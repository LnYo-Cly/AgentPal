import Constants from "expo-constants";
import { Platform } from "react-native";

export type AgentKind = "codex" | "claude-code" | "open-code" | "open-claw" | "custom";
export type SessionState = "idle" | "thinking" | "running" | "waiting-approval" | "completed" | "failed" | "offline";
export type PickerTrigger = "/" | "$";
export type PickerItemKind = "slash-command" | "skill" | "plugin" | "preset";
export type PickerExecuteMode = "insert" | "submit" | "host-action";

export type HostStatus = {
  hostId: string;
  name: string;
  online: boolean;
  agentKinds: AgentKind[];
  workspaces: string[];
  activeSessions: number;
  updatedAt: string;
};

export type SessionSummary = {
  sessionId: string;
  agentKind: AgentKind;
  workspace: string;
  title?: string | null;
  state: SessionState;
  pendingApprovals: number;
  updatedAt: string;
};

export type AgentPalEnvelope<T> = {
  id: string;
  hostId: string;
  sessionId?: string | null;
  seq: number;
  createdAt: string;
  payload: T;
};

export type SessionEventEnvelope = AgentPalEnvelope<SessionEvent>;

export type DiffSummary = {
  filesChanged: number;
  additions: number;
  deletions: number;
  files: Array<{
    path: string;
    additions: number;
    deletions: number;
    risk: "low" | "medium" | "high";
  }>;
};

export type WorkspaceRequest = {
  requestId: string;
  hostId: string;
  sessionId?: string | null;
  workspace?: string | null;
  maxDepth: number;
  maxEntries: number;
};

export type WorkspaceSnapshot = {
  requestId: string;
  hostId: string;
  workspace: string;
  rootName: string;
  generatedAt: string;
  tree: ProjectTreeEntry[];
  treeTruncated: boolean;
  worktrees: WorktreeSummary[];
  error?: string | null;
};

export type FilePreviewRequest = {
  requestId: string;
  hostId: string;
  sessionId?: string | null;
  workspace: string;
  path: string;
  maxBytes: number;
};

export type FilePreview = {
  requestId: string;
  hostId: string;
  workspace: string;
  path: string;
  name: string;
  language?: string | null;
  sizeBytes: number;
  truncated: boolean;
  content?: string | null;
  generatedAt: string;
  error?: string | null;
};

export type ProjectTreeEntry = {
  path: string;
  name: string;
  kind: "directory" | "file";
  depth: number;
};

export type WorktreeSummary = {
  path: string;
  branch?: string | null;
  head?: string | null;
  dirty: boolean;
  filesChanged: number;
  additions: number;
  deletions: number;
  files: DiffSummary["files"];
  diffTruncated: boolean;
  error?: string | null;
};

export type SessionEvent =
  | { type: "session-started"; summary: SessionSummary }
  | { type: "state-changed"; state: SessionState }
  | { type: "user-message"; text: string }
  | { type: "agent-message"; text: string; complete?: boolean }
  | { type: "tool-started"; name: string; input: unknown }
  | { type: "tool-finished"; name: string; ok: boolean; summary: string }
  | { type: "command-output"; command: string; exitCode?: number | null; summary: string }
  | { type: "diff-updated"; summary: DiffSummary }
  | { type: "approval-requested"; request: unknown }
  | { type: "approval-resolved"; approvalId: string; approved: boolean }
  | { type: "error"; message: string; phase?: string | null };

export type RelayServerMessage =
  | { type: "snapshot"; hosts: HostStatus[]; sessions: SessionSummary[]; pickerRegistries?: PickerRegistry[]; workspaceSnapshots?: WorkspaceSnapshot[] }
  | { type: "pair-created"; pairing: PairingPayload }
  | { type: "pair-claimed"; claim: PairClaimAccepted }
  | { type: "host-status"; status: HostStatus }
  | { type: "session-event"; envelope: AgentPalEnvelope<SessionEvent> }
  | { type: "client-command"; command: ClientCommand }
  | { type: "history-request"; request: HistoryRequest }
  | { type: "workspace-request"; request: WorkspaceRequest }
  | { type: "workspace-snapshot"; snapshot: WorkspaceSnapshot }
  | { type: "file-preview-request"; request: FilePreviewRequest }
  | { type: "file-preview"; preview: FilePreview }
  | { type: "history-page"; page: HistoryPage }
  | { type: "picker-registry"; registry: PickerRegistry }
  | { type: "relay-notice"; message: string }
  | { type: "error"; message: string };

export type ClientCommand = {
  commandId: string;
  hostId: string;
  sessionId: string;
  kind: "input-submit";
  createdAt: string;
  payload: {
    text: string;
  };
};

export type RelayClientMessage =
  | { type: "register"; role: "mobile"; clientId: string; hostId?: string | null; deviceId?: string | null; deviceToken?: string | null }
  | { type: "pair-create"; request: PairCreateRequest }
  | { type: "pair-claim"; request: PairClaimRequest }
  | { type: "client-command"; command: ClientCommand }
  | { type: "history-request"; request: HistoryRequest }
  | { type: "workspace-request"; request: WorkspaceRequest }
  | { type: "file-preview-request"; request: FilePreviewRequest };

export type PickerRegistryItem = {
  id: string;
  trigger: PickerTrigger;
  label: string;
  kind: PickerItemKind;
  source: AgentKind;
  description?: string | null;
  insertText: string;
  executeMode: PickerExecuteMode;
};

export type PickerRegistry = {
  hostId: string;
  sessionId: string;
  items: PickerRegistryItem[];
  updatedAt: string;
};

export type HistoryRequest = {
  requestId: string;
  hostId: string;
  sessionId: string;
  beforeSeq?: number | null;
  limit: number;
};

export type HistoryPage = {
  requestId: string;
  hostId: string;
  sessionId: string;
  events: SessionEventEnvelope[];
  hasMore: boolean;
  oldestSeq?: number | null;
  newestSeq?: number | null;
};

export type PairingPayload = {
  version: number;
  relayUrl: string;
  pairId?: string | null;
  hostId: string;
  hostName: string;
  pairToken: string;
  deviceId?: string | null;
  deviceToken?: string | null;
  expiresAt?: string | null;
};

export type PairCreateRequest = {
  hostId: string;
  hostName: string;
  relayUrl: string;
  pairId?: string | null;
  pairToken?: string | null;
  expiresInSeconds?: number | null;
};

export type PairClaimRequest = {
  pairId: string;
  pairToken: string;
  mobileClientId: string;
  deviceId?: string | null;
  deviceName?: string | null;
};

export type PairClaimAccepted = {
  pairId: string;
  hostId: string;
  hostName: string;
  mobileClientId: string;
  deviceId: string;
  deviceToken: string;
};

export type ConnectionState = "connecting" | "online" | "offline" | "error";

export const usbRelayUrl = "ws://127.0.0.1:8790/ws";
export const androidEmulatorRelayUrl = "ws://10.0.2.2:8790/ws";

export function defaultRelayUrl() {
  if (Platform.OS === "android") {
    return isAndroidEmulator() ? androidEmulatorRelayUrl : expoHostRelayUrl() ?? usbRelayUrl;
  }
  return expoHostRelayUrl() ?? usbRelayUrl;
}

export function normalizeRelayUrl(value: string) {
  let next = value.trim();
  if (!next) {
    return defaultRelayUrl();
  }
  if (!next.startsWith("ws://") && !next.startsWith("wss://")) {
    next = `ws://${next}`;
  }
  if (!/\/ws\/?$/.test(next)) {
    next = `${next.replace(/\/$/, "")}/ws`;
  }
  return next;
}

export function makeInputCommand(hostId: string, sessionId: string, text: string): ClientCommand {
  return {
    commandId: `mobile-${Date.now()}`,
    hostId,
    sessionId,
    kind: "input-submit",
    createdAt: new Date().toISOString(),
    payload: { text }
  };
}

export function makeHistoryRequest(hostId: string, sessionId: string, beforeSeq?: number | null, limit = 30): HistoryRequest {
  return {
    requestId: `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    hostId,
    sessionId,
    beforeSeq: beforeSeq ?? null,
    limit
  };
}

export function makeWorkspaceRequest(hostId: string, sessionId?: string | null, workspace?: string | null): WorkspaceRequest {
  return {
    requestId: `workspace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    hostId,
    sessionId: sessionId ?? null,
    workspace: workspace ?? null,
    maxDepth: 5,
    maxEntries: 500
  };
}

export function makeFilePreviewRequest(hostId: string, sessionId: string | null | undefined, workspace: string, path: string, maxBytes = 65536): FilePreviewRequest {
  return {
    requestId: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    hostId,
    sessionId: sessionId ?? null,
    workspace,
    path,
    maxBytes
  };
}

export function filePreviewKey(hostId: string, workspace: string, path: string) {
  return `${hostId}:${workspace}:${path}`;
}

function isAndroidEmulator() {
  const constants = Platform.constants as Record<string, unknown>;
  const fingerprint = String(constants.Fingerprint ?? "").toLowerCase();
  const model = String(constants.Model ?? "").toLowerCase();
  const brand = String(constants.Brand ?? "").toLowerCase();
  const manufacturer = String(constants.Manufacturer ?? "").toLowerCase();

  return (
    fingerprint.includes("generic") ||
    fingerprint.includes("emulator") ||
    model.includes("sdk") ||
    model.includes("emulator") ||
    brand.includes("generic") ||
    manufacturer.includes("genymotion")
  );
}

function expoHostRelayUrl() {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") {
    return null;
  }
  return `ws://${host}:8790/ws`;
}
