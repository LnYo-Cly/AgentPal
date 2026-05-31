use std::{
    env,
    path::PathBuf,
    process::Stdio,
    time::{Duration, Instant},
};

use clap::Args;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::{process::Command, time::timeout};
use tokio_tungstenite::{connect_async, tungstenite::Message};

use crate::normalize_workspace;

#[derive(Debug, Args)]
pub struct CodexProbeArgs {
    #[arg(long, default_value = ".")]
    pub workspace: PathBuf,

    #[arg(long)]
    pub prompt: Option<String>,

    #[arg(long, default_value = "127.0.0.1")]
    pub host: String,

    #[arg(long, default_value_t = 37941)]
    pub port: u16,

    #[arg(long, default_value = "/")]
    pub path: String,

    #[arg(long, default_value = "codex")]
    pub codex_bin: String,

    #[arg(long, default_value_t = 10)]
    pub timeout_seconds: u64,

    #[arg(long, default_value_t = false)]
    pub start_turn: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexProbeReport {
    pub ok: bool,
    pub phase: ProbePhase,
    pub codex_bin: String,
    pub codex_version: Option<String>,
    pub workspace: String,
    pub listen_url: String,
    pub websocket_url: String,
    pub elapsed_ms: u128,
    pub initialize_response: Option<Value>,
    pub thread_id: Option<String>,
    pub events: Vec<Value>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProbePhase {
    ResolveWorkspace,
    ResolveCodexBinary,
    CodexVersion,
    SpawnAppServer,
    WebsocketConnect,
    Initialize,
    ThreadStart,
    TurnStart,
    Completed,
}

pub async fn probe(args: CodexProbeArgs) -> CodexProbeReport {
    let started = Instant::now();
    let timeout_duration = Duration::from_secs(args.timeout_seconds);
    let mut report = CodexProbeReport {
        ok: false,
        phase: ProbePhase::ResolveWorkspace,
        codex_bin: args.codex_bin.clone(),
        codex_version: None,
        workspace: String::new(),
        listen_url: format!("ws://{}:{}", args.host, args.port),
        websocket_url: websocket_url(&args.host, args.port, &args.path),
        elapsed_ms: 0,
        initialize_response: None,
        thread_id: None,
        events: Vec::new(),
        error: None,
    };

    let workspace = match normalize_workspace(args.workspace.clone()) {
        Ok(path) => path,
        Err(error) => return fail(report, started, ProbePhase::ResolveWorkspace, error),
    };
    report.workspace = workspace.display().to_string();

    report.phase = ProbePhase::ResolveCodexBinary;
    let codex_bin = match resolve_command(&args.codex_bin) {
        Ok(path) => path,
        Err(error) => return fail(report, started, ProbePhase::ResolveCodexBinary, error),
    };
    report.codex_bin = codex_bin.display().to_string();

    report.phase = ProbePhase::CodexVersion;
    report.codex_version = codex_version(&codex_bin).await.ok();

    report.phase = ProbePhase::SpawnAppServer;
    let mut child = match Command::new(&codex_bin)
        .arg("app-server")
        .arg("--listen")
        .arg(&report.listen_url)
        .current_dir(&workspace)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(error) => return fail(report, started, ProbePhase::SpawnAppServer, error),
    };

    let connect_result = async {
        report.phase = ProbePhase::WebsocketConnect;
        tokio::time::sleep(Duration::from_millis(600)).await;
        let (mut socket, _) = connect_async(report.websocket_url.as_str()).await?;

        report.phase = ProbePhase::Initialize;
        let initialize = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "clientInfo": {
                    "name": "agentpal-host",
                    "title": "AgentPal Host",
                    "version": env!("CARGO_PKG_VERSION")
                },
                "capabilities": {
                    "experimentalApi": true,
                    "requestAttestation": false
                }
            }
        });
        socket
            .send(Message::Text(initialize.to_string().into()))
            .await?;
        let init_response = read_until_response(&mut socket, 1, &mut report.events).await?;
        report.initialize_response = Some(init_response);

        report.phase = ProbePhase::ThreadStart;
        let thread_start = json!({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "thread/start",
            "params": {
                "cwd": report.workspace,
                "runtimeWorkspaceRoots": [report.workspace],
                "approvalPolicy": "on-request",
                "sandbox": "workspace-write",
                "threadSource": "user",
                "baseInstructions": "You are running under AgentPal probe. Keep the response short."
            }
        });
        socket
            .send(Message::Text(thread_start.to_string().into()))
            .await?;
        let thread_response = read_until_response(&mut socket, 2, &mut report.events).await?;
        report.thread_id = extract_thread_id(&thread_response)
            .or_else(|| extract_thread_id_from_events(&report.events));

        if args.start_turn {
            report.phase = ProbePhase::TurnStart;
            let thread_id = report.thread_id.clone().ok_or_else(|| {
                anyhow::anyhow!("thread/start response did not include a thread id")
            })?;
            let prompt = args
                .prompt
                .as_deref()
                .unwrap_or("AgentPal probe: reply with ok.");
            let turn_start = json!({
                "jsonrpc": "2.0",
                "id": 3,
                "method": "turn/start",
                "params": {
                    "threadId": thread_id,
                    "input": [{
                        "type": "text",
                        "text": prompt,
                        "text_elements": []
                    }],
                    "cwd": report.workspace,
                    "runtimeWorkspaceRoots": [report.workspace],
                    "approvalPolicy": "on-request"
                }
            });
            socket
                .send(Message::Text(turn_start.to_string().into()))
                .await?;
            let _ = read_until_response(&mut socket, 3, &mut report.events).await?;
        }

        anyhow::Ok(())
    };

    let result = timeout(timeout_duration, connect_result).await;

    if let Err(error) = child.start_kill() {
        report.events.push(json!({
            "type": "agentpal.kill-warning",
            "message": error.to_string()
        }));
    }
    let _ = timeout(Duration::from_secs(2), child.wait()).await;

    match result {
        Ok(Ok(())) => {
            report.ok = true;
            report.phase = ProbePhase::Completed;
            report.elapsed_ms = started.elapsed().as_millis();
            report
        }
        Ok(Err(error)) => {
            let phase = report.phase;
            fail(report, started, phase, error)
        }
        Err(error) => {
            let phase = report.phase;
            fail(report, started, phase, error)
        }
    }
}

async fn codex_version(codex_bin: &PathBuf) -> anyhow::Result<String> {
    let output = Command::new(codex_bin).arg("--version").output().await?;
    let text = if output.stdout.is_empty() {
        String::from_utf8_lossy(&output.stderr).trim().to_owned()
    } else {
        String::from_utf8_lossy(&output.stdout).trim().to_owned()
    };
    Ok(text)
}

fn resolve_command(command: &str) -> anyhow::Result<PathBuf> {
    let input = PathBuf::from(command);
    if input.components().count() > 1 || input.is_absolute() {
        if input.exists() {
            return Ok(input);
        }
        anyhow::bail!("command path does not exist: {}", input.display());
    }

    let path_var = env::var_os("PATH").ok_or_else(|| anyhow::anyhow!("PATH is not set"))?;
    let mut extensions = vec![String::new()];
    if cfg!(windows) {
        let pathext = env::var("PATHEXT").unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".to_owned());
        extensions = pathext
            .split(';')
            .filter(|part| !part.is_empty())
            .map(|part| part.to_ascii_lowercase())
            .collect();
        if PathBuf::from(command).extension().is_some() {
            extensions = vec![String::new()];
        } else {
            extensions.push(String::new());
        }
    }

    for dir in env::split_paths(&path_var) {
        for ext in &extensions {
            let candidate = dir.join(format!("{command}{ext}"));
            if candidate.is_file() {
                return Ok(candidate);
            }
        }
    }

    anyhow::bail!("program not found on PATH: {command}");
}

fn websocket_url(host: &str, port: u16, path: &str) -> String {
    let path = if path.starts_with('/') {
        path.to_owned()
    } else {
        format!("/{path}")
    };
    format!("ws://{host}:{port}{path}")
}

async fn read_until_response<S>(
    socket: &mut tokio_tungstenite::WebSocketStream<S>,
    id: u64,
    events: &mut Vec<Value>,
) -> anyhow::Result<Value>
where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin,
{
    while let Some(message) = socket.next().await {
        let message = message?;
        match message {
            Message::Text(text) => {
                let value: Value = serde_json::from_str(&text)?;
                if value.get("id").and_then(Value::as_u64) == Some(id) {
                    return Ok(value);
                }
                events.push(value);
            }
            Message::Binary(bytes) => {
                events.push(json!({
                    "type": "agentpal.binary-message",
                    "bytes": bytes.len()
                }));
            }
            Message::Close(frame) => {
                anyhow::bail!("websocket closed before response {id}: {frame:?}");
            }
            Message::Ping(_) | Message::Pong(_) | Message::Frame(_) => {}
        }
    }
    anyhow::bail!("websocket ended before response {id}");
}

fn extract_thread_id(response: &Value) -> Option<String> {
    response
        .pointer("/result/thread/id")
        .or_else(|| response.pointer("/result/thread/threadId"))
        .or_else(|| response.pointer("/result/id"))
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
}

fn extract_thread_id_from_events(events: &[Value]) -> Option<String> {
    events.iter().find_map(|event| {
        if event.get("method").and_then(Value::as_str) != Some("thread/started") {
            return None;
        }
        event
            .pointer("/params/thread/id")
            .or_else(|| event.pointer("/params/thread/threadId"))
            .and_then(Value::as_str)
            .map(ToOwned::to_owned)
    })
}

fn fail<E>(
    mut report: CodexProbeReport,
    started: Instant,
    phase: ProbePhase,
    error: E,
) -> CodexProbeReport
where
    E: std::fmt::Display,
{
    report.ok = false;
    report.phase = phase;
    report.elapsed_ms = started.elapsed().as_millis();
    report.error = Some(error.to_string());
    report
}
