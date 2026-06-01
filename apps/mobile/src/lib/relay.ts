import Constants from "expo-constants";
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
