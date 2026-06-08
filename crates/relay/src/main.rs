use std::{
    collections::{HashMap, HashSet},
    net::SocketAddr,
    sync::Arc,
};

use agentpal_protocol::{
    DeviceId, HistoryPage, HistoryRequest, HostId, HostStatus, PairClaimAccepted, PairClaimRequest,
    PairCreateRequest, PairId, PairingPayload, PickerRegistry, RelayClientMessage, RelayClientRole,
    RelayServerMessage, SessionEvent, SessionEventEnvelope, SessionSummary, WorkspaceSnapshot,
};
use anyhow::Context;
use async_trait::async_trait;
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
use redis::aio::ConnectionManager;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use time::{Duration as TimeDuration, OffsetDateTime};
use tokio::sync::{RwLock, mpsc};
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

    #[arg(long, env = "OAP_REDIS_URL")]
    redis_url: Option<String>,

    #[arg(long, env = "OAP_REDIS_KEY_PREFIX", default_value = "agentpal:relay")]
    redis_key_prefix: String,

    #[arg(long, env = "OAP_RELAY_REQUIRE_PAIRING", default_value_t = false)]
    require_pairing: bool,
}

#[derive(Clone)]
struct AppState {
    snapshot: Arc<RwLock<RelaySnapshot>>,
    connections: Arc<RwLock<ConnectionRegistry>>,
    store: Arc<dyn PairingStore>,
    require_pairing: bool,
}

#[derive(Default)]
struct RelaySnapshot {
    hosts: HashMap<String, HostStatus>,
    sessions: HashMap<String, SessionSummary>,
    session_hosts: HashMap<String, HostId>,
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
}

#[derive(Clone)]
struct MobileConnection {
    connection_id: String,
    host_id: Option<HostId>,
    device_id: Option<DeviceId>,
    device_token_hash: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct DeviceBinding {
    host_id: HostId,
    device_id: DeviceId,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct StoredPairSession {
    pair_id: PairId,
    relay_url: String,
    host_id: HostId,
    host_name: String,
    pair_token_hash: String,
    #[serde(default, with = "time::serde::rfc3339::option")]
    expires_at: Option<OffsetDateTime>,
}

enum PairClaimOutcome {
    Claimed(StoredPairSession),
    NotFound,
    TokenRejected,
    Expired,
}

#[async_trait]
trait PairingStore: Send + Sync {
    async fn put_pair_session(
        &self,
        session: StoredPairSession,
        ttl_seconds: Option<u64>,
    ) -> anyhow::Result<()>;
    async fn claim_pair_session(
        &self,
        pair_id: &str,
        pair_token: &str,
        now: OffsetDateTime,
    ) -> anyhow::Result<PairClaimOutcome>;
    async fn put_device_binding(
        &self,
        device_token_hash: String,
        binding: DeviceBinding,
    ) -> anyhow::Result<()>;
    async fn get_device_binding(
        &self,
        device_token_hash: &str,
    ) -> anyhow::Result<Option<DeviceBinding>>;
    async fn mark_cloud_pair_host(&self, host_id: &str) -> anyhow::Result<()>;
    async fn is_cloud_pair_host(&self, host_id: &str) -> anyhow::Result<bool>;
}

#[derive(Default)]
struct MemoryPairingStore {
    pairings: RwLock<HashMap<PairId, StoredPairSession>>,
    device_bindings: RwLock<HashMap<String, DeviceBinding>>,
    cloud_pair_hosts: RwLock<HashSet<HostId>>,
}

#[async_trait]
impl PairingStore for MemoryPairingStore {
    async fn put_pair_session(
        &self,
        session: StoredPairSession,
        _ttl_seconds: Option<u64>,
    ) -> anyhow::Result<()> {
        self.pairings
            .write()
            .await
            .insert(session.pair_id.clone(), session);
        Ok(())
    }

    async fn claim_pair_session(
        &self,
        pair_id: &str,
        pair_token: &str,
        now: OffsetDateTime,
    ) -> anyhow::Result<PairClaimOutcome> {
        let mut pairings = self.pairings.write().await;
        let Some(session) = pairings.get(pair_id).cloned() else {
            return Ok(PairClaimOutcome::NotFound);
        };
        if let Some(expires_at) = session.expires_at {
            if expires_at < now {
                pairings.remove(pair_id);
                return Ok(PairClaimOutcome::Expired);
            }
        }
        if session.pair_token_hash != token_hash(pair_token) {
            return Ok(PairClaimOutcome::TokenRejected);
        }
        pairings.remove(pair_id);
        Ok(PairClaimOutcome::Claimed(session))
    }

    async fn put_device_binding(
        &self,
        device_token_hash: String,
        binding: DeviceBinding,
    ) -> anyhow::Result<()> {
        self.device_bindings
            .write()
            .await
            .insert(device_token_hash, binding);
        Ok(())
    }

    async fn get_device_binding(
        &self,
        device_token_hash: &str,
    ) -> anyhow::Result<Option<DeviceBinding>> {
        Ok(self
            .device_bindings
            .read()
            .await
            .get(device_token_hash)
            .cloned())
    }

    async fn mark_cloud_pair_host(&self, host_id: &str) -> anyhow::Result<()> {
        self.cloud_pair_hosts
            .write()
            .await
            .insert(host_id.to_owned());
        Ok(())
    }

    async fn is_cloud_pair_host(&self, host_id: &str) -> anyhow::Result<bool> {
        Ok(self.cloud_pair_hosts.read().await.contains(host_id))
    }
}

#[derive(Clone)]
struct RedisPairingStore {
    connection: ConnectionManager,
    key_prefix: String,
}

impl RedisPairingStore {
    fn pair_key(&self, pair_id: &str) -> String {
        format!("{}:pair:{pair_id}", self.key_prefix)
    }

    fn device_key(&self, device_token_hash: &str) -> String {
        format!("{}:device:{device_token_hash}", self.key_prefix)
    }

    fn cloud_host_key(&self, host_id: &str) -> String {
        format!("{}:cloud-host:{host_id}", self.key_prefix)
    }
}

#[async_trait]
impl PairingStore for RedisPairingStore {
    async fn put_pair_session(
        &self,
        session: StoredPairSession,
        ttl_seconds: Option<u64>,
    ) -> anyhow::Result<()> {
        let key = self.pair_key(&session.pair_id);
        let payload = serde_json::to_string(&session)?;
        let expires_at_unix = session
            .expires_at
            .map(|expires_at| expires_at.unix_timestamp().to_string())
            .unwrap_or_default();
        let mut connection = self.connection.clone();
        let _: usize = redis::cmd("HSET")
            .arg(&key)
            .arg("payload")
            .arg(payload)
            .arg("tokenHash")
            .arg(&session.pair_token_hash)
            .arg("expiresAtUnix")
            .arg(expires_at_unix)
            .query_async(&mut connection)
            .await?;
        if let Some(ttl_seconds) = ttl_seconds {
            let _: bool = redis::cmd("EXPIRE")
                .arg(&key)
                .arg(ttl_seconds.max(1))
                .query_async(&mut connection)
                .await?;
        }
        Ok(())
    }

    async fn claim_pair_session(
        &self,
        pair_id: &str,
        pair_token: &str,
        now: OffsetDateTime,
    ) -> anyhow::Result<PairClaimOutcome> {
        let key = self.pair_key(pair_id);
        let script = r#"
local token_hash = redis.call("HGET", KEYS[1], "tokenHash")
if not token_hash then
  return {0, ""}
end
if token_hash ~= ARGV[1] then
  return {2, ""}
end
local expires_at = redis.call("HGET", KEYS[1], "expiresAtUnix")
if expires_at and expires_at ~= "" and tonumber(expires_at) < tonumber(ARGV[2]) then
  redis.call("DEL", KEYS[1])
  return {3, ""}
end
local payload = redis.call("HGET", KEYS[1], "payload")
redis.call("DEL", KEYS[1])
return {1, payload}
"#;
        let mut connection = self.connection.clone();
        let (code, payload): (i64, String) = redis::cmd("EVAL")
            .arg(script)
            .arg(1)
            .arg(&key)
            .arg(token_hash(pair_token))
            .arg(now.unix_timestamp())
            .query_async(&mut connection)
            .await?;
        match code {
            0 => Ok(PairClaimOutcome::NotFound),
            1 => Ok(PairClaimOutcome::Claimed(serde_json::from_str(&payload)?)),
            2 => Ok(PairClaimOutcome::TokenRejected),
            3 => Ok(PairClaimOutcome::Expired),
            _ => anyhow::bail!("unexpected redis pair claim outcome: {code}"),
        }
    }

    async fn put_device_binding(
        &self,
        device_token_hash: String,
        binding: DeviceBinding,
    ) -> anyhow::Result<()> {
        let key = self.device_key(&device_token_hash);
        let payload = serde_json::to_string(&binding)?;
        let mut connection = self.connection.clone();
        let _: () = redis::cmd("SET")
            .arg(key)
            .arg(payload)
            .query_async(&mut connection)
            .await?;
        Ok(())
    }

    async fn get_device_binding(
        &self,
        device_token_hash: &str,
    ) -> anyhow::Result<Option<DeviceBinding>> {
        let key = self.device_key(device_token_hash);
        let mut connection = self.connection.clone();
        let payload: Option<String> = redis::cmd("GET")
            .arg(key)
            .query_async(&mut connection)
            .await?;
        payload
            .map(|payload| serde_json::from_str(&payload).map_err(Into::into))
            .transpose()
    }

    async fn mark_cloud_pair_host(&self, host_id: &str) -> anyhow::Result<()> {
        let key = self.cloud_host_key(host_id);
        let mut connection = self.connection.clone();
        let _: () = redis::cmd("SET")
            .arg(key)
            .arg("1")
            .query_async(&mut connection)
            .await?;
        Ok(())
    }

    async fn is_cloud_pair_host(&self, host_id: &str) -> anyhow::Result<bool> {
        let key = self.cloud_host_key(host_id);
        let mut connection = self.connection.clone();
        let exists: bool = redis::cmd("EXISTS")
            .arg(key)
            .query_async(&mut connection)
            .await?;
        Ok(exists)
    }
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
    let store = build_pairing_store(&args).await?;
    let state = Arc::new(AppState {
        snapshot: Arc::new(RwLock::new(RelaySnapshot::default())),
        connections: Arc::new(RwLock::new(ConnectionRegistry::default())),
        store,
        require_pairing: args.require_pairing,
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

async fn build_pairing_store(args: &Args) -> anyhow::Result<Arc<dyn PairingStore>> {
    if let Some(redis_url) = &args.redis_url {
        let client = redis::Client::open(redis_url.as_str())
            .with_context(|| "failed to create redis client")?;
        let connection = client
            .get_connection_manager()
            .await
            .with_context(|| "failed to connect to redis")?;
        info!(
            key_prefix = %args.redis_key_prefix,
            require_pairing = args.require_pairing,
            "agentpal relay using redis pairing store"
        );
        return Ok(Arc::new(RedisPairingStore {
            connection,
            key_prefix: args.redis_key_prefix.clone(),
        }));
    }

    if args.require_pairing {
        warn!("OAP_RELAY_REQUIRE_PAIRING is enabled without Redis; restart loses device bindings");
    }
    info!(
        require_pairing = args.require_pairing,
        "agentpal relay using in-memory pairing store"
    );
    Ok(Arc::new(MemoryPairingStore::default()))
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
    let (client_tx, mut client_rx) = mpsc::unbounded_channel::<RelayServerMessage>();
    let connection_id = Uuid::new_v4().to_string();
    state
        .connections
        .write()
        .await
        .clients
        .insert(connection_id.clone(), client_tx);

    let snapshot = RelayServerMessage::Snapshot {
        hosts: Vec::new(),
        sessions: Vec::new(),
        picker_registries: Vec::new(),
        workspace_snapshots: Vec::new(),
    };
    if send_json(&mut sender, &snapshot).await.is_err() {
        cleanup_connection(&state, &connection_id).await;
        return;
    }

    let outbound = tokio::spawn(async move {
        loop {
            tokio::select! {
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
                        route_to_connection(
                            &state,
                            &connection_id,
                            RelayServerMessage::Error {
                                message: format!("invalid relay message: {error}"),
                            },
                        )
                        .await;
                        continue;
                    }
                };
                handle_client_message(incoming, &state, &connection_id).await;
            }
            Ok(Message::Close(_)) => break,
            Ok(Message::Binary(bytes)) => {
                route_to_connection(
                    &state,
                    &connection_id,
                    RelayServerMessage::RelayNotice {
                        message: format!("ignored binary websocket message: {} bytes", bytes.len()),
                    },
                )
                .await;
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
            if role == RelayClientRole::Host {
                if let Some(host_id) = &host_id {
                    let existing = {
                        let connections = state.connections.read().await;
                        connections.hosts.get(host_id).cloned()
                    };
                    if existing.as_deref().is_some_and(|id| id != connection_id) {
                        route_to_connection(
                            state,
                            connection_id,
                            RelayServerMessage::Error {
                                message: format!("host is already connected: {host_id}"),
                            },
                        )
                        .await;
                        return;
                    }
                }
            }
            let verified_binding = match (&host_id, &device_id, &device_token) {
                (Some(host_id), Some(device_id), Some(device_token)) => {
                    let device_token_hash = token_hash(device_token);
                    match state.store.get_device_binding(&device_token_hash).await {
                        Ok(Some(binding))
                            if &binding.host_id == host_id && &binding.device_id == device_id =>
                        {
                            Some((binding, device_token_hash))
                        }
                        Ok(_) => None,
                        Err(error) => {
                            warn!(%error, "failed to verify mobile device binding");
                            None
                        }
                    }
                }
                _ => None,
            };
            let fallback_host: Option<HostId> = match (&verified_binding, &host_id) {
                (None, Some(host_id)) if !state.require_pairing => {
                    match state.store.is_cloud_pair_host(host_id).await {
                        Ok(false) => Some(host_id.to_owned()),
                        Ok(true) => None,
                        Err(error) => {
                            warn!(%error, "failed to check cloud-pair host marker");
                            None
                        }
                    }
                }
                _ => None,
            };
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
                        let mut verified_host_id = None;
                        let mut device_token_hash = None;
                        if let Some((binding, token_hash)) = &verified_binding {
                            verified_host_id = Some(binding.host_id.clone());
                            bind_mobile_to_host(&mut connections, &binding.host_id, &client_id);
                            device_token_hash = Some(token_hash.clone());
                        } else if let Some(host_id) = &fallback_host {
                            verified_host_id = Some(host_id.clone());
                            bind_mobile_to_host(&mut connections, host_id, &client_id);
                        }
                        let mobile = MobileConnection {
                            connection_id: connection_id.to_owned(),
                            host_id: verified_host_id,
                            device_id: device_id.clone(),
                            device_token_hash,
                        };
                        connections.mobiles.insert(client_id.clone(), mobile);
                    }
                }
            }
            if role == RelayClientRole::Mobile {
                if let Some(host_id) = verified_binding
                    .as_ref()
                    .map(|(binding, _)| binding.host_id.clone())
                    .or(fallback_host)
                {
                    route_to_connection(
                        state,
                        connection_id,
                        scoped_snapshot(state, &host_id).await,
                    )
                    .await;
                }
            }
        }
        RelayClientMessage::PairCreate { request } => {
            handle_pair_create(request, state, connection_id).await;
        }
        RelayClientMessage::PairClaim { request } => {
            handle_pair_claim(request, state, connection_id).await;
        }
        RelayClientMessage::HostStatus { status } => {
            if !is_host_connection(state, connection_id, &status.host_id).await {
                reject_host_origin(state, connection_id, &status.host_id, "host status").await;
                return;
            }
            let host_id = status.host_id.clone();
            state
                .snapshot
                .write()
                .await
                .hosts
                .insert(status.host_id.clone(), status.clone());
            route_host_update(state, &host_id, RelayServerMessage::HostStatus { status }).await;
        }
        RelayClientMessage::SessionEvent { envelope } => {
            if !is_host_connection(state, connection_id, &envelope.host_id).await {
                reject_host_origin(state, connection_id, &envelope.host_id, "session event").await;
                return;
            }
            if let Some(session_id) = &envelope.session_id {
                let mut snapshot = state.snapshot.write().await;
                match &envelope.payload {
                    SessionEvent::SessionStarted { summary } => {
                        snapshot
                            .session_hosts
                            .insert(summary.session_id.clone(), envelope.host_id.clone());
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
            route_host_update(
                state,
                &envelope.host_id.clone(),
                RelayServerMessage::SessionEvent { envelope },
            )
            .await;
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
            if is_mobile_authorized_for_host(state, connection_id, &request.host_id).await {
                let page = history_page(&request, state).await;
                route_to_connection(
                    state,
                    connection_id,
                    RelayServerMessage::HistoryPage { page },
                )
                .await;
                route_to_host(
                    state,
                    &request.host_id.clone(),
                    RelayServerMessage::HistoryRequest { request },
                )
                .await;
            } else {
                reject_unpaired_mobile(state, connection_id, &request.host_id).await;
            }
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
            if !is_host_connection(state, connection_id, &snapshot.host_id).await {
                reject_host_origin(
                    state,
                    connection_id,
                    &snapshot.host_id,
                    "workspace snapshot",
                )
                .await;
                return;
            }
            state.snapshot.write().await.workspace_snapshots.insert(
                workspace_snapshot_key(&snapshot.host_id, &snapshot.workspace),
                snapshot.clone(),
            );
            route_host_update(
                state,
                &snapshot.host_id.clone(),
                RelayServerMessage::WorkspaceSnapshot { snapshot },
            )
            .await;
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
            if !is_host_connection(state, connection_id, &preview.host_id).await {
                reject_host_origin(state, connection_id, &preview.host_id, "file preview").await;
                return;
            }
            route_host_update(
                state,
                &preview.host_id.clone(),
                RelayServerMessage::FilePreview { preview },
            )
            .await;
        }
        RelayClientMessage::PickerRegistry { registry } => {
            if !is_host_connection(state, connection_id, &registry.host_id).await {
                reject_host_origin(state, connection_id, &registry.host_id, "picker registry")
                    .await;
                return;
            }
            state
                .snapshot
                .write()
                .await
                .picker_registries
                .insert(registry.session_id.clone(), registry.clone());
            route_host_update(
                state,
                &registry.host_id.clone(),
                RelayServerMessage::PickerRegistry { registry },
            )
            .await;
        }
    }
}

fn workspace_snapshot_key(host_id: &str, workspace: &str) -> String {
    format!("{host_id}:{workspace}")
}

fn token_hash(value: &str) -> String {
    let digest = Sha256::digest(value.as_bytes());
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
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
    let ttl_seconds = request.expires_in_seconds.or(Some(120));
    let expires_at = ttl_seconds.map(|seconds| {
        OffsetDateTime::now_utc() + TimeDuration::seconds(seconds.min(i64::MAX as u64) as i64)
    });
    let session = StoredPairSession {
        pair_id: pair_id.clone(),
        relay_url: request.relay_url.clone(),
        host_id: request.host_id.clone(),
        host_name: request.host_name.clone(),
        pair_token_hash: token_hash(&pair_token),
        expires_at,
    };
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

    if let Err(error) = state.store.put_pair_session(session, ttl_seconds).await {
        route_to_connection(
            state,
            connection_id,
            RelayServerMessage::Error {
                message: format!("pair create failed: {error}"),
            },
        )
        .await;
        return;
    }
    if let Err(error) = state.store.mark_cloud_pair_host(&pairing.host_id).await {
        route_to_connection(
            state,
            connection_id,
            RelayServerMessage::Error {
                message: format!("pair create failed: {error}"),
            },
        )
        .await;
        return;
    }
    route_to_connection(
        state,
        connection_id,
        RelayServerMessage::PairCreated { pairing },
    )
    .await;
}

async fn handle_pair_claim(request: PairClaimRequest, state: &AppState, connection_id: &str) {
    let outcome = match state
        .store
        .claim_pair_session(
            &request.pair_id,
            &request.pair_token,
            OffsetDateTime::now_utc(),
        )
        .await
    {
        Ok(outcome) => outcome,
        Err(error) => {
            route_to_connection(
                state,
                connection_id,
                RelayServerMessage::Error {
                    message: format!("pair claim failed: {error}"),
                },
            )
            .await;
            return;
        }
    };
    let session = match outcome {
        PairClaimOutcome::Claimed(session) => session,
        PairClaimOutcome::NotFound => {
            route_to_connection(
                state,
                connection_id,
                RelayServerMessage::Error {
                    message: "pair session not found or already claimed".to_owned(),
                },
            )
            .await;
            return;
        }
        PairClaimOutcome::TokenRejected => {
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
        PairClaimOutcome::Expired => {
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
    };

    let device_id = request
        .device_id
        .unwrap_or_else(|| format!("mobile_{}", Uuid::new_v4()));
    let device_token = Uuid::new_v4().to_string();
    let device_token_hash = token_hash(&device_token);
    if let Err(error) = state
        .store
        .put_device_binding(
            device_token_hash.clone(),
            DeviceBinding {
                host_id: session.host_id.clone(),
                device_id: device_id.clone(),
            },
        )
        .await
    {
        route_to_connection(
            state,
            connection_id,
            RelayServerMessage::Error {
                message: format!("pair claim failed: {error}"),
            },
        )
        .await;
        return;
    }
    let claim = PairClaimAccepted {
        pair_id: request.pair_id,
        host_id: session.host_id.clone(),
        host_name: session.host_name.clone(),
        mobile_client_id: request.mobile_client_id.clone(),
        device_id: device_id.clone(),
        device_token: device_token.clone(),
    };

    {
        let mut connections = state.connections.write().await;
        bind_mobile_to_host(
            &mut connections,
            &session.host_id,
            &request.mobile_client_id,
        );
        connections
            .mobiles
            .entry(request.mobile_client_id.clone())
            .and_modify(|mobile| {
                mobile.connection_id = connection_id.to_owned();
                mobile.host_id = Some(session.host_id.clone());
                mobile.device_id = Some(device_id.clone());
                mobile.device_token_hash = Some(device_token_hash.clone());
            })
            .or_insert_with(|| MobileConnection {
                connection_id: connection_id.to_owned(),
                host_id: Some(session.host_id.clone()),
                device_id: Some(device_id.clone()),
                device_token_hash: Some(device_token_hash.clone()),
            });
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
        &session.host_id,
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
        return;
    }
}

async fn is_host_connection(state: &AppState, connection_id: &str, host_id: &str) -> bool {
    let connections = state.connections.read().await;
    connections.hosts.get(host_id).map(String::as_str) == Some(connection_id)
}

async fn reject_host_origin(
    state: &AppState,
    connection_id: &str,
    host_id: &str,
    message_kind: &str,
) {
    route_to_connection(
        state,
        connection_id,
        RelayServerMessage::Error {
            message: format!(
                "{message_kind} rejected because this connection is not host: {host_id}"
            ),
        },
    )
    .await;
}

async fn reject_unpaired_mobile(state: &AppState, connection_id: &str, host_id: &str) {
    route_to_connection(
        state,
        connection_id,
        RelayServerMessage::Error {
            message: format!("mobile is not paired with host: {host_id}"),
        },
    )
    .await;
}

async fn is_mobile_authorized_for_host(
    state: &AppState,
    connection_id: &str,
    host_id: &str,
) -> bool {
    let mobile_auth = {
        let connections = state.connections.read().await;
        let mobile = connections.mobiles.iter().find_map(|(client_id, mobile)| {
            (mobile.connection_id == connection_id && mobile.host_id.as_deref() == Some(host_id))
                .then_some((client_id, mobile))
        });
        mobile.map(|(client_id, mobile)| {
            let listed = connections
                .host_mobiles
                .get(host_id)
                .is_some_and(|items| items.iter().any(|item| item == client_id));
            (
                listed,
                mobile.device_id.clone(),
                mobile.device_token_hash.clone(),
            )
        })
    };
    match mobile_auth {
        None => false,
        Some((listed, device_id, device_token_hash)) => {
            let cloud_pair_host = match state.store.is_cloud_pair_host(host_id).await {
                Ok(value) => value,
                Err(error) => {
                    warn!(%error, "failed to check cloud-pair host marker");
                    true
                }
            };
            if !state.require_pairing && !cloud_pair_host {
                listed
            } else {
                match (device_id, device_token_hash) {
                    (Some(device_id), Some(device_token_hash)) => {
                        match state.store.get_device_binding(&device_token_hash).await {
                            Ok(Some(binding)) => {
                                binding.host_id == host_id && binding.device_id == device_id
                            }
                            Ok(None) => false,
                            Err(error) => {
                                warn!(%error, "failed to verify device binding during route");
                                false
                            }
                        }
                    }
                    _ => false,
                }
            }
        }
    }
}

async fn route_host_update(state: &AppState, host_id: &str, payload: RelayServerMessage) {
    let connection_ids: Vec<String> = {
        let connections = state.connections.read().await;
        connections
            .mobiles
            .values()
            .filter(|mobile| mobile.host_id.as_deref() == Some(host_id))
            .map(|mobile| mobile.connection_id.clone())
            .collect()
    };
    for connection_id in connection_ids {
        if is_mobile_authorized_for_host(state, &connection_id, host_id).await {
            route_to_connection(state, &connection_id, payload.clone()).await;
        }
    }
}

async fn scoped_snapshot(state: &AppState, host_id: &str) -> RelayServerMessage {
    let snapshot = state.snapshot.read().await;
    RelayServerMessage::Snapshot {
        hosts: snapshot.hosts.get(host_id).cloned().into_iter().collect(),
        sessions: snapshot
            .sessions
            .iter()
            .filter(|(session_id, _)| {
                snapshot
                    .session_hosts
                    .get(*session_id)
                    .is_some_and(|session_host| session_host == host_id)
            })
            .map(|(_, summary)| summary.clone())
            .collect(),
        picker_registries: snapshot
            .picker_registries
            .values()
            .filter(|registry| registry.host_id == host_id)
            .cloned()
            .collect(),
        workspace_snapshots: snapshot
            .workspace_snapshots
            .values()
            .filter(|workspace_snapshot| workspace_snapshot.host_id == host_id)
            .cloned()
            .collect(),
    }
}

async fn route_mobile_to_host(
    state: &AppState,
    connection_id: &str,
    host_id: &str,
    payload: RelayServerMessage,
) {
    if is_mobile_authorized_for_host(state, connection_id, host_id).await {
        route_to_host(state, host_id, payload).await;
    } else {
        reject_unpaired_mobile(state, connection_id, host_id).await;
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
        AgentKind, AgentPalEnvelope, ClientCommand, PairClaimRequest, PairCreateRequest,
        RelayClientMessage, RelayClientRole, SessionState,
    };

    fn test_state(require_pairing: bool) -> AppState {
        AppState {
            snapshot: Arc::new(RwLock::new(RelaySnapshot::default())),
            connections: Arc::new(RwLock::new(ConnectionRegistry::default())),
            store: Arc::new(MemoryPairingStore::default()),
            require_pairing,
        }
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

    fn session_started(host_id: &str, session_id: &str) -> RelayClientMessage {
        RelayClientMessage::SessionEvent {
            envelope: AgentPalEnvelope::new(
                host_id,
                Some(session_id.to_owned()),
                1,
                SessionEvent::SessionStarted {
                    summary: SessionSummary {
                        session_id: session_id.to_owned(),
                        agent_kind: AgentKind::Codex,
                        workspace: ".".to_owned(),
                        title: Some(session_id.to_owned()),
                        state: SessionState::Idle,
                        pending_approvals: 0,
                        updated_at: OffsetDateTime::now_utc(),
                    },
                },
            ),
        }
    }

    #[tokio::test]
    async fn cloud_pair_claim_binds_mobile_and_routes_commands() {
        let state = test_state(true);
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
    async fn claimed_device_token_authorizes_mobile_reconnect() {
        let state = test_state(true);
        let mut host_rx = register_client(&state, "host-conn").await;
        let mut mobile_rx = register_client(&state, "mobile-conn").await;
        let mut reconnect_rx = register_client(&state, "mobile-reconnect").await;

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
                    pair_id: Some("pair-reconnect".to_owned()),
                    pair_token: Some("secret-reconnect".to_owned()),
                    expires_in_seconds: Some(120),
                },
            },
            &state,
            "host-conn",
        )
        .await;
        assert!(matches!(
            host_rx.recv().await.expect("host receives pair-created"),
            RelayServerMessage::PairCreated { .. }
        ));

        handle_client_message(
            RelayClientMessage::PairClaim {
                request: PairClaimRequest {
                    pair_id: "pair-reconnect".to_owned(),
                    pair_token: "secret-reconnect".to_owned(),
                    mobile_client_id: "mobile-client".to_owned(),
                    device_id: Some("device-a".to_owned()),
                    device_name: Some("test phone".to_owned()),
                },
            },
            &state,
            "mobile-conn",
        )
        .await;
        let RelayServerMessage::PairClaimed { claim } =
            mobile_rx.recv().await.expect("mobile receives claim")
        else {
            panic!("expected pair-claimed for mobile");
        };
        assert!(matches!(
            host_rx.recv().await.expect("host receives claim"),
            RelayServerMessage::PairClaimed { .. }
        ));

        handle_client_message(
            RelayClientMessage::Register {
                role: RelayClientRole::Mobile,
                client_id: "mobile-client".to_owned(),
                host_id: Some("host-a".to_owned()),
                device_id: Some(claim.device_id.clone()),
                device_token: Some(claim.device_token.clone()),
            },
            &state,
            "mobile-reconnect",
        )
        .await;
        assert!(matches!(
            reconnect_rx
                .recv()
                .await
                .expect("mobile receives scoped snapshot"),
            RelayServerMessage::Snapshot { .. }
        ));
        handle_client_message(
            RelayClientMessage::ClientCommand {
                command: ClientCommand::input_submit(
                    "cmd-reconnect",
                    "host-a",
                    "agentpal-codex-local",
                    "after reconnect",
                ),
            },
            &state,
            "mobile-reconnect",
        )
        .await;
        let routed = host_rx
            .recv()
            .await
            .expect("host receives reconnect command");
        let RelayServerMessage::ClientCommand { command } = routed else {
            panic!("expected routed client-command");
        };
        assert_eq!(command.command_id, "cmd-reconnect");
        assert!(reconnect_rx.try_recv().is_err());
    }

    #[tokio::test]
    async fn authorized_mobile_receives_only_scoped_snapshot() {
        let state = test_state(true);
        let mut host_a_rx = register_client(&state, "host-a-conn").await;
        let mut host_b_rx = register_client(&state, "host-b-conn").await;
        let mut mobile_rx = register_client(&state, "mobile-conn").await;

        handle_client_message(
            RelayClientMessage::Register {
                role: RelayClientRole::Host,
                client_id: "host-a-client".to_owned(),
                host_id: Some("host-a".to_owned()),
                device_id: None,
                device_token: None,
            },
            &state,
            "host-a-conn",
        )
        .await;
        handle_client_message(
            RelayClientMessage::Register {
                role: RelayClientRole::Host,
                client_id: "host-b-client".to_owned(),
                host_id: Some("host-b".to_owned()),
                device_id: None,
                device_token: None,
            },
            &state,
            "host-b-conn",
        )
        .await;
        handle_client_message(
            RelayClientMessage::HostStatus {
                status: HostStatus::local_codex("host-a", "Host A", "."),
            },
            &state,
            "host-a-conn",
        )
        .await;
        handle_client_message(
            RelayClientMessage::HostStatus {
                status: HostStatus::local_codex("host-b", "Host B", "."),
            },
            &state,
            "host-b-conn",
        )
        .await;
        handle_client_message(
            session_started("host-a", "session-a"),
            &state,
            "host-a-conn",
        )
        .await;
        handle_client_message(
            session_started("host-b", "session-b"),
            &state,
            "host-b-conn",
        )
        .await;
        handle_client_message(
            RelayClientMessage::PairCreate {
                request: PairCreateRequest {
                    host_id: "host-a".to_owned(),
                    host_name: "Host A".to_owned(),
                    relay_url: "ws://127.0.0.1:8790/ws".to_owned(),
                    pair_id: Some("pair-a-scope".to_owned()),
                    pair_token: Some("secret-a-scope".to_owned()),
                    expires_in_seconds: Some(120),
                },
            },
            &state,
            "host-a-conn",
        )
        .await;
        assert!(matches!(
            host_a_rx
                .recv()
                .await
                .expect("host-a receives pair-created"),
            RelayServerMessage::PairCreated { .. }
        ));
        assert!(host_b_rx.try_recv().is_err());

        handle_client_message(
            RelayClientMessage::PairClaim {
                request: PairClaimRequest {
                    pair_id: "pair-a-scope".to_owned(),
                    pair_token: "secret-a-scope".to_owned(),
                    mobile_client_id: "mobile-client".to_owned(),
                    device_id: Some("device-a-scope".to_owned()),
                    device_name: None,
                },
            },
            &state,
            "mobile-conn",
        )
        .await;
        let RelayServerMessage::PairClaimed { claim } =
            mobile_rx.recv().await.expect("mobile receives claim")
        else {
            panic!("expected pair-claimed for mobile");
        };
        assert!(matches!(
            host_a_rx.recv().await.expect("host-a receives claim"),
            RelayServerMessage::PairClaimed { .. }
        ));
        handle_client_message(
            RelayClientMessage::Register {
                role: RelayClientRole::Mobile,
                client_id: "mobile-client".to_owned(),
                host_id: Some("host-a".to_owned()),
                device_id: Some(claim.device_id),
                device_token: Some(claim.device_token),
            },
            &state,
            "mobile-conn",
        )
        .await;
        let RelayServerMessage::Snapshot {
            hosts,
            sessions,
            picker_registries,
            workspace_snapshots,
        } = mobile_rx
            .recv()
            .await
            .expect("mobile receives scoped snapshot")
        else {
            panic!("expected scoped snapshot");
        };
        assert_eq!(
            hosts
                .iter()
                .map(|host| host.host_id.as_str())
                .collect::<Vec<_>>(),
            ["host-a"]
        );
        assert_eq!(
            sessions
                .iter()
                .map(|session| session.session_id.as_str())
                .collect::<Vec<_>>(),
            ["session-a"]
        );
        assert!(picker_registries.is_empty());
        assert!(workspace_snapshots.is_empty());
        assert!(host_b_rx.try_recv().is_err());
    }

    #[tokio::test]
    async fn duplicate_host_id_registration_is_rejected() {
        let state = test_state(true);
        let mut first_host_rx = register_client(&state, "host-conn-a").await;
        let mut second_host_rx = register_client(&state, "host-conn-b").await;

        handle_client_message(
            RelayClientMessage::Register {
                role: RelayClientRole::Host,
                client_id: "host-client-a".to_owned(),
                host_id: Some("host-a".to_owned()),
                device_id: None,
                device_token: None,
            },
            &state,
            "host-conn-a",
        )
        .await;
        handle_client_message(
            RelayClientMessage::Register {
                role: RelayClientRole::Host,
                client_id: "host-client-b".to_owned(),
                host_id: Some("host-a".to_owned()),
                device_id: None,
                device_token: None,
            },
            &state,
            "host-conn-b",
        )
        .await;

        assert!(matches!(
            second_host_rx
                .recv()
                .await
                .expect("duplicate host receives rejection"),
            RelayServerMessage::Error { .. }
        ));
        handle_client_message(
            RelayClientMessage::PairCreate {
                request: PairCreateRequest {
                    host_id: "host-a".to_owned(),
                    host_name: "Host A".to_owned(),
                    relay_url: "ws://127.0.0.1:8790/ws".to_owned(),
                    pair_id: Some("pair-original-host".to_owned()),
                    pair_token: Some("secret-original-host".to_owned()),
                    expires_in_seconds: Some(120),
                },
            },
            &state,
            "host-conn-a",
        )
        .await;
        assert!(matches!(
            first_host_rx
                .recv()
                .await
                .expect("original host can still create pair"),
            RelayServerMessage::PairCreated { .. }
        ));
    }

    #[tokio::test]
    async fn unpaired_mobile_cannot_read_history() {
        let state = test_state(true);
        let _host_rx = register_client(&state, "host-conn").await;
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
        handle_client_message(session_started("host-a", "session-a"), &state, "host-conn").await;
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
            RelayClientMessage::HistoryRequest {
                request: HistoryRequest {
                    request_id: "history-unpaired".to_owned(),
                    host_id: "host-a".to_owned(),
                    session_id: "session-a".to_owned(),
                    before_seq: None,
                    limit: 20,
                },
            },
            &state,
            "mobile-conn",
        )
        .await;

        assert!(matches!(
            mobile_rx
                .recv()
                .await
                .expect("mobile receives unpaired rejection"),
            RelayServerMessage::Error { .. }
        ));
        assert!(mobile_rx.try_recv().is_err());
    }

    #[tokio::test]
    async fn host_origin_messages_require_registered_host_connection() {
        let state = test_state(true);
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
            RelayClientMessage::HostStatus {
                status: HostStatus::local_codex("host-a", "spoofed", "."),
            },
            &state,
            "mobile-conn",
        )
        .await;
        handle_client_message(
            session_started("host-a", "spoofed-session"),
            &state,
            "mobile-conn",
        )
        .await;

        assert!(matches!(
            mobile_rx
                .recv()
                .await
                .expect("mobile receives host-status rejection"),
            RelayServerMessage::Error { .. }
        ));
        assert!(matches!(
            mobile_rx
                .recv()
                .await
                .expect("mobile receives session-event rejection"),
            RelayServerMessage::Error { .. }
        ));
        assert!(host_rx.try_recv().is_err());
        let RelayServerMessage::Snapshot {
            hosts, sessions, ..
        } = scoped_snapshot(&state, "host-a").await
        else {
            panic!("expected snapshot");
        };
        assert!(hosts.is_empty());
        assert!(sessions.is_empty());
    }

    #[tokio::test]
    async fn pair_claim_rejects_wrong_token_without_consuming_session() {
        let state = test_state(true);
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
                    pair_id: Some("pair-token".to_owned()),
                    pair_token: Some("secret-token".to_owned()),
                    expires_in_seconds: Some(120),
                },
            },
            &state,
            "host-conn",
        )
        .await;
        assert!(matches!(
            host_rx.recv().await.expect("host receives pair-created"),
            RelayServerMessage::PairCreated { .. }
        ));

        handle_client_message(
            RelayClientMessage::PairClaim {
                request: PairClaimRequest {
                    pair_id: "pair-token".to_owned(),
                    pair_token: "wrong-token".to_owned(),
                    mobile_client_id: "mobile-client".to_owned(),
                    device_id: None,
                    device_name: None,
                },
            },
            &state,
            "mobile-conn",
        )
        .await;
        assert!(matches!(
            mobile_rx.recv().await.expect("mobile receives rejection"),
            RelayServerMessage::Error { .. }
        ));

        handle_client_message(
            RelayClientMessage::PairClaim {
                request: PairClaimRequest {
                    pair_id: "pair-token".to_owned(),
                    pair_token: "secret-token".to_owned(),
                    mobile_client_id: "mobile-client".to_owned(),
                    device_id: None,
                    device_name: None,
                },
            },
            &state,
            "mobile-conn",
        )
        .await;
        assert!(matches!(
            mobile_rx.recv().await.expect("mobile receives claim"),
            RelayServerMessage::PairClaimed { .. }
        ));
    }

    #[tokio::test]
    async fn redis_pairing_store_claim_consumes_and_persists_device_binding() {
        let Ok(redis_url) = std::env::var("OAP_REDIS_TEST_URL") else {
            return;
        };
        let client = redis::Client::open(redis_url.as_str()).expect("redis url parses");
        let connection = client
            .get_connection_manager()
            .await
            .expect("redis test connection");
        let prefix = format!("agentpal:test:{}", Uuid::new_v4());
        let store = RedisPairingStore {
            connection,
            key_prefix: prefix,
        };
        let session = StoredPairSession {
            pair_id: "pair-redis".to_owned(),
            relay_url: "ws://127.0.0.1:8790/ws".to_owned(),
            host_id: "host-redis".to_owned(),
            host_name: "Redis Host".to_owned(),
            pair_token_hash: token_hash("secret-redis"),
            expires_at: Some(OffsetDateTime::now_utc() + TimeDuration::minutes(2)),
        };
        store
            .put_pair_session(session, Some(120))
            .await
            .expect("put redis pair session");

        let wrong = store
            .claim_pair_session("pair-redis", "wrong", OffsetDateTime::now_utc())
            .await
            .expect("wrong token query succeeds");
        assert!(matches!(wrong, PairClaimOutcome::TokenRejected));

        let claimed = store
            .claim_pair_session("pair-redis", "secret-redis", OffsetDateTime::now_utc())
            .await
            .expect("correct token query succeeds");
        assert!(matches!(claimed, PairClaimOutcome::Claimed(_)));

        let consumed = store
            .claim_pair_session("pair-redis", "secret-redis", OffsetDateTime::now_utc())
            .await
            .expect("consumed token query succeeds");
        assert!(matches!(consumed, PairClaimOutcome::NotFound));

        let device_token_hash = token_hash("device-secret");
        store
            .put_device_binding(
                device_token_hash.clone(),
                DeviceBinding {
                    host_id: "host-redis".to_owned(),
                    device_id: "device-redis".to_owned(),
                },
            )
            .await
            .expect("put redis device binding");
        let binding = store
            .get_device_binding(&device_token_hash)
            .await
            .expect("get redis device binding")
            .expect("redis device binding exists");
        assert_eq!(binding.host_id, "host-redis");
        assert_eq!(binding.device_id, "device-redis");
        store
            .mark_cloud_pair_host("host-redis")
            .await
            .expect("mark redis cloud host");
        assert!(
            store
                .is_cloud_pair_host("host-redis")
                .await
                .expect("check redis cloud host")
        );

        let mut cleanup = store.connection.clone();
        let _: usize = redis::cmd("DEL")
            .arg(store.device_key(&device_token_hash))
            .arg(store.cloud_host_key("host-redis"))
            .query_async(&mut cleanup)
            .await
            .expect("cleanup redis test keys");
    }

    #[tokio::test]
    async fn pair_create_requires_registered_host_connection() {
        let state = test_state(true);
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
        assert!(
            state
                .store
                .claim_pair_session("pair-a", "secret-a", OffsetDateTime::now_utc())
                .await
                .is_ok_and(|outcome| matches!(outcome, PairClaimOutcome::NotFound))
        );
    }
}
