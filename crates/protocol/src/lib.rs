use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::OffsetDateTime;
use uuid::Uuid;

pub type HostId = String;
pub type SessionId = String;
pub type CommandId = String;
pub type ApprovalId = String;
pub type ClientId = String;
pub type PairToken = String;
pub type WorkspaceId = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentPalEnvelope<T> {
    pub id: Uuid,
    pub host_id: HostId,
    pub session_id: Option<SessionId>,
    pub seq: u64,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    pub payload: T,
}

pub type SessionEventEnvelope = AgentPalEnvelope<SessionEvent>;

impl<T> AgentPalEnvelope<T> {
    pub fn new(
        host_id: impl Into<HostId>,
        session_id: Option<SessionId>,
        seq: u64,
        payload: T,
    ) -> Self {
        Self {
            id: Uuid::now_v7(),
            host_id: host_id.into(),
            session_id,
            seq,
            created_at: OffsetDateTime::now_utc(),
            payload,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
    pub session_id: SessionId,
    pub agent_kind: AgentKind,
    pub workspace: String,
    pub title: Option<String>,
    pub state: SessionState,
    pub pending_approvals: u32,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AgentKind {
    Codex,
    ClaudeCode,
    OpenCode,
    OpenClaw,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SessionState {
    Idle,
    Thinking,
    Running,
    WaitingApproval,
    Completed,
    Failed,
    Offline,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum SessionEvent {
    SessionStarted {
        summary: SessionSummary,
    },
    StateChanged {
        state: SessionState,
    },
    UserMessage {
        text: String,
    },
    AgentMessage {
        text: String,
        #[serde(default)]
        complete: bool,
    },
    ToolStarted {
        name: String,
        input: Value,
    },
    ToolFinished {
        name: String,
        ok: bool,
        summary: String,
    },
    CommandOutput {
        command: String,
        exit_code: Option<i32>,
        summary: String,
    },
    DiffUpdated {
        summary: DiffSummary,
    },
    ApprovalRequested {
        request: ApprovalRequest,
    },
    ApprovalResolved {
        approval_id: ApprovalId,
        approved: bool,
    },
    Error {
        message: String,
        phase: Option<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffSummary {
    pub files_changed: u32,
    pub additions: u32,
    pub deletions: u32,
    pub files: Vec<DiffFileSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffFileSummary {
    pub path: String,
    pub additions: u32,
    pub deletions: u32,
    pub risk: RiskLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRequest {
    pub request_id: String,
    pub host_id: HostId,
    pub session_id: Option<SessionId>,
    pub workspace: Option<String>,
    pub max_depth: u32,
    pub max_entries: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSnapshot {
    pub request_id: String,
    pub host_id: HostId,
    pub workspace: String,
    pub root_name: String,
    #[serde(with = "time::serde::rfc3339")]
    pub generated_at: OffsetDateTime,
    pub tree: Vec<ProjectTreeEntry>,
    pub tree_truncated: bool,
    pub worktrees: Vec<WorktreeSummary>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePreviewRequest {
    pub request_id: String,
    pub host_id: HostId,
    pub session_id: Option<SessionId>,
    pub workspace: String,
    pub path: String,
    pub max_bytes: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePreview {
    pub request_id: String,
    pub host_id: HostId,
    pub workspace: String,
    pub path: String,
    pub name: String,
    pub language: Option<String>,
    pub size_bytes: u64,
    pub truncated: bool,
    pub content: Option<String>,
    #[serde(with = "time::serde::rfc3339")]
    pub generated_at: OffsetDateTime,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTreeEntry {
    pub path: String,
    pub name: String,
    pub kind: ProjectEntryKind,
    pub depth: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProjectEntryKind {
    Directory,
    File,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeSummary {
    pub path: String,
    pub branch: Option<String>,
    pub head: Option<String>,
    pub dirty: bool,
    pub files_changed: u32,
    pub additions: u32,
    pub deletions: u32,
    pub files: Vec<DiffFileSummary>,
    pub diff_truncated: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalRequest {
    pub approval_id: ApprovalId,
    pub source: AgentKind,
    pub action: ApprovalAction,
    pub title: String,
    pub summary: String,
    pub affected_files: Vec<String>,
    pub risk: RiskLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ApprovalAction {
    Command,
    FileChange,
    ToolCall,
    Permission,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientCommand {
    pub command_id: CommandId,
    pub host_id: HostId,
    pub session_id: SessionId,
    pub kind: ClientCommandKind,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    pub payload: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ClientCommandKind {
    InputSubmit,
    SessionInterrupt,
    SessionResume,
    SessionStop,
    ApprovalApprove,
    ApprovalReject,
    CommandInvoke,
    PickerItemSelected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PickerRegistryItem {
    pub id: String,
    pub trigger: PickerTrigger,
    pub label: String,
    pub kind: PickerItemKind,
    pub source: AgentKind,
    pub description: Option<String>,
    pub insert_text: String,
    pub execute_mode: PickerExecuteMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PickerRegistry {
    pub host_id: HostId,
    pub session_id: SessionId,
    pub items: Vec<PickerRegistryItem>,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PickerTrigger {
    #[serde(rename = "/")]
    Slash,
    #[serde(rename = "$")]
    Dollar,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PickerItemKind {
    SlashCommand,
    Skill,
    Plugin,
    Preset,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PickerExecuteMode {
    Insert,
    Submit,
    HostAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub enum RelayClientMessage {
    Register {
        role: RelayClientRole,
        client_id: ClientId,
        host_id: Option<HostId>,
    },
    HostStatus {
        status: HostStatus,
    },
    SessionEvent {
        envelope: AgentPalEnvelope<SessionEvent>,
    },
    ClientCommand {
        command: ClientCommand,
    },
    HistoryRequest {
        request: HistoryRequest,
    },
    WorkspaceRequest {
        request: WorkspaceRequest,
    },
    WorkspaceSnapshot {
        snapshot: WorkspaceSnapshot,
    },
    FilePreviewRequest {
        request: FilePreviewRequest,
    },
    FilePreview {
        preview: FilePreview,
    },
    PickerRegistry {
        registry: PickerRegistry,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum RelayClientRole {
    Host,
    Mobile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub enum RelayServerMessage {
    Snapshot {
        hosts: Vec<HostStatus>,
        sessions: Vec<SessionSummary>,
        picker_registries: Vec<PickerRegistry>,
        workspace_snapshots: Vec<WorkspaceSnapshot>,
    },
    HostStatus {
        status: HostStatus,
    },
    SessionEvent {
        envelope: AgentPalEnvelope<SessionEvent>,
    },
    ClientCommand {
        command: ClientCommand,
    },
    HistoryRequest {
        request: HistoryRequest,
    },
    WorkspaceRequest {
        request: WorkspaceRequest,
    },
    WorkspaceSnapshot {
        snapshot: WorkspaceSnapshot,
    },
    FilePreviewRequest {
        request: FilePreviewRequest,
    },
    FilePreview {
        preview: FilePreview,
    },
    HistoryPage {
        page: HistoryPage,
    },
    PickerRegistry {
        registry: PickerRegistry,
    },
    RelayNotice {
        message: String,
    },
    Error {
        message: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryRequest {
    pub request_id: String,
    pub host_id: HostId,
    pub session_id: SessionId,
    pub before_seq: Option<u64>,
    pub limit: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryPage {
    pub request_id: String,
    pub host_id: HostId,
    pub session_id: SessionId,
    pub events: Vec<SessionEventEnvelope>,
    pub has_more: bool,
    pub oldest_seq: Option<u64>,
    pub newest_seq: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairingPayload {
    pub version: u32,
    pub relay_url: String,
    pub host_id: HostId,
    pub host_name: String,
    pub pair_token: PairToken,
    #[serde(with = "time::serde::rfc3339::option")]
    pub expires_at: Option<OffsetDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HostStatus {
    pub host_id: HostId,
    pub name: String,
    pub online: bool,
    pub agent_kinds: Vec<AgentKind>,
    pub workspaces: Vec<String>,
    pub active_sessions: u32,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

impl HostStatus {
    pub fn local_codex(
        host_id: impl Into<HostId>,
        name: impl Into<String>,
        workspace: impl Into<String>,
    ) -> Self {
        Self {
            host_id: host_id.into(),
            name: name.into(),
            online: true,
            agent_kinds: vec![AgentKind::Codex],
            workspaces: vec![workspace.into()],
            active_sessions: 0,
            updated_at: OffsetDateTime::now_utc(),
        }
    }
}

impl ClientCommand {
    pub fn input_submit(
        command_id: impl Into<CommandId>,
        host_id: impl Into<HostId>,
        session_id: impl Into<SessionId>,
        text: impl Into<String>,
    ) -> Self {
        Self {
            command_id: command_id.into(),
            host_id: host_id.into(),
            session_id: session_id.into(),
            kind: ClientCommandKind::InputSubmit,
            created_at: OffsetDateTime::now_utc(),
            payload: serde_json::json!({ "text": text.into() }),
        }
    }
}
