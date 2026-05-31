use std::{
    env,
    path::PathBuf,
    process::Stdio,
    sync::Arc,
    time::{Duration, Instant},
};

use agentpal_protocol::{
    AgentKind, AgentPalEnvelope, ClientCommand, ClientCommandKind, HostStatus, RelayClientMessage,
    RelayClientRole, RelayServerMessage, SessionEvent, SessionState, SessionSummary,
};
use clap::Args;
use futures_util::{SinkExt, StreamExt, stream::SplitSink};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use time::OffsetDateTime;
use tokio::{
    net::TcpStream,
    process::{Child, Command},
    sync::{Mutex, mpsc},
    time::{sleep, timeout},
};
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream, connect_async,
    tungstenite::{Error as WsError, Message},
};
use uuid::Uuid;

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

#[derive(Debug, Args)]
pub struct CodexConnectArgs {
    #[arg(long, default_value = ".")]
    pub workspace: PathBuf,

    #[arg(long, default_value = "ws://127.0.0.1:8790/ws")]
    pub relay_url: String,

    #[arg(long, default_value = "agentpal-local-host")]
    pub host_id: String,

    #[arg(long)]
    pub host_name: Option<String>,

    #[arg(long, default_value = "agentpal-codex-local")]
    pub session_id: String,

    #[arg(long, default_value = "127.0.0.1")]
    pub codex_host: String,

    #[arg(long, default_value_t = 37941)]
    pub codex_port: u16,

    #[arg(long, default_value = "/")]
    pub codex_path: String,

    #[arg(long, default_value = "codex")]
    pub codex_bin: String,

    #[arg(long)]
    pub once_prompt: Option<String>,

    #[arg(long, default_value_t = 0)]
    pub timeout_seconds: u64,
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

pub async fn connect(args: CodexConnectArgs) -> anyhow::Result<()> {
    let workspace = normalize_workspace(args.workspace.clone())?;
    let workspace_text = workspace.display().to_string();
    let host_name = args.host_name.clone().unwrap_or_else(default_host_name);
    let codex_bin = resolve_command(&args.codex_bin)?;
    let codex_version = codex_version(&codex_bin).await.ok();
    let codex_listen_url = format!("ws://{}:{}", args.codex_host, args.codex_port);
    let codex_websocket_url = websocket_url(&args.codex_host, args.codex_port, &args.codex_path);

    let mut child = Command::new(&codex_bin)
        .arg("app-server")
        .arg("--listen")
        .arg(&codex_listen_url)
        .current_dir(&workspace)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()?;

    let result = run_connect_loop(
        &args,
        &workspace_text,
        &host_name,
        codex_version,
        &codex_websocket_url,
    )
    .await;

    stop_child(&mut child).await;
    result
}

async fn run_connect_loop(
    args: &CodexConnectArgs,
    workspace: &str,
    host_name: &str,
    codex_version: Option<String>,
    codex_websocket_url: &str,
) -> anyhow::Result<()> {
    tokio::time::sleep(Duration::from_millis(600)).await;
    let (relay_socket, _) = connect_async(args.relay_url.as_str()).await?;
    let (codex_socket, _) = connect_async(codex_websocket_url).await?;
    let (relay_write, mut relay_read) = relay_socket.split();
    let (codex_write, codex_read) = codex_socket.split();
    let relay_write = Arc::new(Mutex::new(relay_write));
    let codex_write = Arc::new(Mutex::new(codex_write));
    let (codex_tx, mut codex_rx) = mpsc::unbounded_channel::<Value>();
    let host_id = args.host_id.clone();
    let session_id = args.session_id.clone();
    let workspace_owned = workspace.to_owned();
    let thread_id = Arc::new(Mutex::new(None::<String>));
    let seq = Arc::new(Mutex::new(0_u64));

    relay_send(
        &relay_write,
        &RelayClientMessage::Register {
            role: RelayClientRole::Host,
            client_id: format!("{}-host", args.host_id),
            host_id: Some(args.host_id.clone()),
        },
    )
    .await?;
    publish_host_status(&relay_write, &host_id, host_name, workspace, 1).await?;
    publish_session_event(
        &relay_write,
        &host_id,
        &session_id,
        &seq,
        SessionEvent::SessionStarted {
            summary: SessionSummary {
                session_id: session_id.clone(),
                agent_kind: AgentKind::Codex,
                workspace: workspace_owned.clone(),
                title: Some("Codex local session".to_owned()),
                state: SessionState::Idle,
                pending_approvals: 0,
                updated_at: OffsetDateTime::now_utc(),
            },
        },
    )
    .await?;
    publish_session_event(
        &relay_write,
        &host_id,
        &session_id,
        &seq,
        SessionEvent::StateChanged {
            state: SessionState::Idle,
        },
    )
    .await?;

    send_codex_initialize(&codex_write).await?;

    let relay_writer_for_codex = Arc::clone(&relay_write);
    let host_for_codex = host_id.clone();
    let session_for_codex = session_id.clone();
    let seq_for_codex = Arc::clone(&seq);
    let thread_for_codex = Arc::clone(&thread_id);
    let workspace_for_codex = workspace_owned.clone();
    tokio::spawn(async move {
        read_codex_events(
            codex_read,
            codex_tx,
            relay_writer_for_codex,
            host_for_codex,
            session_for_codex,
            workspace_for_codex,
            seq_for_codex,
            thread_for_codex,
        )
        .await;
    });

    let relay_writer_for_commands = Arc::clone(&relay_write);
    let codex_writer_for_commands = Arc::clone(&codex_write);
    let host_for_commands = host_id.clone();
    let session_for_commands = session_id.clone();
    let seq_for_commands = Arc::clone(&seq);
    let thread_for_commands = Arc::clone(&thread_id);
    let workspace_for_commands = workspace_owned.clone();
    let command_task = tokio::spawn(async move {
        while let Some(message) = relay_read.next().await {
            let message = match message {
                Ok(Message::Text(text)) => text,
                Ok(Message::Close(_)) => break,
                Ok(_) => continue,
                Err(_) => break,
            };
            let Ok(server_message) = serde_json::from_str::<RelayServerMessage>(&message) else {
                continue;
            };
            if let RelayServerMessage::ClientCommand { command } = server_message {
                if command.host_id != host_for_commands {
                    continue;
                }
                if let Err(error) = handle_client_command(
                    command,
                    &relay_writer_for_commands,
                    &codex_writer_for_commands,
                    &host_for_commands,
                    &session_for_commands,
                    &workspace_for_commands,
                    &seq_for_commands,
                    &thread_for_commands,
                )
                .await
                {
                    let _ = publish_session_event(
                        &relay_writer_for_commands,
                        &host_for_commands,
                        &session_for_commands,
                        &seq_for_commands,
                        SessionEvent::Error {
                            message: error.to_string(),
                            phase: Some("client-command".to_owned()),
                        },
                    )
                    .await;
                }
            }
        }
    });

    if let Some(prompt) = &args.once_prompt {
        let command = ClientCommand::input_submit(
            format!("host-once-{}", Uuid::new_v4()),
            args.host_id.clone(),
            args.session_id.clone(),
            prompt.clone(),
        );
        handle_client_command(
            command,
            &relay_write,
            &codex_write,
            &host_id,
            &session_id,
            workspace,
            &seq,
            &thread_id,
        )
        .await?;
    }

    let loop_future = async {
        while let Some(event) = codex_rx.recv().await {
            if args.once_prompt.is_some()
                && event.get("method").and_then(Value::as_str) == Some("turn/completed")
            {
                break;
            }
        }
    };
    let loop_result = if args.timeout_seconds > 0 {
        timeout(Duration::from_secs(args.timeout_seconds), loop_future)
            .await
            .map(|_| ())
            .map_err(anyhow::Error::from)
    } else {
        tokio::select! {
            _ = loop_future => Ok(()),
            result = tokio::signal::ctrl_c() => result.map_err(anyhow::Error::from),
        }
    };
    command_task.abort();

    publish_session_event(
        &relay_write,
        &host_id,
        &session_id,
        &seq,
        SessionEvent::StateChanged {
            state: SessionState::Offline,
        },
    )
    .await?;
    publish_host_status(&relay_write, &host_id, host_name, workspace, 0).await?;

    if args.once_prompt.is_some() {
        loop_result?;
    } else if args.timeout_seconds > 0 {
        loop_result?;
    }

    if let Some(version) = codex_version {
        eprintln!("Codex connected through AgentPal Host ({version})");
    }
    Ok(())
}

async fn handle_client_command(
    command: ClientCommand,
    relay_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    codex_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    host_id: &str,
    session_id: &str,
    workspace: &str,
    seq: &Arc<Mutex<u64>>,
    thread_id: &Arc<Mutex<Option<String>>>,
) -> anyhow::Result<()> {
    if command.kind != ClientCommandKind::InputSubmit {
        return Ok(());
    }
    let text = command
        .payload
        .get("text")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_owned();
    if text.is_empty() {
        return Ok(());
    }

    publish_session_event(
        relay_write,
        host_id,
        session_id,
        seq,
        SessionEvent::UserMessage { text: text.clone() },
    )
    .await?;
    publish_session_event(
        relay_write,
        host_id,
        session_id,
        seq,
        SessionEvent::StateChanged {
            state: SessionState::Running,
        },
    )
    .await?;

    let current_thread = thread_id.lock().await.clone();
    let thread = match current_thread {
        Some(thread) => thread,
        None => {
            let request_id = next_request_id(seq).await;
            let thread_start = json!({
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "thread/start",
                "params": {
                    "cwd": workspace,
                    "runtimeWorkspaceRoots": [workspace],
                    "approvalPolicy": "on-request",
                    "sandbox": "workspace-write",
                    "threadSource": "user",
                    "baseInstructions": "You are controlled by AgentPal mobile UI. Keep mobile-visible updates concise and structured."
                }
            });
            codex_send(codex_write, &thread_start).await?;
            wait_for_thread_id(thread_id).await?
        }
    };

    let request_id = next_request_id(seq).await;
    let turn_start = json!({
        "jsonrpc": "2.0",
        "id": request_id,
        "method": "turn/start",
        "params": {
            "threadId": thread,
            "input": [{
                "type": "text",
                "text": text,
                "text_elements": []
            }],
            "cwd": workspace,
            "runtimeWorkspaceRoots": [workspace],
            "approvalPolicy": "on-request"
        }
    });
    codex_send(codex_write, &turn_start).await?;
    Ok(())
}

async fn read_codex_events(
    mut codex_read: futures_util::stream::SplitStream<WebSocketStream<MaybeTlsStream<TcpStream>>>,
    codex_tx: mpsc::UnboundedSender<Value>,
    relay_write: Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    host_id: String,
    session_id: String,
    workspace: String,
    seq: Arc<Mutex<u64>>,
    thread_id: Arc<Mutex<Option<String>>>,
) {
    while let Some(message) = codex_read.next().await {
        let Ok(Message::Text(text)) = message else {
            continue;
        };
        let Ok(value) = serde_json::from_str::<Value>(&text) else {
            continue;
        };
        let _ = codex_tx.send(value.clone());
        if let Some(error) = value.get("error") {
            let _ = publish_session_event(
                &relay_write,
                &host_id,
                &session_id,
                &seq,
                SessionEvent::Error {
                    message: error.to_string(),
                    phase: Some("codex-response".to_owned()),
                },
            )
            .await;
        }
        if let Some(id) =
            extract_thread_id(&value).or_else(|| extract_thread_id_from_events(&[value.clone()]))
        {
            *thread_id.lock().await = Some(id);
        }
        if let Some(event) = codex_event_to_session_event(&value, &session_id, &workspace) {
            let _ = publish_session_event(&relay_write, &host_id, &session_id, &seq, event).await;
        }
    }
}

fn codex_event_to_session_event(
    value: &Value,
    session_id: &str,
    workspace_fallback: &str,
) -> Option<SessionEvent> {
    let method = value.get("method").and_then(Value::as_str)?;
    match method {
        "thread/started" => {
            let thread = value.pointer("/params/thread")?;
            let workspace = thread
                .get("cwd")
                .and_then(Value::as_str)
                .unwrap_or(workspace_fallback)
                .to_owned();
            Some(SessionEvent::SessionStarted {
                summary: SessionSummary {
                    session_id: session_id.to_owned(),
                    agent_kind: AgentKind::Codex,
                    workspace,
                    title: thread
                        .get("name")
                        .and_then(Value::as_str)
                        .map(ToOwned::to_owned),
                    state: SessionState::Idle,
                    pending_approvals: 0,
                    updated_at: OffsetDateTime::now_utc(),
                },
            })
        }
        "turn/started" => Some(SessionEvent::StateChanged {
            state: SessionState::Running,
        }),
        "turn/completed" => {
            let status = value
                .pointer("/params/turn/status")
                .and_then(Value::as_str)
                .unwrap_or("completed");
            let state = match status {
                "failed" => SessionState::Failed,
                "interrupted" => SessionState::Idle,
                _ => SessionState::Completed,
            };
            Some(SessionEvent::StateChanged { state })
        }
        "item/agentMessage/delta" => value
            .pointer("/params/delta")
            .and_then(Value::as_str)
            .filter(|delta| !delta.trim().is_empty())
            .map(|delta| SessionEvent::AgentMessage {
                text: delta.to_owned(),
            }),
        "turn/diff/updated" => {
            let diff = value
                .pointer("/params/diff")
                .and_then(Value::as_str)
                .unwrap_or("");
            let (files_changed, additions, deletions) = summarize_diff(diff);
            Some(SessionEvent::DiffUpdated {
                summary: agentpal_protocol::DiffSummary {
                    files_changed,
                    additions,
                    deletions,
                    files: Vec::new(),
                },
            })
        }
        "item/started" => value
            .pointer("/params/item/type")
            .and_then(Value::as_str)
            .map(|kind| SessionEvent::ToolStarted {
                name: kind.to_owned(),
                input: value
                    .pointer("/params/item")
                    .cloned()
                    .unwrap_or(Value::Null),
            }),
        "item/completed" => {
            let item = value.pointer("/params/item")?;
            let kind = item.get("type").and_then(Value::as_str).unwrap_or("item");
            Some(SessionEvent::ToolFinished {
                name: kind.to_owned(),
                ok: !matches!(
                    item.get("status").and_then(Value::as_str),
                    Some("failed" | "error")
                ),
                summary: summarize_item(item),
            })
        }
        "error" => Some(SessionEvent::Error {
            message: value
                .pointer("/params/error/message")
                .or_else(|| value.pointer("/params/error"))
                .map(|v| {
                    v.as_str()
                        .map(ToOwned::to_owned)
                        .unwrap_or_else(|| v.to_string())
                })
                .unwrap_or_else(|| "Codex app-server error".to_owned()),
            phase: Some("codex".to_owned()),
        }),
        _ => None,
    }
}

fn summarize_diff(diff: &str) -> (u32, u32, u32) {
    let mut files = 0;
    let mut additions = 0;
    let mut deletions = 0;
    for line in diff.lines() {
        if line.starts_with("diff --git ") {
            files += 1;
        } else if line.starts_with('+') && !line.starts_with("+++") {
            additions += 1;
        } else if line.starts_with('-') && !line.starts_with("---") {
            deletions += 1;
        }
    }
    (files, additions, deletions)
}

fn summarize_item(item: &Value) -> String {
    let kind = item.get("type").and_then(Value::as_str).unwrap_or("item");
    match kind {
        "commandExecution" => {
            let command = item
                .get("command")
                .and_then(Value::as_str)
                .unwrap_or("command");
            let status = item
                .get("status")
                .and_then(Value::as_str)
                .unwrap_or("completed");
            format!("{command} ({status})")
        }
        "fileChange" => {
            let count = item
                .get("changes")
                .and_then(Value::as_array)
                .map(|items| items.len())
                .unwrap_or(0);
            format!("{count} file changes")
        }
        _ => kind.to_owned(),
    }
}

async fn wait_for_thread_id(thread_id: &Arc<Mutex<Option<String>>>) -> anyhow::Result<String> {
    let deadline = Instant::now() + Duration::from_secs(20);
    loop {
        if let Some(thread) = thread_id.lock().await.clone() {
            return Ok(thread);
        }
        if Instant::now() > deadline {
            anyhow::bail!("timed out waiting for codex thread id");
        }
        sleep(Duration::from_millis(100)).await;
    }
}

async fn publish_host_status(
    relay_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    host_id: &str,
    host_name: &str,
    workspace: &str,
    active_sessions: u32,
) -> Result<(), WsError> {
    let mut status = HostStatus::local_codex(host_id, host_name, workspace);
    status.active_sessions = active_sessions;
    relay_send(relay_write, &RelayClientMessage::HostStatus { status }).await
}

async fn publish_session_event(
    relay_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    host_id: &str,
    session_id: &str,
    seq: &Arc<Mutex<u64>>,
    payload: SessionEvent,
) -> Result<(), WsError> {
    let next = next_seq(seq).await;
    let envelope = AgentPalEnvelope::new(host_id, Some(session_id.to_owned()), next, payload);
    relay_send(relay_write, &RelayClientMessage::SessionEvent { envelope }).await
}

async fn relay_send(
    relay_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    payload: &RelayClientMessage,
) -> Result<(), WsError> {
    let text = serde_json::to_string(payload).expect("relay message serializes");
    relay_write
        .lock()
        .await
        .send(Message::Text(text.into()))
        .await
}

async fn codex_send(
    codex_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    payload: &Value,
) -> Result<(), WsError> {
    codex_write
        .lock()
        .await
        .send(Message::Text(payload.to_string().into()))
        .await
}

async fn send_codex_initialize(
    codex_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
) -> Result<(), WsError> {
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
    codex_send(codex_write, &initialize).await
}

async fn next_seq(seq: &Arc<Mutex<u64>>) -> u64 {
    let mut seq = seq.lock().await;
    *seq += 1;
    *seq
}

async fn next_request_id(seq: &Arc<Mutex<u64>>) -> u64 {
    1_000 + next_seq(seq).await
}

async fn stop_child(child: &mut Child) {
    let _ = child.start_kill();
    let _ = timeout(Duration::from_secs(2), child.wait()).await;
}

fn default_host_name() -> String {
    env::var("COMPUTERNAME")
        .or_else(|_| env::var("HOSTNAME"))
        .unwrap_or_else(|_| "AgentPal Host".to_owned())
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
