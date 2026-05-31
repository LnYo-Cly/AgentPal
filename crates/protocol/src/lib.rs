use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::OffsetDateTime;
use uuid::Uuid;

pub type HostId = String;
pub type SessionId = String;
pub type CommandId = String;
pub type ApprovalId = String;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
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
