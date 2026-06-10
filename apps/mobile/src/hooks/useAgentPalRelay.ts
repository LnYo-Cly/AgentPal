import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { currentPairingPayload, updateStoredPairing } from "@/lib/pairing";
import {
  ConnectionState,
  FilePreview,
  HostStatus,
  PickerRegistry,
  RelayClientMessage,
  RelayServerMessage,
  SessionEventEnvelope,
  SessionEvent,
  SessionSummary,
  WorkspaceSnapshot,
  defaultRelayUrl,
  filePreviewKey,
  makeFilePreviewRequest,
  makeHistoryRequest,
  makeInputCommand,
  makeWorkspaceRequest
} from "@/lib/relay";

type TimelineItem = {
  id: string;
  hostId: string;
  sessionId?: string | null;
  createdAt: string;
  event: SessionEvent;
};

type SessionHistory = {
  events: SessionEventEnvelope[];
  loading: boolean;
  hasMore: boolean;
  oldestSeq: number | null;
  error: string | null;
  latestRequestId: string | null;
};

export type FilePreviewState = {
  loading: boolean;
  preview: FilePreview | null;
  error: string | null;
  requestId: string | null;
};

const historyPageSize = 30;
const historyTimeoutMs = 9000;
const filePreviewTimeoutMs = 9000;

export function useAgentPalRelay(url = defaultRelayUrl(), pairedHostId?: string | null) {
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientIdRef = useRef(`mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [hosts, setHosts] = useState<HostStatus[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [sessionHistory, setSessionHistory] = useState<Record<string, SessionHistory>>({});
  const [pickerRegistries, setPickerRegistries] = useState<Record<string, PickerRegistry>>({});
  const [workspaceSnapshots, setWorkspaceSnapshots] = useState<Record<string, WorkspaceSnapshot>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, FilePreviewState>>({});
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;

    const connect = () => {
      if (stopped) {
        return;
      }

      const socket = new WebSocket(url);
      socketRef.current = socket;
      setConnectionState("connecting");

      socket.onopen = () => {
        setConnectionState("online");
        setLastError(null);
        const pairing = matchingPairingForConnection(url, pairedHostId ?? null);
        const clientId = clientIdRef.current;
        sendRaw(socket, {
          type: "register",
          role: "mobile",
          clientId,
          hostId: pairedHostId ?? null,
          deviceId: pairing?.deviceId ?? null,
          deviceToken: pairing?.deviceToken ?? null
        });
        if (pairing?.pairId && isCloudPairToken(pairing.pairToken) && !pairing.deviceToken) {
          sendRaw(socket, {
            type: "pair-claim",
            request: {
              pairId: pairing.pairId,
              pairToken: pairing.pairToken,
              mobileClientId: clientId,
              deviceId: pairing.deviceId ?? null,
              deviceName: "AgentPal Mobile"
            }
          });
        }
      };

      socket.onmessage = (message) => {
        try {
          const parsed = JSON.parse(String(message.data)) as RelayServerMessage;
          applyServerMessage(parsed, setHosts, setSessions, setTimeline, setSessionHistory, setPickerRegistries, setWorkspaceSnapshots, setFilePreviews, setLastError);
          if (parsed.type === "pair-claimed") {
            const claim = parsed.claim;
            updateStoredPairing((pairing) => {
              if (pairing.pairId !== claim.pairId || pairing.hostId !== claim.hostId) {
                return null;
              }
              return {
                ...pairing,
                hostName: claim.hostName || pairing.hostName,
                deviceId: claim.deviceId,
                deviceToken: claim.deviceToken
              };
            })
              .then((next) => {
                if (next && socketRef.current === socket && socket.readyState === WebSocket.OPEN) {
                  socket.close();
                }
              })
              .catch((error) => {
                setLastError(error instanceof Error ? error.message : "配对凭据保存失败");
              });
          }
        } catch (error) {
          setLastError(error instanceof Error ? error.message : "Relay message parse failed");
        }
      };

      socket.onerror = () => {
        setConnectionState("error");
        setLastError(`无法连接 Relay: ${url}`);
      };

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        if (stopped) {
          return;
        }
        setConnectionState((current) => (current === "error" ? "error" : "offline"));
        retryRef.current = setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      stopped = true;
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [pairedHostId, reconnectNonce, url]);

  const activeHost = useMemo(
    () => {
      if (pairedHostId) {
        return hosts.find((host) => host.hostId === pairedHostId) ?? null;
      }
      return hosts.find((host) => host.online) ?? hosts[0] ?? null;
    },
    [hosts, pairedHostId]
  );
  const activeSession = useMemo(() => sessions[0] ?? null, [sessions]);

  const requestSessionHistory = useCallback(
    (hostId: string, sessionId: string, beforeSeq?: number | null) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }

      let shouldRequest = false;
      const request = makeHistoryRequest(hostId, sessionId, beforeSeq, historyPageSize);
      setSessionHistory((items) => {
        const current = items[sessionId];
        if (current?.loading || (beforeSeq && current && !current.hasMore)) {
          return items;
        }
        shouldRequest = true;
        return {
          ...items,
          [sessionId]: {
            events: current?.events ?? [],
            hasMore: current?.hasMore ?? true,
            oldestSeq: current?.oldestSeq ?? null,
            loading: true,
            error: null,
            latestRequestId: request.requestId
          }
        };
      });

      if (!shouldRequest) {
        return false;
      }

      sendRaw(socket, {
        type: "history-request",
        request
      });
      setTimeout(() => {
        setSessionHistory((items) => {
          const current = items[sessionId];
          if (!current?.loading || current.latestRequestId !== request.requestId) {
            return items;
          }
          return {
            ...items,
            [sessionId]: {
              ...current,
              loading: false,
              hasMore: current.events.length > 0 ? current.hasMore : false,
              error: "历史加载超时",
              latestRequestId: null
            }
          };
        });
      }, historyTimeoutMs);
      return true;
    },
    []
  );

  const loadLatestHistory = useCallback(
    (sessionId: string) => {
      const hostId = activeHost?.hostId;
      if (!hostId) {
        return false;
      }
      return requestSessionHistory(hostId, sessionId, null);
    },
    [activeHost, requestSessionHistory]
  );

  const loadOlderHistory = useCallback(
    (sessionId: string) => {
      const current = sessionHistory[sessionId];
      if (!current?.hasMore || !current.oldestSeq) {
        return false;
      }
      const hostId = activeHost?.hostId;
      if (!hostId) {
        return false;
      }
      return requestSessionHistory(hostId, sessionId, current.oldestSeq);
    },
    [activeHost, requestSessionHistory, sessionHistory]
  );

  const submit = useCallback(
    (text: string, sessionIdOverride?: string | null) => {
      const trimmed = text.trim();
      const socket = socketRef.current;
      if (!trimmed || !activeHost || !socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }
      const sessionId = sessionIdOverride ?? activeSession?.sessionId ?? "agentpal-codex-local";
      const message: RelayClientMessage = {
        type: "client-command",
        command: makeInputCommand(activeHost.hostId, sessionId, trimmed)
      };
      sendRaw(socket, message);
      return true;
    },
    [activeHost, activeSession]
  );

  const requestWorkspaceSnapshot = useCallback(
    (sessionId?: string | null, workspace?: string | null) => {
      const socket = socketRef.current;
      const hostId = activeHost?.hostId;
      if (!hostId || !socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }
      const message: RelayClientMessage = {
        type: "workspace-request",
        request: makeWorkspaceRequest(hostId, sessionId, workspace)
      };
      sendRaw(socket, message);
      return true;
    },
    [activeHost]
  );

  const requestFilePreview = useCallback(
    (sessionId: string | null | undefined, workspace: string, path: string) => {
      const socket = socketRef.current;
      const hostId = activeHost?.hostId;
      if (!hostId || !socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }
      const request = makeFilePreviewRequest(hostId, sessionId, workspace, path);
      const key = filePreviewKey(hostId, workspace, path);
      setFilePreviews((items) => ({
        ...items,
        [key]: {
          loading: true,
          preview: items[key]?.preview ?? null,
          error: null,
          requestId: request.requestId
        }
      }));
      sendRaw(socket, {
        type: "file-preview-request",
        request
      });
      setTimeout(() => {
        setFilePreviews((items) => {
          const current = items[key];
          if (!current?.loading || current.requestId !== request.requestId) {
            return items;
          }
          return {
            ...items,
            [key]: {
              ...current,
              loading: false,
              error: "文件预览加载超时",
              requestId: null
            }
          };
        });
      }, filePreviewTimeoutMs);
      return true;
    },
    [activeHost]
  );

  const reconnect = useCallback(() => {
    setHosts([]);
    setSessions([]);
    setTimeline([]);
    setSessionHistory({});
    setPickerRegistries({});
    setWorkspaceSnapshots({});
    setFilePreviews({});
    setConnectionState("connecting");
    setLastError(null);
    setReconnectNonce((value) => value + 1);
  }, []);

  return {
    relayUrl: url,
    connectionState,
    hosts,
    sessions,
    timeline,
    sessionHistory,
    pickerRegistries,
    workspaceSnapshots,
    filePreviews,
    activeHost,
    activeSession,
    lastError,
    reconnect,
    submit,
    requestWorkspaceSnapshot,
    requestFilePreview,
    loadLatestHistory,
    loadOlderHistory
  };
}

function sendRaw(socket: WebSocket, message: RelayClientMessage) {
  socket.send(JSON.stringify(message));
}

function matchingPairingForConnection(relayUrl: string, hostId: string | null) {
  const pairing = currentPairingPayload();
  if (!pairing || pairing.relayUrl !== relayUrl) {
    return null;
  }
  if (hostId && pairing.hostId !== hostId) {
    return null;
  }
  return pairing;
}

function isCloudPairToken(pairToken: string) {
  return pairToken !== "manual" && pairToken !== "discovered";
}

function applyServerMessage(
  message: RelayServerMessage,
  setHosts: (updater: (items: HostStatus[]) => HostStatus[]) => void,
  setSessions: (updater: (items: SessionSummary[]) => SessionSummary[]) => void,
  setTimeline: (updater: (items: TimelineItem[]) => TimelineItem[]) => void,
  setSessionHistory: (updater: (items: Record<string, SessionHistory>) => Record<string, SessionHistory>) => void,
  setPickerRegistries: (updater: (items: Record<string, PickerRegistry>) => Record<string, PickerRegistry>) => void,
  setWorkspaceSnapshots: (updater: (items: Record<string, WorkspaceSnapshot>) => Record<string, WorkspaceSnapshot>) => void,
  setFilePreviews: (updater: (items: Record<string, FilePreviewState>) => Record<string, FilePreviewState>) => void,
  setLastError: (value: string | null) => void
) {
  switch (message.type) {
    case "snapshot":
      setHosts(() => message.hosts);
      setSessions(() => message.sessions);
      setPickerRegistries(() => Object.fromEntries((message.pickerRegistries ?? []).map((registry) => [registry.sessionId, registry])));
      setWorkspaceSnapshots(() => Object.fromEntries((message.workspaceSnapshots ?? []).map((snapshot) => [workspaceSnapshotKey(snapshot.hostId, snapshot.workspace), snapshot])));
      setLastError(null);
      break;
    case "pair-created":
    case "pair-claimed":
      setLastError(null);
      break;
    case "host-status":
      setHosts((items) => upsertBy(items, message.status, (item) => item.hostId));
      setLastError(null);
      break;
    case "session-event":
      setLastError(null);
      const payload = message.envelope.payload;
      if (payload.type === "session-started") {
        const summary = payload.summary;
        setSessions((items) => upsertBy(items, summary, (item) => item.sessionId));
      }
      if (payload.type === "state-changed" && message.envelope.sessionId) {
        const state = payload.state;
        const sessionId = message.envelope.sessionId;
        const createdAt = message.envelope.createdAt;
        setSessions((items) =>
          items.map((item) =>
            item.sessionId === sessionId
              ? { ...item, state, updatedAt: createdAt }
              : item
          )
        );
      }
      setTimeline((items) =>
        [
          {
            id: message.envelope.id,
            hostId: message.envelope.hostId,
            sessionId: message.envelope.sessionId,
            createdAt: message.envelope.createdAt,
            event: message.envelope.payload
          },
          ...items
        ].slice(0, 80)
      );
      if (message.envelope.sessionId) {
        setSessionHistory((items) => mergeRealtimeEnvelope(items, message.envelope));
      }
      break;
    case "history-page":
      setLastError(null);
      setSessionHistory((items) => mergeHistoryPage(items, message.page.sessionId, message.page.events, message.page.hasMore));
      break;
    case "picker-registry":
      setLastError(null);
      setPickerRegistries((items) => ({
        ...items,
        [message.registry.sessionId]: message.registry
      }));
      break;
    case "workspace-snapshot":
      setLastError(null);
      setWorkspaceSnapshots((items) => ({
        ...items,
        [workspaceSnapshotKey(message.snapshot.hostId, message.snapshot.workspace)]: message.snapshot
      }));
      break;
    case "file-preview":
      setLastError(null);
      setFilePreviews((items) => {
        const key = filePreviewKey(message.preview.hostId, message.preview.workspace, message.preview.path);
        return {
          ...items,
          [key]: {
            loading: false,
            preview: message.preview,
            error: message.preview.error ?? null,
            requestId: null
          }
        };
      });
      break;
    case "error":
      setLastError(message.message);
      break;
    case "relay-notice":
    case "client-command":
    case "history-request":
    case "workspace-request":
    case "file-preview-request":
      break;
    default:
      setLastError(null);
  }
}

export function workspaceSnapshotKey(hostId: string, workspace: string) {
  return `${hostId}:${workspace}`;
}

function mergeRealtimeEnvelope(items: Record<string, SessionHistory>, envelope: SessionEventEnvelope) {
  const sessionId = envelope.sessionId;
  if (!sessionId) {
    return items;
  }
  const current = items[sessionId] ?? { events: [], loading: false, hasMore: true, oldestSeq: null, error: null, latestRequestId: null };
  if (current.events.some((item) => item.id === envelope.id)) {
    return items;
  }
  const events = sortEvents([...current.events, envelope]);
  return {
    ...items,
    [sessionId]: {
      ...current,
      events,
      oldestSeq: events[0]?.seq ?? current.oldestSeq,
      loading: false,
      error: null,
      latestRequestId: null
    }
  };
}

function mergeHistoryPage(items: Record<string, SessionHistory>, sessionId: string, nextEvents: SessionEventEnvelope[], hasMore: boolean) {
  const current = items[sessionId] ?? { events: [], loading: false, hasMore: true, oldestSeq: null, error: null, latestRequestId: null };
  const byId = new Map<string, SessionEventEnvelope>();
  for (const event of current.events) {
    byId.set(event.id, event);
  }
  for (const event of nextEvents) {
    byId.set(event.id, event);
  }
  const events = sortEvents(Array.from(byId.values()));
  return {
    ...items,
    [sessionId]: {
      events,
      hasMore,
      loading: false,
      oldestSeq: events[0]?.seq ?? null,
      error: null,
      latestRequestId: null
    }
  };
}

function sortEvents(events: SessionEventEnvelope[]) {
  return events.slice().sort((a, b) => a.seq - b.seq);
}

function upsertBy<T>(items: T[], next: T, getKey: (item: T) => string) {
  const key = getKey(next);
  const index = items.findIndex((item) => getKey(item) === key);
  if (index < 0) {
    return [next, ...items];
  }
  const copy = items.slice();
  copy[index] = next;
  return copy;
}
