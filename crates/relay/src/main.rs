use std::{
    collections::{HashMap, HashSet},
    net::SocketAddr,
    sync::Arc,
};

use agentpal_protocol::{
    DeviceId, DeviceToken, HistoryPage, HistoryRequest, HostId, HostStatus, PairClaimAccepted,
    PairClaimRequest, PairCreateRequest, PairId, PairingPayload, PickerRegistry,
    RelayClientMessage, RelayClientRole, RelayServerMessage, SessionEvent, SessionEventEnvelope,
    SessionSummary, WorkspaceSnapshot,
};
use anyhow::Context;
use axum::{
    Json, Router,
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::IntoResponse,
    routing::get,
};
use clap::Parser;
use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use time::{Duration as TimeDuration, OffsetDateTime};
use tokio::sync::{RwLock, broadcast, mpsc};
use tracing::{info, warn};
use uuid::Uuid;

#[derive(Debug, Parser)]
#[command(
    name = "agentpal-relay",
    version,
    about = "AgentPal local relay prototype"
)]
struct Args {
    #[arg(long, default_value = "127.0.0.1")]
    host: String,

    #[arg(long, default_value_t = 8790)]
    port: u16,
}

#[derive(Clone)]
struct AppState {
    tx: broadcast::Sender<RelayServerMessage>,
    snapshot: Arc<RwLock<RelaySnapshot>>,
    connections: Arc<RwLock<ConnectionRegistry>>,
    pairings: Arc<RwLock<HashMap<PairId, PairSession>>>,
}

#[derive(Default)]
struct RelaySnapshot {
    hosts: HashMap<String, HostStatus>,
    sessions: HashMap<String, SessionSummary>,
    events: HashMap<String, Vec<SessionEventEnvelope>>,
    picker_registries: HashMap<String, PickerRegistry>,
    workspace_snapshots: HashMap<String, WorkspaceSnapshot>,
}

#[derive(Default)]
struct ConnectionRegistry {
    clients: HashMap<String, mpsc::UnboundedSender<RelayServerMessage>>,
    hosts: HashMap<HostId, String>,
    mobiles: HashMap<String, MobileConnection>,
    host_mobiles: HashMap<HostId, Vec<String>>,
    device_bindings: HashMap<DeviceToken, DeviceBinding>,
    cloud_pair_hosts: HashSet<HostId>,
}

#[derive(Clone)]
struct MobileConnection {
    connection_id: String,
    host_id: Option<HostId>,
    device_id: Option<DeviceId>,
    device_token: Option<DeviceToken>,
}

#[derive(Clone)]
struct DeviceBinding {
    host_id: HostId,
    device_id: DeviceId,
}

#[derive(Clone)]
struct PairSession {
    pairing: PairingPayload,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Health {
    ok: bool,
    service: &'static str,
    version: &'static str,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let args = Args::parse();
    let (tx, _) = broadcast::channel(256);
    let state = Arc::new(AppState {
        tx,
        snapshot: Arc::new(RwLock::new(RelaySnapshot::default())),
        connections: Arc::new(RwLock::new(ConnectionRegistry::default())),
        pairings: Arc::new(RwLock::new(HashMap::new())),
    });

    let app = Router::new()
        .route("/healthz", get(healthz))
        .route("/ws", get(ws_handler))
        .with_state(state);

    let addr: SocketAddr = format!("{}:{}", args.host, args.port)
        .parse()
        .context("invalid host/port")?;
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!(%addr, "agentpal relay listening");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn healthz() -> Json<Health> {
    Json(Health {
        ok: true,
        service: "agentpal-relay",
        version: env!("CARGO_PKG_VERSION"),
    })
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<Arc<AppState>>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();
    let (client_tx, mut client_rx) = mpsc::unbounded_channel::<RelayServerMessage>();
    let connection_id = Uuid::new_v4().to_string();
    state
        .connections
        .write()
        .await
        .clients
        .insert(connection_id.clone(), client_tx);

    let snapshot = {
        let snapshot = state.snapshot.read().await;
        RelayServerMessage::Snapshot {
            hosts: snapshot.hosts.values().cloned().collect(),
            sessions: snapshot.sessions.values().cloned().collect(),
            picker_registries: snapshot.picker_registries.values().cloned().collect(),
            workspace_snapshots: snapshot.workspace_snapshots.values().cloned().collect(),
        }
    };
    if send_json(&mut sender, &snapshot).await.is_err() {
        cleanup_connection(&state, &connection_id).await;
        return;
    }

    let outbound = tokio::spawn(async move {
        loop {
            tokio::select! {
                Ok(payload) = rx.recv() => {
                    if send_json(&mut sender, &payload).await.is_err() {
                        break;
                    }
                }
                Some(payload) = client_rx.recv() => {
                    if send_json(&mut sender, &payload).await.is_err() {
                        break;
                    }
                }
                else => break,
            }
        }
    });

    while let Some(message) = receiver.next().await {
        match message {
            Ok(Message::Text(text)) => {
                let incoming: RelayClientMessage = match serde_json::from_str(&text) {
                    Ok(message) => message,
                    Err(error) => {
                        let _ = state.tx.send(RelayServerMessage::Error {
                            message: format!("invalid relay message: {error}"),
                        });
                        continue;
                    }
                };
                handle_client_message(incoming, &state, &connection_id).await;
            }
            Ok(Message::Close(_)) => break,
            Ok(Message::Binary(bytes)) => {
                if state
                    .tx
                    .send(RelayServerMessage::RelayNotice {
                        message: format!("ignored binary websocket message: {} bytes", bytes.len()),
                    })
                    .is_err()
                {
                    warn!("relay had no active receivers for binary notice");
                }
            }
            Ok(Message::Ping(_)) | Ok(Message::Pong(_)) => {}
            Err(error) => {
                warn!(%error, "websocket receive error");
                break;
            }
        }
    }

    outbound.abort();
    cleanup_connection(&state, &connection_id).await;
}

async fn handle_client_message(message: RelayClientMessage, state: &AppState, connection_id: &str) {
    match message {
        RelayClientMessage::Register {
            role,
            client_id,
            host_id,
            device_id,
            device_token,
        } => {
            let label = host_id.clone().unwrap_or_else(|| client_id.clone());
            {
                let mut connections = state.connections.write().await;
                match role {
                    RelayClientRole::Host => {
                        if let Some(host_id) = &host_id {
                            connections
                                .hosts
                                .insert(host_id.clone(), connection_id.to_owned());
                        }
                    }
                    RelayClientRole::Mobile => {
                        let mut verified_host_id = host_id.clone();
                        let verified_binding = device_token
                            .as_ref()
                            .and_then(|token| connections.device_bindings.get(token).cloned())
                            .filter(|binding| {
                                host_id.as_ref() == Some(&binding.host_id)
                                    && device_id.as_ref() == Some(&binding.device_id)
                            });
                        if let Some(binding) = &verified_binding {
                            verified_host_id = Some(binding.host_id.clone());
                            bind_mobile_to_host(&mut connections, &binding.host_id, &client_id);
                        } else if let Some(host_id) = &host_id {
                            if !connections.cloud_pair_hosts.contains(host_id) {
                                bind_mobile_to_host(&mut connections, host_id, &client_id);
                            }
                        }
                        let mobile = MobileConnection {
                            connection_id: connection_id.to_owned(),
                            host_id: verified_host_id,
                            device_id: device_id.clone(),
                            device_token: device_token.clone(),
                        };
                        connections.mobiles.insert(client_id.clone(), mobile);
                    }
                }
            }
            let _ = state.tx.send(RelayServerMessage::RelayNotice {
                message: format!("{role:?} registered as {label}"),
            });
        }
        RelayClientMessage::PairCreate { request } => {
            handle_pair_create(request, state, connection_id).await;
        }
        RelayClientMessage::PairClaim { request } => {
            handle_pair_claim(request, state, connection_id).await;
        }
        RelayClientMessage::HostStatus { status } => {
            state
                .snapshot
                .write()
                .await
                .hosts
                .insert(status.host_id.clone(), status.clone());
            let _ = state.tx.send(RelayServerMessage::HostStatus { status });
        }
        RelayClientMessage::SessionEvent { envelope } => {
            if let Some(session_id) = &envelope.session_id {
                let mut snapshot = state.snapshot.write().await;
                match &envelope.payload {
                    SessionEvent::SessionStarted { summary } => {
                        snapshot
                            .sessions
                            .insert(summary.session_id.clone(), summary.clone());
                    }
                    SessionEvent::StateChanged { state } => {
                        if let Some(summary) = snapshot.sessions.get_mut(session_id) {
                            summary.state = state.clone();
                            summary.updated_at = envelope.created_at;
                        }
                    }
                    SessionEvent::ApprovalRequested { .. } => {
                        if let Some(summary) = snapshot.sessions.get_mut(session_id) {
                            summary.pending_approvals = summary.pending_approvals.saturating_add(1);
                            summary.updated_at = envelope.created_at;
                        }
                    }
                    SessionEvent::ApprovalResolved { .. } => {
                        if let Some(summary) = snapshot.sessions.get_mut(session_id) {
                            summary.pending_approvals = summary.pending_approvals.saturating_sub(1);
                            summary.updated_at = envelope.created_at;
                        }
                    }
                    _ => {}
                }
                snapshot
                    .events
                    .entry(session_id.clone())
                    .or_default()
                    .push(envelope.clone());
            }
            let _ = state.tx.send(RelayServerMessage::SessionEvent { envelope });
        }
        RelayClientMessage::ClientCommand { command } => {
            let host_id = command.host_id.clone();
            route_mobile_to_host(
                state,
                connection_id,
                &host_id,
                RelayServerMessage::ClientCommand { command },
            )
            .await;
        }
        RelayClientMessage::HistoryRequest { request } => {
            let page = history_page(&request, state).await;
            route_to_connection(
                state,
                connection_id,
                RelayServerMessage::HistoryPage { page },
            )
            .await;
            route_mobile_to_host(
                state,
                connection_id,
                &request.host_id.clone(),
                RelayServerMessage::HistoryRequest { request },
            )
            .await;
        }
        RelayClientMessage::WorkspaceRequest { request } => {
            route_mobile_to_host(
                state,
                connection_id,
                &request.host_id.clone(),
                RelayServerMessage::WorkspaceRequest { request },
            )
            .await;
        }
        RelayClientMessage::WorkspaceSnapshot { snapshot } => {
            state.snapshot.write().await.workspace_snapshots.insert(
                workspace_snapshot_key(&snapshot.host_id, &snapshot.workspace),
                snapshot.clone(),
            );
            let _ = state
                .tx
                .send(RelayServerMessage::WorkspaceSnapshot { snapshot });
        }
        RelayClientMessage::FilePreviewRequest { request } => {
            route_mobile_to_host(
                state,
                connection_id,
                &request.host_id.clone(),
                RelayServerMessage::FilePreviewRequest { request },
            )
            .await;
        }
        RelayClientMessage::FilePreview { preview } => {
            let _ = state.tx.send(RelayServerMessage::FilePreview { preview });
        }
        RelayClientMessage::PickerRegistry { registry } => {
            state
                .snapshot
                .write()
                .await
                .picker_registries
                .insert(registry.session_id.clone(), registry.clone());
            let _ = state
                .tx
                .send(RelayServerMessage::PickerRegistry { registry });
        }
    }
}

fn workspace_snapshot_key(host_id: &str, workspace: &str) -> String {
    format!("{host_id}:{workspace}")
}

async fn handle_pair_create(request: PairCreateRequest, state: &AppState, connection_id: &str) {
    let registered_host = {
        let connections = state.connections.read().await;
        connections.hosts.get(&request.host_id).cloned()
    };
    if registered_host.as_deref() != Some(connection_id) {
        route_to_connection(
            state,
            connection_id,
            RelayServerMessage::Error {
                message: format!(
                    "pair create rejected because this connection is not host: {}",
                    request.host_id
                ),
            },
        )
        .await;
        return;
    }

    let pair_id = request
        .pair_id
        .unwrap_or_else(|| format!("pair_{}", Uuid::new_v4()));
    let pair_token = request
        .pair_token
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let expires_at = request
        .expires_in_seconds
        .map(|seconds| {
            OffsetDateTime::now_utc() + TimeDuration::seconds(seconds.min(i64::MAX as u64) as i64)
        })
        .or_else(|| Some(OffsetDateTime::now_utc() + TimeDuration::minutes(2)));
    let pairing = PairingPayload {
        version: 1,
        relay_url: request.relay_url,
        pair_id: Some(pair_id.clone()),
        host_id: request.host_id,
        host_name: request.host_name,
        pair_token,
        device_id: None,
        device_token: None,
        expires_at,
    };

    state.pairings.write().await.insert(
        pair_id,
        PairSession {
            pairing: pairing.clone(),
        },
    );
    state
        .connections
        .write()
        .await
        .cloud_pair_hosts
        .insert(pairing.host_id.clone());
    route_to_connection(
        state,
        connection_id,
        RelayServerMessage::PairCreated { pairing },
    )
    .await;
}

async fn handle_pair_claim(request: PairClaimRequest, state: &AppState, connection_id: &str) {
    let mut pairings = state.pairings.write().await;
    let Some(session) = pairings.get(&request.pair_id).cloned() else {
        route_to_connection(
            state,
            connection_id,
            RelayServerMessage::Error {
                message: "pair session not found or already claimed".to_owned(),
            },
        )
        .await;
        return;
    };
    if let Some(expires_at) = session.pairing.expires_at {
        if expires_at < OffsetDateTime::now_utc() {
            pairings.remove(&request.pair_id);
            route_to_connection(
                state,
                connection_id,
                RelayServerMessage::Error {
                    message: "pair session expired".to_owned(),
                },
            )
            .await;
            return;
        }
    }
    if request.pair_token != session.pairing.pair_token {
        route_to_connection(
            state,
            connection_id,
            RelayServerMessage::Error {
                message: "pair token rejected".to_owned(),
            },
        )
        .await;
        return;
    }
    pairings.remove(&request.pair_id);
    drop(pairings);

    let device_id = request
        .device_id
        .unwrap_or_else(|| format!("mobile_{}", Uuid::new_v4()));
    let device_token = Uuid::new_v4().to_string();
    let claim = PairClaimAccepted {
        pair_id: request.pair_id,
        host_id: session.pairing.host_id.clone(),
        host_name: session.pairing.host_name.clone(),
        mobile_client_id: request.mobile_client_id.clone(),
        device_id: device_id.clone(),
        device_token: device_token.clone(),
    };

    {
        let mut connections = state.connections.write().await;
        bind_mobile_to_host(
            &mut connections,
            &session.pairing.host_id,
            &request.mobile_client_id,
        );
        connections
            .mobiles
            .entry(request.mobile_client_id.clone())
            .and_modify(|mobile| {
                mobile.connection_id = connection_id.to_owned();
                mobile.host_id = Some(session.pairing.host_id.clone());
                mobile.device_id = Some(device_id.clone());
                mobile.device_token = Some(device_token.clone());
            })
            .or_insert_with(|| MobileConnection {
                connection_id: connection_id.to_owned(),
                host_id: Some(session.pairing.host_id.clone()),
                device_id: Some(device_id.clone()),
                device_token: Some(device_token.clone()),
            });
        connections.device_bindings.insert(
            device_token.clone(),
            DeviceBinding {
                host_id: session.pairing.host_id.clone(),
                device_id: device_id.clone(),
            },
        );
    }

    route_to_connection(
        state,
        connection_id,
        RelayServerMessage::PairClaimed {
            claim: claim.clone(),
        },
    )
    .await;
    route_to_host(
        state,
        &session.pairing.host_id,
        RelayServerMessage::PairClaimed { claim },
    )
    .await;
}

fn bind_mobile_to_host(
    connections: &mut ConnectionRegistry,
    host_id: &str,
    mobile_client_id: &str,
) {
    let items = connections
        .host_mobiles
        .entry(host_id.to_owned())
        .or_default();
    if !items.iter().any(|item| item == mobile_client_id) {
        items.push(mobile_client_id.to_owned());
    }
}

async fn route_to_host(state: &AppState, host_id: &str, payload: RelayServerMessage) {
    let target = {
        let connections = state.connections.read().await;
        connections
            .hosts
            .get(host_id)
            .and_then(|connection_id| connections.clients.get(connection_id))
            .cloned()
    };
    if let Some(tx) = target {
        let _ = tx.send(payload);
    } else {
        let _ = state.tx.send(RelayServerMessage::Error {
            message: format!("host is not connected: {host_id}"),
        });
    }
}

async fn route_mobile_to_host(
    state: &AppState,
    connection_id: &str,
    host_id: &str,
    payload: RelayServerMessage,
) {
    let allowed = {
        let connections = state.connections.read().await;
        let mobile = connections.mobiles.iter().find_map(|(client_id, mobile)| {
            (mobile.connection_id == connection_id && mobile.host_id.as_deref() == Some(host_id))
                .then_some((client_id, mobile))
        });
        mobile.is_some_and(|(client_id, mobile)| {
            let listed = connections
                .host_mobiles
                .get(host_id)
                .is_some_and(|items| items.iter().any(|item| item == client_id));
            if !listed {
                return false;
            }
            if !connections.cloud_pair_hosts.contains(host_id) {
                return true;
            }
            let Some(device_token) = &mobile.device_token else {
                return false;
            };
            connections
                .device_bindings
                .get(device_token)
                .is_some_and(|binding| {
                    binding.host_id == host_id
                        && Some(&binding.device_id) == mobile.device_id.as_ref()
                })
        })
    };
    if allowed {
        route_to_host(state, host_id, payload).await;
    } else {
        route_to_connection(
            state,
            connection_id,
            RelayServerMessage::Error {
                message: format!("mobile is not paired with host: {host_id}"),
            },
        )
        .await;
    }
}

async fn route_to_connection(state: &AppState, connection_id: &str, payload: RelayServerMessage) {
    let target = {
        let connections = state.connections.read().await;
        connections.clients.get(connection_id).cloned()
    };
    if let Some(tx) = target {
        let _ = tx.send(payload);
    }
}

async fn cleanup_connection(state: &AppState, connection_id: &str) {
    let mut connections = state.connections.write().await;
    connections.clients.remove(connection_id);
    let removed_hosts: Vec<HostId> = connections
        .hosts
        .iter()
        .filter_map(|(host_id, id)| (id == connection_id).then_some(host_id.clone()))
        .collect();
    for host_id in removed_hosts {
        connections.hosts.remove(&host_id);
        connections.host_mobiles.remove(&host_id);
        connections.cloud_pair_hosts.remove(&host_id);
        connections
            .device_bindings
            .retain(|_, binding| binding.host_id != host_id);
    }
    let removed_mobiles: Vec<String> = connections
        .mobiles
        .iter()
        .filter_map(|(client_id, mobile)| {
            (mobile.connection_id == connection_id).then_some(client_id.clone())
        })
        .collect();
    for client_id in removed_mobiles {
        connections.mobiles.remove(&client_id);
        for clients in connections.host_mobiles.values_mut() {
            clients.retain(|item| item != &client_id);
        }
    }
}

async fn history_page(request: &HistoryRequest, state: &AppState) -> HistoryPage {
    let limit = request.limit.clamp(1, 100) as usize;
    let snapshot = state.snapshot.read().await;
    let all_events = snapshot
        .events
        .get(&request.session_id)
        .map(Vec::as_slice)
        .unwrap_or(&[]);

    let mut candidates: Vec<SessionEventEnvelope> = all_events
        .iter()
        .filter(|event| event.host_id == request.host_id)
        .filter(|event| match request.before_seq {
            Some(before_seq) => event.seq < before_seq,
            None => true,
        })
        .rev()
        .take(limit + 1)
        .cloned()
        .collect();
    let has_more = candidates.len() > limit;
    if has_more {
        candidates.truncate(limit);
    }
    candidates.reverse();

    HistoryPage {
        request_id: request.request_id.clone(),
        host_id: request.host_id.clone(),
        session_id: request.session_id.clone(),
        oldest_seq: candidates.first().map(|event| event.seq),
        newest_seq: candidates.last().map(|event| event.seq),
        events: candidates,
        has_more,
    }
}

async fn send_json(
    sender: &mut futures_util::stream::SplitSink<WebSocket, Message>,
    payload: &RelayServerMessage,
) -> Result<(), axum::Error> {
    let text = match serde_json::to_string(payload) {
        Ok(text) => text,
        Err(error) => {
            warn!(%error, "failed to serialize relay payload");
            return Ok(());
        }
    };
    sender.send(Message::Text(text.into())).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use agentpal_protocol::{
        ClientCommand, PairClaimRequest, PairCreateRequest, RelayClientMessage, RelayClientRole,
    };

    fn test_state() -> (AppState, broadcast::Receiver<RelayServerMessage>) {
        let (tx, rx) = broadcast::channel(32);
        (
            AppState {
                tx,
                snapshot: Arc::new(RwLock::new(RelaySnapshot::default())),
                connections: Arc::new(RwLock::new(ConnectionRegistry::default())),
                pairings: Arc::new(RwLock::new(HashMap::new())),
            },
            rx,
        )
    }

    async fn register_client(
        state: &AppState,
        connection_id: &str,
    ) -> mpsc::UnboundedReceiver<RelayServerMessage> {
        let (tx, rx) = mpsc::unbounded_channel();
        state
            .connections
            .write()
            .await
            .clients
            .insert(connection_id.to_owned(), tx);
        rx
    }

    #[tokio::test]
    async fn cloud_pair_claim_binds_mobile_and_routes_commands() {
        let (state, _broadcast_rx) = test_state();
        let mut host_rx = register_client(&state, "host-conn").await;
        let mut mobile_rx = register_client(&state, "mobile-conn").await;

        handle_client_message(
            RelayClientMessage::Register {
                role: RelayClientRole::Host,
                client_id: "host-client".to_owned(),
                host_id: Some("host-a".to_owned()),
                device_id: None,
                device_token: None,
            },
            &state,
            "host-conn",
        )
        .await;

        handle_client_message(
            RelayClientMessage::PairCreate {
                request: PairCreateRequest {
                    host_id: "host-a".to_owned(),
                    host_name: "Host A".to_owned(),
                    relay_url: "ws://127.0.0.1:8790/ws".to_owned(),
                    pair_id: Some("pair-a".to_owned()),
                    pair_token: Some("secret-a".to_owned()),
                    expires_in_seconds: Some(120),
                },
            },
            &state,
            "host-conn",
        )
        .await;

        let created = host_rx.recv().await.expect("host receives pair-created");
        let RelayServerMessage::PairCreated { pairing } = created else {
            panic!("expected pair-created");
        };
        assert_eq!(pairing.pair_id.as_deref(), Some("pair-a"));

        handle_client_message(
            RelayClientMessage::Register {
                role: RelayClientRole::Mobile,
                client_id: "mobile-client".to_owned(),
                host_id: Some("host-a".to_owned()),
                device_id: None,
                device_token: None,
            },
            &state,
            "mobile-conn",
        )
        .await;
        handle_client_message(
            RelayClientMessage::ClientCommand {
                command: ClientCommand::input_submit(
                    "cmd-rejected",
                    "host-a",
                    "agentpal-codex-local",
                    "before claim",
                ),
            },
            &state,
            "mobile-conn",
        )
        .await;
        let rejected = mobile_rx.recv().await.expect("mobile receives rejection");
        assert!(matches!(rejected, RelayServerMessage::Error { .. }));

        handle_client_message(
            RelayClientMessage::PairClaim {
                request: PairClaimRequest {
                    pair_id: "pair-a".to_owned(),
                    pair_token: "secret-a".to_owned(),
                    mobile_client_id: "mobile-client".to_owned(),
                    device_id: None,
                    device_name: Some("test phone".to_owned()),
                },
            },
            &state,
            "mobile-conn",
        )
        .await;
        let claimed_for_mobile = mobile_rx.recv().await.expect("mobile receives claim");
        let RelayServerMessage::PairClaimed { claim } = claimed_for_mobile else {
            panic!("expected pair-claimed for mobile");
        };
        assert_eq!(claim.host_id, "host-a");
        assert!(!claim.device_token.is_empty());
        assert!(matches!(
            host_rx.recv().await.expect("host receives claim"),
            RelayServerMessage::PairClaimed { .. }
        ));

        handle_client_message(
            RelayClientMessage::ClientCommand {
                command: ClientCommand::input_submit(
                    "cmd-accepted",
                    "host-a",
                    "agentpal-codex-local",
                    "after claim",
                ),
            },
            &state,
            "mobile-conn",
        )
        .await;
        let routed = host_rx.recv().await.expect("host receives client command");
        let RelayServerMessage::ClientCommand { command } = routed else {
            panic!("expected routed client-command");
        };
        assert_eq!(command.command_id, "cmd-accepted");
    }

    #[tokio::test]
    async fn pair_create_requires_registered_host_connection() {
        let (state, _broadcast_rx) = test_state();
        let mut mobile_rx = register_client(&state, "mobile-conn").await;

        handle_client_message(
            RelayClientMessage::PairCreate {
                request: PairCreateRequest {
                    host_id: "host-a".to_owned(),
                    host_name: "Host A".to_owned(),
                    relay_url: "ws://127.0.0.1:8790/ws".to_owned(),
                    pair_id: Some("pair-a".to_owned()),
                    pair_token: Some("secret-a".to_owned()),
                    expires_in_seconds: Some(120),
                },
            },
            &state,
            "mobile-conn",
        )
        .await;

        let rejected = mobile_rx
            .recv()
            .await
            .expect("requester receives rejection");
        assert!(matches!(rejected, RelayServerMessage::Error { .. }));
        assert!(state.pairings.read().await.is_empty());
    }
}
