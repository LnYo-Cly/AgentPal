use std::{net::SocketAddr, sync::Arc};

use agentpal_protocol::AgentPalEnvelope;
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
use serde_json::{Value, json};
use tokio::sync::broadcast;
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
    tx: broadcast::Sender<Value>,
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
    let state = Arc::new(AppState { tx });

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

    let outbound = tokio::spawn(async move {
        while let Ok(payload) = rx.recv().await {
            let text = match serde_json::to_string(&payload) {
                Ok(text) => text,
                Err(error) => {
                    warn!(%error, "failed to serialize relay payload");
                    continue;
                }
            };
            if sender.send(Message::Text(text.into())).await.is_err() {
                break;
            }
        }
    });

    while let Some(message) = receiver.next().await {
        match message {
            Ok(Message::Text(text)) => {
                let incoming: Value = serde_json::from_str(&text).unwrap_or_else(|_| {
                    json!({
                        "type": "relay.rawText",
                        "text": text.to_string()
                    })
                });
                let envelope = AgentPalEnvelope::new(
                    "local-relay",
                    None,
                    0,
                    json!({
                        "type": "relay.echo",
                        "payload": incoming
                    }),
                );
                if state.tx.send(json!(envelope)).is_err() {
                    warn!("relay had no active receivers for echo");
                }
            }
            Ok(Message::Close(_)) => break,
            Ok(Message::Binary(bytes)) => {
                let envelope = AgentPalEnvelope::new(
                    "local-relay",
                    None,
                    0,
                    json!({
                        "type": "relay.binary",
                        "bytes": bytes.len()
                    }),
                );
                let _ = state.tx.send(json!(envelope));
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
