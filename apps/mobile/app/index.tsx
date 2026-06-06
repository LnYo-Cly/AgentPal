import { ThemeProvider } from "@shopify/restyle";
import {
  Activity,
  ArrowLeft,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  FileDiff,
  FileText,
  Folder,
  GitBranch,
  Mic,
  Monitor,
  X,
  QrCode,
  Paperclip,
  RefreshCcw,
  Send,
  Settings,
  Trash2,
  ShieldAlert,
  TerminalSquare,
  Wrench,
  Zap
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from "expo-secure-store";
import MarkdownIt from "markdown-it";
import Prism from "prismjs";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-diff.js";
import "prismjs/components/prism-javascript.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-markup.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-markdown.js";
import "prismjs/components/prism-powershell.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-rust.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-tsx.js";
import "prismjs/components/prism-yaml.js";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, AppState, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text as NativeText, TextInput, useColorScheme, useWindowDimensions, View } from "react-native";
import RenderHTML from "react-native-render-html";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAgentPalRelay, type FilePreviewState } from "@/hooks/useAgentPalRelay";
import { clearStoredPairing, loadStoredPairing, PairingPayload, parsePairingInput, saveStoredPairing } from "@/lib/pairing";
import { ConnectionState, HostStatus, PickerRegistryItem, ProjectTreeEntry, SessionEvent, SessionEventEnvelope, SessionState, SessionSummary, WorkspaceSnapshot, WorktreeSummary, filePreviewKey } from "@/lib/relay";
import { applyThemePalette, Box, ResolvedThemeMode, Text, theme, ThemePreference } from "@/theme";

type ActiveTab = "home" | "sessions" | "conversation" | "settings";
type ConversationPanel = "chat" | "project" | "changes";
type ToastState = { id: number; text: string } | null;
type Tone = "blue" | "amber" | "green" | "danger" | "neutral" | "violet";
type ThemeColorName = keyof typeof theme.colors;
type IconComponent = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
type CameraViewComponent = React.ComponentType<Record<string, unknown>>;
type GlassViewComponent = React.ComponentType<Record<string, unknown>>;
type BarcodeScanningResult = { data?: string | null };
type DynamicIslandTestState = "idle" | "running" | "approval";
type GlassModule = {
  GlassView?: GlassViewComponent;
  isGlassEffectAPIAvailable?: () => boolean;
  isLiquidGlassAvailable?: () => boolean;
};
type GlassDiagnostics = {
  enabled: boolean;
  reason: string;
  platform: string;
  moduleLoaded: boolean;
  reduceTransparencyEnabled: boolean;
  liquidGlassAvailable: boolean;
  glassApiAvailable: boolean;
};
type DynamicIslandStatus = {
  label: string;
  shortLabel: string;
  body: string;
  icon: IconComponent;
  token: ThemeColorName;
  bgToken: ThemeColorName;
  borderToken: ThemeColorName;
  color: string;
};
type PairingUiState = {
  title: string;
  body: string;
  badge: string;
  tone: Tone;
  icon: IconComponent;
  token: ThemeColorName;
  panelBg: ThemeColorName;
  borderColor: ThemeColorName;
};
type PairingStepState = "done" | "active" | "danger" | "todo";
type DisplayEvent = SessionEventEnvelope & { pending?: boolean };
type CommandPickerMode = "skill" | "slash";
type CommandOption = {
  id: string;
  label: string;
  insertText: string;
  description: string;
  kind: string;
  disabled?: boolean;
};
type PickerSheetState = {
  synced: boolean;
  updatedAt: string | null;
};
type ToolDetail = {
  title: string;
  status: string;
  tone: Tone;
  summary: string;
  rawName: string;
  rawSummary: string;
  command?: string;
  output?: string | null;
};
type CodeDetail = {
  title: string;
  language: string;
  code: string;
};
type FilePreviewTarget = {
  hostId: string;
  workspace: string;
  sessionId: string | null;
  entry: ProjectTreeEntry;
};
type ConversationListItem =
  | { kind: "context"; id: string; session: SessionSummary }
  | { kind: "history"; id: string }
  | { kind: "loading"; id: string }
  | { kind: "empty-history"; id: string }
  | { kind: "empty-session"; id: string; session: SessionSummary }
  | { kind: "no-session"; id: string }
  | { kind: "event"; id: string; envelope: DisplayEvent }
  | { kind: "turn-status"; id: string; session: SessionSummary };
type MarkdownSegment =
  | { type: "markdown"; id: string; text: string }
  | { type: "code"; id: string; language: string; code: string };
type HighlightSpan = {
  text: string;
  token: string;
};
type WorkspaceSessionGroup = {
  id: string;
  workspace: string;
  name: string;
  path: string;
  sessions: SessionSummary[];
  latestAt: string;
  activeCount: number;
  pendingApprovals: number;
  failedCount: number;
};

const markdownParser = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
});

const THEME_PREFERENCE_STORAGE_KEY = "agentpal.themePreference";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [pairing, setPairing] = useState<PairingPayload | null>(null);
  const relay = useAgentPalRelay(pairing?.relayUrl, pairing?.hostId);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [composerText, setComposerText] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [pairingSheetOpen, setPairingSheetOpen] = useState(false);
  const [reduceTransparencyEnabled, setReduceTransparencyEnabled] = useState(true);
  const [dynamicIslandTestState, setDynamicIslandTestState] = useState<DynamicIslandTestState>("running");
  const [pendingTurns, setPendingTurns] = useState<Record<string, { text: string; createdAt: string }>>({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [toolDetail, setToolDetail] = useState<ToolDetail | null>(null);
  const [codeDetail, setCodeDetail] = useState<CodeDetail | null>(null);
  const [filePreviewTarget, setFilePreviewTarget] = useState<FilePreviewTarget | null>(null);
  const [commandPickerMode, setCommandPickerMode] = useState<CommandPickerMode | null>(null);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const [conversationComposerHeight, setConversationComposerHeight] = useState(112);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const initialHistoryKickRef = useRef<Record<string, number>>({});
  const olderHistoryKickRef = useRef<Record<string, number>>({});
  const workspaceSnapshotKickRef = useRef<Record<string, number>>({});
  const systemColorScheme = useColorScheme();
  const resolvedTheme: ResolvedThemeMode = themePreference === "system" ? (systemColorScheme === "dark" ? "dark" : "light") : themePreference;
  const activeTheme = useMemo(() => applyThemePalette(resolvedTheme), [resolvedTheme]);
  const setThemePreference = useCallback((nextPreference: ThemePreference) => {
    setThemePreferenceState(nextPreference);
    SecureStore.setItemAsync(THEME_PREFERENCE_STORAGE_KEY, nextPreference).catch(() => {});
  }, []);

  const hostOnline = relay.connectionState === "online" && !!relay.activeHost?.online;
  const sessions = relay.sessions;
  const focusSession = useMemo(() => preferredSession(sessions), [sessions]);
  const selectedSession = sessions.find((session) => session.sessionId === selectedSessionId) ?? focusSession ?? null;
  const pendingApprovals = sessions.reduce((sum, item) => sum + item.pendingApprovals, 0);
  const activeSessions = sessions.filter(isWorkingSession).length;
  const glassModule = useMemo(() => loadGlassModule(), []);
  const glassDiagnostics = useMemo(() => getGlassDiagnostics(reduceTransparencyEnabled, glassModule), [glassModule, reduceTransparencyEnabled]);
  const nativeGlassEnabled = glassDiagnostics.enabled && !!glassModule?.GlassView;
  const latestVisibleEvent = useMemo(() => latestVisibleTimelineEvent(relay.timeline), [relay.timeline]);
  const latestHomeEvent = useMemo(() => latestVisibleEvent ?? (focusSession ? sessionStatusEvent(focusSession) : null), [focusSession, latestVisibleEvent]);
  const conversationEvents = useMemo(
    () => (selectedSession ? buildConversationEvents(relay.sessionHistory[selectedSession.sessionId]?.events ?? [], pendingTurns[selectedSession.sessionId]) : []),
    [pendingTurns, relay.sessionHistory, selectedSession]
  );
  const selectedHistory = selectedSession ? relay.sessionHistory[selectedSession.sessionId] : null;
  const selectedPickerRegistry = useMemo(() => {
    if (!selectedSession) {
      return null;
    }
    return relay.pickerRegistries[selectedSession.sessionId] ?? relay.pickerRegistries["agentpal-codex-local"] ?? null;
  }, [relay.pickerRegistries, selectedSession]);
  const selectedPickerItems = selectedPickerRegistry?.items ?? [];
  const selectedWorkspaceSnapshot = useMemo(
    () => matchingWorkspaceSnapshot(relay.workspaceSnapshots, relay.activeHost?.hostId ?? null, selectedSession?.workspace ?? null),
    [relay.activeHost?.hostId, relay.workspaceSnapshots, selectedSession?.workspace]
  );
  const selectedFilePreviewState = filePreviewTarget
    ? relay.filePreviews[filePreviewKey(filePreviewTarget.hostId, filePreviewTarget.workspace, filePreviewTarget.entry.path)] ?? null
    : null;
  const pickerSheetState = useMemo<PickerSheetState>(
    () => ({
      synced: !!selectedPickerRegistry,
      updatedAt: selectedPickerRegistry?.updatedAt ?? null
    }),
    [selectedPickerRegistry]
  );
  const commandOptions = useMemo(() => commandPickerOptions(commandPickerMode, selectedPickerItems), [commandPickerMode, selectedPickerItems]);

  useEffect(() => {
    let mounted = true;
    SecureStore.getItemAsync(THEME_PREFERENCE_STORAGE_KEY)
      .then((storedPreference) => {
        if (mounted && isThemePreference(storedPreference)) {
          setThemePreferenceState(storedPreference);
        }
      })
      .catch(() => {});

    loadStoredPairing()
      .then((stored) => {
        if (mounted && stored) {
          setPairing(stored);
        }
      })
      .catch(() => {});

    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((enabled) => {
        if (mounted) setReduceTransparencyEnabled(enabled);
      })
      .catch(() => {
        if (mounted) setReduceTransparencyEnabled(true);
      });

    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparencyEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (selectedSessionId || !sessions.length) {
      return;
    }
    if (focusSession) {
      setSelectedSessionId(focusSession.sessionId);
    }
  }, [focusSession, selectedSessionId, sessions.length]);

  useEffect(() => {
    setPendingTurns((items) => {
      let changed = false;
      const next = { ...items };
      for (const [sessionId, pending] of Object.entries(items)) {
        const events = relay.sessionHistory[sessionId]?.events ?? [];
        const hasRemoteUserMessage = events.some((event) => event.payload.type === "user-message" && event.payload.text === pending.text);
        const hasTerminalState = events.some(
          (event) =>
            event.payload.type === "state-changed" &&
            ["completed", "failed", "idle"].includes(event.payload.state)
        );
        if (hasRemoteUserMessage || hasTerminalState) {
          delete next[sessionId];
          changed = true;
        }
      }
      return changed ? next : items;
    });
  }, [relay.sessionHistory]);

  const savePairing = async (input: string) => {
    try {
      const next = parsePairingInput(input);
      await saveStoredPairing(next);
      setPairing(next);
      setPairingSheetOpen(false);
      setActiveTab("settings");
      relay.reconnect();
      showToast(setToast, "配对已保存，正在连接 Host");
    } catch (error) {
      showToast(setToast, error instanceof Error ? error.message : "配对地址无效");
    }
  };

  const clearPairing = async () => {
    await clearStoredPairing();
    setPairing(null);
    relay.reconnect();
    setActiveTab("settings");
    showToast(setToast, "已清除配对");
  };

  const saveDiscoveredHost = async () => {
    const activeHost = relay.activeHost;
    if (!activeHost?.hostId) {
      setPairingSheetOpen(true);
      return;
    }
    const next: PairingPayload = {
      version: 1,
      relayUrl: relay.relayUrl,
      hostId: activeHost.hostId,
      hostName: activeHost.name || "AgentPal Host",
      pairToken: "discovered",
      expiresAt: null
    };
    await saveStoredPairing(next);
    setPairing(next);
    relay.reconnect();
    showToast(setToast, "已固定为默认 Host");
  };

  const submitPrompt = () => {
    const trimmed = composerText.trim();
    if (!trimmed) {
      showToast(setToast, "先输入一条指令");
      return;
    }

    const targetSessionId = selectedSession?.sessionId ?? "agentpal-codex-local";
    const sent = relay.submit(trimmed, targetSessionId);
    if (sent) {
      setPendingTurns((items) => ({
        ...items,
        [targetSessionId]: { text: trimmed, createdAt: new Date().toISOString() }
      }));
      setComposerText("");
      return;
    }

    showToast(setToast, hostOnline ? "当前没有可用会话" : "Host 未连接");
  };

  const openSessionPicker = () => {
    if (!sessions.length) {
      showToast(setToast, "暂无可切换会话");
      return;
    }
    setSessionPickerOpen(true);
  };

  const selectSession = (sessionId: string) => {
    const next = sessions.find((session) => session.sessionId === sessionId);
    setSelectedSessionId(sessionId);
    setSessionPickerOpen(false);
    setActiveTab("conversation");
    if (next) {
      showToast(setToast, `已切换到 ${agentLabel(next.agentKind)}`);
    }
  };

  const requestWorkspaceSnapshotSilently = useCallback((force = false) => {
    if (!selectedSession || !relay.activeHost) {
      return false;
    }
    const key = `${relay.activeHost.hostId}:${selectedSession.workspace}`;
    const lastKick = workspaceSnapshotKickRef.current[key] ?? 0;
    if (!force && Date.now() - lastKick < 8_000) {
      return false;
    }
    workspaceSnapshotKickRef.current[key] = Date.now();
    return relay.requestWorkspaceSnapshot(selectedSession.sessionId, selectedSession.workspace);
  }, [relay.activeHost, relay.requestWorkspaceSnapshot, selectedSession]);

  const refreshSelectedSession = useCallback(() => {
    if (!selectedSession) {
      showToast(setToast, "当前没有可刷新会话");
      return;
    }
    const requested = relay.loadLatestHistory(selectedSession.sessionId);
    requestWorkspaceSnapshotSilently(true);
    showToast(setToast, requested ? "正在刷新当前会话" : "暂时无法刷新");
  }, [relay.loadLatestHistory, requestWorkspaceSnapshotSilently, selectedSession]);

  const refreshWorkspaceSnapshot = useCallback(() => {
    if (!selectedSession) {
      showToast(setToast, "当前没有会话工作区");
      return;
    }
    const requested = requestWorkspaceSnapshotSilently(true);
    showToast(setToast, requested ? "正在读取项目目录和变更" : "Host 未连接，暂时无法读取");
  }, [requestWorkspaceSnapshotSilently, selectedSession]);

  const openFilePreview = useCallback(
    (snapshot: WorkspaceSnapshot, entry: ProjectTreeEntry) => {
      if (!selectedSession) {
        showToast(setToast, "当前没有会话，无法预览文件");
        return;
      }
      const target = {
        hostId: snapshot.hostId,
        workspace: snapshot.workspace,
        sessionId: selectedSession.sessionId,
        entry
      };
      setFilePreviewTarget(target);
      const requested = relay.requestFilePreview(selectedSession.sessionId, snapshot.workspace, entry.path);
      if (!requested) {
        showToast(setToast, "Host 未连接，暂时无法读取文件");
      }
    },
    [relay.requestFilePreview, selectedSession]
  );

  const openConversation = (sessionId?: string) => {
    if (sessionId) {
      setSelectedSessionId(sessionId);
    }
    setActiveTab("conversation");
  };

  const insertComposerToken = (token: string) => {
    setComposerText((current) => {
      const separator = current.length > 0 && !/\s$/.test(current) ? " " : "";
      return `${current}${separator}${token}`;
    });
    setCommandPickerMode(null);
    setActiveTab("conversation");
  };

  const copyCode = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showToast(setToast, "已复制代码");
  };

  const selectedHistoryEventCount = selectedHistory?.events.length ?? 0;
  const selectedVisibleHistoryEventCount = useMemo(
    () => (selectedHistory?.events ?? []).filter((event) => shouldShowConversationEvent(event.payload)).length,
    [selectedHistory?.events]
  );
  const selectedHistoryLoading = selectedHistory?.loading ?? false;
  const selectedHistoryError = selectedHistory?.error ?? null;
  const conversationStartsWithAgent = conversationEvents[0]?.payload.type === "agent-message";

  useEffect(() => {
    if (!selectedSession || relay.connectionState !== "online" || !relay.activeHost) {
      return;
    }
    if (selectedHistoryLoading || selectedVisibleHistoryEventCount > 0 || selectedHistoryError) {
      return;
    }
    if (selectedHistory && selectedHistoryEventCount === 0 && !selectedHistory.hasMore) {
      return;
    }
    if (selectedHistory && selectedHistoryEventCount > 0 && (!selectedHistory.hasMore || !selectedHistory.oldestSeq)) {
      return;
    }
    const timer = setTimeout(() => {
      if (selectedHistory && selectedHistoryEventCount > 0) {
        relay.loadOlderHistory(selectedSession.sessionId);
      } else {
        relay.loadLatestHistory(selectedSession.sessionId);
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [
    relay.activeHost,
    relay.connectionState,
    relay.loadOlderHistory,
    relay.loadLatestHistory,
    selectedHistory,
    selectedHistoryError,
    selectedHistoryEventCount,
    selectedHistoryLoading,
    selectedVisibleHistoryEventCount,
    selectedSession?.sessionId
  ]);

  useEffect(() => {
    if (activeTab !== "conversation" || !selectedSession || relay.connectionState !== "online" || !relay.activeHost) {
      return;
    }
    if (selectedHistoryLoading || selectedVisibleHistoryEventCount > 0) {
      return;
    }
    const lastKick = initialHistoryKickRef.current[selectedSession.sessionId] ?? 0;
    if (Date.now() - lastKick < 12_000) {
      return;
    }
    initialHistoryKickRef.current[selectedSession.sessionId] = Date.now();
    relay.loadLatestHistory(selectedSession.sessionId);
  }, [
    activeTab,
    relay.activeHost,
    relay.connectionState,
    relay.loadLatestHistory,
    selectedHistoryLoading,
    selectedSession,
    selectedVisibleHistoryEventCount
  ]);

  useEffect(() => {
    if (activeTab !== "conversation" || !selectedSession || !conversationStartsWithAgent || selectedHistoryLoading || !selectedHistory?.hasMore) {
      return;
    }
    const lastKick = olderHistoryKickRef.current[selectedSession.sessionId] ?? 0;
    if (Date.now() - lastKick < 15_000) {
      return;
    }
    olderHistoryKickRef.current[selectedSession.sessionId] = Date.now();
    relay.loadOlderHistory(selectedSession.sessionId);
  }, [
    activeTab,
    conversationStartsWithAgent,
    relay.loadOlderHistory,
    selectedHistory?.hasMore,
    selectedHistoryLoading,
    selectedSession
  ]);

  useEffect(() => {
    if (!selectedSession || relay.connectionState !== "online" || !relay.activeHost) {
      return;
    }
    const key = `${relay.activeHost.hostId}:${selectedSession.workspace}`;
    const generatedAt = selectedWorkspaceSnapshot?.generatedAt ? Date.parse(selectedWorkspaceSnapshot.generatedAt) : Number.NaN;
    const snapshotIsFresh = Number.isFinite(generatedAt) && Date.now() - generatedAt < 45_000;
    if (selectedWorkspaceSnapshot && snapshotIsFresh) {
      return;
    }
    const lastKick = workspaceSnapshotKickRef.current[key] ?? 0;
    if (Date.now() - lastKick < 12_000) {
      return;
    }
    requestWorkspaceSnapshotSilently();
  }, [
    relay.activeHost,
    relay.connectionState,
    requestWorkspaceSnapshotSilently,
    selectedSession,
    selectedWorkspaceSnapshot
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || activeTab !== "conversation" || !selectedSession || relay.connectionState !== "online") {
        return;
      }
      relay.loadLatestHistory(selectedSession.sessionId);
      requestWorkspaceSnapshotSilently();
    });
    return () => subscription.remove();
  }, [activeTab, relay.connectionState, relay.loadLatestHistory, requestWorkspaceSnapshotSilently, selectedSession]);

  return (
    <ThemeProvider theme={activeTheme}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Box flex={1} backgroundColor="canvas">
          {activeTab === "home" ? (
            <HomePage
              top={insets.top}
              bottom={insets.bottom}
              hostOnline={hostOnline}
              connectionState={relay.connectionState}
              activeHost={relay.activeHost}
              sessions={sessions}
              activeSession={focusSession}
              pendingApprovals={pendingApprovals}
              latestEvent={latestHomeEvent}
              onOpenConversation={openConversation}
              onOpenSettings={() => setActiveTab("settings")}
            />
          ) : activeTab === "sessions" ? (
            <SessionsPage
              top={insets.top}
              bottom={insets.bottom}
              hostOnline={hostOnline}
              activeHost={relay.activeHost}
              sessions={sessions}
              selectedSessionId={selectedSession?.sessionId ?? null}
              onOpenSession={selectSession}
              onOpenSettings={() => setActiveTab("settings")}
            />
          ) : activeTab === "conversation" ? (
            <ConversationPage
              top={insets.top}
              bottom={insets.bottom}
              hostOnline={hostOnline}
              session={selectedSession}
              sessions={sessions}
              events={conversationEvents}
              historyLoading={selectedHistory?.loading ?? false}
              historyHasMore={selectedHistory?.hasMore ?? false}
              historyError={selectedHistory?.error ?? null}
              workspaceSnapshot={selectedWorkspaceSnapshot}
              keyboardVisible={keyboardVisible}
              composerHeight={conversationComposerHeight}
              value={composerText}
              onChangeText={setComposerText}
              onSubmit={submitPrompt}
              onSwitchSession={openSessionPicker}
              onRefresh={refreshSelectedSession}
              onRefreshWorkspace={refreshWorkspaceSnapshot}
              onEnsureWorkspaceFresh={requestWorkspaceSnapshotSilently}
              onOpenFilePreview={openFilePreview}
              onLoadOlder={() => {
                if (!selectedSession) return;
                relay.loadOlderHistory(selectedSession.sessionId);
              }}
              onAttach={() => showToast(setToast, "附件暂未接入")}
              onVoice={() => showToast(setToast, "语音输入待接入")}
              onApproveApproval={() => showToast(setToast, "审批回传待接入")}
              onRejectApproval={() => showToast(setToast, "已拒绝该审批")}
              onCommand={setCommandPickerMode}
              onOpenToolDetail={setToolDetail}
              onOpenCodeDetail={setCodeDetail}
              onCopyCode={copyCode}
              onComposerHeightChange={setConversationComposerHeight}
              onBack={() => setActiveTab("sessions")}
            />
          ) : (
            <SettingsPage
              top={insets.top}
              bottom={insets.bottom}
              relayUrl={relay.relayUrl}
              activeHost={relay.activeHost}
              hostOnline={hostOnline}
              connectionState={relay.connectionState}
              lastError={relay.lastError}
              activeSessionCount={activeSessions}
              glassDiagnostics={glassDiagnostics}
              glassView={glassModule?.GlassView ?? null}
              islandTestState={dynamicIslandTestState}
              pairing={pairing}
              themePreference={themePreference}
              resolvedTheme={resolvedTheme}
              onPair={() => setPairingSheetOpen(true)}
              onSaveDiscoveredHost={saveDiscoveredHost}
              onReconnect={() => {
                relay.reconnect();
                showToast(setToast, "正在重新连接 Relay");
              }}
              onClearPairing={clearPairing}
              onThemePreferenceChange={setThemePreference}
              onTestIsland={(state) => {
                setDynamicIslandTestState(state);
                showToast(setToast, `${dynamicIslandStatus(state).label} 预览已切换`);
              }}
            />
          )}

          {activeTab !== "conversation" ? <BottomNav activeTab={activeTab} bottom={insets.bottom + 10} glassView={glassModule?.GlassView ?? null} nativeGlassEnabled={nativeGlassEnabled} onSelect={setActiveTab} /> : null}
          <PairingSheet
            visible={pairingSheetOpen}
            top={insets.top}
            bottom={insets.bottom}
            initialValue={pairing?.relayUrl ?? ""}
            onClose={() => setPairingSheetOpen(false)}
            onPair={savePairing}
          />
          <CommandPickerSheet
            mode={commandPickerMode}
            bottom={insets.bottom}
            options={commandOptions}
            sheetState={pickerSheetState}
            onInsert={insertComposerToken}
            onClose={() => setCommandPickerMode(null)}
          />
          <SessionPickerSheet
            visible={sessionPickerOpen}
            bottom={insets.bottom}
            sessions={sessions}
            selectedSessionId={selectedSession?.sessionId ?? null}
            onSelect={selectSession}
            onClose={() => setSessionPickerOpen(false)}
          />
          <ToolDetailSheet detail={toolDetail} bottom={insets.bottom} onClose={() => setToolDetail(null)} />
          <CodeDetailSheet detail={codeDetail} bottom={insets.bottom} onCopy={copyCode} onClose={() => setCodeDetail(null)} />
          <FilePreviewSheet
            target={filePreviewTarget}
            state={selectedFilePreviewState}
            bottom={insets.bottom}
            onCopy={copyCode}
            onClose={() => setFilePreviewTarget(null)}
          />
          {toast ? <Toast message={toast.text} bottom={activeTab === "conversation" ? insets.bottom + conversationComposerHeight + 40 : insets.bottom + 92} /> : null}
        </Box>
      </KeyboardAvoidingView>
    </ThemeProvider>
  );
}

function HomePage({
  top,
  bottom,
  hostOnline,
  connectionState,
  activeHost,
  sessions,
  activeSession,
  pendingApprovals,
  latestEvent,
  onOpenConversation,
  onOpenSettings
}: {
  top: number;
  bottom: number;
  hostOnline: boolean;
  connectionState: ConnectionState;
  activeHost: HostStatus | null;
  sessions: SessionSummary[];
  activeSession: SessionSummary | null;
  pendingApprovals: number;
  latestEvent: SessionEvent | null;
  onOpenConversation: (sessionId?: string) => void;
  onOpenSettings: () => void;
}) {
  const failedSessions = sessions.filter((session) => session.state === "failed").length;
  const workingSessions = sessions.filter((session) => session.state === "running" || session.state === "thinking").length;
  const waitingSessions = sessions.filter((session) => session.pendingApprovals > 0 || session.state === "waiting-approval").length;
  const hasAttention = !hostOnline || pendingApprovals > 0 || failedSessions > 0 || workingSessions > 0 || waitingSessions > 0;
  const focus = homeFocusState({
    hostOnline,
    connectionState,
    session: activeSession,
    pendingApprovals,
    latestEvent
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: top + 14,
        paddingHorizontal: 18,
        paddingBottom: bottom + 140,
        gap: 18
      }}
    >
      <Box flexDirection="row" alignItems="center" justifyContent="space-between">
        <Box flex={1} paddingRight="m">
          <Text variant="screenTitle">工作台</Text>
          <Text variant="caption" numberOfLines={2}>
            当前 Host、阻塞事项和正在工作的 Agent
          </Text>
        </Box>
        <StatusCapsule online={hostOnline} text={hostOnline ? "在线" : "离线"} />
      </Box>

      <HomeHostStrip activeHost={activeHost} hostOnline={hostOnline} connectionState={connectionState} onPress={onOpenSettings} />

      {hasAttention ? (
        <>
          <HomeFocusCard focus={focus} session={activeSession} latestEvent={latestEvent} onPress={focus.target === "settings" ? onOpenSettings : onOpenConversation} />
          <AttentionQueue
            pendingApprovals={pendingApprovals}
            failedSessions={failedSessions}
            workingSessions={workingSessions}
            waitingSessions={waitingSessions}
            hostOnline={hostOnline}
            onOpenConversation={onOpenConversation}
            onOpenSettings={onOpenSettings}
          />
        </>
      ) : (
        <WorkbenchCurrentSessionCard session={activeSession} hostOnline={hostOnline} onOpenConversation={onOpenConversation} />
      )}

      <Box gap="s">
        <SectionHeader title="最近事件" />
        {latestEvent ? (
          <CompactEventLine event={latestEvent} />
        ) : (
          <Box paddingVertical="m" borderTopWidth={1} borderColor="line">
            <Text variant="body" color="inkMuted">
              暂无会话动态
            </Text>
          </Box>
        )}
      </Box>
    </ScrollView>
  );
}

function SessionsPage({
  top,
  bottom,
  hostOnline,
  activeHost,
  sessions,
  selectedSessionId,
  onOpenSession,
  onOpenSettings
}: {
  top: number;
  bottom: number;
  hostOnline: boolean;
  activeHost: HostStatus | null;
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onOpenSession: (sessionId: string) => void;
  onOpenSettings: () => void;
}) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => workspaceSessionGroups(sessions), [sessions]);
  const filteredGroups = useMemo(() => filterWorkspaceSessionGroups(groups, query), [groups, query]);
  const hostLabelText = activeHost?.name ? `${activeHost.name} · ${groups.length} 项目 · ${sessions.length} 会话` : `${groups.length} 项目 · ${sessions.length} 会话`;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: top + 30,
        paddingHorizontal: 16,
        paddingBottom: bottom + 176,
        gap: 14
      }}
    >
      <Box flexDirection="row" alignItems="center" justifyContent="space-between">
        <Box flex={1} paddingRight="m">
          <Text variant="screenTitle">会话</Text>
          <Text variant="caption" numberOfLines={2}>
            按项目选择和恢复 Codex、Claude Code、OpenCode 会话
          </Text>
        </Box>
        <StatusCapsule online={hostOnline} text={hostOnline ? "在线" : "离线"} />
      </Box>

      <SessionsHostSummary online={hostOnline} label={hostLabelText} onOpenSettings={onOpenSettings} />

      <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" paddingHorizontal="m" minHeight={48} justifyContent="center">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜索项目、会话或 Agent"
          placeholderTextColor={theme.colors.inkMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ color: theme.colors.ink, fontSize: 16, minHeight: 46 }}
        />
      </Box>

      <Box gap="s">
        <SectionHeader title="项目" action={query.trim() ? `${filteredGroups.length} 个匹配` : `${groups.length} 个`} />
        {filteredGroups.length ? (
          filteredGroups.map((group) => (
            <ProjectSessionGroupCard
              key={group.id}
              group={group}
              selectedSessionId={selectedSessionId}
              onOpenSession={onOpenSession}
            />
          ))
        ) : sessions.length ? (
          <HomeEmptyLine icon={Folder} title="没有匹配结果" body="换个项目名、会话标题或 Agent 类型试试。" />
        ) : (
          <SessionsEmptyState hostOnline={hostOnline} onOpenSettings={onOpenSettings} />
        )}
      </Box>
    </ScrollView>
  );
}

function ProjectSessionGroupCard({
  group,
  selectedSessionId,
  onOpenSession
}: {
  group: WorkspaceSessionGroup;
  selectedSessionId: string | null;
  onOpenSession: (sessionId: string) => void;
}) {
  const projectTone: Tone = group.pendingApprovals > 0 ? "danger" : group.activeCount > 0 ? "amber" : "green";
  const visibleSessions = group.sessions.slice(0, 5);
  const extraCount = Math.max(0, group.sessions.length - visibleSessions.length);

  return (
    <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" overflow="hidden">
      <Box paddingHorizontal="m" paddingVertical="m" gap="s" borderBottomWidth={1} borderColor="line">
        <Box flexDirection="row" alignItems="center" gap="s">
          <Box width={42} height={42} borderRadius="m" backgroundColor={toneSoftToken(projectTone)} alignItems="center" justifyContent="center">
            <Folder color={theme.colors[toneToken(projectTone)]} size={21} />
          </Box>
          <Box flex={1}>
            <Text variant="title" numberOfLines={1}>
              {group.name}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {group.path}
            </Text>
          </Box>
          <Box alignItems="flex-end" gap="xs">
            <Text variant="caption" color="inkMuted">
              {group.sessions.length} 个
            </Text>
            {group.pendingApprovals > 0 ? <SessionStateInline tone="danger" label={`${group.pendingApprovals} 审批`} /> : group.activeCount > 0 ? <SessionStateInline tone="amber" label={`${group.activeCount} 工作中`} /> : null}
          </Box>
        </Box>
        <Box flexDirection="row" alignItems="center" gap="s" flexWrap="wrap">
          <WorkspaceGroupMetaPill icon={Bot} text={`${group.sessions.length} 会话`} />
          <WorkspaceGroupMetaPill icon={Activity} text={formatRelativeTime(group.latestAt)} />
          {group.failedCount > 0 ? <WorkspaceGroupMetaPill icon={ShieldAlert} text={`${group.failedCount} 失败`} tone="danger" /> : null}
        </Box>
      </Box>

      <Box>
        {visibleSessions.map((session, index) => (
          <ProjectSessionRow
            key={session.sessionId}
            session={session}
            selected={session.sessionId === selectedSessionId}
            first={index === 0}
            onPress={() => onOpenSession(session.sessionId)}
          />
        ))}
        {extraCount > 0 ? (
          <Box minHeight={40} paddingHorizontal="m" justifyContent="center" borderTopWidth={1} borderColor="line">
            <Text variant="caption" color="inkMuted">
              还有 {extraCount} 个会话，输入关键词可筛选。
            </Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function SessionsHostSummary({ online, label, onOpenSettings }: { online: boolean; label: string; onOpenSettings: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="打开 Host 设置" onPress={onOpenSettings}>
      {({ pressed }) => (
        <Box minHeight={48} borderRadius="m" backgroundColor="surface" borderWidth={1} borderColor="line" paddingHorizontal="m" flexDirection="row" alignItems="center" gap="s" style={{ opacity: pressed ? 0.72 : 1 }}>
          <Monitor color={online ? theme.colors.success : theme.colors.inkMuted} size={19} />
          <Box flex={1}>
            <Text variant="caption" color="inkMuted" numberOfLines={1}>
              {label}
            </Text>
          </Box>
          <SessionStateInline tone={online ? "green" : "neutral"} label={online ? "Host 在线" : "未连接"} />
        </Box>
      )}
    </Pressable>
  );
}

function WorkspaceGroupMetaPill({ icon: Icon, text, tone = "neutral" }: { icon: IconComponent; text: string; tone?: Tone }) {
  return (
    <Box minHeight={28} borderRadius="round" backgroundColor={toneSoftToken(tone)} paddingHorizontal="s" flexDirection="row" alignItems="center" gap="xs">
      <Icon color={theme.colors[toneToken(tone)]} size={14} />
      <Text variant="caption" color={tone === "neutral" ? "inkMuted" : toneToken(tone)} numberOfLines={1}>
        {text}
      </Text>
    </Box>
  );
}

function ProjectSessionRow({
  session,
  selected,
  first,
  onPress
}: {
  session: SessionSummary;
  selected: boolean;
  first: boolean;
  onPress: () => void;
}) {
  const tone = sessionTone(session.state);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`打开${session.title ?? "会话"}`} onPress={onPress}>
      {({ pressed }) => (
        <Box
          minHeight={62}
          flexDirection="row"
          alignItems="center"
          gap="s"
          paddingHorizontal="m"
          borderTopWidth={first ? 0 : 1}
          borderColor="line"
          backgroundColor={selected ? "navActive" : "surface"}
          style={{ opacity: pressed ? 0.72 : 1 }}
        >
          <Box width={34} height={34} borderRadius="m" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
            <Bot color={theme.colors[toneToken(tone)]} size={18} />
          </Box>
          <Box flex={1} gap="xs">
            <Box flexDirection="row" alignItems="center" gap="s">
              <Text variant="section" numberOfLines={1} style={{ flexShrink: 1 }}>
                {session.title ?? "新会话"}
              </Text>
              {selected ? (
                <Text variant="caption" color="accent">
                  当前
                </Text>
              ) : null}
            </Box>
            <Text variant="caption" numberOfLines={1}>
              {agentLabel(session.agentKind)} · {formatRelativeTime(session.updatedAt)}
            </Text>
          </Box>
          <Box alignItems="flex-end" gap="xs" minWidth={46}>
            <SessionStateInline tone={tone} label={stateLabel(session.state)} />
            {session.pendingApprovals > 0 ? (
              <Text variant="caption" color="danger">
                {session.pendingApprovals} 审批
              </Text>
            ) : null}
          </Box>
          <ChevronRight color={theme.colors.inkMuted} size={18} />
        </Box>
      )}
    </Pressable>
  );
}

function SessionsEmptyState({ hostOnline, onOpenSettings }: { hostOnline: boolean; onOpenSettings: () => void }) {
  return (
    <Box minHeight={236} borderRadius="l" borderWidth={1} borderColor="line" backgroundColor="surface" alignItems="center" justifyContent="center" padding="xl" gap="m">
      <Box width={72} height={72} borderRadius="round" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center">
        <Bot color={theme.colors.inkMuted} size={34} />
      </Box>
      <Box alignItems="center" gap="xs" maxWidth={300}>
        <Text variant="title" textAlign="center">
          暂无会话
        </Text>
        <Text variant="body" color="inkMuted" textAlign="center">
          {hostOnline ? "从电脑端启动或恢复 Codex session 后，这里会按项目自动分组。" : "先连接电脑端 Host，再同步 Codex、Claude Code 或 OpenCode session。"}
        </Text>
      </Box>
      {!hostOnline ? <SettingsButton label="连接 Host" tone="blue" onPress={onOpenSettings} /> : null}
    </Box>
  );
}

function SessionStateInline({ tone, label }: { tone: Tone; label: string }) {
  return (
    <Box flexDirection="row" alignItems="center" gap="xs">
      <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: theme.colors[toneToken(tone)] }} />
      <Text variant="caption" color={tone === "green" ? "success" : toneToken(tone)} numberOfLines={1}>
        {label}
      </Text>
    </Box>
  );
}

function WorkbenchCurrentSessionCard({
  session,
  hostOnline,
  onOpenConversation
}: {
  session: SessionSummary | null;
  hostOnline: boolean;
  onOpenConversation: (sessionId?: string) => void;
}) {
  if (!session) {
    return <HomeEmptyLine icon={TerminalSquare} title="还没有当前会话" body={hostOnline ? "可以从电脑端启动 Codex，或从会话页恢复已有 session。" : "连接 Host 后会显示 Codex、Claude Code 或 OpenCode 会话。"} />;
  }

  const tone = sessionTone(session.state);
  return (
    <Box gap="s">
      <SectionHeader title="当前会话" />
      <Pressable accessibilityRole="button" accessibilityLabel="继续当前会话" onPress={() => onOpenConversation(session.sessionId)}>
        {({ pressed }) => (
          <Box minHeight={76} backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" paddingHorizontal="m" flexDirection="row" alignItems="center" gap="m" style={{ opacity: pressed ? 0.72 : 1 }}>
            <Box width={42} height={42} borderRadius="m" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
              <Bot color={theme.colors[toneToken(tone)]} size={21} />
            </Box>
            <Box flex={1} gap="xs">
              <Text variant="section" numberOfLines={1}>
                {session.title ?? "新会话"}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {agentLabel(session.agentKind)} · {compactWorkspaceName(session.workspace)} · {formatRelativeTime(session.updatedAt)}
              </Text>
            </Box>
            <SessionStateInline tone={tone} label={stateLabel(session.state)} />
            <ChevronRight color={theme.colors.inkMuted} size={18} />
          </Box>
        )}
      </Pressable>
    </Box>
  );
}

type HomeFocusState = {
  tone: Tone;
  title: string;
  body: string;
  action: string;
  target: "conversation" | "settings";
  icon: IconComponent;
};

function HomeHostStrip({
  activeHost,
  hostOnline,
  connectionState,
  onPress
}: {
  activeHost: HostStatus | null;
  hostOnline: boolean;
  connectionState: ConnectionState;
  onPress: () => void;
}) {
  const agentKinds = activeHost?.agentKinds?.length ? activeHost.agentKinds.map(agentLabel).join(" / ") : "等待 Agent";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="查看 Host 连接状态" onPress={onPress}>
      {({ pressed }) => (
        <Box minHeight={64} borderRadius="m" borderWidth={1} borderColor="line" backgroundColor="surface" flexDirection="row" alignItems="center" gap="m" paddingHorizontal="m" style={{ opacity: pressed ? 0.7 : 1 }}>
          <Box width={38} height={38} borderRadius="m" backgroundColor={hostOnline ? "successSoft" : "surfaceMuted"} alignItems="center" justifyContent="center">
            <Monitor color={hostOnline ? theme.colors.success : theme.colors.inkMuted} size={20} />
          </Box>
          <Box flex={1}>
            <Text variant="section" numberOfLines={1}>
              {activeHost?.name ?? "电脑端 Host"}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {hostOnline ? agentKinds : connectionLabel(connectionState)}
            </Text>
          </Box>
          <ChevronRight color={theme.colors.inkMuted} size={20} />
        </Box>
      )}
    </Pressable>
  );
}

function HomeFocusCard({
  focus,
  session,
  latestEvent,
  onPress
}: {
  focus: HomeFocusState;
  session: SessionSummary | null;
  latestEvent: SessionEvent | null;
  onPress: () => void;
}) {
  const Icon = focus.icon;
  const latest = latestEvent ? eventMeta(latestEvent) : null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={focus.action} onPress={onPress}>
      {({ pressed }) => (
        <Box minHeight={142} backgroundColor="surface" borderRadius="l" borderColor="line" borderWidth={1} padding="l" gap="m" style={softShadow(pressed)}>
          <Box flexDirection="row" alignItems="flex-start" gap="m">
            <Box width={44} height={44} borderRadius="m" backgroundColor={toneSoftToken(focus.tone)} alignItems="center" justifyContent="center">
              <Icon color={theme.colors[toneToken(focus.tone)]} size={22} />
            </Box>
            <Box flex={1} gap="xs">
              <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s">
                <Text variant="title" numberOfLines={1}>
                  {focus.title}
                </Text>
                <ToneCapsule tone={focus.tone} text={focus.action} />
              </Box>
              <Text variant="body" color="inkMuted" numberOfLines={2}>
                {focus.body}
              </Text>
            </Box>
          </Box>

          {session ? (
            <Box flexDirection="row" flexWrap="wrap" gap="s">
              <StatusChip label={agentLabel(session.agentKind)} tone="violet" icon={Bot} />
              <StatusChip label={compactWorkspaceName(session.workspace)} tone={sessionTone(session.state)} icon={TerminalSquare} />
              <StatusChip label={formatTime(session.updatedAt)} tone="neutral" icon={Activity} />
            </Box>
          ) : null}

          {latest ? (
            <Box borderTopWidth={1} borderColor="line" paddingTop="m">
              <Text variant="caption" color="inkMuted" numberOfLines={1}>
                最近：{latest.title} · {latest.body}
              </Text>
            </Box>
          ) : null}
        </Box>
      )}
    </Pressable>
  );
}

function AttentionQueue({
  pendingApprovals,
  failedSessions,
  workingSessions,
  waitingSessions,
  hostOnline,
  onOpenConversation,
  onOpenSettings
}: {
  pendingApprovals: number;
  failedSessions: number;
  workingSessions: number;
  waitingSessions: number;
  hostOnline: boolean;
  onOpenConversation: () => void;
  onOpenSettings: () => void;
}) {
  const hasAttention = !hostOnline || pendingApprovals > 0 || failedSessions > 0 || workingSessions > 0 || waitingSessions > 0;
  const waitingWithoutApprovalCount = Math.max(0, waitingSessions - pendingApprovals);
  return (
    <Box gap="s">
      <SectionHeader title="待处理" />
      <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" overflow="hidden">
        {!hostOnline ? <HomeQueueRow icon={Monitor} title="Host 未连接" body="手机暂时无法控制电脑端 Agent" value="连接" tone="danger" isFirst onPress={onOpenSettings} /> : null}
        {pendingApprovals > 0 ? <HomeQueueRow icon={ShieldAlert} title="等待审批" body="确认后 Agent 才会继续执行" value={`${pendingApprovals}`} tone="danger" isFirst={hostOnline} onPress={onOpenConversation} /> : null}
        {waitingWithoutApprovalCount > 0 ? <HomeQueueRow icon={ShieldAlert} title="等待确认" body="会话已暂停，等待你继续处理" value={`${waitingWithoutApprovalCount}`} tone="danger" isFirst={hostOnline && pendingApprovals === 0} onPress={onOpenConversation} /> : null}
        {failedSessions > 0 ? <HomeQueueRow icon={ShieldAlert} title="失败会话" body="需要查看错误并恢复" value={`${failedSessions}`} tone="danger" isFirst={hostOnline && pendingApprovals === 0 && waitingWithoutApprovalCount === 0} onPress={onOpenConversation} /> : null}
        {workingSessions > 0 ? <HomeQueueRow icon={Bot} title="正在工作" body="Agent 正在执行命令、改文件或跑测试" value={`${workingSessions}`} tone="amber" isFirst={hostOnline && pendingApprovals === 0 && waitingWithoutApprovalCount === 0 && failedSessions === 0} onPress={onOpenConversation} /> : null}
        {hostOnline && !hasAttention ? <HomeEmptyLine icon={CheckCircle2} title="没有阻塞事项" body="所有 Agent 都可以继续接收指令。" compact /> : null}
      </Box>
    </Box>
  );
}

function HomeQueueRow({
  icon: Icon,
  title,
  body,
  value,
  tone,
  isFirst = false,
  onPress
}: {
  icon: IconComponent;
  title: string;
  body: string;
  value: string;
  tone: Tone;
  isFirst?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      {({ pressed }) => (
        <Box flexDirection="row" alignItems="center" gap="m" minHeight={64} paddingHorizontal="m" borderTopWidth={isFirst ? 0 : 1} borderColor="line" style={{ opacity: pressed ? 0.68 : 1 }}>
          <Box width={36} height={36} borderRadius="m" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
            <Icon color={theme.colors[toneToken(tone)]} size={19} />
          </Box>
          <Box flex={1}>
            <Text variant="section" numberOfLines={1}>
              {title}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {body}
            </Text>
          </Box>
          <ToneCapsule tone={tone} text={value} />
        </Box>
      )}
    </Pressable>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <Box flexDirection="row" alignItems="center" justifyContent="space-between">
      <Text variant="section">{title}</Text>
      {action ? (
        <Text variant="caption" color="inkMuted">
          {action}
        </Text>
      ) : null}
    </Box>
  );
}

function HomeEmptyLine({ icon: Icon, title, body, compact = false }: { icon: IconComponent; title: string; body: string; compact?: boolean }) {
  return (
    <Box minHeight={compact ? 64 : 78} flexDirection="row" alignItems="center" gap="m" paddingHorizontal="m" paddingVertical="m">
      <Box width={36} height={36} borderRadius="m" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center">
        <Icon color={theme.colors.inkMuted} size={19} />
      </Box>
      <Box flex={1}>
        <Text variant="section" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" numberOfLines={2}>
          {body}
        </Text>
      </Box>
    </Box>
  );
}

function ConversationPage({
  top,
  bottom,
  hostOnline,
  session,
  sessions,
  events,
  historyLoading,
  historyHasMore,
  historyError,
  workspaceSnapshot,
  keyboardVisible,
  composerHeight,
  value,
  onChangeText,
  onSubmit,
  onSwitchSession,
  onRefresh,
  onRefreshWorkspace,
  onEnsureWorkspaceFresh,
  onOpenFilePreview,
  onLoadOlder,
  onAttach,
  onVoice,
  onApproveApproval,
  onRejectApproval,
  onCommand,
  onOpenToolDetail,
  onOpenCodeDetail,
  onCopyCode,
  onComposerHeightChange,
  onBack
}: {
  top: number;
  bottom: number;
  hostOnline: boolean;
  session: SessionSummary | null;
  sessions: SessionSummary[];
  events: DisplayEvent[];
  historyLoading: boolean;
  historyHasMore: boolean;
  historyError: string | null;
  workspaceSnapshot: WorkspaceSnapshot | null;
  keyboardVisible: boolean;
  composerHeight: number;
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onSwitchSession: () => void;
  onRefresh: () => void;
  onRefreshWorkspace: () => void;
  onEnsureWorkspaceFresh: () => boolean;
  onOpenFilePreview: (snapshot: WorkspaceSnapshot, entry: ProjectTreeEntry) => void;
  onLoadOlder: () => void;
  onAttach: () => void;
  onVoice: () => void;
  onApproveApproval: () => void;
  onRejectApproval: () => void;
  onCommand: (kind: CommandPickerMode) => void;
  onOpenToolDetail: (detail: ToolDetail) => void;
  onOpenCodeDetail: (detail: CodeDetail) => void;
  onCopyCode: (text: string) => void;
  onComposerHeightChange: (height: number) => void;
  onBack: () => void;
}) {
  const listRef = useRef<FlatList<ConversationListItem>>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [initialLoadExpired, setInitialLoadExpired] = useState(false);
  const [activePanel, setActivePanel] = useState<ConversationPanel>("chat");
  const headerHeight = top + 124;
  const contentTopInset = headerHeight + 12;
  const composerLift = keyboardVisible ? 8 : bottom + 10;
  const timelineBottomInset = composerLift + composerHeight + 56;
  const workspaceBottomInset = timelineBottomInset + 72;
  const hasConversation = events.length > 0;
  const latestEventId = events[events.length - 1]?.id ?? null;
  const latestEvent = events[events.length - 1]?.payload ?? null;
  const showInitialHistoryLoading = !!session && historyLoading && !hasConversation && !historyError && !initialLoadExpired;
  const showHistoryLine = !!session && !showInitialHistoryLoading && (historyLoading || !!historyError || (historyHasMore && hasConversation));
  const showEmptyHistoryFallback = !!session && !hasConversation && !showInitialHistoryLoading && (initialLoadExpired || !!historyError);
  const showTurnStatus = !!session && isWorkingSession(session) && session.state !== "waiting-approval";
  const listItems = useMemo(
    () =>
      conversationListItems({
        session,
        events,
        showHistoryLine,
        showInitialHistoryLoading,
        showEmptyHistoryFallback,
        showTurnStatus
      }),
    [events, session, showEmptyHistoryFallback, showHistoryLine, showInitialHistoryLoading, showTurnStatus]
  );

  useEffect(() => {
    setInitialLoadExpired(false);
  }, [session?.sessionId]);

  useEffect(() => {
    if (activePanel !== "chat" && session) {
      onEnsureWorkspaceFresh();
    }
  }, [activePanel, onEnsureWorkspaceFresh, session]);

  useEffect(() => {
    if (!historyLoading || hasConversation || historyError) {
      setInitialLoadExpired(false);
      return;
    }
    const timer = setTimeout(() => setInitialLoadExpired(true), 4200);
    return () => clearTimeout(timer);
  }, [hasConversation, historyError, historyLoading, session?.sessionId]);

  useEffect(() => {
    if (!hasConversation || !latestEventId) {
      return;
    }
    const shouldFollow = isAtBottom || latestEvent?.type === "user-message";
    if (shouldFollow) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      setShowNewMessages(false);
    } else {
      setShowNewMessages(true);
    }
  }, [hasConversation, isAtBottom, latestEvent?.type, latestEventId, keyboardVisible]);

  const scrollToConversationBottom = (animated = true) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
    setShowNewMessages(false);
    setIsAtBottom(true);
  };

  return (
    <>
      <ConversationHeader
        top={top}
        hostOnline={hostOnline}
        session={session}
        sessionCount={sessions.length}
        onBack={onBack}
        onRefresh={activePanel === "chat" ? onRefresh : onRefreshWorkspace}
        refreshLabel={activePanel === "chat" ? "刷新当前会话" : "刷新文件和变更"}
        onSwitchSession={onSwitchSession}
        activePanel={activePanel}
        onSelectPanel={setActivePanel}
      />
      {activePanel === "chat" ? (
        <FlatList
          ref={listRef}
          data={listItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationListRow
              item={item}
              historyLoading={historyLoading}
              historyHasMore={historyHasMore}
              historyError={historyError}
              onRefresh={onRefresh}
              onLoadOlder={onLoadOlder}
              onApprovalApprove={onApproveApproval}
              onApprovalReject={onRejectApproval}
              onOpenToolDetail={onOpenToolDetail}
              onOpenCodeDetail={onOpenCodeDetail}
              onCopyCode={onCopyCode}
            />
          )}
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const distanceFromBottom = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
            const nearBottom = distanceFromBottom < Math.max(96, composerHeight + 42);
            setIsAtBottom(nearBottom);
            if (nearBottom) {
              setShowNewMessages(false);
            }
            if (nativeEvent.contentOffset.y < 24 && hasConversation && historyHasMore && !historyLoading) {
              onLoadOlder();
            }
          }}
          onContentSizeChange={() => {
            if (isAtBottom) {
              scrollToConversationBottom(false);
            }
          }}
          scrollEventThrottle={80}
          contentContainerStyle={{
            paddingTop: contentTopInset,
            paddingHorizontal: 16,
            paddingBottom: 0,
            gap: 14
          }}
          scrollIndicatorInsets={{ bottom: timelineBottomInset, top: contentTopInset }}
          ListFooterComponent={<View style={{ height: timelineBottomInset }} />}
          bounces
          alwaysBounceVertical={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <WorkspacePanel
          mode={activePanel}
          session={session}
          snapshot={workspaceSnapshot}
          topInset={contentTopInset}
          bottomInset={workspaceBottomInset}
          onRefresh={onRefreshWorkspace}
          onOpenFilePreview={onOpenFilePreview}
        />
      )}
      {activePanel === "chat" && showNewMessages ? <NewMessagesButton bottom={timelineBottomInset + 10} onPress={() => scrollToConversationBottom(true)} /> : null}
      <ConversationComposer
        bottom={composerLift}
        compact={keyboardVisible}
        value={value}
        disabled={!hostOnline || !session}
        onChangeText={onChangeText}
        onSubmit={onSubmit}
        onAttach={onAttach}
        onVoice={onVoice}
        onCommand={onCommand}
        onHeightChange={onComposerHeightChange}
      />
    </>
  );
}

function ConversationListRow({
  item,
  historyLoading,
  historyHasMore,
  historyError,
  onRefresh,
  onLoadOlder,
  onApprovalApprove,
  onApprovalReject,
  onOpenToolDetail,
  onOpenCodeDetail,
  onCopyCode
}: {
  item: ConversationListItem;
  historyLoading: boolean;
  historyHasMore: boolean;
  historyError: string | null;
  onRefresh: () => void;
  onLoadOlder: () => void;
  onApprovalApprove: () => void;
  onApprovalReject: () => void;
  onOpenToolDetail: (detail: ToolDetail) => void;
  onOpenCodeDetail: (detail: CodeDetail) => void;
  onCopyCode: (text: string) => void;
}) {
  if (item.kind === "context") {
    return <SessionContextBar session={item.session} />;
  }
  if (item.kind === "history") {
    return <HistoryLoadLine loading={historyLoading} hasMore={historyHasMore} error={historyError} onLoadOlder={onLoadOlder} />;
  }
  if (item.kind === "loading") {
    return <ConversationLoadingState />;
  }
  if (item.kind === "empty-history") {
    return <ConversationNoRecentState error={historyError} onRetry={onRefresh} />;
  }
  if (item.kind === "empty-session") {
    return <ConversationEmpty session={item.session} />;
  }
  if (item.kind === "turn-status") {
    return <CurrentTurnStatus session={item.session} />;
  }
  if (item.kind === "event") {
    return (
      <ConversationEvent
        event={item.envelope.payload}
        pending={item.envelope.pending}
        onApprovalApprove={onApprovalApprove}
        onApprovalReject={onApprovalReject}
        onOpenToolDetail={onOpenToolDetail}
        onOpenCodeDetail={onOpenCodeDetail}
        onCopyCode={onCopyCode}
      />
    );
  }
  return <NoSessionState />;
}

function ConversationLoadingState() {
  return (
    <Box alignItems="center" paddingTop="xxl" gap="m">
      <Box width={72} height={72} borderRadius="round" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center">
        <RefreshCcw color={theme.colors.inkMuted} size={30} />
      </Box>
      <Box alignItems="center" gap="xs" maxWidth={260}>
        <Text variant="title" textAlign="center">
          正在加载会话
        </Text>
        <Text variant="body" color="inkMuted" textAlign="center">
          正在读取最近消息。
        </Text>
      </Box>
    </Box>
  );
}

function ConversationNoRecentState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <Box alignItems="center" paddingTop="xxl" gap="m">
      <Box width={78} height={78} borderRadius="round" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center">
        <TerminalSquare color={theme.colors.inkMuted} size={32} />
      </Box>
      <Box alignItems="center" gap="xs" maxWidth={280}>
        <Text variant="title" textAlign="center">
          暂无最近消息
        </Text>
        <Text variant="body" color="inkMuted" textAlign="center">
          {error ? `${error}，你仍然可以继续发送指令。` : "可以直接继续发送指令。"}
        </Text>
      </Box>
      {error ? <SettingsButton label="重试加载" tone="neutral" onPress={onRetry} /> : null}
    </Box>
  );
}

function NewMessagesButton({ bottom, onPress }: { bottom: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="跳到新消息" onPress={onPress} style={{ position: "absolute", alignSelf: "center", bottom, zIndex: 32 }}>
      {({ pressed }) => (
        <Box minHeight={34} borderRadius="round" backgroundColor="terminal" paddingHorizontal="m" flexDirection="row" alignItems="center" gap="xs" style={{ opacity: pressed ? 0.75 : 1 }}>
          <ChevronDown color={theme.colors.white} size={16} />
          <Text variant="caption" color="white">
            新消息
          </Text>
        </Box>
      )}
    </Pressable>
  );
}

function ConversationHeader({
  top,
  hostOnline,
  session,
  sessionCount,
  onBack,
  onRefresh,
  refreshLabel,
  onSwitchSession,
  activePanel,
  onSelectPanel
}: {
  top: number;
  hostOnline: boolean;
  session: SessionSummary | null;
  sessionCount: number;
  onBack: () => void;
  onRefresh: () => void;
  refreshLabel: string;
  onSwitchSession: () => void;
  activePanel: ConversationPanel;
  onSelectPanel: (panel: ConversationPanel) => void;
}) {
  const workspaceName = session ? compactWorkspaceName(session.workspace) : `${sessionCount} 个会话`;
  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      zIndex={20}
      backgroundColor="canvas"
      borderBottomWidth={1}
      borderColor="line"
      paddingHorizontal="m"
      paddingBottom="xs"
      style={{ paddingTop: top + 8 }}
    >
      <Box flexDirection="row" alignItems="center" gap="s">
        <IconShell icon={ArrowLeft} tone="neutral" onPress={onBack} label="返回" />
        <Box flex={1}>
          <Pressable accessibilityRole="button" onPress={onSwitchSession}>
            <Box>
              <Box flexDirection="row" alignItems="center" gap="xs" minHeight={20}>
                <Text variant="caption" color="inkMuted">
                  当前会话
                </Text>
                <ChevronDown color={theme.colors.inkMuted} size={16} />
              </Box>
              <Text variant="title" numberOfLines={1}>
                {session?.title ?? "会话详情"}
              </Text>
            </Box>
          </Pressable>
          <Text variant="caption" numberOfLines={1}>
            {session ? `${agentLabel(session.agentKind)} · ${workspaceName}` : workspaceName}
          </Text>
        </Box>
        <Box alignItems="flex-end" gap="s">
          <StatusCapsule online={hostOnline} text={hostOnline ? "在线" : "离线"} />
          <IconShell icon={RefreshCcw} tone="neutral" onPress={onRefresh} label={refreshLabel} />
        </Box>
      </Box>
      <ConversationPanelTabs activePanel={activePanel} onSelect={onSelectPanel} />
    </Box>
  );
}

function ConversationPanelTabs({
  activePanel,
  onSelect
}: {
  activePanel: ConversationPanel;
  onSelect: (panel: ConversationPanel) => void;
}) {
  const items: Array<{ id: ConversationPanel; label: string; icon: IconComponent }> = [
    { id: "chat", label: "聊天", icon: Bot },
    { id: "project", label: "项目", icon: Folder },
    { id: "changes", label: "变更", icon: FileDiff }
  ];

  return (
    <Box paddingTop="s" alignItems="center">
      <Box width="100%" flexDirection="row" backgroundColor="surfaceMuted" borderRadius="round" borderWidth={1} borderColor="line" padding="xs" gap="xs">
        {items.map((item) => {
          const active = item.id === activePanel;
          const Icon = item.icon;
          return (
            <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onSelect(item.id)} style={{ flex: 1 }}>
              {({ pressed }) => (
                  <Box
                  minHeight={32}
                  borderRadius="round"
                  backgroundColor={active ? "surface" : "transparent"}
                  alignItems="center"
                  justifyContent="center"
                  flexDirection="row"
                  gap="xs"
                  style={{ opacity: pressed ? 0.72 : 1 }}
                >
                  <Icon color={active ? theme.colors.accent : theme.colors.inkMuted} size={15} />
                  <Text variant="caption" color={active ? "accent" : "inkMuted"} numberOfLines={1} style={{ fontWeight: active ? "700" : "600" }}>
                    {item.label}
                  </Text>
                </Box>
              )}
            </Pressable>
          );
        })}
      </Box>
    </Box>
  );
}

function WorkspacePanel({
  mode,
  session,
  snapshot,
  topInset,
  bottomInset,
  onRefresh,
  onOpenFilePreview
}: {
  mode: Exclude<ConversationPanel, "chat">;
  session: SessionSummary | null;
  snapshot: WorkspaceSnapshot | null;
  topInset: number;
  bottomInset: number;
  onRefresh: () => void;
  onOpenFilePreview: (snapshot: WorkspaceSnapshot, entry: ProjectTreeEntry) => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: topInset,
        paddingHorizontal: 16,
        paddingBottom: bottomInset,
        gap: 14
      }}
      keyboardShouldPersistTaps="handled"
    >
      {!session ? (
        <WorkspaceEmptyState title="暂无工作区" body="连接 Host 并选择会话后，会显示文件目录和 worktree 变更。" onRefresh={onRefresh} />
      ) : !snapshot ? (
        <WorkspaceEmptyState title="正在等待工作区快照" body="Host 会读取当前 workspace 的文件目录和 Git worktree 变更摘要。" onRefresh={onRefresh} />
      ) : mode === "project" ? (
        <ProjectTreePanel snapshot={snapshot} onOpenFilePreview={onOpenFilePreview} />
      ) : (
        <WorktreeChangesPanel snapshot={snapshot} onRefresh={onRefresh} />
      )}
    </ScrollView>
  );
}

function WorkspaceEmptyState({ title, body, onRefresh }: { title: string; body: string; onRefresh: () => void }) {
  return (
    <Box alignItems="center" paddingTop="xxl" gap="m">
      <Box width={78} height={78} borderRadius="round" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center">
        <Folder color={theme.colors.inkMuted} size={34} />
      </Box>
      <Box alignItems="center" gap="xs" maxWidth={290}>
        <Text variant="title" textAlign="center">
          {title}
        </Text>
        <Text variant="body" color="inkMuted" textAlign="center">
          {body}
        </Text>
      </Box>
      <SettingsButton label="刷新文件和变更" tone="blue" onPress={onRefresh} />
    </Box>
  );
}

function ProjectTreePanel({ snapshot, onOpenFilePreview }: { snapshot: WorkspaceSnapshot; onOpenFilePreview: (snapshot: WorkspaceSnapshot, entry: ProjectTreeEntry) => void }) {
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  const directories = snapshot.tree.filter((entry) => entry.kind === "directory").length;
  const files = snapshot.tree.filter((entry) => entry.kind === "file").length;
  const visibleTree = useMemo(() => visibleProjectTree(snapshot.tree, expandedPaths), [expandedPaths, snapshot.tree]);
  const childPaths = useMemo(() => projectTreeChildPathSet(snapshot.tree), [snapshot.tree]);
  const snapshotTime = formatTime(snapshot.generatedAt);
  const toggleFolder = (entry: ProjectTreeEntry) => {
    setExpandedPaths((current) => ({
      ...current,
      [entry.path]: !current[entry.path]
    }));
  };

  useEffect(() => {
    setExpandedPaths({});
  }, [snapshot.requestId, snapshot.workspace]);

  return (
    <>
      <WorkspaceCompactHeader
        icon={Folder}
        title={snapshot.rootName}
        body={displayWorkspacePath(snapshot.workspace)}
        meta={`${directories} 个目录 · ${files} 个文件${snapshot.treeTruncated ? " · 已截断" : ""}`}
        time={snapshotTime}
        tone="blue"
      />
      {snapshot.error ? <SystemLine text={snapshot.error} tone="danger" /> : null}
      <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" overflow="hidden">
        <Box minHeight={44} paddingHorizontal="m" flexDirection="row" alignItems="center" justifyContent="space-between" borderBottomWidth={1} borderColor="line">
          <Text variant="section">项目目录</Text>
          <Text variant="caption">{formatTime(snapshot.generatedAt)}</Text>
        </Box>
        {visibleTree.length ? (
          visibleTree.map((entry, index) => (
            <ProjectTreeRow
              key={`${entry.path}-${index}`}
              entry={entry}
              expanded={!!expandedPaths[entry.path]}
              hasChildren={childPaths.has(entry.path)}
              onToggleFolder={toggleFolder}
              onOpenFile={() => onOpenFilePreview(snapshot, entry)}
            />
          ))
        ) : (
          <Box padding="m">
            <Text variant="body" color="inkMuted">
              当前目录没有可展示的文件。
            </Text>
          </Box>
        )}
      </Box>
      {snapshot.treeTruncated ? <SystemLine text="项目快照已截断，部分深层目录可能需要刷新后才能显示。" tone="neutral" /> : null}
    </>
  );
}

function ProjectTreeRow({
  entry,
  expanded,
  hasChildren,
  onToggleFolder,
  onOpenFile
}: {
  entry: ProjectTreeEntry;
  expanded: boolean;
  hasChildren: boolean;
  onToggleFolder: (entry: ProjectTreeEntry) => void;
  onOpenFile: () => void;
}) {
  const Icon = entry.kind === "directory" ? Folder : FileText;
  const isDirectory = entry.kind === "directory";
  const handlePress = () => {
    if (isDirectory) {
      if (hasChildren) {
        onToggleFolder(entry);
      }
      return;
    }
    onOpenFile();
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={isDirectory ? `${expanded ? "收起" : "展开"}文件夹 ${entry.name}` : `预览文件 ${entry.name}`} onPress={handlePress}>
      {({ pressed }) => (
        <Box minHeight={42} flexDirection="row" alignItems="center" gap="s" paddingRight="m" borderTopWidth={1} borderColor="line" style={{ paddingLeft: 14 + entry.depth * 16, opacity: pressed ? 0.68 : 1 }}>
          {isDirectory ? (
            hasChildren ? (
              expanded ? <ChevronDown color={theme.colors.inkMuted} size={15} /> : <ChevronRight color={theme.colors.inkMuted} size={15} />
            ) : (
              <Box width={15} />
            )
          ) : (
            <Box width={15} />
          )}
          <Icon color={isDirectory ? theme.colors.cobalt : theme.colors.inkMuted} size={17} />
          <Text variant="caption" color={isDirectory ? "ink" : "inkMuted"} numberOfLines={1} flex={1}>
            {entry.name}
          </Text>
          {isDirectory ? null : <ChevronRight color={theme.colors.inkMuted} size={16} />}
        </Box>
      )}
    </Pressable>
  );
}

function WorktreeChangesPanel({ snapshot, onRefresh }: { snapshot: WorkspaceSnapshot; onRefresh: () => void }) {
  const dirtyWorktrees = snapshot.worktrees.filter((item) => item.dirty);
  const filesChanged = dirtyWorktrees.reduce((sum, item) => sum + item.filesChanged, 0);
  const additions = dirtyWorktrees.reduce((sum, item) => sum + item.additions, 0);
  const deletions = dirtyWorktrees.reduce((sum, item) => sum + item.deletions, 0);
  const snapshotTime = formatTime(snapshot.generatedAt);

  return (
    <>
      <WorkspaceCompactHeader
        icon={FileDiff}
        title={dirtyWorktrees.length ? `${dirtyWorktrees.length} 个 worktree 有变更` : "当前 worktree 干净"}
        body={displayWorkspacePath(snapshot.workspace)}
        meta={dirtyWorktrees.length ? `${filesChanged} 个文件 · +${additions} / -${deletions}` : `${snapshot.worktrees.length} 个 worktree`}
        time={snapshotTime}
        tone={dirtyWorktrees.length ? "amber" : "green"}
      />
      {dirtyWorktrees.length ? (
        dirtyWorktrees.map((worktree) => <WorktreeCard key={worktree.path} worktree={worktree} />)
      ) : snapshot.worktrees.length ? (
        <CleanWorktreeList worktrees={snapshot.worktrees} generatedAt={snapshot.generatedAt} />
      ) : (
        <WorkspaceEmptyState title="未发现 worktree" body="Host 没有从当前 workspace 读取到 Git worktree 信息。" onRefresh={onRefresh} />
      )}
    </>
  );
}

function WorkspaceCompactHeader({
  icon: Icon,
  title,
  body,
  meta,
  time,
  tone
}: {
  icon: IconComponent;
  title: string;
  body: string;
  meta: string;
  time: string;
  tone: Tone;
}) {
  return (
    <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" padding="m" gap="s">
      <Box flexDirection="row" alignItems="center" gap="s">
        <Box width={40} height={40} borderRadius="m" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
          <Icon color={theme.colors[toneToken(tone)]} size={21} />
        </Box>
        <Box flex={1}>
          <Text variant="section" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {body}
          </Text>
        </Box>
        <Text variant="caption" color="inkMuted">
          {time}
        </Text>
      </Box>
      <Box flexDirection="row">
        <StatusChip label={meta} tone={tone} icon={Activity} />
      </Box>
    </Box>
  );
}

function CleanWorktreeList({ worktrees, generatedAt }: { worktrees: WorktreeSummary[]; generatedAt: string }) {
  const visible = worktrees.slice(0, 6);
  return (
    <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" overflow="hidden">
      <Box minHeight={44} paddingHorizontal="m" flexDirection="row" alignItems="center" justifyContent="space-between" borderBottomWidth={1} borderColor="line">
        <Box flexDirection="row" alignItems="center" gap="s">
          <CheckCircle2 color={theme.colors.success} size={18} />
          <Text variant="section">没有待审变更</Text>
        </Box>
        <Text variant="caption">{formatTime(generatedAt)}</Text>
      </Box>
      {visible.map((worktree, index) => (
        <Box key={worktree.path} minHeight={48} flexDirection="row" alignItems="center" gap="s" paddingHorizontal="m" borderTopWidth={index === 0 ? 0 : 1} borderColor="line">
          <GitBranch color={theme.colors.inkMuted} size={17} />
          <Box flex={1}>
            <Text variant="body" numberOfLines={1}>
              {worktree.branch ?? "detached"}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {displayWorkspacePath(worktree.path)}
            </Text>
          </Box>
          <StatusChip label="干净" tone="green" icon={CheckCircle2} />
        </Box>
      ))}
      {worktrees.length > visible.length ? (
        <Box minHeight={40} justifyContent="center" paddingHorizontal="m" borderTopWidth={1} borderColor="line">
          <Text variant="caption">还有 {worktrees.length - visible.length} 个干净 worktree。</Text>
        </Box>
      ) : null}
    </Box>
  );
}

function WorktreeCard({ worktree }: { worktree: WorktreeSummary }) {
  const tone: Tone = worktree.error ? "danger" : worktree.dirty ? "amber" : "green";
  const visibleFiles = worktree.files.slice(0, 6);

  return (
    <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" overflow="hidden">
      <Box padding="m" gap="s">
        <Box flexDirection="row" alignItems="center" gap="m">
          <Box width={42} height={42} borderRadius="m" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
            <GitBranch color={theme.colors[toneToken(tone)]} size={21} />
          </Box>
          <Box flex={1} gap="xs">
            <Text variant="section" numberOfLines={1}>
              {worktree.branch ?? "detached"}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {displayWorkspacePath(worktree.path)}
            </Text>
          </Box>
          <StatusChip label={worktree.dirty ? "有变更" : "干净"} tone={tone} icon={worktree.dirty ? FileDiff : CheckCircle2} />
        </Box>
        <Box flexDirection="row" alignItems="center" gap="s" flexWrap="wrap">
          <MetricPill label="文件" value={String(worktree.filesChanged)} />
          <MetricPill label="新增" value={`+${worktree.additions}`} tone="green" />
          <MetricPill label="删除" value={`-${worktree.deletions}`} tone="danger" />
          {worktree.head ? <MetricPill label="HEAD" value={worktree.head.slice(0, 7)} /> : null}
        </Box>
      </Box>
      {worktree.error ? <SystemLine text={worktree.error} tone="danger" /> : null}
      {visibleFiles.length ? (
        <Box borderTopWidth={1} borderColor="line">
          {visibleFiles.map((file) => (
            <DiffFileRow key={file.path} file={file} />
          ))}
          {worktree.diffTruncated ? (
            <Box paddingHorizontal="m" paddingVertical="s" borderTopWidth={1} borderColor="line">
              <Text variant="caption" color="inkMuted">
                还有更多文件，已在手机端摘要截断。
              </Text>
            </Box>
          ) : null}
        </Box>
      ) : (
        <Box paddingHorizontal="m" paddingBottom="m">
          <Text variant="body" color="inkMuted">
            没有文件变更。
          </Text>
        </Box>
      )}
    </Box>
  );
}

function MetricPill({ label, value, tone = "neutral" }: { label: string; value: string; tone?: Tone }) {
  return (
    <Box minHeight={28} borderRadius="round" backgroundColor={toneSoftToken(tone)} paddingHorizontal="s" flexDirection="row" alignItems="center" gap="xs">
      <Text variant="caption" color="inkMuted">
        {label}
      </Text>
      <Text variant="caption" color={toneToken(tone)}>
        {value}
      </Text>
    </Box>
  );
}

function DiffFileRow({ file }: { file: WorktreeSummary["files"][number] }) {
  const tone: Tone = file.risk === "high" ? "danger" : file.risk === "medium" ? "amber" : "neutral";
  const hasStats = file.additions > 0 || file.deletions > 0;
  return (
    <Box minHeight={40} flexDirection="row" alignItems="center" gap="s" paddingHorizontal="m" borderTopWidth={1} borderColor="line">
      <FileText color={theme.colors[toneToken(tone)]} size={16} />
      <Text variant="caption" flex={1} numberOfLines={1}>
        {file.path}
      </Text>
      {hasStats ? (
        <>
          <Text variant="caption" color="success">
            +{file.additions}
          </Text>
          <Text variant="caption" color="danger">
            -{file.deletions}
          </Text>
        </>
      ) : (
        <Text variant="caption" color="inkMuted">
          变更
        </Text>
      )}
    </Box>
  );
}

function SessionContextBar({ session }: { session: SessionSummary }) {
  const showState = session.state !== "completed" && session.state !== "idle";
  return (
    <Box flexDirection="row" alignItems="center" gap="s" paddingVertical="xs" flexWrap="wrap">
      <StatusChip label={agentLabel(session.agentKind)} tone="violet" icon={Bot} />
      {showState ? <StatusChip label={stateLabel(session.state)} tone={sessionTone(session.state)} icon={TerminalSquare} /> : null}
      {session.pendingApprovals > 0 ? <StatusChip label={`${session.pendingApprovals} 审批`} tone="danger" icon={ShieldAlert} /> : null}
    </Box>
  );
}

function HistoryLoadLine({ loading, hasMore, error, onLoadOlder }: { loading: boolean; hasMore: boolean; error: string | null; onLoadOlder: () => void }) {
  if (error) {
    return (
      <Pressable accessibilityRole="button" onPress={onLoadOlder}>
        {({ pressed }) => <SystemLine text={`${error}，点按重试`} tone="danger" pressed={pressed} />}
      </Pressable>
    );
  }
  if (!hasMore && !loading) {
    return null;
  }
  return (
    <Pressable accessibilityRole="button" onPress={onLoadOlder} disabled={loading || !hasMore}>
      {({ pressed }) => (
        <Box alignSelf="center" minHeight={34} borderRadius="round" backgroundColor="surfaceMuted" paddingHorizontal="m" flexDirection="row" alignItems="center" gap="xs" style={{ opacity: pressed ? 0.7 : 1 }}>
          <RefreshCcw color={theme.colors.inkMuted} size={15} />
          <Text variant="caption">{loading ? "加载历史..." : "加载更早消息"}</Text>
        </Box>
      )}
    </Pressable>
  );
}

function ConversationEmpty({ session }: { session: SessionSummary }) {
  return (
    <Box alignItems="center" paddingTop="xxl" gap="m">
      <Box width={118} height={118} borderRadius="l" backgroundColor="terminal" alignItems="center" justifyContent="center" borderWidth={1} borderColor="line">
        <Bot color={theme.colors.terminalText} size={48} />
        <Box position="absolute" left={16} right={16} bottom={16} height={4} borderRadius="round" backgroundColor={toneToken(sessionTone(session.state))} />
      </Box>
      <Box alignItems="center" gap="xs" maxWidth={280}>
        <Text variant="title" textAlign="center">
          {stateHeadline(session.state)}
        </Text>
        <Text variant="body" color="inkMuted" textAlign="center">
          {stateSummary(session.state)}
        </Text>
      </Box>
    </Box>
  );
}

function NoSessionState() {
  return (
    <Box alignItems="center" paddingTop="xxl" gap="m">
      <Box width={78} height={78} borderRadius="round" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center">
        <Bot color={theme.colors.inkMuted} size={34} />
      </Box>
      <Text variant="title">暂无会话</Text>
      <Text variant="body" color="inkMuted" textAlign="center">
        电脑端启动 Codex 或 Claude Code 后会显示在这里。
      </Text>
    </Box>
  );
}

function CurrentTurnStatus({ session }: { session: SessionSummary }) {
  const tone = sessionTone(session.state);
  return (
    <Box flexDirection="row" alignItems="flex-start" gap="s" paddingRight="l">
      <Box width={32} height={32} borderRadius="m" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center" marginTop="xs">
        <Bot color={theme.colors[toneToken(tone)]} size={18} />
      </Box>
      <Box borderRadius="m" borderWidth={1} borderColor={toneToken(tone)} backgroundColor={toneSoftToken(tone)} paddingHorizontal="m" paddingVertical="s" maxWidth="78%">
        <Text variant="caption" color={toneToken(tone)}>
          {session.state === "thinking" ? "Agent 正在读取上下文" : "Agent 正在执行任务"}
        </Text>
      </Box>
    </Box>
  );
}

function ConversationEvent({
  event,
  pending,
  onApprovalApprove,
  onApprovalReject,
  onOpenToolDetail,
  onOpenCodeDetail,
  onCopyCode
}: {
  event: SessionEvent;
  pending?: boolean;
  onApprovalApprove: () => void;
  onApprovalReject: () => void;
  onOpenToolDetail: (detail: ToolDetail) => void;
  onOpenCodeDetail: (detail: CodeDetail) => void;
  onCopyCode: (text: string) => void;
}) {
  if (event.type === "user-message") {
    return <UserBubble text={event.text} pending={pending} />;
  }
  if (event.type === "agent-message") {
    return <AgentBubble text={event.text} onOpenCodeDetail={onOpenCodeDetail} onCopyCode={onCopyCode} />;
  }
  if (event.type === "tool-started" && isInternalCodexItem(event.name)) {
    return null;
  }
  if (event.type === "tool-finished" && isInternalCodexItem(event.name)) {
    return null;
  }
  if (event.type === "command-output") {
    return <CommandBlock command={event.command} summary={event.summary} ok={!event.exitCode} onOpenDetail={onOpenToolDetail} />;
  }
  if (event.type === "tool-started") {
    return <ToolBlock name={event.name} summary="等待 Host 返回结果" status="进行中" tone="blue" onOpenDetail={onOpenToolDetail} />;
  }
  if (event.type === "tool-finished") {
    return <ToolBlock name={event.name} summary={event.summary} status={event.ok ? "完成" : "失败"} tone={event.ok ? "green" : "danger"} onOpenDetail={onOpenToolDetail} />;
  }
  if (event.type === "diff-updated") {
    return <DiffBlock summary={event.summary} />;
  }
  if (event.type === "approval-requested") {
    return <ApprovalBlock onApprove={onApprovalApprove} onReject={onApprovalReject} />;
  }
  if (event.type === "state-changed") {
    return null;
  }
  if (event.type === "error") {
    return <ToolBlock name="运行错误" summary={event.message} status="失败" tone="danger" onOpenDetail={onOpenToolDetail} />;
  }
  if (event.type === "approval-resolved") {
    return <SystemLine text={event.approved ? "审批已批准" : "审批已拒绝"} tone={event.approved ? "green" : "danger"} />;
  }
  return <SystemLine text="会话已开始" tone="neutral" />;
}

function UserBubble({ text, pending }: { text: string; pending?: boolean }) {
  return (
    <Box alignItems="flex-end" gap="xs">
      <Box maxWidth="82%" backgroundColor="userBubble" borderRadius="l" paddingHorizontal="l" paddingVertical="m">
        <Text variant="body">{text}</Text>
      </Box>
      {pending ? (
        <Text variant="caption" color="inkMuted">
          发送中...
        </Text>
      ) : null}
    </Box>
  );
}

function AgentBubble({ text, onOpenCodeDetail, onCopyCode }: { text: string; onOpenCodeDetail: (detail: CodeDetail) => void; onCopyCode: (text: string) => void }) {
  const { width } = useWindowDimensions();
  const segments = useMemo(() => splitMarkdownSegments(text), [text]);
  const contentWidth = Math.max(220, Math.min(430, width - 112));

  return (
    <Box flexDirection="row" alignItems="flex-start" gap="s" paddingRight="l">
      <Box width={32} height={32} borderRadius="m" backgroundColor="cobaltSoft" alignItems="center" justifyContent="center" marginTop="xs">
        <Bot color={theme.colors.cobalt} size={18} />
      </Box>
      <Box maxWidth="84%" gap="s">
        {segments.map((segment) =>
          segment.type === "code" ? (
            <CodeBlockCard key={segment.id} language={segment.language} code={segment.code} contentWidth={contentWidth} onOpenCodeDetail={onOpenCodeDetail} onCopyCode={onCopyCode} />
          ) : (
            <MarkdownBubble key={segment.id} text={segment.text} contentWidth={contentWidth} />
          )
        )}
      </Box>
    </Box>
  );
}

function MarkdownBubble({ text, contentWidth }: { text: string; contentWidth: number }) {
  const html = useMemo(() => markdownToHtml(text), [text]);
  return (
    <Box backgroundColor="surface" borderRadius="l" paddingHorizontal="m" paddingVertical="m" borderWidth={1} borderColor="line" style={softShadow(false)}>
      <RenderHTML
        contentWidth={contentWidth}
        source={{ html }}
        baseStyle={markdownBaseStyle()}
        tagsStyles={markdownTagStyles()}
        enableExperimentalMarginCollapsing
      />
    </Box>
  );
}

function CodeBlockCard({
  language,
  code,
  contentWidth,
  onOpenCodeDetail,
  onCopyCode
}: {
  language: string;
  code: string;
  contentWidth: number;
  onOpenCodeDetail: (detail: CodeDetail) => void;
  onCopyCode: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const cleanCode = cleanCodeBlock(code);
  const preview = codePreviewForCard(cleanCode);
  const codeWidth = codeContentWidth(preview.text, contentWidth);
  const lineCount = codeLineCount(cleanCode);
  const label = language || "code";
  const openDetail = () => onOpenCodeDetail({ title: "代码块", language: label, code: cleanCode });
  const handleCopy = () => {
    onCopyCode(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Box borderRadius="m" borderWidth={1} borderColor="line" backgroundColor="surface" overflow="hidden" style={{ width: contentWidth }}>
      <Box minHeight={40} flexDirection="row" alignItems="center" justifyContent="space-between" paddingHorizontal="m" style={{ backgroundColor: githubDark.header }}>
        <Box flexDirection="row" alignItems="center" gap="xs" flex={1}>
          <Code2 color={githubDark.accent} size={16} />
          <Text variant="caption" color="terminalText" numberOfLines={1}>
            {label} · {lineCount} 行
          </Text>
        </Box>
        <Box flexDirection="row" alignItems="center" gap="xs">
          <CodeAction icon={Copy} label={copied ? "已复制" : "复制"} active={copied} onPress={handleCopy} />
          <CodeAction label="查看" onPress={openDetail} />
        </Box>
      </Box>
      <Pressable accessibilityRole="button" accessibilityLabel="查看代码块详情" onPress={openDetail}>
        {({ pressed }) => (
          <Box style={{ opacity: pressed ? 0.76 : 1, backgroundColor: githubDark.bg }}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <HighlightedCode code={preview.text} language={label} width={codeWidth} />
            </ScrollView>
            {preview.hasMore ? (
              <Box minHeight={34} paddingHorizontal="m" flexDirection="row" alignItems="center" justifyContent="space-between" style={{ backgroundColor: githubDark.header }}>
                <Text variant="caption" color="terminalText" style={{ color: githubDark.muted }}>
                  已显示前 {preview.visibleLines} / {lineCount} 行
                </Text>
                <Text variant="caption" color="terminalText" style={{ color: githubDark.accent }}>
                  查看完整
                </Text>
              </Box>
            ) : null}
          </Box>
        )}
      </Pressable>
    </Box>
  );
}

function CodeAction({ icon: Icon, label, active = false, onPress }: { icon?: IconComponent; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {({ pressed }) => (
        <Box minHeight={28} borderRadius="s" paddingHorizontal="s" flexDirection="row" alignItems="center" gap="xs" style={{ opacity: pressed ? 0.65 : 1, backgroundColor: active ? githubDark.successButton : githubDark.button }}>
          {Icon ? <Icon color={active ? githubDark.successText : githubDark.text} size={13} /> : null}
          <Text variant="caption" color="terminalText" style={{ color: active ? githubDark.successText : githubDark.text }}>
            {label}
          </Text>
        </Box>
      )}
    </Pressable>
  );
}

function HighlightedCode({ code, language, width }: { code: string; language: string; width: number }) {
  const spans = useMemo(() => highlightCodeSpans(code || " ", language), [code, language]);
  return (
    <NativeText selectable style={[codeTextStyle, { width, color: githubDark.text }]}>
      {spans.map((span, index) => (
        <NativeText key={`${index}-${span.token}-${span.text.length}`} style={syntaxStyleForToken(span.token)}>
          {span.text}
        </NativeText>
      ))}
    </NativeText>
  );
}

function CommandBlock({ command, summary, ok, onOpenDetail }: { command: string; summary: string; ok: boolean; onOpenDetail: (detail: ToolDetail) => void }) {
  const detail = commandDetail(command, summary, ok);
  return <ToolEventRow icon={TerminalSquare} detail={detail} onOpenDetail={onOpenDetail} />;
}

function ToolBlock({
  name,
  summary,
  status,
  tone,
  onOpenDetail
}: {
  name: string;
  summary: string;
  status: string;
  tone: Tone;
  onOpenDetail: (detail: ToolDetail) => void;
}) {
  const detail = toolDetail(name, summary, status, tone);
  return <ToolEventRow icon={Wrench} detail={detail} onOpenDetail={onOpenDetail} />;
}

function ToolEventRow({ icon: Icon, detail, onOpenDetail }: { icon: IconComponent; detail: ToolDetail; onOpenDetail: (detail: ToolDetail) => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`查看${detail.title}详情`} onPress={() => onOpenDetail(detail)}>
      {({ pressed }) => (
        <Box
          minHeight={48}
          flexDirection="row"
          alignItems="center"
          gap="s"
          borderRadius="m"
          borderWidth={1}
          borderColor="line"
          backgroundColor="surface"
          paddingHorizontal="m"
          paddingVertical="s"
          style={{ opacity: pressed ? 0.68 : 1 }}
        >
          <Box width={28} height={28} borderRadius="s" backgroundColor={toneSoftToken(detail.tone)} alignItems="center" justifyContent="center">
            <Icon color={theme.colors[toneToken(detail.tone)]} size={16} />
          </Box>
          <Box flex={1}>
            <Box flexDirection="row" alignItems="center" gap="xs">
              <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: theme.colors[toneToken(detail.tone)] }} />
              <Text variant="caption" color="inkMuted" numberOfLines={1}>
                {detail.status}
              </Text>
              <Text variant="caption" color="inkMuted">
                ·
              </Text>
              <Text variant="body" flex={1} numberOfLines={1}>
                {detail.title}
              </Text>
            </Box>
            {detail.summary ? (
              <Text variant="caption" numberOfLines={1}>
                {detail.summary}
              </Text>
            ) : null}
          </Box>
          <ChevronRight color={theme.colors.inkMuted} size={18} />
        </Box>
      )}
    </Pressable>
  );
}

function DiffBlock({ summary }: { summary: Extract<SessionEvent, { type: "diff-updated" }>["summary"] }) {
  return (
    <Box borderRadius="m" borderWidth={1} borderColor="line" backgroundColor="surface" overflow="hidden">
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" padding="m" borderBottomWidth={1} borderColor="line">
        <Box flexDirection="row" alignItems="center" gap="s">
          <FileDiff color={theme.colors.cobalt} size={20} />
          <Text variant="section">Diff 摘要</Text>
        </Box>
        <Text variant="caption" color="cobalt">
          +{summary.additions} / -{summary.deletions}
        </Text>
      </Box>
      {summary.files.slice(0, 3).map((file) => (
        <Box key={file.path} flexDirection="row" alignItems="center" gap="m" paddingHorizontal="m" paddingVertical="s">
          <Text variant="caption" numberOfLines={1} flex={1}>
            {file.path}
          </Text>
          <Text variant="caption" color="success">
            +{file.additions}
          </Text>
          <Text variant="caption" color="danger">
            -{file.deletions}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function ApprovalBlock({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  return (
    <Box borderRadius="m" borderWidth={1} borderColor="danger" backgroundColor="dangerSoft" padding="m" gap="m">
      <Box flexDirection="row" alignItems="center" gap="s">
        <ShieldAlert color={theme.colors.danger} size={22} />
        <Text variant="section" color="danger">
          等待审批
        </Text>
      </Box>
      <Text variant="body" color="ink">
        Agent 请求执行需要确认的操作。请先查看 Diff 和涉及文件。
      </Text>
      <Box flexDirection="row" gap="s">
        <DecisionButton label="拒绝" tone="neutral" onPress={onReject} />
        <DecisionButton label="批准" tone="green" onPress={onApprove} />
      </Box>
    </Box>
  );
}

function DecisionButton({ label, tone, onPress }: { label: string; tone: Tone; onPress: () => void }) {
  const filled = tone !== "neutral";
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <Box
          minHeight={44}
          borderRadius="m"
          alignItems="center"
          justifyContent="center"
          backgroundColor={filled ? toneToken(tone) : "surface"}
          borderWidth={filled ? 0 : 1}
          borderColor="line"
          style={{ opacity: pressed ? 0.7 : 1 }}
        >
          <Text variant="section" color={filled ? "white" : "inkMuted"}>
            {label}
          </Text>
        </Box>
      )}
    </Pressable>
  );
}

function SystemLine({ text, tone, pressed = false }: { text: string; tone: Tone; pressed?: boolean }) {
  return (
    <Box flexDirection="row" alignItems="center" gap="s" alignSelf="center" paddingHorizontal="m" paddingVertical="s" backgroundColor={toneSoftToken(tone)} borderRadius="round" style={{ opacity: pressed ? 0.7 : 1 }}>
      <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: theme.colors[toneToken(tone)] }} />
      <Text variant="caption" color={toneToken(tone)}>
        {text}
      </Text>
    </Box>
  );
}

function ConversationComposer({
  bottom,
  compact,
  value,
  disabled,
  onChangeText,
  onSubmit,
  onAttach,
  onVoice,
  onCommand,
  onHeightChange
}: {
  bottom: number;
  compact: boolean;
  value: string;
  disabled: boolean;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onAttach: () => void;
  onVoice: () => void;
  onCommand: (kind: CommandPickerMode) => void;
  onHeightChange: (height: number) => void;
}) {
  const canSubmit = value.trim().length > 0 && !disabled;
  const commandPrefix = value.trimStart().charAt(0);
  const showCommandHints = !compact && (commandPrefix === "$" || commandPrefix === "/");

  return (
    <Box
      position="absolute"
      left={0}
      right={0}
      bottom={bottom}
      zIndex={30}
      paddingHorizontal="m"
      gap="s"
      onLayout={(event) => onHeightChange(Math.ceil(event.nativeEvent.layout.height))}
    >
      {showCommandHints ? (
        <Box flexDirection="row" gap="s">
          {commandPrefix === "$" ? (
            <CommandChip label="选择技能" hint="打开列表" icon={Code2} onPress={() => onCommand("skill")} />
          ) : (
            <CommandChip label="选择命令" hint="打开列表" icon={TerminalSquare} onPress={() => onCommand("slash")} />
          )}
        </Box>
      ) : (
        <Box flexDirection="row" gap="s" alignItems="center">
          <ComposerTag label="技能" icon={Code2} onPress={() => onCommand("skill")} />
          <ComposerTag label="命令" icon={TerminalSquare} onPress={() => onCommand("slash")} />
        </Box>
      )}
      <Box backgroundColor="surface" borderRadius="l" borderWidth={1} borderColor="line" minHeight={58} flexDirection="row" alignItems="center" gap="s" paddingHorizontal="s" style={softShadow(false)}>
        <IconOnly icon={Paperclip} tone="neutral" label="附件" onPress={onAttach} />
        <Box flex={1} minHeight={44} justifyContent="center">
          <TextInput
            value={value}
            onChangeText={onChangeText}
            editable={!disabled}
            placeholder={disabled ? "等待 Host 或会话..." : "输入消息..."}
            placeholderTextColor={theme.colors.inkMuted}
            multiline
            style={{ color: theme.colors.ink, fontSize: 16, lineHeight: 22, paddingVertical: 10, minHeight: 44 }}
          />
        </Box>
        <IconOnly icon={Mic} tone="neutral" label="语音" onPress={onVoice} />
        <Pressable accessibilityRole="button" accessibilityLabel="发送" onPress={onSubmit}>
          {({ pressed }) => (
            <Box width={46} height={46} borderRadius="round" backgroundColor={canSubmit ? "accent" : "surfaceMuted"} alignItems="center" justifyContent="center" style={{ opacity: pressed ? 0.68 : 1 }}>
              <Send color={canSubmit ? theme.colors.white : theme.colors.inkMuted} size={20} />
            </Box>
          )}
        </Pressable>
      </Box>
    </Box>
  );
}

function SettingsPage({
  top,
  bottom,
  relayUrl,
  activeHost,
  hostOnline,
  connectionState,
  lastError,
  activeSessionCount,
  glassDiagnostics,
  glassView,
  islandTestState,
  pairing,
  themePreference,
  resolvedTheme,
  onPair,
  onSaveDiscoveredHost,
  onReconnect,
  onClearPairing,
  onThemePreferenceChange,
  onTestIsland
}: {
  top: number;
  bottom: number;
  relayUrl: string;
  activeHost: HostStatus | null;
  hostOnline: boolean;
  connectionState: ConnectionState;
  lastError: string | null;
  activeSessionCount: number;
  glassDiagnostics: GlassDiagnostics;
  glassView: GlassViewComponent | null;
  islandTestState: DynamicIslandTestState;
  pairing: PairingPayload | null;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedThemeMode;
  onPair: () => void;
  onSaveDiscoveredHost: () => void;
  onReconnect: () => void;
  onClearPairing: () => void;
  onThemePreferenceChange: (value: ThemePreference) => void;
  onTestIsland: (state: DynamicIslandTestState) => void;
}) {
  const pairingState = getPairingState(pairing, hostOnline, connectionState, activeHost, lastError);
  const StateIcon = pairingState.icon;
  const pairingHostValue = pairing?.hostName ?? (hostOnline && activeHost?.name ? `未固定 · ${activeHost.name}` : "未固定");
  const pairButtonLabel = pairing ? "重新配对" : hostOnline ? "固定为默认" : "配对 Host";
  const pairButtonAction = !pairing && hostOnline ? onSaveDiscoveredHost : onPair;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: top + 16,
        paddingHorizontal: 16,
        paddingBottom: bottom + 300,
        gap: 18
      }}
      scrollIndicatorInsets={{ bottom: bottom + 126 }}
    >
      <Box gap="xs">
        <Text variant="screenTitle">设置</Text>
        <Text variant="caption">连接、通知和 Agent 环境</Text>
      </Box>

      <Box borderRadius="l" backgroundColor={pairingState.panelBg} borderWidth={1} borderColor={pairingState.borderColor} padding="l" gap="m" style={softShadow(false)}>
        <Box flexDirection="row" alignItems="center" gap="m">
          <Box width={54} height={54} borderRadius="m" backgroundColor="surface" alignItems="center" justifyContent="center">
            <StateIcon color={theme.colors[pairingState.token]} size={26} />
          </Box>
          <Box flex={1}>
            <Text variant="title">{pairingState.title}</Text>
            <Text variant="caption">{pairingState.body}</Text>
          </Box>
          <ToneCapsule tone={pairingState.tone} text={pairingState.badge} />
        </Box>
        {hostOnline ? null : <PairingSteps pairing={pairing} connectionState={connectionState} hostOnline={hostOnline} activeHost={activeHost} />}
        <Box flexDirection="row" gap="s">
          <SettingsButton label={pairButtonLabel} tone="blue" onPress={pairButtonAction} />
          <SettingsButton label="重连" tone="neutral" onPress={onReconnect} />
        </Box>
      </Box>

      <SettingsSection title="连接">
        <SettingsRow icon={QrCode} title="配对 Host" value={pairingHostValue} />
        <SettingsRow icon={Zap} title="Relay" value={relayUrl} monospace />
        {lastError ? <SettingsHint tone="danger" title="连接错误" text={lastError} /> : null}
        {pairing && !hostOnline ? (
          <SettingsHint
            tone={connectionState === "online" ? "amber" : "neutral"}
            title={connectionState === "online" ? "Host 还没上线" : "等待 Relay"}
            text={connectionState === "online" ? "Relay 已连接，但还没有收到这台电脑 Host 的在线状态。" : "保存配对后 App 会自动重连。请确认电脑端 Relay 正在运行。"}
            detail={connectionState === "online" ? "npm run relay:dev\ncargo run -p agentpal-host -- codex connect --workspace . --relay-url ws://127.0.0.1:8790/ws" : undefined}
          />
        ) : null}
        <SettingsRow icon={Bot} title="当前工作中" value={`${activeSessionCount}`} />
        <SettingsRow icon={TerminalSquare} title="工作区" value={`${activeHost?.workspaces.length ?? 0}`} />
      </SettingsSection>

      {pairing ? (
        <SettingsSection title="配对详情">
          <SettingsRow icon={Monitor} title="Host ID" value={pairing.hostId} />
          <SettingsActionRow icon={Trash2} title="清除当前配对" value="回到自动发现" tone="danger" onPress={onClearPairing} />
        </SettingsSection>
      ) : null}

      <SettingsSection title="偏好">
        <SettingsRow icon={Activity} title="当前主题" value={resolvedTheme === "dark" ? "暗色" : "明亮"} />
        <ThemePreferenceControl value={themePreference} onChange={onThemePreferenceChange} />
        <SettingsRow icon={Bell} title="通知" value="审批 / 完成 / 失败" />
        <SettingsRow icon={Mic} title="语音输入" value="待接入" />
        <SettingsRow icon={ShieldAlert} title="审批策略" value="跟随原生 Agent" />
      </SettingsSection>

      <DynamicIslandTestPanel diagnostics={glassDiagnostics} glassView={glassView} selectedState={islandTestState} onSelectState={onTestIsland} />
    </ScrollView>
  );
}

function getPairingState(
  pairing: PairingPayload | null,
  hostOnline: boolean,
  connectionState: ConnectionState,
  activeHost: HostStatus | null,
  lastError: string | null
): PairingUiState {
  if (lastError || connectionState === "error") {
    return {
      title: "Relay 连接失败",
      body: lastError ?? `无法连接 ${pairing?.relayUrl ?? "Relay"}`,
      badge: "错误",
      tone: "danger",
      icon: ShieldAlert,
      token: "danger",
      panelBg: "dangerSoft",
      borderColor: "danger"
    };
  }

  if (connectionState === "connecting") {
    return {
      title: "正在连接 Relay",
      body: pairing?.relayUrl ?? "正在连接默认 Relay",
      badge: "连接中",
      tone: "amber",
      icon: RefreshCcw,
      token: "amber",
      panelBg: "amberSoft",
      borderColor: "amber"
    };
  }

  if (connectionState === "offline") {
    return {
      title: "Relay 已断开",
      body: "App 会自动重试，也可以手动点击重连。",
      badge: "离线",
      tone: "neutral",
      icon: Zap,
      token: "inkMuted",
      panelBg: "surface",
      borderColor: "line"
    };
  }

  if (!pairing) {
    if (hostOnline && activeHost) {
      return {
        title: "Host 在线",
        body: "这台电脑在线，但还没有固定为默认 Host。",
        badge: "未固定",
        tone: "green",
        icon: CheckCircle2,
        token: "success",
        panelBg: "successSoft",
        borderColor: "success"
      };
    }
    if (connectionState === "online") {
      return {
        title: "Relay 已连接",
        body: "等待电脑端 Host 上线，或扫码保存配对信息。",
        badge: "等待 Host",
        tone: "amber",
        icon: Zap,
        token: "amber",
        panelBg: "amberSoft",
        borderColor: "amber"
      };
    }
    return {
      title: "等待配对",
      body: "先连接电脑端 Host，之后才能读取会话和发送指令。",
      badge: "未配对",
      tone: "neutral",
      icon: QrCode,
      token: "inkMuted",
      panelBg: "surface",
      borderColor: "line"
    };
  }

  if (!hostOnline) {
    return {
      title: "等待 Host 上线",
      body: `Relay 已连接，但还没找到 ${pairing.hostName}。`,
      badge: "等待",
      tone: "amber",
      icon: Monitor,
      token: "amber",
      panelBg: "amberSoft",
      borderColor: "amber"
    };
  }

  return {
    title: "Host 已连接",
    body: activeHost?.name ? `${activeHost.name} 可以接收指令` : `${pairing.hostName} 可以接收指令`,
    badge: "在线",
    tone: "green",
    icon: CheckCircle2,
    token: "success",
    panelBg: "successSoft",
    borderColor: "success"
  };
}

function PairingSteps({
  pairing,
  connectionState,
  hostOnline,
  activeHost
}: {
  pairing: PairingPayload | null;
  connectionState: ConnectionState;
  hostOnline: boolean;
  activeHost: HostStatus | null;
}) {
  const relayState: PairingStepState = connectionState === "online" ? "done" : connectionState === "error" ? "danger" : pairing ? "active" : "todo";
  const hostState: PairingStepState = hostOnline ? "done" : connectionState === "online" && pairing ? "active" : "todo";

  return (
    <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" overflow="hidden">
      <PairingStepLine index={1} title="保存配对" value={pairing?.hostName ?? "等待二维码或手动地址"} state={pairing ? "done" : "active"} />
      <PairingStepLine index={2} title="连接 Relay" value={connectionLabel(connectionState)} state={relayState} />
      <PairingStepLine index={3} title="找到 Host" value={activeHost?.name ?? pairing?.hostId ?? "等待电脑端上线"} state={hostState} last />
    </Box>
  );
}

function PairingStepLine({
  index,
  title,
  value,
  state,
  last
}: {
  index: number;
  title: string;
  value: string;
  state: PairingStepState;
  last?: boolean;
}) {
  const tone = pairingStepTone(state);
  const done = state === "done";

  return (
    <Box minHeight={52} flexDirection="row" alignItems="center" gap="m" paddingHorizontal="m" borderBottomWidth={last ? 0 : 1} borderColor="line">
      <Box width={28} height={28} borderRadius="round" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
        {done ? (
          <CheckCircle2 color={theme.colors[toneToken(tone)]} size={16} />
        ) : (
          <Text variant="caption" color={toneToken(tone)}>
            {index}
          </Text>
        )}
      </Box>
      <Box flex={1}>
        <Text variant="body" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {value}
        </Text>
      </Box>
      <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: theme.colors[toneToken(tone)] }} />
    </Box>
  );
}

function SettingsHint({
  title,
  text,
  detail,
  tone = "neutral"
}: {
  title: string;
  text: string;
  detail?: string;
  tone?: Tone;
}) {
  return (
    <Box padding="m" gap="s" borderBottomWidth={1} borderColor="line" backgroundColor={toneSoftToken(tone)}>
      <Box flexDirection="row" alignItems="center" gap="s">
        <ShieldAlert color={theme.colors[toneToken(tone)]} size={17} />
        <Text variant="section" color={toneToken(tone)}>
          {title}
        </Text>
      </Box>
      <Text variant="caption" color={tone === "neutral" ? "inkMuted" : toneToken(tone)}>
        {text}
      </Text>
      {detail ? (
        <Box backgroundColor="terminal" borderRadius="s" padding="s">
          <Text variant="caption" color="terminalText">
            {detail}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

function DynamicIslandTestPanel({
  diagnostics,
  glassView,
  selectedState,
  onSelectState
}: {
  diagnostics: GlassDiagnostics;
  glassView: GlassViewComponent | null;
  selectedState: DynamicIslandTestState;
  onSelectState: (state: DynamicIslandTestState) => void;
}) {
  const status = dynamicIslandStatus(selectedState);
  const Icon = status.icon;
  const options: DynamicIslandTestState[] = ["approval", "running", "idle"];

  return (
    <Box gap="s">
      <Text variant="section">灵动岛测试</Text>
      <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" padding="m" gap="m" style={softShadow(false)}>
        <Box borderRadius="round" backgroundColor="terminal" minHeight={64} paddingHorizontal="m" flexDirection="row" alignItems="center" gap="m">
          <Box width={34} height={34} borderRadius="round" backgroundColor={status.bgToken} alignItems="center" justifyContent="center">
            <Icon color={status.color} size={18} />
          </Box>
          <Box flex={1}>
            <Text variant="section" color="white" numberOfLines={1}>
              {status.label}
            </Text>
            <Text variant="caption" color="terminalText" numberOfLines={1}>
              {status.body}
            </Text>
          </Box>
          <View style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: status.color }} />
        </Box>

        <GlassEffectProbe diagnostics={diagnostics} glassView={glassView} />

        <Box flexDirection="row" gap="s">
          {options.map((state) => {
            const item = dynamicIslandStatus(state);
            const active = selectedState === state;
            return (
              <Pressable key={state} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onSelectState(state)} style={{ flex: 1 }}>
                {({ pressed }) => (
                  <Box
                    minHeight={46}
                    borderRadius="m"
                    backgroundColor={active ? item.bgToken : "surfaceMuted"}
                    borderWidth={1}
                    borderColor={active ? item.borderToken : "line"}
                    alignItems="center"
                    justifyContent="center"
                    style={{ opacity: pressed ? 0.7 : 1 }}
                  >
                    <Text variant="caption" color={active ? item.token : "inkMuted"} numberOfLines={1}>
                      {item.shortLabel}
                    </Text>
                  </Box>
                )}
              </Pressable>
            );
          })}
        </Box>

        <SettingsRowPlain icon={Activity} title="Liquid Glass" value={diagnostics.enabled ? "可用" : diagnostics.reason} />
        <Text variant="caption">
          平台 {diagnostics.platform} / 模块 {diagnostics.moduleLoaded ? "已加载" : "未加载"} / 透明度 {diagnostics.reduceTransparencyEnabled ? "关闭" : "允许"} / Liquid {diagnostics.liquidGlassAvailable ? "可用" : "不可用"} / API {diagnostics.glassApiAvailable ? "可用" : "不可用"}
        </Text>
        <Text variant="caption">
          这里是状态预览和能力诊断。真正的 iOS 灵动岛 / Live Activity 需要原生模块和 Dev Build，Expo Go 不能直接触发系统灵动岛。
        </Text>
      </Box>
    </Box>
  );
}

function GlassEffectProbe({ diagnostics, glassView }: { diagnostics: GlassDiagnostics; glassView: GlassViewComponent | null }) {
  const glassProps = {
    glassEffectStyle: "regular",
    tintColor: "rgba(255,255,255,0.24)",
    style: {
      width: "86%",
      minHeight: 70,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18
    }
  };
  return (
    <Box borderRadius="m" overflow="hidden" minHeight={116} backgroundColor="terminal">
      <View style={{ position: "absolute", left: 0, top: 0, width: 118, height: 116, backgroundColor: theme.colors.accent }} />
      <View style={{ position: "absolute", left: 86, top: 0, width: 92, height: 116, backgroundColor: theme.colors.violet }} />
      <View style={{ position: "absolute", right: 0, top: 0, width: 120, height: 116, backgroundColor: theme.colors.success }} />
      <View style={{ position: "absolute", left: 28, top: 72, width: 140, height: 16, borderRadius: 999, backgroundColor: theme.colors.amber }} />
      <View style={{ position: "absolute", right: 34, top: 30, width: 96, height: 16, borderRadius: 999, backgroundColor: theme.colors.danger }} />
      <Box flex={1} alignItems="center" justifyContent="center" padding="m">
        {diagnostics.enabled && glassView ? (
          React.createElement(
            glassView,
            glassProps,
            <>
            <Text variant="section" color="white" textAlign="center">
              Native Liquid Glass
            </Text>
            <Text variant="caption" color="white" textAlign="center">
              这块应当能看到背景被系统玻璃折射
            </Text>
            </>
          )
        ) : (
          <Box width="86%" minHeight={70} borderRadius="round" backgroundColor="surface" alignItems="center" justifyContent="center" paddingHorizontal="m">
            <Text variant="section" textAlign="center">
              当前未启用
            </Text>
            <Text variant="caption" textAlign="center">
              {diagnostics.reason}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box gap="s">
      <Text variant="section">{title}</Text>
      <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" overflow="hidden">
        {children}
      </Box>
    </Box>
  );
}

function ThemePreferenceControl({ value, onChange }: { value: ThemePreference; onChange: (value: ThemePreference) => void }) {
  const options: Array<{ value: ThemePreference; label: string }> = [
    { value: "system", label: "跟随系统" },
    { value: "light", label: "明亮" },
    { value: "dark", label: "暗色" }
  ];

  return (
    <Box minHeight={72} gap="s" paddingHorizontal="m" paddingVertical="m" borderBottomWidth={1} borderColor="line">
      <Text variant="body">外观</Text>
      <Box flexDirection="row" gap="s">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onChange(option.value)} style={{ flex: 1 }}>
              {({ pressed }) => (
                <Box minHeight={38} borderRadius="m" backgroundColor={active ? "navActive" : "surfaceMuted"} borderWidth={1} borderColor={active ? "accent" : "line"} alignItems="center" justifyContent="center" style={{ opacity: pressed ? 0.68 : 1 }}>
                  <Text variant="caption" color={active ? "accent" : "inkMuted"}>
                    {option.label}
                  </Text>
                </Box>
              )}
            </Pressable>
          );
        })}
      </Box>
    </Box>
  );
}

function SettingsRow({ icon: Icon, title, value, monospace = false }: { icon: IconComponent; title: string; value: string; monospace?: boolean }) {
  return (
    <Box minHeight={58} flexDirection="row" alignItems="center" gap="m" paddingHorizontal="m" borderBottomWidth={1} borderColor="line">
      <Box width={34} height={34} borderRadius="s" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center">
        <Icon color={theme.colors.inkMuted} size={18} />
      </Box>
      <Text variant="body" flex={1}>
        {title}
      </Text>
      <Text variant="caption" numberOfLines={1} maxWidth={190} textAlign="right" style={monospace ? { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) } : undefined}>
        {value}
      </Text>
    </Box>
  );
}

function SettingsRowPlain({ icon: Icon, title, value }: { icon: IconComponent; title: string; value: string }) {
  return (
    <Box minHeight={48} flexDirection="row" alignItems="center" gap="m" paddingHorizontal="s" borderRadius="s" backgroundColor="surfaceMuted">
      <Icon color={theme.colors.inkMuted} size={18} />
      <Text variant="body" flex={1}>
        {title}
      </Text>
      <Text variant="caption" numberOfLines={1} maxWidth={190} textAlign="right">
        {value}
      </Text>
    </Box>
  );
}

function SettingsActionRow({
  icon: Icon,
  title,
  value,
  tone,
  onPress
}: {
  icon: IconComponent;
  title: string;
  value: string;
  tone: Tone;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Box minHeight={58} flexDirection="row" alignItems="center" gap="m" paddingHorizontal="m" borderBottomWidth={1} borderColor="line" style={{ opacity: pressed ? 0.68 : 1 }}>
          <Box width={34} height={34} borderRadius="s" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
            <Icon color={theme.colors[toneToken(tone)]} size={18} />
          </Box>
          <Text variant="body" flex={1}>
            {title}
          </Text>
          <Text variant="caption" color={toneToken(tone)} numberOfLines={1} maxWidth={190} textAlign="right">
            {value}
          </Text>
        </Box>
      )}
    </Pressable>
  );
}

function SettingsButton({ label, tone, onPress }: { label: string; tone: Tone; onPress: () => void }) {
  const filled = tone === "blue";
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <Box minHeight={46} borderRadius="m" backgroundColor={filled ? "accent" : "surfaceMuted"} alignItems="center" justifyContent="center" style={{ opacity: pressed ? 0.68 : 1 }}>
          <Text variant="section" color={filled ? "white" : "inkMuted"}>
            {label}
          </Text>
        </Box>
      )}
    </Pressable>
  );
}

function PairingSheet({
  visible,
  top,
  bottom,
  initialValue,
  onClose,
  onPair
}: {
  visible: boolean;
  top: number;
  bottom: number;
  initialValue: string;
  onClose: () => void;
  onPair: (value: string) => void;
}) {
  const [manualValue, setManualValue] = useState(initialValue);
  const [scanEnabled, setScanEnabled] = useState(false);
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [cameraView, setCameraView] = useState<CameraViewComponent | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setManualValue(initialValue);
      setScannedValue(null);
      setScanEnabled(false);
      setCameraError(null);
    }
  }, [initialValue, visible]);

  const startScan = async () => {
    try {
      const camera = require("expo-camera") as {
        CameraView?: CameraViewComponent;
        Camera?: { requestCameraPermissionsAsync?: () => Promise<{ granted: boolean }> };
        requestCameraPermissionsAsync?: () => Promise<{ granted: boolean }>;
      };
      const requestPermission = camera.Camera?.requestCameraPermissionsAsync ?? camera.requestCameraPermissionsAsync;
      if (requestPermission) {
        const permission = await requestPermission();
        if (!permission.granted) {
          setCameraError("没有相机权限，请使用手动输入");
          return;
        }
      }
      if (!camera.CameraView) {
        setCameraError("当前运行环境没有扫码组件，请使用手动输入");
        return;
      }
      setCameraView(() => camera.CameraView ?? null);
      setCameraError(null);
      setScannedValue(null);
      setScanEnabled(true);
    } catch {
      setScanEnabled(false);
      setCameraError("Expo Go 当前无法加载扫码模块，请使用手动输入");
    }
  };

  const handleBarcode = (result: BarcodeScanningResult) => {
    if (!scanEnabled || !result.data) {
      return;
    }
    setScanEnabled(false);
    setScannedValue(result.data);
    setManualValue(result.data);
  };

  const submit = () => {
    onPair(scannedValue ?? manualValue);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.34)", justifyContent: "flex-end" }}>
        <Box backgroundColor="canvas" borderTopLeftRadius="l" borderTopRightRadius="l" paddingHorizontal="m" paddingTop="m" gap="m" style={{ paddingBottom: bottom + 14, maxHeight: "92%" }}>
          <Box flexDirection="row" alignItems="center" gap="m" style={{ paddingTop: Math.max(0, top - 16) }}>
            <Box width={44} height={44} borderRadius="m" backgroundColor="cobaltSoft" alignItems="center" justifyContent="center">
              <QrCode color={theme.colors.cobalt} size={23} />
            </Box>
            <Box flex={1}>
              <Text variant="title">配对电脑端 Host</Text>
              <Text variant="caption">扫描二维码，或输入配对地址 / Relay 地址</Text>
            </Box>
            <IconShell icon={ArrowLeft} tone="neutral" onPress={onClose} label="关闭配对" />
          </Box>

          <Box borderRadius="l" overflow="hidden" backgroundColor="terminal" minHeight={scanEnabled ? 260 : 150} alignItems="center" justifyContent="center">
            {scanEnabled ? (
              cameraView ? (
                React.createElement(cameraView, {
                  active: visible && scanEnabled,
                  facing: "back",
                  barcodeScannerSettings: { barcodeTypes: ["qr"] },
                  onBarcodeScanned: handleBarcode,
                  style: { width: "100%", height: 300 }
                })
              ) : null
            ) : (
              <Box padding="l" alignItems="center" gap="m">
                <Box width={58} height={58} borderRadius="round" backgroundColor="surface" alignItems="center" justifyContent="center">
                  <QrCode color={theme.colors.cobalt} size={28} />
                </Box>
                <Text variant="section" color="white" textAlign="center">
                  {scannedValue ? "已读取二维码" : "等待扫码"}
                </Text>
                <Text variant="caption" color="terminalText" textAlign="center">
                  {cameraError ?? "在电脑端运行 Host 配对命令后，用这里扫描终端二维码。"}
                </Text>
              </Box>
            )}
          </Box>

          <Box flexDirection="row" gap="s">
            <SettingsButton label={scanEnabled ? "正在扫描" : "扫码"} tone="blue" onPress={startScan} />
            <SettingsButton label="保存" tone="neutral" onPress={submit} />
          </Box>

          <Box gap="s">
            <Text variant="section">手动输入</Text>
            <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" paddingHorizontal="m" paddingVertical="s" minHeight={94}>
              <TextInput
                value={manualValue}
                onChangeText={setManualValue}
                placeholder="agentpal://pair?... 或 192.168.1.13:8790"
                placeholderTextColor={theme.colors.inkMuted}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                style={{ minHeight: 70, color: theme.colors.ink, fontSize: 15, lineHeight: 21 }}
              />
            </Box>
            <Text variant="caption">推荐先运行 `agentpal-host codex pair` 生成二维码；只输入 IP:端口时默认 Host ID 为 agentpal-local-host。</Text>
          </Box>
        </Box>
      </View>
    </Modal>
  );
}

function SessionPickerSheet({
  visible,
  bottom,
  sessions,
  selectedSessionId,
  onSelect,
  onClose
}: {
  visible: boolean;
  bottom: number;
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onClose: () => void;
}) {
  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const toneA = sessionPriority(a);
        const toneB = sessionPriority(b);
        if (toneA !== toneB) {
          return toneA - toneB;
        }
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }),
    [sessions]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.34)", justifyContent: "flex-end" }}>
        <Box backgroundColor="canvas" borderTopLeftRadius="l" borderTopRightRadius="l" paddingHorizontal="m" paddingTop="m" gap="m" style={{ paddingBottom: bottom + 16, maxHeight: "78%" }}>
          <Box flexDirection="row" alignItems="center" gap="m">
            <Box width={42} height={42} borderRadius="m" backgroundColor="cobaltSoft" alignItems="center" justifyContent="center">
              <Bot color={theme.colors.cobalt} size={22} />
            </Box>
            <Box flex={1}>
              <Text variant="title">选择会话</Text>
              <Text variant="caption">按需要处理的优先级排序</Text>
            </Box>
            <IconShell icon={X} tone="neutral" label="关闭会话选择" onPress={onClose} />
          </Box>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
            {sortedSessions.length > 0 ? (
              <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" overflow="hidden">
                {sortedSessions.map((session, index) => (
                  <SessionPickerRow
                    key={session.sessionId}
                    session={session}
                    selected={session.sessionId === selectedSessionId}
                    first={index === 0}
                    onPress={() => onSelect(session.sessionId)}
                  />
                ))}
              </Box>
            ) : (
              <Box borderRadius="m" borderWidth={1} borderColor="line" backgroundColor="surface" padding="l" gap="xs">
                <Text variant="section">暂无会话</Text>
                <Text variant="body" color="inkMuted">
                  电脑端 Host 连接后，会在这里展示 Codex、Claude Code 或 OpenCode session。
                </Text>
              </Box>
            )}
          </ScrollView>
        </Box>
      </View>
    </Modal>
  );
}

function SessionPickerRow({
  session,
  selected,
  first,
  onPress
}: {
  session: SessionSummary;
  selected: boolean;
  first: boolean;
  onPress: () => void;
}) {
  const tone = sessionTone(session.state);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}>
      {({ pressed }) => (
        <Box
          minHeight={76}
          flexDirection="row"
          alignItems="center"
          gap="s"
          paddingHorizontal="m"
          paddingVertical="s"
          borderTopWidth={first ? 0 : 1}
          borderLeftWidth={selected ? 3 : 0}
          borderColor={selected ? "accent" : "line"}
          backgroundColor={selected ? "accentSoft" : "surface"}
          style={{ opacity: pressed ? 0.72 : 1 }}
        >
          <Box width={38} height={38} borderRadius="m" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
            <Bot color={theme.colors[toneToken(tone)]} size={19} />
          </Box>
          <Box flex={1} gap="xs">
            <Text variant="section" numberOfLines={1}>
              {session.title ?? "未命名会话"}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {agentLabel(session.agentKind)} · {compactWorkspaceName(session.workspace)}
            </Text>
          </Box>
          <Box alignItems="flex-end" gap="xs">
            {selected ? (
              <Text variant="caption" color="accent">
                当前
              </Text>
            ) : (
              <Text variant="caption" color="inkMuted">
                {formatRelativeTime(session.updatedAt)}
              </Text>
            )}
            <Box flexDirection="row" alignItems="center" gap="xs">
              {session.pendingApprovals > 0 ? <ShieldAlert color={theme.colors.danger} size={14} /> : null}
              <Text variant="caption" color={toneToken(tone)}>
                {stateLabel(session.state)}
              </Text>
            </Box>
          </Box>
        </Box>
      )}
    </Pressable>
  );
}

function CommandPickerSheet({
  mode,
  bottom,
  options,
  sheetState,
  onInsert,
  onClose
}: {
  mode: CommandPickerMode | null;
  bottom: number;
  options: CommandOption[];
  sheetState: PickerSheetState;
  onInsert: (value: string) => void;
  onClose: () => void;
}) {
  const isSkill = mode === "skill";
  const title = isSkill ? "选择技能" : "选择命令";
  const prefix = isSkill ? "$" : "/";
  const emptyTitle = sheetState.synced ? (isSkill ? "当前会话没有可用技能" : "当前会话没有可用命令") : "正在等待 Host 同步";
  const emptyBody = sheetState.synced
    ? isSkill
      ? "Host 已同步列表，但当前 Codex 会话没有返回可插入的 skill 或 plugin。"
      : "Host 已同步列表，但当前 Codex 会话没有返回 slash command。"
    : "电脑端 Host 会从当前 Agent 会话读取 skills、plugins 和 slash commands。同步前可以先插入前缀继续手动输入。";

  return (
    <Modal visible={!!mode} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.34)", justifyContent: "flex-end" }}>
        <Box backgroundColor="canvas" borderTopLeftRadius="l" borderTopRightRadius="l" paddingHorizontal="m" paddingTop="m" gap="m" style={{ paddingBottom: bottom + 16, maxHeight: "72%" }}>
          <Box flexDirection="row" alignItems="center" gap="m">
            <Box width={42} height={42} borderRadius="m" backgroundColor="cobaltSoft" alignItems="center" justifyContent="center">
              {isSkill ? <Code2 color={theme.colors.cobalt} size={22} /> : <TerminalSquare color={theme.colors.cobalt} size={22} />}
            </Box>
            <Box flex={1}>
              <Text variant="title">{title}</Text>
              <Text variant="caption">
                {sheetState.synced ? `已同步${sheetState.updatedAt ? ` · ${formatTime(sheetState.updatedAt)}` : ""}` : "等待 Host 同步"} · 点选后插入输入框
              </Text>
            </Box>
            <IconShell icon={X} tone="neutral" label="关闭选择面板" onPress={onClose} />
          </Box>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            {options.length > 0 ? (
              options.map((option) => (
                <CommandOptionRow key={option.id} option={option} onInsert={onInsert} />
              ))
            ) : (
              <Box borderRadius="m" borderWidth={1} borderColor="line" backgroundColor="surface" padding="l" gap="m">
                <Box gap="xs">
                  <Text variant="section">{emptyTitle}</Text>
                  <Text variant="body" color="inkMuted">
                    {emptyBody}
                  </Text>
                </Box>
                <SettingsButton label={`插入 ${prefix}`} tone="blue" onPress={() => onInsert(prefix)} />
              </Box>
            )}
          </ScrollView>
        </Box>
      </View>
    </Modal>
  );
}

function CommandOptionRow({ option, onInsert }: { option: CommandOption; onInsert: (value: string) => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={option.disabled} onPress={() => onInsert(option.insertText)}>
      {({ pressed }) => (
        <Box
          minHeight={62}
          borderRadius="m"
          borderWidth={1}
          borderColor="line"
          backgroundColor="surface"
          paddingHorizontal="m"
          paddingVertical="s"
          gap="xs"
          style={{ opacity: option.disabled ? 0.5 : pressed ? 0.72 : 1 }}
        >
          <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s">
            <Text variant="section" flex={1} numberOfLines={1}>
              {option.label}
            </Text>
            <Text variant="caption" color="inkMuted">
              {option.kind}
            </Text>
          </Box>
          <Text variant="caption" color="cobalt" numberOfLines={1}>
            {option.insertText.trim()}
          </Text>
          <Text variant="caption" numberOfLines={2}>
            {option.description}
          </Text>
        </Box>
      )}
    </Pressable>
  );
}

function ToolDetailSheet({ detail, bottom, onClose }: { detail: ToolDetail | null; bottom: number; onClose: () => void }) {
  const Icon = detail?.rawName === "command-output" || detail?.rawName === "commandExecution" ? TerminalSquare : Wrench;
  const isCommand = !!detail && isCommandDetail(detail);
  const primaryCommand = detail ? commandForDetail(detail) : null;
  const commandOutput = detail ? outputForDetail(detail, primaryCommand) : null;
  const summaryDuplicatesCommand = !!detail && !!primaryCommand && normalizeDetailText(detail.summary) === normalizeDetailText(primaryCommand);
  const showSummary = !!detail?.summary && !summaryDuplicatesCommand && !isCommand;

  return (
    <Modal visible={!!detail} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.34)", justifyContent: "flex-end" }}>
        {detail ? (
          <Box backgroundColor="canvas" borderTopLeftRadius="l" borderTopRightRadius="l" paddingHorizontal="m" paddingTop="m" gap="m" style={{ paddingBottom: bottom + 14, maxHeight: "76%" }}>
            <Box flexDirection="row" alignItems="center" gap="m">
              <Box width={42} height={42} borderRadius="m" backgroundColor={toneSoftToken(detail.tone)} alignItems="center" justifyContent="center">
                <Icon color={theme.colors[toneToken(detail.tone)]} size={22} />
              </Box>
              <Box flex={1}>
                <Text variant="title" numberOfLines={1}>
                  {detail.title}
                </Text>
                <Text variant="caption" color={toneToken(detail.tone)}>
                  {detail.status}
                </Text>
              </Box>
              <IconShell icon={X} tone="neutral" label="关闭工具详情" onPress={onClose} />
            </Box>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
              {showSummary ? <DetailField label="结果摘要" value={detail.summary} /> : null}
              {isCommand ? (
                <>
                  <DetailField label="执行命令" value={primaryCommand ?? "暂无命令"} monospace compact maxHeight={180} />
                  {commandOutput ? (
                    <DetailField label="命令输出" value={commandOutput} monospace compact maxHeight={220} />
                  ) : (
                    <DetailField label="命令输出" value={detail.status === "完成" ? "命令已完成，未返回可展示输出。" : "暂无可展示输出。"} />
                  )}
                </>
              ) : (
                <>
                  {primaryCommand ? <DetailField label="执行命令" value={primaryCommand} monospace compact maxHeight={180} /> : null}
                  <DetailField label="工具类型" value={detail.rawName} />
                  <DetailField label="完整输出" value={detail.rawSummary || "暂无完整输出"} monospace compact maxHeight={180} />
                </>
              )}
              {isCommand ? <DetailField label="工具类型" value={detail.rawName === "command-output" ? "commandExecution" : detail.rawName} /> : null}
            </ScrollView>
          </Box>
        ) : null}
      </View>
    </Modal>
  );
}

function CodeDetailSheet({ detail, bottom, onCopy, onClose }: { detail: CodeDetail | null; bottom: number; onCopy: (text: string) => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const { width } = useWindowDimensions();
  const codeViewportWidth = Math.max(320, width - 32);
  const codeWidth = detail ? codeContentWidth(detail.code, codeViewportWidth) : codeViewportWidth;
  useEffect(() => {
    setCopied(false);
  }, [detail?.code]);
  const handleCopy = () => {
    if (!detail) {
      return;
    }
    onCopy(detail.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Modal visible={!!detail} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.34)", justifyContent: "flex-end" }}>
        {detail ? (
          <Box backgroundColor="canvas" borderTopLeftRadius="l" borderTopRightRadius="l" paddingHorizontal="m" paddingTop="m" gap="m" style={{ paddingBottom: bottom + 14, maxHeight: "82%" }}>
            <Box flexDirection="row" alignItems="center" gap="m">
              <Box width={42} height={42} borderRadius="m" backgroundColor="cobaltSoft" alignItems="center" justifyContent="center">
                <Code2 color={theme.colors.cobalt} size={22} />
              </Box>
              <Box flex={1}>
                <Text variant="title" numberOfLines={1}>
                  {detail.title}
                </Text>
                <Text variant="caption">{detail.language}</Text>
              </Box>
              <CodeAction icon={Copy} label={copied ? "已复制" : "复制"} active={copied} onPress={handleCopy} />
              <IconShell icon={X} tone="neutral" label="关闭代码详情" onPress={onClose} />
            </Box>
            <Box borderRadius="m" overflow="hidden" borderWidth={1} borderColor="line">
              <Box minHeight={36} paddingHorizontal="m" flexDirection="row" alignItems="center" justifyContent="space-between" style={{ backgroundColor: githubDark.header }}>
                <Text variant="caption" color="terminalText" numberOfLines={1}>
                  {detail.language || "code"}
                </Text>
                <Text variant="caption" color="inkMuted">
                  横向滑动查看长行
                </Text>
              </Box>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 520, backgroundColor: githubDark.bg }} showsVerticalScrollIndicator>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <HighlightedCode code={detail.code} language={detail.language} width={codeWidth} />
                </ScrollView>
              </ScrollView>
            </Box>
          </Box>
        ) : null}
      </View>
    </Modal>
  );
}

function FilePreviewSheet({
  target,
  state,
  bottom,
  onCopy,
  onClose
}: {
  target: FilePreviewTarget | null;
  state: FilePreviewState | null;
  bottom: number;
  onCopy: (text: string) => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { width } = useWindowDimensions();
  const preview = state?.preview ?? null;
  const content = preview?.content ?? "";
  const language = preview?.language ?? (target ? languageForFileName(target.entry.name) : "text");
  const codeViewportWidth = Math.max(320, width - 32);
  const codeWidth = content ? codeContentWidth(content, codeViewportWidth) : codeViewportWidth;
  const loading = !!state?.loading;
  const error = state?.error ?? preview?.error ?? null;

  useEffect(() => {
    setCopied(false);
  }, [target?.entry.path, content]);

  const handleCopy = () => {
    if (!content) {
      return;
    }
    onCopy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Modal visible={!!target} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.34)", justifyContent: "flex-end" }}>
        {target ? (
          <Box backgroundColor="canvas" borderTopLeftRadius="l" borderTopRightRadius="l" paddingHorizontal="m" paddingTop="m" gap="m" style={{ paddingBottom: bottom + 14, maxHeight: "84%" }}>
            <Box flexDirection="row" alignItems="center" gap="m">
              <Box width={42} height={42} borderRadius="m" backgroundColor="cobaltSoft" alignItems="center" justifyContent="center">
                <FileText color={theme.colors.cobalt} size={22} />
              </Box>
              <Box flex={1}>
                <Text variant="title" numberOfLines={1}>
                  {target.entry.name}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {target.entry.path}
                </Text>
              </Box>
              <CodeAction icon={Copy} label={copied ? "已复制" : "复制"} active={copied} onPress={handleCopy} />
              <IconShell icon={X} tone="neutral" label="关闭文件预览" onPress={onClose} />
            </Box>

            <Box flexDirection="row" alignItems="center" gap="s" flexWrap="wrap">
              <StatusChip label={loading ? "读取中" : error ? "不可预览" : "已读取"} tone={loading ? "blue" : error ? "danger" : "green"} icon={loading ? RefreshCcw : error ? ShieldAlert : CheckCircle2} />
              <StatusChip label={language || "text"} tone="neutral" icon={Code2} />
              {preview ? <StatusChip label={formatBytes(preview.sizeBytes)} tone="neutral" icon={FileText} /> : null}
              {preview?.truncated ? <StatusChip label="已截断" tone="amber" icon={ShieldAlert} /> : null}
            </Box>

            {error ? (
              <DetailField label="预览状态" value={error} />
            ) : loading && !content ? (
              <Box minHeight={220} borderRadius="m" borderWidth={1} borderColor="line" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center" gap="s">
                <RefreshCcw color={theme.colors.inkMuted} size={28} />
                <Text variant="section">正在读取文件</Text>
                <Text variant="caption" color="inkMuted">
                  Host 正在返回只读预览。
                </Text>
              </Box>
            ) : content ? (
              <Box borderRadius="m" overflow="hidden" borderWidth={1} borderColor="line">
                <Box minHeight={36} paddingHorizontal="m" flexDirection="row" alignItems="center" justifyContent="space-between" style={{ backgroundColor: githubDark.header }}>
                  <Text variant="caption" color="terminalText" numberOfLines={1}>
                    {language || "text"}
                  </Text>
                  <Text variant="caption" color="terminalText" style={{ color: githubDark.muted }}>
                    横向滑动查看长行
                  </Text>
                </Box>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 520, backgroundColor: githubDark.bg }} showsVerticalScrollIndicator>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <HighlightedCode code={content} language={language || "text"} width={codeWidth} />
                  </ScrollView>
                </ScrollView>
              </Box>
            ) : (
              <DetailField label="预览状态" value="暂无文件内容。" />
            )}
          </Box>
        ) : null}
      </View>
    </Modal>
  );
}

function DetailField({ label, value, monospace = false, compact = false, maxHeight }: { label: string; value: string; monospace?: boolean; compact?: boolean; maxHeight?: number }) {
  const content = (
    <Text variant={compact ? "caption" : "body"} color={monospace ? "terminalText" : "ink"}>
      {value}
    </Text>
  );

  return (
    <Box gap="xs">
      <Text variant="label">{label}</Text>
      <Box backgroundColor={monospace ? "terminal" : "surface"} borderRadius="m" borderWidth={1} borderColor="line" padding={compact ? "s" : "m"}>
        {maxHeight ? (
          <ScrollView nestedScrollEnabled style={{ maxHeight }} showsVerticalScrollIndicator>
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </Box>
    </Box>
  );
}

function BottomNav({
  activeTab,
  bottom,
  glassView,
  nativeGlassEnabled,
  onSelect
}: {
  activeTab: ActiveTab;
  bottom: number;
  glassView: GlassViewComponent | null;
  nativeGlassEnabled: boolean;
  onSelect: (tab: ActiveTab) => void;
}) {
  const items: Array<{ tab: ActiveTab; label: string; icon: IconComponent }> = [
    { tab: "home", label: "工作台", icon: Zap },
    { tab: "sessions", label: "会话", icon: Bot },
    { tab: "settings", label: "设置", icon: Settings }
  ];

  const content = (
    <>
      {items.map((item) => {
        const active = activeTab === item.tab;
        const Icon = item.icon;
        return (
          <Pressable key={item.tab} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onSelect(item.tab)} style={{ flex: 1 }}>
            {({ pressed }) => (
              <Box minHeight={54} borderRadius="m" backgroundColor={active ? "navActive" : "transparent"} alignItems="center" justifyContent="center" gap="xs" style={{ opacity: pressed ? 0.72 : 1 }}>
                <Icon color={active ? theme.colors.accent : theme.colors.inkMuted} size={22} strokeWidth={active ? 2.5 : 2} />
                <Text variant="caption" color={active ? "accent" : "inkMuted"}>
                  {item.label}
                </Text>
              </Box>
            )}
          </Pressable>
        );
      })}
    </>
  );

  if (nativeGlassEnabled && glassView) {
    return React.createElement(
      glassView,
      {
        glassEffectStyle: "regular",
        isInteractive: true,
        tintColor: theme.colors.surface,
        style: {
          position: "absolute",
          left: 18,
          right: 18,
          bottom,
          minHeight: 64,
          borderRadius: 999,
          overflow: "hidden",
          padding: 4,
          flexDirection: "row",
          alignItems: "center",
          zIndex: 40
        }
      },
      content
    );
  }

  return (
    <Box
      position="absolute"
      left={18}
      right={18}
      bottom={bottom}
      minHeight={64}
      backgroundColor="surface"
      borderRadius="round"
      borderWidth={1}
      borderColor="line"
      padding="xs"
      flexDirection="row"
      alignItems="center"
      zIndex={40}
      style={softShadow(false)}
    >
      {content}
    </Box>
  );
}

function CompactEventLine({ event }: { event: SessionEvent }) {
  const meta = eventMeta(event);
  const Icon = meta.icon;
  return (
    <Box flexDirection="row" alignItems="center" gap="m" paddingVertical="m" borderTopWidth={1} borderColor="line">
      <Box width={38} height={38} borderRadius="s" backgroundColor={toneSoftToken(meta.tone)} alignItems="center" justifyContent="center">
        <Icon color={theme.colors[toneToken(meta.tone)]} size={19} />
      </Box>
      <Box flex={1}>
        <Text variant="section" numberOfLines={1}>
          {meta.title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {meta.body}
        </Text>
      </Box>
    </Box>
  );
}

function StatusChip({ label, tone, icon: Icon }: { label: string; tone: Tone; icon: IconComponent }) {
  return (
    <Box minHeight={34} borderRadius="round" backgroundColor={toneSoftToken(tone)} paddingHorizontal="m" flexDirection="row" alignItems="center" gap="xs">
      <Icon color={theme.colors[toneToken(tone)]} size={16} />
      <Text variant="caption" color={toneToken(tone)} numberOfLines={1}>
        {label}
      </Text>
    </Box>
  );
}

function CommandChip({ label, hint, icon: Icon, onPress }: { label: string; hint: string; icon: IconComponent; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <Box minHeight={34} borderRadius="round" backgroundColor="surface" borderWidth={1} borderColor="line" paddingHorizontal="s" flexDirection="row" alignItems="center" justifyContent="center" gap="xs" style={{ opacity: pressed ? 0.7 : 0.86 }}>
          <Icon color={theme.colors.accent} size={16} />
          <Text variant="caption" numberOfLines={1}>
            {label}
          </Text>
          <View style={{ width: 5, height: 5, borderRadius: 99, backgroundColor: theme.colors.inkMuted }} />
          <Text variant="caption" color="inkMuted" numberOfLines={1}>
            {hint}
          </Text>
        </Box>
      )}
    </Pressable>
  );
}

function ComposerTag({ label, icon: Icon, onPress }: { label: string; icon: IconComponent; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`打开${label}列表`} onPress={onPress}>
      {({ pressed }) => (
        <Box minHeight={32} borderRadius="round" backgroundColor="surface" borderWidth={1} borderColor="line" paddingHorizontal="m" flexDirection="row" alignItems="center" gap="xs" style={{ opacity: pressed ? 0.68 : 0.92 }}>
          <Icon color={theme.colors.accent} size={15} />
          <Text variant="caption">{label}</Text>
        </Box>
      )}
    </Pressable>
  );
}

function StatusCapsule({ online, text }: { online: boolean; text: string }) {
  return (
    <Box minHeight={34} borderRadius="round" backgroundColor={online ? "successSoft" : "surfaceMuted"} paddingHorizontal="m" flexDirection="row" alignItems="center" gap="xs">
      <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: online ? theme.colors.success : theme.colors.inkMuted }} />
      <Text variant="caption" color={online ? "success" : "inkMuted"}>
        {text}
      </Text>
    </Box>
  );
}

function ToneCapsule({ tone, text }: { tone: Tone; text: string }) {
  return (
    <Box minHeight={34} borderRadius="round" backgroundColor={toneSoftToken(tone)} paddingHorizontal="m" flexDirection="row" alignItems="center" gap="xs">
      <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: theme.colors[toneToken(tone)] }} />
      <Text variant="caption" color={toneToken(tone)}>
        {text}
      </Text>
    </Box>
  );
}

function IconShell({ icon: Icon, tone, onPress, label }: { icon: IconComponent; tone: Tone; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {({ pressed }) => (
        <Box width={42} height={42} borderRadius="m" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center" style={{ opacity: pressed ? 0.65 : 1 }}>
          <Icon color={theme.colors[toneToken(tone)]} size={21} />
        </Box>
      )}
    </Pressable>
  );
}

function IconOnly({ icon: Icon, tone, label, onPress }: { icon: IconComponent; tone: Tone; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {({ pressed }) => (
        <Box width={42} height={42} borderRadius="m" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center" style={{ opacity: pressed ? 0.65 : 1 }}>
          <Icon color={theme.colors[toneToken(tone)]} size={22} />
        </Box>
      )}
    </Pressable>
  );
}

function Toast({ message, bottom }: { message: string; bottom: number }) {
  return (
    <Box position="absolute" left={30} right={30} bottom={bottom} backgroundColor="terminal" borderRadius="round" paddingHorizontal="l" paddingVertical="s" alignItems="center" zIndex={80}>
      <Text variant="caption" color="terminalText">
        {message}
      </Text>
    </Box>
  );
}

function loadGlassModule(): GlassModule | null {
  try {
    return require("expo-glass-effect") as GlassModule;
  } catch {
    return null;
  }
}

function getGlassDiagnostics(reduceTransparencyEnabled: boolean, glassModule: GlassModule | null): GlassDiagnostics {
  let liquidGlassAvailable = false;
  let glassApiAvailable = false;
  try {
    liquidGlassAvailable = glassModule?.isLiquidGlassAvailable?.() ?? false;
    glassApiAvailable = glassModule?.isGlassEffectAPIAvailable?.() ?? false;
  } catch {
    liquidGlassAvailable = false;
    glassApiAvailable = false;
  }

  let reason = "可用";
  if (!glassModule?.GlassView) {
    reason = "Expo Go 未加载原生模块";
  } else if (Platform.OS !== "ios") {
    reason = "仅 iOS 支持";
  } else if (reduceTransparencyEnabled) {
    reason = "系统关闭透明度";
  } else if (!liquidGlassAvailable) {
    reason = "系统不支持";
  } else if (!glassApiAvailable) {
    reason = "Expo Go 不支持";
  }

  return {
    enabled: !!glassModule?.GlassView && Platform.OS === "ios" && !reduceTransparencyEnabled && liquidGlassAvailable && glassApiAvailable,
    reason,
    platform: Platform.OS,
    moduleLoaded: !!glassModule?.GlassView,
    reduceTransparencyEnabled,
    liquidGlassAvailable,
    glassApiAvailable
  };
}

function dynamicIslandStatus(state: DynamicIslandTestState): DynamicIslandStatus {
  if (state === "approval") {
    return {
      label: "等待审批",
      shortLabel: "红灯审批",
      body: "Codex 需要你确认权限",
      icon: ShieldAlert,
      token: "danger",
      bgToken: "dangerSoft",
      borderToken: "danger",
      color: theme.colors.danger
    };
  }

  if (state === "idle") {
    return {
      label: "空闲",
      shortLabel: "绿灯空闲",
      body: "当前没有阻塞任务",
      icon: CheckCircle2,
      token: "success",
      bgToken: "successSoft",
      borderToken: "success",
      color: theme.colors.success
    };
  }

  return {
    label: "工作中",
    shortLabel: "黄灯运行",
    body: "Agent 正在执行任务",
    icon: Wrench,
    token: "amber",
    bgToken: "amberSoft",
    borderToken: "amber",
    color: theme.colors.amber
  };
}

function markdownBaseStyle() {
  return {
    color: theme.colors.ink,
    fontSize: 15.75,
    lineHeight: 24
  };
}

const codeTextStyle = {
  fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  fontSize: 12.75,
  lineHeight: 18,
  paddingHorizontal: 12,
  paddingVertical: 10
};

const githubDark = {
  bg: "#0D1117",
  header: "#161B22",
  button: "#21262D",
  accent: "#58A6FF",
  text: "#C9D1D9",
  muted: "#8B949E",
  successButton: "#123524",
  successText: "#3FD782"
};

const githubDarkSyntax = {
  plain: "#C9D1D9",
  muted: "#8B949E",
  red: "#FF7B72",
  orange: "#FFA657",
  blue: "#79C0FF",
  purple: "#D2A8FF",
  string: "#A5D6FF",
  green: "#7EE787"
};

const syntaxTokenStyles: Record<string, { color: string; fontStyle?: "italic"; fontWeight?: "600" | "700" }> = {
  plain: { color: githubDarkSyntax.plain },
  comment: { color: githubDarkSyntax.muted, fontStyle: "italic" },
  prolog: { color: githubDarkSyntax.muted },
  doctype: { color: githubDarkSyntax.muted },
  cdata: { color: githubDarkSyntax.muted },
  punctuation: { color: githubDarkSyntax.muted },
  namespace: { color: githubDarkSyntax.muted },
  property: { color: githubDarkSyntax.blue },
  tag: { color: githubDarkSyntax.green },
  boolean: { color: githubDarkSyntax.orange },
  number: { color: githubDarkSyntax.orange },
  constant: { color: githubDarkSyntax.orange },
  symbol: { color: githubDarkSyntax.orange },
  deleted: { color: "#FFA198" },
  selector: { color: githubDarkSyntax.green },
  "attr-name": { color: githubDarkSyntax.blue },
  string: { color: githubDarkSyntax.string },
  char: { color: githubDarkSyntax.string },
  builtin: { color: githubDarkSyntax.orange },
  inserted: { color: githubDarkSyntax.green },
  operator: { color: githubDarkSyntax.red },
  entity: { color: githubDarkSyntax.purple },
  url: { color: githubDarkSyntax.blue },
  atrule: { color: githubDarkSyntax.red },
  "attr-value": { color: githubDarkSyntax.string },
  keyword: { color: githubDarkSyntax.red },
  function: { color: githubDarkSyntax.purple, fontWeight: "600" },
  "class-name": { color: githubDarkSyntax.orange, fontWeight: "600" },
  regex: { color: githubDarkSyntax.string },
  important: { color: githubDarkSyntax.red, fontWeight: "700" },
  variable: { color: githubDarkSyntax.orange }
};

const prismLanguageAliases: Record<string, string> = {
  "": "text",
  code: "text",
  text: "text",
  plaintext: "text",
  py: "python",
  python3: "python",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  ps1: "powershell",
  pwsh: "powershell",
  powershell7: "powershell",
  rs: "rust",
  yml: "yaml",
  md: "markdown",
  patch: "diff"
};

function markdownTagStyles() {
  return {
    p: {
      marginTop: 0,
      marginBottom: 8
    },
    strong: {
      fontWeight: "700" as const
    },
    em: {
      fontStyle: "italic" as const
    },
    ul: {
      marginTop: 0,
      marginBottom: 8,
      paddingLeft: 22
    },
    ol: {
      marginTop: 0,
      marginBottom: 8,
      paddingLeft: 22
    },
    li: {
      marginBottom: 7,
      paddingLeft: 3
    },
    code: {
      backgroundColor: theme.colors.surfaceMuted,
      color: theme.colors.ink,
      borderRadius: 6,
      paddingHorizontal: 4,
      paddingVertical: 2,
      fontSize: 15
    },
    pre: {
      backgroundColor: theme.colors.terminal,
      borderRadius: 10,
      padding: 10,
      marginTop: 4,
      marginBottom: 10,
      color: theme.colors.terminalText
    },
    a: {
      color: theme.colors.accent
    },
    blockquote: {
      backgroundColor: theme.colors.surfaceMuted,
      borderLeftColor: theme.colors.accent,
      borderLeftWidth: 3,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginVertical: 6
    },
    h1: {
      color: theme.colors.ink,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "800" as const,
      marginBottom: 8
    },
    h2: {
      color: theme.colors.ink,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "800" as const,
      marginBottom: 8
    },
    h3: {
      color: theme.colors.ink,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "700" as const,
      marginBottom: 6
    }
  };
}

function markdownToHtml(value: string) {
  return markdownParser.render(normalizeLegacyMarkdownForDisplay(value));
}

function highlightCodeSpans(value: string, language: string): HighlightSpan[] {
  const prismLanguage = prismLanguageName(language);
  const grammar = prismLanguage ? Prism.languages[prismLanguage] : null;
  if (!grammar) {
    return [{ text: value, token: "plain" }];
  }

  try {
    return flattenPrismTokens(Prism.tokenize(value, grammar), "plain");
  } catch {
    return [{ text: value, token: "plain" }];
  }
}

function flattenPrismTokens(tokens: Array<string | Prism.Token>, parentToken: string): HighlightSpan[] {
  const spans: HighlightSpan[] = [];
  for (const token of tokens) {
    if (typeof token === "string") {
      spans.push({ text: token, token: parentToken });
      continue;
    }

    const tokenType = token.type || parentToken;
    const content = token.content;
    if (typeof content === "string") {
      spans.push({ text: content, token: tokenType });
      continue;
    }

    if (Array.isArray(content)) {
      spans.push(...flattenPrismTokens(content, tokenType));
    }
  }
  return spans.length ? spans : [{ text: "", token: "plain" }];
}

function prismLanguageName(language: string) {
  const normalized = sanitizeCodeLanguage(language).toLowerCase();
  const alias = prismLanguageAliases[normalized] ?? normalized;
  return alias === "text" ? "" : alias;
}

function syntaxStyleForToken(token: string) {
  return syntaxTokenStyles[token] ?? syntaxTokenStyles.plain;
}

function splitMarkdownSegments(value: string): MarkdownSegment[] {
  const normalized = normalizeLegacyMarkdownForDisplay(value);
  const segments: MarkdownSegment[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const fenceStart = normalized.indexOf("```", cursor);
    if (fenceStart < 0) {
      break;
    }

    const before = normalized.slice(cursor, fenceStart);
    if (before.trim()) {
      segments.push({ type: "markdown", id: `md-${segments.length}`, text: before });
    }

    const languageStart = fenceStart + 3;
    const languageEnd = normalized.indexOf("\n", languageStart);
    if (languageEnd < 0) {
      segments.push({ type: "code", id: `code-${segments.length}`, language: sanitizeCodeLanguage(normalized.slice(languageStart)), code: "" });
      cursor = normalized.length;
      break;
    }

    const language = sanitizeCodeLanguage(normalized.slice(languageStart, languageEnd));
    const codeStart = languageEnd + 1;
    const fenceEnd = normalized.indexOf("```", codeStart);
    if (fenceEnd < 0) {
      segments.push({ type: "code", id: `code-${segments.length}`, language, code: normalized.slice(codeStart) });
      cursor = normalized.length;
      break;
    }

    segments.push({ type: "code", id: `code-${segments.length}`, language, code: normalized.slice(codeStart, fenceEnd) });
    cursor = fenceEnd + 3;
  }

  const tail = normalized.slice(cursor);
  if (tail.trim()) {
    segments.push({ type: "markdown", id: `md-${segments.length}`, text: tail });
  }
  return segments.length ? segments : [{ type: "markdown", id: "md-empty", text: normalized }];
}

function sanitizeCodeLanguage(value: string) {
  return value.trim().split(/\s+/)[0].replace(/[^A-Za-z0-9_+.-]/g, "") || "code";
}

function cleanCodeBlock(value: string) {
  return value.replace(/^\s*\n/, "").replace(/\s+$/g, "");
}

function codePreviewForCard(value: string) {
  const maxPreviewLines = 6;
  const lines = value.split(/\r?\n/);
  const visibleLines = Math.min(lines.length, maxPreviewLines);
  return {
    text: lines.slice(0, visibleLines).join("\n"),
    visibleLines,
    hasMore: lines.length > maxPreviewLines
  };
}

function codeLineCount(value: string) {
  if (!value) {
    return 1;
  }
  return value.split(/\r?\n/).length;
}

function codeContentWidth(value: string, minWidth = 320) {
  const longestLine = value
    .split(/\r?\n/)
    .reduce((max, line) => Math.max(max, Array.from(line).reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 2 : 1), 0)), 0);
  return Math.min(Math.max(minWidth, longestLine * 7.4 + 32), 1600);
}

function normalizeLegacyMarkdownForDisplay(value: string) {
  if (!/(^|\n|\s)[1-9]\d?\.\s/.test(value)) {
    return value;
  }
  return value
    .replace(/([^\n\s])([1-9]\d?)\.\s+(?=\S)/g, (match, previous: string, index: string) => {
      if (/\d/.test(previous)) {
        return match;
      }
      return `${previous}\n${index}. `;
    })
    .replace(/([^\n])\s+([1-9]\d?)\.\s+(?=\S)/g, (match, previous: string, index: string) => {
      if (/\d/.test(previous)) {
        return match;
      }
      return `${previous}\n${index}. `;
    });
}

function conversationListItems({
  session,
  events,
  showHistoryLine,
  showInitialHistoryLoading,
  showEmptyHistoryFallback,
  showTurnStatus
}: {
  session: SessionSummary | null;
  events: DisplayEvent[];
  showHistoryLine: boolean;
  showInitialHistoryLoading: boolean;
  showEmptyHistoryFallback: boolean;
  showTurnStatus: boolean;
}): ConversationListItem[] {
  if (!session) {
    return [{ kind: "no-session", id: "no-session" }];
  }

  const items: ConversationListItem[] = [{ kind: "context", id: `context-${session.sessionId}`, session }];
  if (showHistoryLine) {
    items.push({ kind: "history", id: `history-${session.sessionId}` });
  }
  if (showInitialHistoryLoading) {
    items.push({ kind: "loading", id: `loading-${session.sessionId}` });
    return items;
  }
  if (showEmptyHistoryFallback) {
    items.push({ kind: "empty-history", id: `empty-history-${session.sessionId}` });
    return items;
  }
  if (events.length) {
    for (const envelope of events) {
      items.push({ kind: "event", id: envelope.id, envelope });
    }
    if (showTurnStatus) {
      items.push({ kind: "turn-status", id: `turn-status-${session.sessionId}-${session.state}`, session });
    }
    return items;
  }
  items.push({ kind: "empty-session", id: `empty-session-${session.sessionId}`, session });
  return items;
}

function showToast(setToast: React.Dispatch<React.SetStateAction<ToastState>>, text: string) {
  const id = Date.now();
  setToast({ id, text });
  setTimeout(() => {
    setToast((current) => (current?.id === id ? null : current));
  }, 1400);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (deltaSeconds < 60) {
    return "刚刚";
  }
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) {
    return `${deltaMinutes} 分钟前`;
  }
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours} 小时前`;
  }
  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays} 天前`;
}

function softShadow(pressed: boolean) {
  return {
    opacity: pressed ? 0.72 : 1,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  };
}

function heroShadow(pressed: boolean) {
  return {
    opacity: pressed ? 0.72 : 1,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6
  };
}

function preferredSession(sessions: SessionSummary[]) {
  const sorted = sessions.slice().sort((a, b) => sessionPriority(a) - sessionPriority(b) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const first = sorted[0] ?? null;
  if (first && isFallbackCodexSession(first) && !isWorkingSession(first) && first.pendingApprovals === 0) {
    return sorted.find((session) => !isFallbackCodexSession(session)) ?? first;
  }
  return first;
}

function workspaceSessionGroups(sessions: SessionSummary[]): WorkspaceSessionGroup[] {
  const byWorkspace = new Map<string, SessionSummary[]>();
  for (const session of sessions) {
    const key = normalizeWorkspacePath(session.workspace || "unknown-workspace");
    const group = byWorkspace.get(key) ?? [];
    group.push(session);
    byWorkspace.set(key, group);
  }

  return Array.from(byWorkspace.entries())
    .map(([id, groupSessions]) => createWorkspaceSessionGroup(id, groupSessions))
    .sort((a, b) => workspaceGroupPriority(a) - workspaceGroupPriority(b) || Date.parse(b.latestAt) - Date.parse(a.latestAt));
}

function filterWorkspaceSessionGroups(groups: WorkspaceSessionGroup[], query: string): WorkspaceSessionGroup[] {
  const term = query.trim().toLowerCase();
  if (!term) {
    return groups;
  }

  return groups
    .map((group) => {
      const groupMatches =
        group.name.toLowerCase().includes(term) ||
        group.path.toLowerCase().includes(term) ||
        group.workspace.toLowerCase().includes(term);
      const sessions = groupMatches ? group.sessions : group.sessions.filter((session) => sessionMatchesQuery(session, term));
      return sessions.length ? createWorkspaceSessionGroup(group.id, sessions) : null;
    })
    .filter((group): group is WorkspaceSessionGroup => !!group);
}

function createWorkspaceSessionGroup(id: string, sessions: SessionSummary[]): WorkspaceSessionGroup {
  const sortedSessions = sessions
    .slice()
    .sort((a, b) => sessionPriority(a) - sessionPriority(b) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const primary = sortedSessions[0];
  const workspace = primary?.workspace ?? "unknown-workspace";
  return {
    id,
    workspace,
    name: compactWorkspaceName(workspace) || "未命名项目",
    path: displayWorkspacePath(workspace),
    sessions: sortedSessions,
    latestAt: sortedSessions.reduce((latest, session) => {
      const latestTime = Date.parse(latest);
      const nextTime = Date.parse(session.updatedAt);
      return Number.isFinite(nextTime) && (!Number.isFinite(latestTime) || nextTime > latestTime) ? session.updatedAt : latest;
    }, primary?.updatedAt ?? new Date(0).toISOString()),
    activeCount: sortedSessions.filter(isWorkingSession).length,
    pendingApprovals: sortedSessions.reduce((sum, session) => sum + session.pendingApprovals, 0),
    failedCount: sortedSessions.filter((session) => session.state === "failed").length
  };
}

function sessionMatchesQuery(session: SessionSummary, term: string) {
  return (
    (session.title ?? "").toLowerCase().includes(term) ||
    session.workspace.toLowerCase().includes(term) ||
    compactWorkspaceName(session.workspace).toLowerCase().includes(term) ||
    agentLabel(session.agentKind).toLowerCase().includes(term) ||
    session.agentKind.toLowerCase().includes(term)
  );
}

function workspaceGroupPriority(group: WorkspaceSessionGroup) {
  if (group.pendingApprovals > 0) return 0;
  if (group.activeCount > 0) return 1;
  if (group.failedCount > 0) return 2;
  return 3;
}

function workspaceGroupTone(group: WorkspaceSessionGroup): Tone {
  if (group.pendingApprovals > 0) return "danger";
  if (group.activeCount > 0) return "amber";
  if (group.failedCount > 0) return "danger";
  return "green";
}

function workspaceGroupLabel(group: WorkspaceSessionGroup) {
  if (group.pendingApprovals > 0) return "待审批";
  if (group.activeCount > 0) return "工作中";
  if (group.failedCount > 0) return "有失败";
  return "可继续";
}

function isFallbackCodexSession(session: SessionSummary) {
  return session.sessionId === "agentpal-codex-local";
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function sessionPriority(session: SessionSummary) {
  if (session.pendingApprovals > 0 || session.state === "waiting-approval") return 0;
  if (session.state === "running" || session.state === "thinking") return 1;
  if (session.state === "failed") return 2;
  if (session.state === "completed") return 3;
  if (session.state === "idle") return 4;
  if (session.state === "offline") return 5;
  return 4;
}

function homeFocusState({
  hostOnline,
  connectionState,
  session,
  pendingApprovals,
  latestEvent
}: {
  hostOnline: boolean;
  connectionState: ConnectionState;
  session: SessionSummary | null;
  pendingApprovals: number;
  latestEvent: SessionEvent | null;
}): HomeFocusState {
  if (!hostOnline) {
    return {
      tone: connectionState === "error" ? "danger" : "neutral",
      title: "电脑端未连接",
      body: connectionLabel(connectionState),
      action: "去连接",
      target: "settings",
      icon: Monitor
    };
  }
  if (pendingApprovals > 0) {
    return {
      tone: "danger",
      title: "等待审批",
      body: `${pendingApprovals} 项审批正在阻塞 Agent 继续执行。`,
      action: "查看",
      target: "conversation",
      icon: ShieldAlert
    };
  }
  if (session?.state === "failed") {
    return {
      tone: "danger",
      title: "需要恢复",
      body: `${agentLabel(session.agentKind)} · ${compactWorkspaceName(session.workspace)} 最近一次运行失败。`,
      action: "处理",
      target: "conversation",
      icon: ShieldAlert
    };
  }
  if (session && isWorkingSession(session)) {
    const latest = latestEvent ? eventMeta(latestEvent) : null;
    return {
      tone: sessionTone(session.state),
      title: stateHeadline(session.state),
      body: latest ? `${agentLabel(session.agentKind)} · ${latest.title}` : `${agentLabel(session.agentKind)} 正在 ${compactWorkspaceName(session.workspace)} 工作。`,
      action: "进入",
      target: "conversation",
      icon: Bot
    };
  }
  if (session?.state === "completed") {
    return {
      tone: "green",
      title: "刚刚完成",
      body: `${agentLabel(session.agentKind)} · ${compactWorkspaceName(session.workspace)} 可以继续追加指令。`,
      action: "继续",
      target: "conversation",
      icon: CheckCircle2
    };
  }
  if (session) {
    return {
      tone: "green",
      title: "可以继续",
      body: `${agentLabel(session.agentKind)} · ${compactWorkspaceName(session.workspace)} 等待下一条指令。`,
      action: "打开",
      target: "conversation",
      icon: TerminalSquare
    };
  }
  return {
    tone: "green",
    title: "Host 已就绪",
    body: "电脑端在线，等待 Codex、Claude Code 或 OpenCode 会话。",
    action: "会话",
    target: "conversation",
    icon: Monitor
  };
}

function sessionStatusEvent(session: SessionSummary): SessionEvent {
  return { type: "state-changed", state: session.state };
}

function commandPickerOptions(mode: CommandPickerMode | null, items: PickerRegistryItem[]): CommandOption[] {
  if (!mode) {
    return [];
  }
  const trigger = mode === "skill" ? "$" : "/";
  return items
    .filter((item) => item.trigger === trigger)
    .map((item) => {
      const token = item.insertText.trim();
      const rawLabel = item.label.trim();
      const normalizedLabel = rawLabel.toLowerCase() === token.slice(1).toLowerCase() ? token : `${token} ${rawLabel}`;
      return {
        id: item.id,
        label: normalizedLabel,
        insertText: item.insertText,
        description: item.description?.trim() || `${agentLabel(item.source)} ${pickerKindLabel(item.kind)}`,
        kind: pickerKindLabel(item.kind)
      };
    });
}

function pickerKindLabel(kind: PickerRegistryItem["kind"]) {
  switch (kind) {
    case "skill":
      return "技能";
    case "plugin":
      return "插件";
    case "preset":
      return "Preset";
    case "slash-command":
    default:
      return "命令";
  }
}

function isWorkingSession(session: SessionSummary) {
  return session.state === "thinking" || session.state === "running" || session.state === "waiting-approval";
}

function latestVisibleTimelineEvent(items: Array<{ event: SessionEvent }>) {
  return items.find((item) => shouldShowRecentEvent(item.event))?.event ?? null;
}

function buildConversationEvents(events: SessionEventEnvelope[], pending?: { text: string; createdAt: string }): DisplayEvent[] {
  const result: DisplayEvent[] = [];
  for (const event of events) {
    if (!shouldShowConversationEvent(event.payload)) {
      continue;
    }
    const previous = result[result.length - 1];
    if (event.payload.type === "agent-message") {
      if (event.payload.complete) {
        if (previous?.payload.type === "agent-message") {
          result[result.length - 1] = { ...event };
          continue;
        }
        result.push({ ...event });
        continue;
      }
      if (previous?.payload.type === "agent-message" && !previous.payload.complete) {
        previous.payload = {
          type: "agent-message",
          text: `${previous.payload.text}${event.payload.text}`,
          complete: false
        };
        continue;
      }
    }
    if (
      event.payload.type === "tool-finished" &&
      previous?.payload.type === "tool-started" &&
      previous.payload.name === event.payload.name
    ) {
      result[result.length - 1] = { ...event };
      continue;
    }
    if (
      event.payload.type === "tool-started" &&
      previous?.payload.type === "tool-started" &&
      previous.payload.name === event.payload.name
    ) {
      continue;
    }
    result.push({ ...event });
  }

  if (pending && !events.some((event) => event.payload.type === "user-message" && event.payload.text === pending.text)) {
    result.push({
      id: `pending-${pending.createdAt}`,
      hostId: "local",
      sessionId: null,
      seq: Number.MAX_SAFE_INTEGER,
      createdAt: pending.createdAt,
      pending: true,
      payload: { type: "user-message", text: pending.text }
    });
  }
  return result;
}

function shouldShowConversationEvent(event: SessionEvent) {
  if (event.type === "session-started") return false;
  if (event.type === "state-changed") return false;
  if ((event.type === "tool-started" || event.type === "tool-finished") && isInternalCodexItem(event.name)) return false;
  return true;
}

function shouldShowRecentEvent(event: SessionEvent) {
  if (event.type === "user-message") {
    return false;
  }
  if (event.type === "agent-message") {
    return event.complete !== false && event.text.trim().length > 0;
  }
  if (event.type === "tool-started") {
    return false;
  }
  if (event.type === "state-changed") {
    return event.state === "waiting-approval" || event.state === "failed" || event.state === "completed";
  }
  return shouldShowConversationEvent(event);
}

function isInternalCodexItem(name: string) {
  return ["userMessage", "agentMessage", "reasoning"].includes(name);
}

function toolDetail(name: string, summary: string, status: string, tone: Tone): ToolDetail {
  const title = toolDisplayName(name);
  const cleaned = compactToolSummary(name, summary, status);
  const command = name === "commandExecution" ? readableCommandFromText(summary) : commandFromWrapper(summary) ?? undefined;
  return {
    title,
    status,
    tone,
    summary: cleaned,
    rawName: name,
    rawSummary: summary,
    command,
    output: name === "commandExecution" ? null : undefined
  };
}

function commandDetail(command: string, summary: string, ok: boolean): ToolDetail {
  const readableCommand = readableCommandFromText(command);
  return {
    title: "命令执行",
    status: ok ? "完成" : "失败",
    tone: ok ? "green" : "danger",
    summary: compactCommand(readableCommand),
    rawName: "command-output",
    rawSummary: summary,
    command: readableCommand,
    output: summary?.trim() ? summary : null
  };
}

function toolDisplayName(name: string) {
  if (name === "commandExecution") return "命令执行";
  if (name === "read") return "读取文件";
  if (name === "applyPatch") return "修改文件";
  if (name === "edit") return "编辑文件";
  if (name === "shell") return "命令执行";
  return name;
}

function compactToolSummary(name: string, summary: string, status: string) {
  if (status === "进行中") {
    return name === "commandExecution" ? "正在电脑端执行命令" : summary;
  }
  const command = commandFromWrapper(summary);
  if (name === "commandExecution" && command) {
    return compactCommand(command);
  }
  return summary.replace(/\s+\((completed|failed)\)$/i, "").replace(/\s+/g, " ").trim();
}

function compactCommand(command: string) {
  const readable = readableCommandFromText(command);
  const lines = significantCommandLines(readable);
  if (lines.length > 1) {
    return `${lines[0].replace(/\s+/g, " ")} · ${lines.length} 行脚本`;
  }
  return readable.replace(/\s+/g, " ").trim();
}

function commandFromWrapper(text: string) {
  const withoutStatus = stripCommandStatus(text);
  const match = withoutStatus.match(/-Command\b/i);
  if (!match || typeof match.index !== "number") {
    return null;
  }
  const payload = withoutStatus.slice(match.index + match[0].length);
  return cleanupCommandPayload(payload);
}

function cleanupCommandPayload(payload: string) {
  let text = payload.trim();
  if (!text) {
    return null;
  }
  const first = text[0];
  const last = text[text.length - 1];
  if ((first === "'" || first === '"') && last === first && text.length > 1) {
    text = text.slice(1, -1).trim();
  } else if (first === "'" || first === '"') {
    text = text.slice(1).trimStart();
  }
  return normalizeCommandText(text);
}

function stripCommandStatus(text: string) {
  return text.replace(/\s+\((completed|failed)\)$/i, "").trim();
}

function readableCommandFromText(text: string) {
  return commandFromWrapper(text) ?? normalizeCommandText(stripCommandStatus(text)) ?? "command";
}

function isCommandDetail(detail: ToolDetail) {
  return detail.rawName === "command-output" || detail.rawName === "commandExecution" || detail.title === "命令执行";
}

function commandForDetail(detail: ToolDetail) {
  const source = detail.command ?? detail.rawSummary;
  return readableCommandFromText(source);
}

function outputForDetail(detail: ToolDetail, command: string | null) {
  const output = detail.output ?? (detail.rawName === "command-output" ? detail.rawSummary : null);
  if (!output?.trim()) {
    return null;
  }
  const normalizedOutput = normalizeDetailText(output);
  const normalizedCommand = command ? normalizeDetailText(command) : "";
  if (normalizedCommand && normalizedOutput === normalizedCommand) {
    return null;
  }
  if (commandFromWrapper(output)) {
    return null;
  }
  return stripCommandStatus(output);
}

function normalizeDetailText(text: string) {
  return stripCommandStatus(text).replace(/\s+/g, " ").trim();
}

function normalizeCommandText(text: string) {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/""/g, '"')
    .replace(/^['"]|['"]$/g, "")
    .trim();
  return normalized || null;
}

function significantCommandLines(command: string) {
  const lines = command.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const meaningful = lines.filter((line) => !/^\$ErrorActionPreference\s*=/.test(line));
  return meaningful.length > 0 ? meaningful : lines;
}

function visibleProjectTree(entries: ProjectTreeEntry[], expandedPaths: Record<string, boolean>) {
  return entries.filter((entry) => {
    if (entry.depth === 0) {
      return true;
    }
    return projectTreeAncestors(entry.path).every((ancestor) => expandedPaths[ancestor]);
  });
}

function projectTreeChildPathSet(entries: ProjectTreeEntry[]) {
  const directoryPaths = new Set(entries.filter((entry) => entry.kind === "directory").map((entry) => entry.path));
  const parents = new Set<string>();
  for (const entry of entries) {
    const parent = projectTreeParentPath(entry.path);
    if (parent && directoryPaths.has(parent)) {
      parents.add(parent);
    }
  }
  return parents;
}

function projectTreeAncestors(path: string) {
  const parts = path.split("/").filter(Boolean);
  const ancestors: string[] = [];
  for (let index = 1; index < parts.length; index += 1) {
    ancestors.push(parts.slice(0, index).join("/"));
  }
  return ancestors;
}

function projectTreeParentPath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index > 0 ? normalized.slice(0, index) : null;
}

function languageForFileName(name: string) {
  const extension = name.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    cjs: "javascript",
    css: "css",
    diff: "diff",
    htm: "markup",
    html: "markup",
    js: "javascript",
    json: "json",
    jsx: "jsx",
    markdown: "markdown",
    md: "markdown",
    mjs: "javascript",
    patch: "diff",
    ps1: "powershell",
    py: "python",
    rs: "rust",
    sh: "bash",
    ts: "typescript",
    tsx: "tsx",
    xml: "markup",
    yaml: "yaml",
    yml: "yaml",
    zsh: "bash"
  };
  return map[extension] ?? extension ?? "text";
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function compactWorkspaceName(path: string) {
  const raw = path.trim();
  if (!raw || raw === "." || raw === "unknown-workspace") {
    return "当前项目";
  }
  const normalized = displayWorkspacePath(path).replace(/[\\/]+$/, "");
  return normalized.split(/[\\/]/).filter(Boolean).pop() ?? normalized;
}

function displayWorkspacePath(path: string) {
  const normalized = path.replace(/^\\\\\?\\/, "").replace(/\//g, "\\").trim();
  if (!normalized || normalized === ".") {
    return "当前工作目录";
  }
  if (normalized === "unknown-workspace") {
    return "未知工作区";
  }
  return normalized;
}

function matchingWorkspaceSnapshot(
  snapshots: Record<string, WorkspaceSnapshot>,
  hostId: string | null,
  workspace: string | null
) {
  if (!hostId || !workspace) {
    return null;
  }
  const target = normalizeWorkspacePath(workspace);
  return (
    Object.values(snapshots).find(
      (snapshot) =>
        snapshot.hostId === hostId &&
        (normalizeWorkspacePath(snapshot.workspace) === target || snapshot.rootName === compactWorkspaceName(workspace))
    ) ?? null
  );
}

function normalizeWorkspacePath(path: string) {
  return path
    .replace(/^\\\\\?\\/, "")
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function agentLabel(kind: SessionSummary["agentKind"]) {
  if (kind === "claude-code") return "Claude";
  if (kind === "open-code") return "OpenCode";
  if (kind === "open-claw") return "OpenClaw";
  if (kind === "custom") return "Custom";
  return "Codex";
}

function sessionTone(state: SessionState): Tone {
  if (state === "waiting-approval") return "danger";
  if (state === "running" || state === "thinking") return "amber";
  if (state === "completed") return "green";
  if (state === "failed") return "danger";
  if (state === "offline") return "neutral";
  return "green";
}

function stateLabel(state: SessionState) {
  if (state === "waiting-approval") return "待审批";
  if (state === "running") return "运行中";
  if (state === "thinking") return "思考中";
  if (state === "completed") return "完成";
  if (state === "failed") return "失败";
  if (state === "offline") return "离线";
  return "空闲";
}

function stateHeadline(state: SessionState) {
  if (state === "waiting-approval") return "需要确认";
  if (state === "running") return "正在工作";
  if (state === "thinking") return "正在思考";
  if (state === "completed") return "刚刚完成";
  if (state === "failed") return "需要恢复";
  if (state === "offline") return "会话离线";
  return "可以继续";
}

function stateSummary(state: SessionState) {
  if (state === "waiting-approval") return "确认后 Agent 才会继续。";
  if (state === "running") return "Agent 正在执行命令、修改文件或运行测试。";
  if (state === "thinking") return "Agent 正在读取上下文并准备下一步。";
  if (state === "completed") return "任务已完成，可以继续追加指令。";
  if (state === "failed") return "最近一次运行失败，需要查看错误并恢复。";
  if (state === "offline") return "等待 Host 恢复连接。";
  return "等待你的下一条指令。";
}

function toneToken(tone: Tone): ThemeColorName {
  if (tone === "amber") return "amber";
  if (tone === "green") return "success";
  if (tone === "danger") return "danger";
  if (tone === "violet") return "violet";
  if (tone === "neutral") return "inkMuted";
  return "cobalt";
}

function toneSoftToken(tone: Tone): ThemeColorName {
  if (tone === "amber") return "amberSoft";
  if (tone === "green") return "successSoft";
  if (tone === "danger") return "dangerSoft";
  if (tone === "violet") return "violetSoft";
  if (tone === "neutral") return "surfaceMuted";
  return "cobaltSoft";
}

function pairingStepTone(state: PairingStepState): Tone {
  if (state === "done") return "green";
  if (state === "active") return "amber";
  if (state === "danger") return "danger";
  return "neutral";
}

function connectionLabel(state: ConnectionState) {
  if (state === "online") return "Relay 在线";
  if (state === "connecting") return "正在连接";
  if (state === "error") return "连接失败";
  return "离线，等待重试";
}

function eventMeta(event: SessionEvent): { title: string; body: string; tone: Tone; icon: IconComponent } {
  if (event.type === "approval-requested") {
    return { title: "审批请求", body: "Agent 等待确认", tone: "danger", icon: ShieldAlert };
  }
  if (event.type === "diff-updated") {
    return { title: "Diff 更新", body: `${event.summary.filesChanged} 个文件`, tone: "blue", icon: FileDiff };
  }
  if (event.type === "command-output") {
    return { title: "命令输出", body: event.command, tone: event.exitCode ? "danger" : "neutral", icon: TerminalSquare };
  }
  if (event.type === "tool-finished") {
    return { title: event.ok ? "工具完成" : "工具失败", body: event.summary, tone: event.ok ? "green" : "danger", icon: Wrench };
  }
  if (event.type === "agent-message") {
    return { title: "Agent 回复", body: event.text, tone: "green", icon: Bot };
  }
  if (event.type === "user-message") {
    return { title: "你发送了指令", body: event.text, tone: "blue", icon: Send };
  }
  if (event.type === "state-changed") {
    return { title: stateLabel(event.state), body: stateSummary(event.state), tone: sessionTone(event.state), icon: CheckCircle2 };
  }
  if (event.type === "error") {
    return { title: "运行错误", body: event.message, tone: "danger", icon: ShieldAlert };
  }
  return { title: "会话更新", body: event.type, tone: "neutral", icon: CheckCircle2 };
}
