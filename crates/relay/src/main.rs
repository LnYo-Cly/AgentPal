use std::{collections::HashMap, net::SocketAddr, sync::Arc};

use agentpal_protocol::{
    HostStatus, RelayClientMessage, RelayServerMessage, SessionEvent, SessionSummary,
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
use tokio::sync::{RwLock, broadcast};
use tracing::{info, warn};

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
}

#[derive(Default)]
struct RelaySnapshot {
    hosts: HashMap<String, HostStatus>,
    sessions: HashMap<String, SessionSummary>,
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

    let snapshot = {
        let snapshot = state.snapshot.read().await;
        RelayServerMessage::Snapshot {
            hosts: snapshot.hosts.values().cloned().collect(),
            sessions: snapshot.sessions.values().cloned().collect(),
        }
    };
    if send_json(&mut sender, &snapshot).await.is_err() {
        return;
    }

    let outbound = tokio::spawn(async move {
        while let Ok(payload) = rx.recv().await {
            if send_json(&mut sender, &payload).await.is_err() {
                break;
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
                handle_client_message(incoming, &state).await;
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
}

async fn handle_client_message(message: RelayClientMessage, state: &AppState) {
    match message {
        RelayClientMessage::Register {
            role,
            client_id,
            host_id,
        } => {
            let label = host_id.unwrap_or(client_id);
            let _ = state.tx.send(RelayServerMessage::RelayNotice {
                message: format!("{role:?} registered as {label}"),
            });
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
            if let SessionEvent::SessionStarted { summary } = &envelope.payload {
                state
                    .snapshot
                    .write()
                    .await
                    .sessions
                    .insert(summary.session_id.clone(), summary.clone());
            }
            let _ = state.tx.send(RelayServerMessage::SessionEvent { envelope });
        }
        RelayClientMessage::ClientCommand { command } => {
            let _ = state.tx.send(RelayServerMessage::ClientCommand { command });
        }
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
