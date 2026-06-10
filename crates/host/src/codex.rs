use std::{
    collections::{HashMap, HashSet},
    env,
    path::{Path, PathBuf},
    process::Stdio,
    sync::Arc,
    time::{Duration, Instant},
};

use agentpal_protocol::{
    AgentKind, AgentPalEnvelope, ClientCommand, ClientCommandKind, DiffFileSummary, FilePreview,
    FilePreviewRequest, HistoryRequest, HostStatus, PairCreateRequest, PairingPayload,
    PickerExecuteMode, PickerItemKind, PickerRegistry, PickerRegistryItem, PickerTrigger,
    ProjectEntryKind, ProjectTreeEntry, RelayClientMessage, RelayClientRole, RelayServerMessage,
    RiskLevel, SessionEvent, SessionState, SessionSummary, WorkspaceSnapshot, WorktreeSummary,
};
use clap::Args;
use futures_util::{SinkExt, StreamExt, stream::SplitSink};
use local_ip_address::local_ip;
use qrcode::{QrCode, render::unicode};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use time::{Duration as TimeDuration, OffsetDateTime, format_description::well_known::Rfc3339};
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

const DEFAULT_PUBLIC_RELAY_URL: &str = "wss://openagentpal-production.up.railway.app/ws";

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

    #[arg(long, default_value = DEFAULT_PUBLIC_RELAY_URL)]
    pub relay_url: String,

    #[arg(long)]
    pub host_id: Option<String>,

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

    #[arg(long, default_value_t = false)]
    pub create_pair: bool,

    #[arg(long, default_value_t = 10)]
    pub pair_expires_minutes: u64,

    #[arg(long, default_value_t = false)]
    pub no_qr: bool,
}

#[derive(Debug, Args)]
pub struct CodexPairArgs {
    #[arg(long)]
    pub host_id: Option<String>,

    #[arg(long)]
    pub host_name: Option<String>,

    #[arg(long)]
    pub relay_url: Option<String>,

    #[arg(long, default_value_t = 8790)]
    pub relay_port: u16,

    #[arg(long, default_value = "/ws")]
    pub relay_path: String,

    #[arg(long, default_value_t = 10)]
    pub expires_minutes: u64,

    #[arg(long, default_value_t = false)]
    pub no_qr: bool,
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

type ThreadMap = Arc<Mutex<HashMap<String, String>>>;
type PendingThreadStarts = Arc<Mutex<HashMap<u64, String>>>;
type PendingThreadLoads = Arc<Mutex<HashMap<u64, String>>>;
type PickerItems = Arc<Mutex<Vec<PickerRegistryItem>>>;

pub fn pair(args: CodexPairArgs) -> anyhow::Result<()> {
    let host_name = args.host_name.clone().unwrap_or_else(default_host_name);
    let host_id = args.host_id.unwrap_or_else(default_host_id);
    let relay_url = match args.relay_url {
        Some(url) => normalize_ws_url(&url),
        None => default_lan_relay_url(args.relay_port, &args.relay_path)?,
    };
    let expires_at = if args.expires_minutes == 0 {
        None
    } else {
        Some(OffsetDateTime::now_utc() + TimeDuration::minutes(args.expires_minutes as i64))
    };
    let payload = PairingPayload {
        version: 1,
        relay_url,
        pair_id: None,
        host_id,
        host_name,
        pair_token: Uuid::new_v4().to_string(),
        device_id: None,
        device_token: None,
        expires_at,
    };
    print_pairing_payload(&payload, args.no_qr)?;

    Ok(())
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
    let relay_url = normalize_ws_url(&args.relay_url);
    let (relay_socket, _) = connect_async(relay_url.as_str()).await?;
    let (codex_socket, _) = connect_async(codex_websocket_url).await?;
    let (relay_write, mut relay_read) = relay_socket.split();
    let (codex_write, codex_read) = codex_socket.split();
    let relay_write = Arc::new(Mutex::new(relay_write));
    let codex_write = Arc::new(Mutex::new(codex_write));
    let (codex_tx, mut codex_rx) = mpsc::unbounded_channel::<Value>();
    let host_id = args.host_id.clone().unwrap_or_else(default_host_id);
    let session_id = args.session_id.clone();
    let workspace_owned = workspace.to_owned();
    let thread_ids = Arc::new(Mutex::new(HashMap::<String, String>::new()));
    let pending_thread_starts = Arc::new(Mutex::new(HashMap::<u64, String>::new()));
    let pending_thread_loads = Arc::new(Mutex::new(HashMap::<u64, String>::new()));
    let picker_items = Arc::new(Mutex::new(default_picker_items()));
    let seq = Arc::new(Mutex::new(0_u64));

    relay_send(
        &relay_write,
        &RelayClientMessage::Register {
            role: RelayClientRole::Host,
            client_id: format!("{host_id}-host"),
            host_id: Some(host_id.clone()),
            device_id: None,
            device_token: None,
        },
    )
    .await?;
    if args.create_pair {
        let expires_in_seconds = if args.pair_expires_minutes == 0 {
            None
        } else {
            Some(args.pair_expires_minutes.saturating_mul(60))
        };
        relay_send(
            &relay_write,
            &RelayClientMessage::PairCreate {
                request: PairCreateRequest {
                    host_id: host_id.clone(),
                    host_name: host_name.to_owned(),
                    relay_url: relay_url.clone(),
                    pair_id: None,
                    pair_token: None,
                    expires_in_seconds,
                },
            },
        )
        .await?;
    }
    publish_host_status(&relay_write, &host_id, host_name, workspace, 1).await?;

    send_codex_initialize(&codex_write).await?;
    request_codex_picker_sources(&codex_write, &seq, workspace).await?;
    publish_picker_registry(&relay_write, &host_id, &session_id, &picker_items).await?;
    publish_recent_codex_threads(
        &relay_write,
        &codex_write,
        &host_id,
        &session_id,
        &workspace_owned,
        &seq,
    )
    .await?;
    publish_workspace_snapshot(
        &relay_write,
        &host_id,
        &session_id,
        &workspace_owned,
        "workspace-initial",
        3,
        220,
    )
    .await?;

    let relay_writer_for_codex = Arc::clone(&relay_write);
    let host_for_codex = host_id.clone();
    let seq_for_codex = Arc::clone(&seq);
    let threads_for_codex = Arc::clone(&thread_ids);
    let pending_for_codex = Arc::clone(&pending_thread_starts);
    let pending_loads_for_codex = Arc::clone(&pending_thread_loads);
    let picker_items_for_codex = Arc::clone(&picker_items);
    let picker_session_for_codex = session_id.clone();
    let workspace_for_codex = workspace_owned.clone();
    tokio::spawn(async move {
        read_codex_events(
            codex_read,
            codex_tx,
            relay_writer_for_codex,
            host_for_codex,
            workspace_for_codex,
            seq_for_codex,
            threads_for_codex,
            pending_for_codex,
            pending_loads_for_codex,
            picker_items_for_codex,
            picker_session_for_codex,
        )
        .await;
    });

    let relay_writer_for_commands = Arc::clone(&relay_write);
    let codex_writer_for_commands = Arc::clone(&codex_write);
    let host_for_commands = host_id.clone();
    let session_for_commands = session_id.clone();
    let seq_for_commands = Arc::clone(&seq);
    let threads_for_commands = Arc::clone(&thread_ids);
    let pending_for_commands = Arc::clone(&pending_thread_starts);
    let pending_loads_for_commands = Arc::clone(&pending_thread_loads);
    let workspace_for_commands = workspace_owned.clone();
    let no_qr_for_commands = args.no_qr;
    let mut command_task = tokio::spawn(async move {
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
            match server_message {
                RelayServerMessage::PairCreated { pairing } => {
                    if pairing.host_id == host_for_commands {
                        if let Err(error) = print_pairing_payload(&pairing, no_qr_for_commands) {
                            eprintln!("Failed to render pairing payload: {error}");
                        }
                    }
                }
                RelayServerMessage::PairClaimed { claim } => {
                    if claim.host_id == host_for_commands {
                        eprintln!(
                            "AgentPal mobile paired: {} ({})",
                            claim.mobile_client_id, claim.device_id
                        );
                    }
                }
                RelayServerMessage::ClientCommand { command } => {
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
                        &threads_for_commands,
                        &pending_for_commands,
                        &pending_loads_for_commands,
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
                RelayServerMessage::HistoryRequest { request } => {
                    if request.host_id != host_for_commands {
                        continue;
                    }
                    if let Err(error) = handle_history_request(
                        request,
                        &codex_writer_for_commands,
                        &workspace_for_commands,
                        &seq_for_commands,
                        &threads_for_commands,
                        &pending_loads_for_commands,
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
                                phase: Some("history-request".to_owned()),
                            },
                        )
                        .await;
                    }
                }
                RelayServerMessage::WorkspaceRequest { request } => {
                    if request.host_id != host_for_commands {
                        continue;
                    }
                    let workspace = request
                        .workspace
                        .as_deref()
                        .unwrap_or(&workspace_for_commands);
                    if let Err(error) = publish_workspace_snapshot(
                        &relay_writer_for_commands,
                        &host_for_commands,
                        request
                            .session_id
                            .as_deref()
                            .unwrap_or(&session_for_commands),
                        workspace,
                        &request.request_id,
                        request.max_depth,
                        request.max_entries,
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
                                phase: Some("workspace-request".to_owned()),
                            },
                        )
                        .await;
                    }
                }
                RelayServerMessage::FilePreviewRequest { request } => {
                    if request.host_id != host_for_commands {
                        continue;
                    }
                    if let Err(error) =
                        publish_file_preview(&relay_writer_for_commands, request).await
                    {
                        let _ = publish_session_event(
                            &relay_writer_for_commands,
                            &host_for_commands,
                            &session_for_commands,
                            &seq_for_commands,
                            SessionEvent::Error {
                                message: error.to_string(),
                                phase: Some("file-preview-request".to_owned()),
                            },
                        )
                        .await;
                    }
                }
                RelayServerMessage::Error { message } => {
                    eprintln!("AgentPal Relay error: {message}");
                }
                _ => {}
            }
        }
        anyhow::Result::<()>::Err(anyhow::anyhow!("relay websocket closed"))
    });

    if let Some(prompt) = &args.once_prompt {
        let command = ClientCommand::input_submit(
            format!("host-once-{}", Uuid::new_v4()),
            host_id.clone(),
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
            &thread_ids,
            &pending_thread_starts,
            &pending_thread_loads,
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
        tokio::select! {
            result = timeout(Duration::from_secs(args.timeout_seconds), loop_future) => {
                result.map(|_| ()).map_err(anyhow::Error::from)
            }
            result = &mut command_task => relay_task_result(result),
        }
    } else {
        tokio::select! {
            _ = loop_future => Ok(()),
            result = tokio::signal::ctrl_c() => result.map_err(anyhow::Error::from),
            result = &mut command_task => relay_task_result(result),
        }
    };
    if !command_task.is_finished() {
        command_task.abort();
    }

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

fn relay_task_result(
    result: Result<anyhow::Result<()>, tokio::task::JoinError>,
) -> anyhow::Result<()> {
    match result {
        Ok(Ok(())) => Ok(()),
        Ok(Err(error)) => Err(error),
        Err(error) => Err(anyhow::Error::from(error)),
    }
}

async fn handle_client_command(
    command: ClientCommand,
    relay_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    codex_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    host_id: &str,
    fallback_session_id: &str,
    workspace: &str,
    seq: &Arc<Mutex<u64>>,
    thread_ids: &ThreadMap,
    pending_thread_starts: &PendingThreadStarts,
    pending_thread_loads: &PendingThreadLoads,
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
    let target_session_id = if command.session_id.trim().is_empty() {
        fallback_session_id
    } else {
        command.session_id.as_str()
    };

    publish_session_event(
        relay_write,
        host_id,
        target_session_id,
        seq,
        SessionEvent::UserMessage { text: text.clone() },
    )
    .await?;
    publish_session_event(
        relay_write,
        host_id,
        target_session_id,
        seq,
        SessionEvent::StateChanged {
            state: SessionState::Running,
        },
    )
    .await?;

    let current_thread = thread_ids.lock().await.get(target_session_id).cloned();
    let thread = match current_thread {
        Some(thread) => {
            if target_session_id == fallback_session_id {
                thread
            } else {
                resume_codex_thread(
                    codex_write,
                    workspace,
                    seq,
                    pending_thread_loads,
                    target_session_id,
                    &thread,
                    false,
                )
                .await?
            }
        }
        None => {
            let request_id = next_request_id(seq).await;
            pending_thread_starts
                .lock()
                .await
                .insert(request_id, target_session_id.to_owned());
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
            wait_for_thread_id(thread_ids, target_session_id).await?
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

async fn handle_history_request(
    request: HistoryRequest,
    codex_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    workspace: &str,
    seq: &Arc<Mutex<u64>>,
    thread_ids: &ThreadMap,
    pending_thread_loads: &PendingThreadLoads,
) -> anyhow::Result<()> {
    let session_id = request.session_id.trim();
    if session_id.is_empty() {
        return Ok(());
    }

    let known_thread = thread_ids.lock().await.get(session_id).cloned();
    let Some(thread_id) = known_thread.or_else(|| thread_id_from_session_id(session_id)) else {
        return Ok(());
    };

    resume_codex_thread(
        codex_write,
        workspace,
        seq,
        pending_thread_loads,
        session_id,
        &thread_id,
        true,
    )
    .await?;
    Ok(())
}

async fn read_codex_events(
    mut codex_read: futures_util::stream::SplitStream<WebSocketStream<MaybeTlsStream<TcpStream>>>,
    codex_tx: mpsc::UnboundedSender<Value>,
    relay_write: Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    host_id: String,
    workspace: String,
    seq: Arc<Mutex<u64>>,
    thread_ids: ThreadMap,
    pending_thread_starts: PendingThreadStarts,
    pending_thread_loads: PendingThreadLoads,
    picker_items: PickerItems,
    picker_session_id: String,
) {
    while let Some(message) = codex_read.next().await {
        let Ok(Message::Text(text)) = message else {
            continue;
        };
        let Ok(value) = serde_json::from_str::<Value>(&text) else {
            continue;
        };
        let _ = codex_tx.send(value.clone());
        if let Some(items) = picker_items_from_codex_response(&value) {
            update_picker_items(&picker_items, items).await;
            let _ =
                publish_picker_registry(&relay_write, &host_id, &picker_session_id, &picker_items)
                    .await;
        }
        let request_id = value.get("id").and_then(Value::as_u64);
        let event_thread_id =
            extract_thread_id(&value).or_else(|| extract_thread_id_from_events(&[value.clone()]));
        if let Some(id) = &event_thread_id {
            let pending_session_id = match request_id {
                Some(request_id) => pending_thread_starts.lock().await.remove(&request_id),
                None => None,
            };
            let session_id = pending_session_id.unwrap_or_else(|| session_id_for_thread(id));
            thread_ids.lock().await.insert(session_id, id.clone());
        }
        if let Some(request_id) = request_id {
            if let Some(session_id) = pending_thread_loads.lock().await.remove(&request_id) {
                if let Some(thread_id) = value.pointer("/result/thread/id").and_then(Value::as_str)
                {
                    thread_ids
                        .lock()
                        .await
                        .insert(session_id, thread_id.to_owned());
                }
            }
        }
        let thread_id_snapshot = thread_ids.lock().await.clone();
        for (history_session_id, event) in
            codex_response_to_history_events(&value, &workspace, &thread_id_snapshot)
        {
            let _ = publish_session_event(&relay_write, &host_id, &history_session_id, &seq, event)
                .await;
        }
        for (history_session_id, thread_id) in codex_threads_in_response(&value) {
            thread_ids
                .lock()
                .await
                .insert(history_session_id, thread_id);
        }

        let (mapped_event_session_id, fallback_session_id) = {
            let thread_ids = thread_ids.lock().await;
            let mapped_event_session_id = event_thread_id
                .as_deref()
                .and_then(|thread_id| session_id_for_known_thread(&thread_ids, thread_id));
            let fallback_session_id = thread_ids
                .keys()
                .next()
                .cloned()
                .unwrap_or_else(|| "agentpal-codex-local".to_owned());
            (mapped_event_session_id, fallback_session_id)
        };
        let session_id = {
            let thread_ids = thread_ids.lock().await;
            session_id_from_codex_event(&value, &thread_ids)
        }
        .or(mapped_event_session_id)
        .unwrap_or(fallback_session_id);
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
            .filter(|delta| !delta.is_empty())
            .map(|delta| SessionEvent::AgentMessage {
                text: delta.to_owned(),
                complete: false,
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
            if kind == "agentMessage" {
                return item
                    .get("text")
                    .and_then(Value::as_str)
                    .filter(|text| !text.trim().is_empty())
                    .map(|text| SessionEvent::AgentMessage {
                        text: text.to_owned(),
                        complete: true,
                    });
            }
            if kind == "commandExecution" {
                return Some(SessionEvent::CommandOutput {
                    command: item
                        .get("command")
                        .and_then(Value::as_str)
                        .unwrap_or("command")
                        .to_owned(),
                    exit_code: item
                        .get("exitCode")
                        .and_then(Value::as_i64)
                        .map(|code| code as i32),
                    summary: item
                        .get("aggregatedOutput")
                        .and_then(Value::as_str)
                        .map(short_summary)
                        .unwrap_or_default(),
                });
            }
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

fn default_picker_items() -> Vec<PickerRegistryItem> {
    [
        ("/help", "帮助", "查看 Codex 可用命令和当前会话帮助"),
        ("/model", "模型", "切换或查看当前 Codex 模型"),
        ("/status", "状态", "查看当前会话、模型和权限状态"),
        ("/diff", "Diff", "查看当前工作区变更"),
        ("/review", "Review", "请求 Codex 审查当前变更"),
        ("/approvals", "审批", "查看或调整审批相关设置"),
        ("/new", "新会话", "开始一个新的 Codex 会话"),
        ("/resume", "恢复", "恢复历史 Codex 会话"),
        ("/compact", "压缩上下文", "压缩当前会话上下文"),
        ("/clear", "清屏", "清理当前终端显示"),
        ("/quit", "退出", "退出当前 Codex 终端会话"),
    ]
    .into_iter()
    .map(|(insert_text, label, description)| PickerRegistryItem {
        id: format!("slash:{insert_text}"),
        trigger: PickerTrigger::Slash,
        label: label.to_owned(),
        kind: PickerItemKind::SlashCommand,
        source: AgentKind::Codex,
        description: Some(description.to_owned()),
        insert_text: format!("{insert_text} "),
        execute_mode: PickerExecuteMode::Insert,
    })
    .collect()
}

fn picker_items_from_codex_response(value: &Value) -> Option<Vec<PickerRegistryItem>> {
    let mut items = Vec::new();
    if let Some(entries) = value.pointer("/result/data").and_then(Value::as_array) {
        for entry in entries {
            for skill in entry
                .get("skills")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                let Some(name) = skill.get("name").and_then(Value::as_str) else {
                    continue;
                };
                if skill.get("enabled").and_then(Value::as_bool) == Some(false) {
                    continue;
                }
                let label = skill
                    .pointer("/interface/displayName")
                    .and_then(Value::as_str)
                    .unwrap_or(name);
                let description = skill
                    .pointer("/interface/shortDescription")
                    .or_else(|| skill.get("shortDescription"))
                    .or_else(|| skill.get("description"))
                    .and_then(Value::as_str)
                    .map(short_picker_description);
                items.push(PickerRegistryItem {
                    id: format!("skill:{name}"),
                    trigger: PickerTrigger::Dollar,
                    label: label.to_owned(),
                    kind: PickerItemKind::Skill,
                    source: AgentKind::Codex,
                    description,
                    insert_text: format!("${name} "),
                    execute_mode: PickerExecuteMode::Insert,
                });
            }
        }
    }

    if let Some(marketplaces) = value
        .pointer("/result/marketplaces")
        .and_then(Value::as_array)
    {
        for marketplace in marketplaces {
            for plugin in marketplace
                .get("plugins")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                let Some(name) = plugin.get("name").and_then(Value::as_str) else {
                    continue;
                };
                if plugin.get("installed").and_then(Value::as_bool) == Some(false)
                    || plugin.get("enabled").and_then(Value::as_bool) == Some(false)
                {
                    continue;
                }
                let label = plugin
                    .pointer("/interface/displayName")
                    .and_then(Value::as_str)
                    .unwrap_or(name);
                let description = plugin
                    .pointer("/interface/shortDescription")
                    .or_else(|| plugin.pointer("/interface/longDescription"))
                    .and_then(Value::as_str)
                    .map(short_picker_description);
                items.push(PickerRegistryItem {
                    id: format!("plugin:{name}"),
                    trigger: PickerTrigger::Dollar,
                    label: label.to_owned(),
                    kind: PickerItemKind::Plugin,
                    source: AgentKind::Codex,
                    description,
                    insert_text: format!("${name} "),
                    execute_mode: PickerExecuteMode::Insert,
                });
            }
        }
    }

    (!items.is_empty()).then_some(items)
}

async fn update_picker_items(picker_items: &PickerItems, next_items: Vec<PickerRegistryItem>) {
    let mut items = picker_items.lock().await;
    for next in next_items {
        if let Some(existing) = items.iter_mut().find(|item| item.id == next.id) {
            *existing = next;
        } else {
            items.push(next);
        }
    }
}

fn short_picker_description(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.chars().count() <= 120 {
        trimmed.to_owned()
    } else {
        format!("{}...", trimmed.chars().take(120).collect::<String>())
    }
}

fn picker_kind_rank(kind: &PickerItemKind) -> u8 {
    match kind {
        PickerItemKind::SlashCommand => 0,
        PickerItemKind::Skill => 1,
        PickerItemKind::Plugin => 2,
        PickerItemKind::Preset => 3,
    }
}

fn codex_response_to_history_events(
    value: &Value,
    workspace: &str,
    thread_ids: &HashMap<String, String>,
) -> Vec<(String, SessionEvent)> {
    let Some(id) = value.get("id").and_then(Value::as_u64) else {
        return Vec::new();
    };
    if id < 1_000 {
        return Vec::new();
    }

    let mut events = Vec::new();
    if let Some(items) = value.pointer("/result/data").and_then(Value::as_array) {
        for thread in items {
            if let Some(summary) = thread_to_session_summary(thread, workspace) {
                events.push((
                    summary.session_id.clone(),
                    SessionEvent::SessionStarted { summary },
                ));
            }
        }
    }
    if let Some(thread) = value.pointer("/result/thread") {
        if let Some(mut summary) = thread_to_session_summary(thread, workspace) {
            if let Some(thread_id) = thread.get("id").and_then(Value::as_str) {
                if let Some(mapped_session_id) = session_id_for_known_thread(thread_ids, thread_id)
                {
                    summary.session_id = mapped_session_id;
                }
            }
            let session_id = summary.session_id.clone();
            events.push((session_id.clone(), SessionEvent::SessionStarted { summary }));
            for item in thread
                .get("turns")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(|turn| turn.get("items").and_then(Value::as_array))
                .flatten()
            {
                if let Some(event) = thread_item_to_session_event(item) {
                    events.push((session_id.clone(), event));
                }
            }
        }
    }
    events
}

fn codex_threads_in_response(value: &Value) -> Vec<(String, String)> {
    let mut items = Vec::new();
    if let Some(threads) = value.pointer("/result/data").and_then(Value::as_array) {
        for thread in threads {
            if let Some(thread_id) = thread.get("id").and_then(Value::as_str) {
                items.push((session_id_for_thread(thread_id), thread_id.to_owned()));
            }
        }
    }
    if let Some(thread_id) = value.pointer("/result/thread/id").and_then(Value::as_str) {
        items.push((session_id_for_thread(thread_id), thread_id.to_owned()));
    }
    items
}

fn thread_to_session_summary(thread: &Value, workspace_fallback: &str) -> Option<SessionSummary> {
    let thread_id = thread.get("id").and_then(Value::as_str)?;
    let workspace = thread
        .get("cwd")
        .and_then(Value::as_str)
        .unwrap_or(workspace_fallback)
        .to_owned();
    Some(SessionSummary {
        session_id: session_id_for_thread(thread_id),
        agent_kind: AgentKind::Codex,
        workspace,
        title: thread
            .get("name")
            .and_then(Value::as_str)
            .or_else(|| thread.get("preview").and_then(Value::as_str))
            .filter(|title| !title.trim().is_empty())
            .map(|title| title.trim().chars().take(72).collect()),
        state: codex_thread_state(thread),
        pending_approvals: 0,
        updated_at: unix_seconds_to_offset_datetime(
            thread
                .get("updatedAt")
                .or_else(|| thread.get("updated_at"))
                .and_then(Value::as_i64),
        )
        .unwrap_or_else(OffsetDateTime::now_utc),
    })
}

fn thread_item_to_session_event(item: &Value) -> Option<SessionEvent> {
    let kind = item.get("type").and_then(Value::as_str)?;
    match kind {
        "userMessage" => {
            let text = item
                .get("content")
                .and_then(Value::as_array)?
                .iter()
                .filter_map(|content| {
                    if content.get("type").and_then(Value::as_str) == Some("text") {
                        content.get("text").and_then(Value::as_str)
                    } else {
                        None
                    }
                })
                .collect::<Vec<_>>()
                .join("\n");
            (!text.trim().is_empty()).then_some(SessionEvent::UserMessage { text })
        }
        "agentMessage" => item
            .get("text")
            .and_then(Value::as_str)
            .filter(|text| !text.trim().is_empty())
            .map(|text| SessionEvent::AgentMessage {
                text: text.to_owned(),
                complete: true,
            }),
        "commandExecution" => Some(SessionEvent::CommandOutput {
            command: item
                .get("command")
                .and_then(Value::as_str)
                .unwrap_or("command")
                .to_owned(),
            exit_code: item
                .get("exitCode")
                .and_then(Value::as_i64)
                .map(|code| code as i32),
            summary: item
                .get("aggregatedOutput")
                .and_then(Value::as_str)
                .map(short_summary)
                .unwrap_or_default(),
        }),
        "fileChange" | "mcpToolCall" | "dynamicToolCall" => Some(SessionEvent::ToolFinished {
            name: kind.to_owned(),
            ok: true,
            summary: summarize_item(item),
        }),
        _ => None,
    }
}

fn codex_thread_state(thread: &Value) -> SessionState {
    let status = thread.pointer("/status/type").and_then(Value::as_str);
    match status {
        Some("active") => SessionState::Running,
        Some("systemError") => SessionState::Failed,
        Some("idle") | Some("notLoaded") | _ => SessionState::Idle,
    }
}

fn unix_seconds_to_offset_datetime(seconds: Option<i64>) -> Option<OffsetDateTime> {
    seconds.and_then(|seconds| OffsetDateTime::from_unix_timestamp(seconds).ok())
}

fn short_summary(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.chars().count() <= 600 {
        return trimmed.to_owned();
    }
    format!("{}...", trimmed.chars().take(600).collect::<String>())
}

async fn publish_recent_codex_threads(
    relay_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    codex_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    host_id: &str,
    fallback_session_id: &str,
    workspace: &str,
    seq: &Arc<Mutex<u64>>,
) -> anyhow::Result<()> {
    let request_id = next_request_id(seq).await;
    let request = json!({
        "jsonrpc": "2.0",
        "id": request_id,
        "method": "thread/list",
        "params": {
            "limit": 8,
            "cwd": workspace,
            "sortKey": "updated_at",
            "sortDirection": "desc",
            "archived": false
        }
    });
    codex_send(codex_write, &request).await?;

    let fallback_summary = SessionSummary {
        session_id: fallback_session_id.to_owned(),
        agent_kind: AgentKind::Codex,
        workspace: workspace.to_owned(),
        title: Some("新 Codex 会话".to_owned()),
        state: SessionState::Idle,
        pending_approvals: 0,
        updated_at: OffsetDateTime::now_utc(),
    };
    publish_session_event(
        relay_write,
        host_id,
        fallback_session_id,
        seq,
        SessionEvent::SessionStarted {
            summary: fallback_summary,
        },
    )
    .await?;
    publish_session_event(
        relay_write,
        host_id,
        fallback_session_id,
        seq,
        SessionEvent::StateChanged {
            state: SessionState::Idle,
        },
    )
    .await?;
    Ok(())
}

async fn wait_for_thread_id(thread_ids: &ThreadMap, session_id: &str) -> anyhow::Result<String> {
    let deadline = Instant::now() + Duration::from_secs(20);
    loop {
        if let Some(thread) = thread_ids.lock().await.get(session_id).cloned() {
            if !thread.is_empty() {
                return Ok(thread);
            }
        }
        if Instant::now() > deadline {
            anyhow::bail!("timed out waiting for codex thread id");
        }
        sleep(Duration::from_millis(100)).await;
    }
}

async fn resume_codex_thread(
    codex_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    workspace: &str,
    seq: &Arc<Mutex<u64>>,
    pending_thread_loads: &PendingThreadLoads,
    session_id: &str,
    thread_id: &str,
    include_turns: bool,
) -> anyhow::Result<String> {
    let request_id = next_request_id(seq).await;
    pending_thread_loads
        .lock()
        .await
        .insert(request_id, session_id.to_owned());
    let resume = json!({
        "jsonrpc": "2.0",
        "id": request_id,
        "method": "thread/resume",
        "params": {
            "threadId": thread_id,
            "cwd": workspace,
            "runtimeWorkspaceRoots": [workspace],
            "approvalPolicy": "on-request",
            "sandbox": "workspace-write",
            "excludeTurns": !include_turns
        }
    });
    codex_send(codex_write, &resume).await?;
    Ok(thread_id.to_owned())
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

async fn request_codex_picker_sources(
    codex_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    seq: &Arc<Mutex<u64>>,
    workspace: &str,
) -> Result<(), WsError> {
    let skills_id = next_request_id(seq).await;
    let skills = json!({
        "jsonrpc": "2.0",
        "id": skills_id,
        "method": "skills/list",
        "params": {
            "cwds": [workspace],
            "forceReload": true
        }
    });
    codex_send(codex_write, &skills).await?;

    let plugins_id = next_request_id(seq).await;
    let plugins = json!({
        "jsonrpc": "2.0",
        "id": plugins_id,
        "method": "plugin/list",
        "params": {
            "cwds": [workspace],
            "marketplaceKinds": ["local", "workspace-directory"]
        }
    });
    codex_send(codex_write, &plugins).await
}

async fn publish_picker_registry(
    relay_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    host_id: &str,
    session_id: &str,
    picker_items: &PickerItems,
) -> Result<(), WsError> {
    let mut items = picker_items.lock().await.clone();
    items.sort_by(|a, b| {
        picker_kind_rank(&a.kind)
            .cmp(&picker_kind_rank(&b.kind))
            .then_with(|| a.label.to_lowercase().cmp(&b.label.to_lowercase()))
    });
    let registry = PickerRegistry {
        host_id: host_id.to_owned(),
        session_id: session_id.to_owned(),
        items,
        updated_at: OffsetDateTime::now_utc(),
    };
    relay_send(
        relay_write,
        &RelayClientMessage::PickerRegistry { registry },
    )
    .await
}

async fn publish_workspace_snapshot(
    relay_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    host_id: &str,
    _session_id: &str,
    workspace: &str,
    request_id: &str,
    max_depth: u32,
    max_entries: u32,
) -> anyhow::Result<()> {
    let snapshot =
        build_workspace_snapshot(host_id, workspace, request_id, max_depth, max_entries).await;
    relay_send(
        relay_write,
        &RelayClientMessage::WorkspaceSnapshot { snapshot },
    )
    .await?;
    Ok(())
}

async fn publish_file_preview(
    relay_write: &Arc<Mutex<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
    request: FilePreviewRequest,
) -> anyhow::Result<()> {
    let preview = build_file_preview(&request).await;
    relay_send(relay_write, &RelayClientMessage::FilePreview { preview }).await?;
    Ok(())
}

async fn build_file_preview(request: &FilePreviewRequest) -> FilePreview {
    let workspace_root = canonical_workspace_path(&request.workspace);
    let requested_path = workspace_root.join(request.path.replace('\\', "/"));
    let generated_at = OffsetDateTime::now_utc();
    let name = requested_path
        .file_name()
        .and_then(|item| item.to_str())
        .unwrap_or(&request.path)
        .to_owned();
    let language = language_for_path(&request.path);

    let mut preview = FilePreview {
        request_id: request.request_id.clone(),
        host_id: request.host_id.clone(),
        workspace: workspace_root.to_string_lossy().to_string(),
        path: request.path.clone(),
        name,
        language,
        size_bytes: 0,
        truncated: false,
        content: None,
        generated_at,
        error: None,
    };

    let resolved_path = match requested_path.canonicalize() {
        Ok(path) => path,
        Err(error) => {
            preview.error = Some(format!("无法读取文件: {error}"));
            return preview;
        }
    };

    if !resolved_path.starts_with(&workspace_root) {
        preview.error = Some("文件不在当前 workspace 内，已拒绝预览。".to_owned());
        return preview;
    }

    let metadata = match std::fs::metadata(&resolved_path) {
        Ok(metadata) => metadata,
        Err(error) => {
            preview.error = Some(format!("无法读取文件信息: {error}"));
            return preview;
        }
    };
    preview.size_bytes = metadata.len();

    if metadata.is_dir() {
        preview.error = Some("这是文件夹，不支持作为文件预览。".to_owned());
        return preview;
    }

    let max_bytes = request.max_bytes.clamp(1024, 131_072) as usize;
    let bytes = match std::fs::read(&resolved_path) {
        Ok(bytes) => bytes,
        Err(error) => {
            preview.error = Some(format!("文件读取失败: {error}"));
            return preview;
        }
    };

    if looks_binary(&bytes) {
        preview.error = Some("该文件像二进制内容，暂不在手机端预览。".to_owned());
        return preview;
    }

    let truncated = bytes.len() > max_bytes;
    let visible_bytes = if truncated {
        &bytes[..max_bytes]
    } else {
        bytes.as_slice()
    };
    preview.content = Some(String::from_utf8_lossy(visible_bytes).to_string());
    preview.truncated = truncated;
    preview
}

async fn build_workspace_snapshot(
    host_id: &str,
    workspace: &str,
    request_id: &str,
    max_depth: u32,
    max_entries: u32,
) -> WorkspaceSnapshot {
    let root = canonical_workspace_path(workspace);
    let workspace_display = root.to_string_lossy().to_string();
    let root_name = root
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("workspace")
        .to_owned();
    let (tree, tree_truncated, tree_error) =
        collect_project_tree(&root, max_depth.clamp(1, 6), max_entries.clamp(40, 800));
    let (worktrees, worktree_error) = collect_worktree_summaries(&root).await;
    let error = [tree_error, worktree_error]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>()
        .join("; ");

    WorkspaceSnapshot {
        request_id: request_id.to_owned(),
        host_id: host_id.to_owned(),
        workspace: workspace_display,
        root_name,
        generated_at: OffsetDateTime::now_utc(),
        tree,
        tree_truncated,
        worktrees,
        error: (!error.is_empty()).then_some(error),
    }
}

fn canonical_workspace_path(workspace: &str) -> PathBuf {
    let input = PathBuf::from(workspace);
    input.canonicalize().unwrap_or(input)
}

fn looks_binary(bytes: &[u8]) -> bool {
    bytes.iter().take(4096).any(|byte| *byte == 0)
}

fn language_for_path(path: &str) -> Option<String> {
    let lower = path.to_lowercase();
    let extension = Path::new(&lower)
        .extension()
        .and_then(|item| item.to_str())?;
    let language = match extension {
        "bash" | "sh" | "zsh" => "bash",
        "css" => "css",
        "diff" | "patch" => "diff",
        "html" | "htm" | "xml" => "markup",
        "js" | "cjs" | "mjs" => "javascript",
        "json" => "json",
        "jsx" => "jsx",
        "md" | "markdown" => "markdown",
        "ps1" | "psm1" => "powershell",
        "py" => "python",
        "rs" => "rust",
        "ts" => "typescript",
        "tsx" => "tsx",
        "yaml" | "yml" => "yaml",
        _ => extension,
    };
    Some(language.to_owned())
}

fn collect_project_tree(
    root: &Path,
    max_depth: u32,
    max_entries: u32,
) -> (Vec<ProjectTreeEntry>, bool, Option<String>) {
    if !root.exists() {
        return (
            Vec::new(),
            false,
            Some(format!("workspace path does not exist: {}", root.display())),
        );
    }

    let mut entries = Vec::new();
    let mut truncated = false;
    let result = collect_project_tree_inner(
        root,
        root,
        0,
        max_depth,
        max_entries as usize,
        &mut entries,
        &mut truncated,
    );
    (
        entries,
        truncated,
        result.err().map(|error| error.to_string()),
    )
}

fn collect_project_tree_inner(
    root: &Path,
    current: &Path,
    depth: u32,
    max_depth: u32,
    max_entries: usize,
    entries: &mut Vec<ProjectTreeEntry>,
    truncated: &mut bool,
) -> anyhow::Result<()> {
    if entries.len() >= max_entries {
        *truncated = true;
        return Ok(());
    }

    let mut children = Vec::new();
    for item in std::fs::read_dir(current)? {
        let item = item?;
        let file_name = item.file_name().to_string_lossy().to_string();
        if should_skip_tree_entry(&file_name) {
            continue;
        }
        let file_type = item.file_type()?;
        children.push((file_name, file_type.is_dir(), item.path()));
    }
    children.sort_by(|a, b| {
        b.1.cmp(&a.1)
            .then_with(|| a.0.to_lowercase().cmp(&b.0.to_lowercase()))
    });

    for (name, is_dir, path) in children {
        if entries.len() >= max_entries {
            *truncated = true;
            break;
        }
        let display_path = relative_path(root, &path);
        entries.push(ProjectTreeEntry {
            path: display_path,
            name,
            kind: if is_dir {
                ProjectEntryKind::Directory
            } else {
                ProjectEntryKind::File
            },
            depth,
        });
        if is_dir && depth + 1 < max_depth {
            collect_project_tree_inner(
                root,
                &path,
                depth + 1,
                max_depth,
                max_entries,
                entries,
                truncated,
            )?;
        }
    }

    Ok(())
}

fn should_skip_tree_entry(name: &str) -> bool {
    matches!(
        name,
        ".git"
            | ".agents"
            | ".codex"
            | ".coding-agent-harness"
            | ".expo"
            | ".gradle"
            | ".harness"
            | ".idea"
            | ".next"
            | ".turbo"
            | ".venv"
            | ".vscode"
            | "build"
            | "coding-agent-harness"
            | "dist"
            | "node_modules"
            | "target"
            | "tmp"
            | "ui"
    )
}

async fn collect_worktree_summaries(root: &Path) -> (Vec<WorktreeSummary>, Option<String>) {
    let worktrees = match git_output(root, &["worktree", "list", "--porcelain"]).await {
        Ok(output) => parse_worktree_list(&output),
        Err(error) => {
            let summary = summarize_worktree(root, None, None).await;
            return (vec![summary], Some(error.to_string()));
        }
    };
    let targets = if worktrees.is_empty() {
        vec![WorktreeInfo {
            path: root.to_path_buf(),
            branch: None,
            head: None,
        }]
    } else {
        worktrees
    };

    let mut summaries = Vec::new();
    for worktree in targets.into_iter().take(12) {
        summaries.push(summarize_worktree(&worktree.path, worktree.branch, worktree.head).await);
    }
    (summaries, None)
}

#[derive(Debug)]
struct WorktreeInfo {
    path: PathBuf,
    branch: Option<String>,
    head: Option<String>,
}

fn parse_worktree_list(output: &str) -> Vec<WorktreeInfo> {
    let mut items = Vec::new();
    let mut current: Option<WorktreeInfo> = None;

    for line in output.lines() {
        if let Some(path) = line.strip_prefix("worktree ") {
            if let Some(item) = current.take() {
                items.push(item);
            }
            current = Some(WorktreeInfo {
                path: PathBuf::from(path.trim()),
                branch: None,
                head: None,
            });
            continue;
        }
        if let Some(item) = current.as_mut() {
            if let Some(head) = line.strip_prefix("HEAD ") {
                item.head = Some(head.trim().to_owned());
            } else if let Some(branch) = line.strip_prefix("branch ") {
                item.branch = Some(branch.trim().trim_start_matches("refs/heads/").to_owned());
            }
        }
    }
    if let Some(item) = current {
        items.push(item);
    }
    items
}

async fn summarize_worktree(
    path: &Path,
    branch: Option<String>,
    head: Option<String>,
) -> WorktreeSummary {
    let mut files: HashMap<String, DiffFileSummary> = HashMap::new();
    let mut error_messages = Vec::new();

    for args in [
        &["diff", "--numstat", "--"][..],
        &["diff", "--cached", "--numstat", "--"][..],
    ] {
        match git_output(path, args).await {
            Ok(output) => merge_numstat(&mut files, &output),
            Err(error) => error_messages.push(error.to_string()),
        }
    }

    let status_output = match git_output(path, &["status", "--porcelain=v1", "-uall"]).await {
        Ok(output) => output,
        Err(error) => {
            error_messages.push(error.to_string());
            String::new()
        }
    };
    merge_status_paths(&mut files, &status_output);

    let mut file_list: Vec<DiffFileSummary> = files.into_values().collect();
    file_list.sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));
    let files_changed = file_list.len() as u32;
    let additions = file_list.iter().map(|item| item.additions).sum();
    let deletions = file_list.iter().map(|item| item.deletions).sum();
    let diff_truncated = file_list.len() > 30;
    if diff_truncated {
        file_list.truncate(30);
    }

    WorktreeSummary {
        path: path.to_string_lossy().to_string(),
        branch,
        head,
        dirty: files_changed > 0 || !status_output.trim().is_empty(),
        files_changed,
        additions,
        deletions,
        files: file_list,
        diff_truncated,
        error: (!error_messages.is_empty()).then_some(error_messages.join("; ")),
    }
}

fn merge_numstat(files: &mut HashMap<String, DiffFileSummary>, output: &str) {
    for line in output.lines() {
        let mut parts = line.split('\t');
        let additions = parse_numstat_count(parts.next());
        let deletions = parse_numstat_count(parts.next());
        let Some(path) = parts.next().map(clean_git_path) else {
            continue;
        };
        let entry = files
            .entry(path.clone())
            .or_insert_with(|| DiffFileSummary {
                path: path.clone(),
                additions: 0,
                deletions: 0,
                risk: risk_for_path(&path),
            });
        entry.additions = entry.additions.saturating_add(additions);
        entry.deletions = entry.deletions.saturating_add(deletions);
    }
}

fn parse_numstat_count(value: Option<&str>) -> u32 {
    value.and_then(|part| part.parse::<u32>().ok()).unwrap_or(0)
}

fn merge_status_paths(files: &mut HashMap<String, DiffFileSummary>, output: &str) {
    let mut seen = HashSet::new();
    for line in output.lines() {
        if line.len() < 4 {
            continue;
        }
        let path = clean_git_path(&line[3..]);
        if path.is_empty() || !seen.insert(path.clone()) {
            continue;
        }
        files
            .entry(path.clone())
            .or_insert_with(|| DiffFileSummary {
                path: path.clone(),
                additions: 0,
                deletions: 0,
                risk: risk_for_path(&path),
            });
    }
}

fn clean_git_path(path: &str) -> String {
    let cleaned = path
        .rsplit_once(" -> ")
        .map(|(_, next)| next)
        .unwrap_or(path)
        .trim()
        .trim_matches('"');
    cleaned.replace('\\', "/")
}

fn risk_for_path(path: &str) -> RiskLevel {
    let lower = path.to_lowercase();
    if lower.contains("secret")
        || lower.contains("credential")
        || lower.ends_with(".env")
        || lower.contains("androidmanifest.xml")
    {
        RiskLevel::High
    } else if lower.ends_with(".lock")
        || lower.contains("package-lock.json")
        || lower.contains("cargo.lock")
        || lower.contains("gradle")
    {
        RiskLevel::Medium
    } else {
        RiskLevel::Low
    }
}

async fn git_output(cwd: &Path, args: &[&str]) -> anyhow::Result<String> {
    let output = timeout(
        Duration::from_secs(8),
        Command::new("git")
            .args(args)
            .current_dir(cwd)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output(),
    )
    .await??;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        anyhow::bail!("git {} failed: {}", args.join(" "), stderr);
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn relative_path(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
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

fn default_host_id() -> String {
    format!("agentpal-{}", Uuid::new_v4())
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

fn normalize_ws_url(input: &str) -> String {
    let mut value = input.trim().to_owned();
    if !value.starts_with("ws://") && !value.starts_with("wss://") {
        value = format!("ws://{value}");
    }
    if !value.ends_with("/ws") && !value.ends_with("/ws/") {
        value = format!("{}/ws", value.trim_end_matches('/'));
    }
    value
}

fn default_lan_relay_url(port: u16, path: &str) -> anyhow::Result<String> {
    let ip = local_ip()?;
    Ok(websocket_url(&ip.to_string(), port, path))
}

fn print_pairing_payload(payload: &PairingPayload, no_qr: bool) -> anyhow::Result<()> {
    let pair_url = pair_url(payload);

    println!("AgentPal pairing address:");
    println!("{pair_url}");
    println!();
    println!("Manual fields:");
    println!("  relay_url: {}", payload.relay_url);
    if let Some(pair_id) = &payload.pair_id {
        println!("  pair_id: {pair_id}");
    }
    println!("  host_id: {}", payload.host_id);
    println!("  host_name: {}", payload.host_name);
    println!("  pair_token: {}", payload.pair_token);
    if let Some(device_id) = &payload.device_id {
        println!("  device_id: {device_id}");
    }
    if payload.device_token.is_some() {
        println!("  device_token: issued");
    }
    if let Some(expires_at) = payload.expires_at {
        println!("  expires_at: {expires_at}");
    } else {
        println!("  expires_at: never");
    }

    if !no_qr {
        let code = QrCode::new(pair_url.as_bytes())?;
        let qr = code
            .render::<unicode::Dense1x2>()
            .quiet_zone(true)
            .module_dimensions(2, 1)
            .build();
        println!();
        println!("{qr}");
    }

    Ok(())
}

fn pair_url(payload: &PairingPayload) -> String {
    let mut url = url::Url::parse("agentpal://pair").expect("static pair url parses");
    {
        let mut query = url.query_pairs_mut();
        query.append_pair("v", &payload.version.to_string());
        query.append_pair("relayUrl", &payload.relay_url);
        if let Some(pair_id) = &payload.pair_id {
            query.append_pair("pairId", pair_id);
        }
        query.append_pair("hostId", &payload.host_id);
        query.append_pair("hostName", &payload.host_name);
        query.append_pair("pairToken", &payload.pair_token);
        if let Some(device_id) = &payload.device_id {
            query.append_pair("deviceId", device_id);
        }
        if let Some(device_token) = &payload.device_token {
            query.append_pair("deviceToken", device_token);
        }
        if let Some(expires_at) = payload.expires_at {
            query.append_pair(
                "expiresAt",
                &expires_at
                    .format(&Rfc3339)
                    .unwrap_or_else(|_| expires_at.to_string()),
            );
        }
    }
    url.to_string()
}

fn session_id_for_thread(thread_id: &str) -> String {
    format!("codex-{thread_id}")
}

fn thread_id_from_session_id(session_id: &str) -> Option<String> {
    session_id
        .strip_prefix("codex-")
        .filter(|thread_id| !thread_id.trim().is_empty())
        .map(str::to_owned)
}

fn session_id_from_codex_event(
    value: &Value,
    thread_ids: &HashMap<String, String>,
) -> Option<String> {
    value
        .pointer("/params/threadId")
        .or_else(|| value.pointer("/params/thread/id"))
        .or_else(|| value.pointer("/params/turn/threadId"))
        .and_then(Value::as_str)
        .map(|thread_id| {
            session_id_for_known_thread(thread_ids, thread_id)
                .unwrap_or_else(|| session_id_for_thread(thread_id))
        })
}

fn session_id_for_known_thread(
    thread_ids: &HashMap<String, String>,
    thread_id: &str,
) -> Option<String> {
    thread_ids
        .iter()
        .find_map(|(session_id, known_thread_id)| {
            if known_thread_id == thread_id && !session_id.starts_with("codex-") {
                Some(session_id.clone())
            } else {
                None
            }
        })
        .or_else(|| {
            thread_ids.iter().find_map(|(session_id, known_thread_id)| {
                if known_thread_id == thread_id {
                    Some(session_id.clone())
                } else {
                    None
                }
            })
        })
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
