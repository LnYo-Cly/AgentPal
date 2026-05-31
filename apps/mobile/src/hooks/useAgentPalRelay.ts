import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ConnectionState,
  HostStatus,
  RelayClientMessage,
  RelayServerMessage,
  SessionEvent,
  SessionSummary,
  defaultRelayUrl,
  makeInputCommand
} from "@/lib/relay";

type TimelineItem = {
  id: string;
  hostId: string;
  sessionId?: string | null;
  createdAt: string;
  event: SessionEvent;
};

export function useAgentPalRelay(url = defaultRelayUrl()) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [hosts, setHosts] = useState<HostStatus[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;
    setConnectionState("connecting");

    socket.onopen = () => {
      setConnectionState("online");
      sendRaw(socket, {
        type: "register",
        role: "mobile",
        clientId: `mobile-${Date.now()}`,
        hostId: null
      });
    };

    socket.onmessage = (message) => {
      try {
        const parsed = JSON.parse(String(message.data)) as RelayServerMessage;
        applyServerMessage(parsed, setHosts, setSessions, setTimeline, setLastError);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : "Relay message parse failed");
      }
    };

    socket.onerror = () => {
      setConnectionState("error");
      setLastError(`无法连接 Relay: ${url}`);
    };

    socket.onclose = () => {
      setConnectionState((current) => (current === "error" ? "error" : "offline"));
    };

    return () => {
      socket.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [url]);

  const activeHost = useMemo(() => hosts.find((host) => host.online) ?? hosts[0] ?? null, [hosts]);
  const activeSession = useMemo(() => sessions[0] ?? null, [sessions]);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const socket = socketRef.current;
      if (!trimmed || !activeHost || !socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }
      const sessionId = activeSession?.sessionId ?? "agentpal-codex-local";
      const message: RelayClientMessage = {
        type: "client-command",
        command: makeInputCommand(activeHost.hostId, sessionId, trimmed)
      };
      sendRaw(socket, message);
      return true;
    },
    [activeHost, activeSession]
  );

  return {
    relayUrl: url,
    connectionState,
    hosts,
    sessions,
    timeline,
    activeHost,
    activeSession,
    lastError,
    submit
  };
}

function sendRaw(socket: WebSocket, message: RelayClientMessage) {
  socket.send(JSON.stringify(message));
}

function applyServerMessage(
  message: RelayServerMessage,
  setHosts: (updater: (items: HostStatus[]) => HostStatus[]) => void,
  setSessions: (updater: (items: SessionSummary[]) => SessionSummary[]) => void,
  setTimeline: (updater: (items: TimelineItem[]) => TimelineItem[]) => void,
  setLastError: (value: string | null) => void
) {
  switch (message.type) {
    case "snapshot":
      setHosts(() => message.hosts);
      setSessions(() => message.sessions);
      break;
    case "host-status":
      setHosts((items) => upsertBy(items, message.status, (item) => item.hostId));
      break;
    case "session-event":
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
      break;
    case "error":
      setLastError(message.message);
      break;
    case "relay-notice":
    case "client-command":
      break;
    default:
      setLastError(null);
  }
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
