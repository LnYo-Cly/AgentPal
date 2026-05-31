import { Platform } from "react-native";

export type AgentKind = "codex" | "claude-code" | "open-code" | "open-claw" | "custom";
export type SessionState = "idle" | "thinking" | "running" | "waiting-approval" | "completed" | "failed" | "offline";

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

export type SessionEvent =
  | { type: "session-started"; summary: SessionSummary }
  | { type: "state-changed"; state: SessionState }
  | { type: "user-message"; text: string }
  | { type: "agent-message"; text: string }
  | { type: "tool-started"; name: string; input: unknown }
  | { type: "tool-finished"; name: string; ok: boolean; summary: string }
  | { type: "command-output"; command: string; exitCode?: number | null; summary: string }
  | { type: "diff-updated"; summary: DiffSummary }
  | { type: "approval-requested"; request: unknown }
  | { type: "approval-resolved"; approvalId: string; approved: boolean }
  | { type: "error"; message: string; phase?: string | null };

export type RelayServerMessage =
  | { type: "snapshot"; hosts: HostStatus[]; sessions: SessionSummary[] }
  | { type: "host-status"; status: HostStatus }
  | { type: "session-event"; envelope: AgentPalEnvelope<SessionEvent> }
  | { type: "client-command"; command: ClientCommand }
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
  | { type: "register"; role: "mobile"; clientId: string; hostId?: string | null }
  | { type: "client-command"; command: ClientCommand };

export type ConnectionState = "connecting" | "online" | "offline" | "error";

export function defaultRelayUrl() {
  if (Platform.OS === "android") {
    return "ws://10.0.2.2:8790/ws";
  }
  return "ws://127.0.0.1:8790/ws";
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
