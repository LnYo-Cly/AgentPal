import { ThemeProvider } from "@shopify/restyle";
import {
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  FileDiff,
  Home,
  Menu,
  Mic,
  Monitor,
  Paperclip,
  RefreshCcw,
  Send,
  Settings,
  ShieldAlert,
  TerminalSquare,
  Wrench,
  Zap
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAgentPalRelay } from "@/hooks/useAgentPalRelay";
import { HostStatus, SessionEvent, SessionState, SessionSummary } from "@/lib/relay";
import { Box, Text, theme } from "@/theme";
import { uiAssets } from "@/lib/uiAssets";

type ActiveTab = "home" | "conversation" | "settings";
type ToastState = { id: number; text: string } | null;
type Tone = "blue" | "amber" | "green" | "danger" | "neutral" | "violet";
type ThemeColorName = keyof typeof theme.colors;
type IconComponent = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const relay = useAgentPalRelay();
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [composerText, setComposerText] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const hostOnline = relay.connectionState === "online" && !!relay.activeHost?.online;
  const sessions = relay.sessions;
  const selectedSession = sessions.find((session) => session.sessionId === selectedSessionId) ?? relay.activeSession ?? sessions[0] ?? null;
  const pendingApprovals = sessions.reduce((sum, item) => sum + item.pendingApprovals, 0);
  const activeSessions = sessions.filter((session) => session.state !== "completed" && session.state !== "offline").length;
  const conversationEvents = useMemo(
    () =>
      relay.timeline
        .filter((item) => !selectedSession || !item.sessionId || item.sessionId === selectedSession.sessionId)
        .slice(0, 18)
        .reverse(),
    [relay.timeline, selectedSession]
  );

  const submitPrompt = () => {
    const trimmed = composerText.trim();
    if (!trimmed) {
      showToast(setToast, "先输入一条指令");
      return;
    }

    const sent = relay.submit(trimmed, selectedSession?.sessionId);
    if (sent) {
      setComposerText("");
      showToast(setToast, "已发送到当前会话");
      return;
    }

    showToast(setToast, hostOnline ? "当前没有可用会话" : "Host 未连接");
  };

  const selectNextSession = () => {
    if (sessions.length < 2) {
      showToast(setToast, "当前只有一个会话");
      return;
    }
    const currentIndex = sessions.findIndex((session) => session.sessionId === selectedSession?.sessionId);
    const next = sessions[(currentIndex + 1 + sessions.length) % sessions.length];
    setSelectedSessionId(next.sessionId);
    showToast(setToast, `已切换到 ${agentLabel(next.agentKind)}`);
  };

  return (
    <ThemeProvider theme={theme}>
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
              activeSession={selectedSession}
              pendingApprovals={pendingApprovals}
              activeSessions={activeSessions}
              latestEvent={relay.timeline[0]?.event ?? null}
              onOpenConversation={() => setActiveTab("conversation")}
              onOpenSettings={() => setActiveTab("settings")}
            />
          ) : activeTab === "conversation" ? (
            <ConversationPage
              top={insets.top}
              bottom={insets.bottom}
              hostOnline={hostOnline}
              session={selectedSession}
              sessions={sessions}
              events={conversationEvents.map((item) => item.event)}
              value={composerText}
              onChangeText={setComposerText}
              onSubmit={submitPrompt}
              onSwitchSession={selectNextSession}
              onAttach={() => showToast(setToast, "附件暂未接入")}
              onVoice={() => showToast(setToast, "语音输入待接入")}
              onApproveApproval={() => showToast(setToast, "审批回传待接入")}
              onRejectApproval={() => showToast(setToast, "已拒绝该审批")}
              onCommand={(kind) => showToast(setToast, kind === "slash" ? "Slash commands 待接入" : "Skills / plugins 待接入")}
            />
          ) : (
            <SettingsPage
              top={insets.top}
              bottom={insets.bottom}
              relayUrl={relay.relayUrl}
              activeHost={relay.activeHost}
              hostOnline={hostOnline}
              connectionState={relay.connectionState}
              sessionCount={sessions.length}
              onPair={() => showToast(setToast, "主机配对待接入")}
              onReconnect={() => showToast(setToast, "等待 Host 重连")}
            />
          )}

          <BottomNav activeTab={activeTab} bottom={insets.bottom + 10} onSelect={setActiveTab} />
          {toast ? <Toast message={toast.text} bottom={insets.bottom + (activeTab === "conversation" ? 156 : 92)} /> : null}
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
  activeSessions,
  latestEvent,
  onOpenConversation,
  onOpenSettings
}: {
  top: number;
  bottom: number;
  hostOnline: boolean;
  connectionState: string;
  activeHost: HostStatus | null;
  sessions: SessionSummary[];
  activeSession: SessionSummary | null;
  pendingApprovals: number;
  activeSessions: number;
  latestEvent: SessionEvent | null;
  onOpenConversation: () => void;
  onOpenSettings: () => void;
}) {
  const focusTone = pendingApprovals > 0 ? "danger" : activeSession ? sessionTone(activeSession.state) : hostOnline ? "green" : "neutral";
  const focusTitle = pendingApprovals > 0 ? "等待你确认" : activeSession ? stateHeadline(activeSession.state) : hostOnline ? "Host 已就绪" : "等待连接";
  const focusBody =
    pendingApprovals > 0
      ? `${pendingApprovals} 项审批会阻塞 Agent 继续执行。`
      : activeSession
        ? activeSession.title ?? stateSummary(activeSession.state)
        : hostOnline
          ? activeHost?.name ?? "本地 Host 在线"
          : `Relay ${connectionState}`;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: top + 14,
        paddingHorizontal: 18,
        paddingBottom: bottom + 96,
        gap: 18
      }}
    >
      <Box flexDirection="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Text variant="screenTitle">AgentPal</Text>
          <Text variant="caption">Pocket coding agent desk</Text>
        </Box>
        <StatusCapsule online={hostOnline} text={hostOnline ? "在线" : "离线"} />
      </Box>

      <FocusPanel tone={focusTone} title={focusTitle} body={focusBody} session={activeSession} onPress={onOpenConversation} />

      <Box flexDirection="row" gap="s">
        <MetricBlock label="活跃" value={`${activeSessions}`} icon={Bot} tone="violet" />
        <MetricBlock label="审批" value={`${pendingApprovals}`} icon={ShieldAlert} tone={pendingApprovals > 0 ? "danger" : "neutral"} />
        <MetricBlock label="会话" value={`${sessions.length}`} icon={TerminalSquare} tone="blue" />
      </Box>

      <HomeActionStrip
        pendingApprovals={pendingApprovals}
        activeSession={activeSession}
        hostOnline={hostOnline}
        onOpenConversation={onOpenConversation}
        onOpenSettings={onOpenSettings}
      />

      <Box gap="s">
        <Text variant="section">最近</Text>
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

function FocusPanel({
  tone,
  title,
  body,
  session,
  onPress
}: {
  tone: Tone;
  title: string;
  body: string;
  session: SessionSummary | null;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Box
          minHeight={178}
          borderRadius="l"
          backgroundColor="surface"
          padding="l"
          overflow="hidden"
          borderWidth={1}
          borderColor="line"
          style={softShadow(pressed)}
        >
          <Box position="absolute" right={-12} bottom={-18} width={164} height={164} opacity={0.92}>
            <Image source={companionForState(session?.state)} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
          </Box>
          <Box maxWidth="68%" gap="m">
            <Box width={48} height={48} borderRadius="m" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
              <Zap color={theme.colors[toneToken(tone)]} size={24} />
            </Box>
            <Box gap="xs">
              <Text variant="screenTitle" numberOfLines={2}>
                {title}
              </Text>
              <Text variant="body" color="inkMuted" numberOfLines={3}>
                {body}
              </Text>
            </Box>
          </Box>
        </Box>
      )}
    </Pressable>
  );
}

function MetricBlock({ label, value, icon: Icon, tone }: { label: string; value: string; icon: IconComponent; tone: Tone }) {
  return (
    <Box flex={1} minHeight={82} justifyContent="space-between" borderTopWidth={1} borderColor="line" paddingTop="m">
      <Box width={32} height={32} borderRadius="s" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
        <Icon color={theme.colors[toneToken(tone)]} size={18} />
      </Box>
      <Box>
        <Text variant="title">{value}</Text>
        <Text variant="caption">{label}</Text>
      </Box>
    </Box>
  );
}

function HomeActionStrip({
  pendingApprovals,
  activeSession,
  hostOnline,
  onOpenConversation,
  onOpenSettings
}: {
  pendingApprovals: number;
  activeSession: SessionSummary | null;
  hostOnline: boolean;
  onOpenConversation: () => void;
  onOpenSettings: () => void;
}) {
  if (!hostOnline) {
    return <PrimaryLine icon={Monitor} title="连接电脑端 Host" body="Relay / 配对 / 通知" tone="blue" onPress={onOpenSettings} />;
  }
  if (pendingApprovals > 0) {
    return <PrimaryLine icon={ShieldAlert} title="处理审批" body="查看风险、Diff 与涉及文件" tone="danger" onPress={onOpenConversation} />;
  }
  return (
    <PrimaryLine
      icon={TerminalSquare}
      title={activeSession ? "继续当前会话" : "打开会话"}
      body={activeSession?.workspace ?? "等待 Agent 会话"}
      tone={activeSession ? sessionTone(activeSession.state) : "neutral"}
      onPress={onOpenConversation}
    />
  );
}

function PrimaryLine({ icon: Icon, title, body, tone, onPress }: { icon: IconComponent; title: string; body: string; tone: Tone; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Box
          minHeight={76}
          flexDirection="row"
          alignItems="center"
          gap="m"
          borderTopWidth={1}
          borderBottomWidth={1}
          borderColor="line"
          style={{ opacity: pressed ? 0.65 : 1 }}
        >
          <Box width={46} height={46} borderRadius="m" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
            <Icon color={theme.colors[toneToken(tone)]} size={22} />
          </Box>
          <Box flex={1}>
            <Text variant="section">{title}</Text>
            <Text variant="caption" numberOfLines={1}>
              {body}
            </Text>
          </Box>
          <ChevronRight color={theme.colors.inkMuted} size={22} />
        </Box>
      )}
    </Pressable>
  );
}

function ConversationPage({
  top,
  bottom,
  hostOnline,
  session,
  sessions,
  events,
  value,
  onChangeText,
  onSubmit,
  onSwitchSession,
  onAttach,
  onVoice,
  onApproveApproval,
  onRejectApproval,
  onCommand
}: {
  top: number;
  bottom: number;
  hostOnline: boolean;
  session: SessionSummary | null;
  sessions: SessionSummary[];
  events: SessionEvent[];
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onSwitchSession: () => void;
  onAttach: () => void;
  onVoice: () => void;
  onApproveApproval: () => void;
  onRejectApproval: () => void;
  onCommand: (kind: "slash" | "skill") => void;
}) {
  return (
    <>
      <ConversationHeader top={top} hostOnline={hostOnline} session={session} sessionCount={sessions.length} onSwitchSession={onSwitchSession} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: top + 122,
          paddingHorizontal: 16,
          paddingBottom: bottom + 182,
          gap: 14
        }}
      >
        {session ? <SessionContextBar session={session} /> : null}
        {session ? (
          events.length > 0 ? (
            events.map((event, index) => (
              <ConversationEvent key={`${event.type}-${index}`} event={event} onApprovalApprove={onApproveApproval} onApprovalReject={onRejectApproval} />
            ))
          ) : (
            <ConversationEmpty session={session} />
          )
        ) : (
          <NoSessionState />
        )}
      </ScrollView>
      <ConversationComposer
        bottom={bottom + 72}
        value={value}
        disabled={!hostOnline || !session}
        onChangeText={onChangeText}
        onSubmit={onSubmit}
        onAttach={onAttach}
        onVoice={onVoice}
        onCommand={onCommand}
      />
    </>
  );
}

function ConversationHeader({
  top,
  hostOnline,
  session,
  sessionCount,
  onSwitchSession
}: {
  top: number;
  hostOnline: boolean;
  session: SessionSummary | null;
  sessionCount: number;
  onSwitchSession: () => void;
}) {
  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      zIndex={20}
      backgroundColor="surface"
      borderBottomWidth={1}
      borderColor="line"
      paddingHorizontal="m"
      paddingBottom="m"
      style={{ paddingTop: top + 10 }}
    >
      <Box flexDirection="row" alignItems="flex-start" gap="s">
        <IconShell icon={Menu} tone="neutral" onPress={onSwitchSession} label="切换会话" />
        <Box flex={1}>
          <Pressable accessibilityRole="button" onPress={onSwitchSession}>
            <Box gap="xs">
              <Box flexDirection="row" alignItems="center" gap="xs">
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
            {session ? `${agentLabel(session.agentKind)} · ${session.workspace}` : `${sessionCount} 个会话`}
          </Text>
        </Box>
        <Box alignItems="flex-end" gap="xs">
          <StatusCapsule online={hostOnline} text={hostOnline ? "在线" : "离线"} />
          <IconShell icon={RefreshCcw} tone="neutral" onPress={onSwitchSession} label="刷新" />
        </Box>
      </Box>
    </Box>
  );
}

function SessionContextBar({ session }: { session: SessionSummary }) {
  return (
    <Box flexDirection="row" alignItems="center" gap="s">
      <StatusChip label={agentLabel(session.agentKind)} tone="violet" icon={Bot} />
      <StatusChip label={stateLabel(session.state)} tone={sessionTone(session.state)} icon={TerminalSquare} />
      {session.pendingApprovals > 0 ? <StatusChip label={`${session.pendingApprovals} 审批`} tone="danger" icon={ShieldAlert} /> : null}
    </Box>
  );
}

function ConversationEmpty({ session }: { session: SessionSummary }) {
  return (
    <Box alignItems="center" paddingTop="xxl" gap="m">
      <Image source={companionForState(session.state)} style={{ width: 156, height: 156 }} resizeMode="contain" />
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

function ConversationEvent({
  event,
  onApprovalApprove,
  onApprovalReject
}: {
  event: SessionEvent;
  onApprovalApprove: () => void;
  onApprovalReject: () => void;
}) {
  if (event.type === "user-message") {
    return <UserBubble text={event.text} />;
  }
  if (event.type === "agent-message") {
    return <AgentBubble text={event.text} />;
  }
  if (event.type === "command-output") {
    return <CommandBlock command={event.command} summary={event.summary} ok={!event.exitCode} />;
  }
  if (event.type === "tool-started") {
    return <ToolBlock title={event.name} summary="工具调用中" tone="blue" />;
  }
  if (event.type === "tool-finished") {
    return <ToolBlock title={event.name} summary={event.summary} tone={event.ok ? "green" : "danger"} />;
  }
  if (event.type === "diff-updated") {
    return <DiffBlock summary={event.summary} />;
  }
  if (event.type === "approval-requested") {
    return <ApprovalBlock onApprove={onApprovalApprove} onReject={onApprovalReject} />;
  }
  if (event.type === "state-changed") {
    return <SystemLine text={stateLabel(event.state)} tone={sessionTone(event.state)} />;
  }
  if (event.type === "error") {
    return <ToolBlock title="运行错误" summary={event.message} tone="danger" />;
  }
  if (event.type === "approval-resolved") {
    return <SystemLine text={event.approved ? "审批已批准" : "审批已拒绝"} tone={event.approved ? "green" : "danger"} />;
  }
  return <SystemLine text="会话已开始" tone="neutral" />;
}

function UserBubble({ text }: { text: string }) {
  return (
    <Box alignItems="flex-end">
      <Box maxWidth="82%" backgroundColor="userBubble" borderRadius="l" paddingHorizontal="l" paddingVertical="m">
        <Text variant="body">{text}</Text>
      </Box>
    </Box>
  );
}

function AgentBubble({ text }: { text: string }) {
  return (
    <Box flexDirection="row" alignItems="flex-end" gap="s">
      <Box width={38} height={38} borderRadius="round" backgroundColor="cobaltSoft" alignItems="center" justifyContent="center">
        <Bot color={theme.colors.cobalt} size={19} />
      </Box>
      <Box maxWidth="82%" backgroundColor="surface" borderRadius="l" padding="l" borderWidth={1} borderColor="line">
        <Text variant="body">{text}</Text>
      </Box>
    </Box>
  );
}

function CommandBlock({ command, summary, ok }: { command: string; summary: string; ok: boolean }) {
  return (
    <Box borderRadius="m" borderWidth={1} borderColor="line" backgroundColor="terminal" padding="m" gap="s">
      <Box flexDirection="row" alignItems="center" gap="s">
        <TerminalSquare color={theme.colors.terminalText} size={18} />
        <Text variant="caption" color="terminalText" numberOfLines={1} flex={1}>
          {command}
        </Text>
        <Text variant="caption" color={ok ? "success" : "danger"}>
          {ok ? "done" : "failed"}
        </Text>
      </Box>
      <Text variant="body" color="terminalText">
        {summary}
      </Text>
    </Box>
  );
}

function ToolBlock({ title, summary, tone }: { title: string; summary: string; tone: Tone }) {
  return (
    <Box flexDirection="row" gap="m" alignItems="flex-start" borderLeftWidth={3} borderColor={toneToken(tone)} paddingLeft="m" paddingVertical="s">
      <Box width={34} height={34} borderRadius="s" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
        <Wrench color={theme.colors[toneToken(tone)]} size={18} />
      </Box>
      <Box flex={1}>
        <Text variant="section">{title}</Text>
        <Text variant="body" color="inkMuted">
          {summary}
        </Text>
      </Box>
    </Box>
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

function SystemLine({ text, tone }: { text: string; tone: Tone }) {
  return (
    <Box flexDirection="row" alignItems="center" gap="s" alignSelf="center" paddingHorizontal="m" paddingVertical="s" backgroundColor={toneSoftToken(tone)} borderRadius="round">
      <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: theme.colors[toneToken(tone)] }} />
      <Text variant="caption" color={toneToken(tone)}>
        {text}
      </Text>
    </Box>
  );
}

function ConversationComposer({
  bottom,
  value,
  disabled,
  onChangeText,
  onSubmit,
  onAttach,
  onVoice,
  onCommand
}: {
  bottom: number;
  value: string;
  disabled: boolean;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onAttach: () => void;
  onVoice: () => void;
  onCommand: (kind: "slash" | "skill") => void;
}) {
  const canSubmit = value.trim().length > 0 && !disabled;

  return (
    <Box position="absolute" left={0} right={0} bottom={bottom} zIndex={30} paddingHorizontal="m" gap="s">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <CommandChip label="$ Skills" icon={Code2} onPress={() => onCommand("skill")} />
        <CommandChip label="/ Commands" icon={TerminalSquare} onPress={() => onCommand("slash")} />
        <CommandChip label="工具" icon={Wrench} onPress={() => onCommand("slash")} />
      </ScrollView>
      <Box backgroundColor="surface" borderRadius="round" borderWidth={1} borderColor="line" minHeight={58} flexDirection="row" alignItems="center" gap="s" paddingHorizontal="s" style={softShadow(false)}>
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
  sessionCount,
  onPair,
  onReconnect
}: {
  top: number;
  bottom: number;
  relayUrl: string;
  activeHost: HostStatus | null;
  hostOnline: boolean;
  connectionState: string;
  sessionCount: number;
  onPair: () => void;
  onReconnect: () => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: top + 16,
        paddingHorizontal: 18,
        paddingBottom: bottom + 96,
        gap: 18
      }}
    >
      <Box>
        <Text variant="screenTitle">设置</Text>
        <Text variant="caption">连接、通知和 Agent 环境</Text>
      </Box>

      <Box borderRadius="l" backgroundColor="surface" borderWidth={1} borderColor="line" padding="l" gap="m" style={softShadow(false)}>
        <Box flexDirection="row" alignItems="center" gap="m">
          <Box width={54} height={54} borderRadius="m" backgroundColor={hostOnline ? "successSoft" : "surfaceMuted"} alignItems="center" justifyContent="center">
            <Monitor color={hostOnline ? theme.colors.success : theme.colors.inkMuted} size={26} />
          </Box>
          <Box flex={1}>
            <Text variant="title">{activeHost?.name ?? "本地 Host"}</Text>
            <Text variant="caption">{hostOnline ? "在线并可接收指令" : `状态：${connectionState}`}</Text>
          </Box>
          <StatusCapsule online={hostOnline} text={hostOnline ? "在线" : "离线"} />
        </Box>
        <Box flexDirection="row" gap="s">
          <SettingsButton label="配对" tone="blue" onPress={onPair} />
          <SettingsButton label="重连" tone="neutral" onPress={onReconnect} />
        </Box>
      </Box>

      <SettingsSection title="连接">
        <SettingsRow icon={Zap} title="Relay" value={relayUrl} />
        <SettingsRow icon={Bot} title="活跃会话" value={`${sessionCount}`} />
        <SettingsRow icon={TerminalSquare} title="工作区" value={`${activeHost?.workspaces.length ?? 0}`} />
      </SettingsSection>

      <SettingsSection title="偏好">
        <SettingsRow icon={Bell} title="通知" value="审批 / 完成 / 失败" />
        <SettingsRow icon={Mic} title="语音输入" value="待接入" />
        <SettingsRow icon={ShieldAlert} title="审批策略" value="跟随原生 Agent" />
      </SettingsSection>
    </ScrollView>
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

function SettingsRow({ icon: Icon, title, value }: { icon: IconComponent; title: string; value: string }) {
  return (
    <Box minHeight={58} flexDirection="row" alignItems="center" gap="m" paddingHorizontal="m" borderBottomWidth={1} borderColor="line">
      <Box width={34} height={34} borderRadius="s" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center">
        <Icon color={theme.colors.inkMuted} size={18} />
      </Box>
      <Text variant="body" flex={1}>
        {title}
      </Text>
      <Text variant="caption" numberOfLines={1} maxWidth={190} textAlign="right">
        {value}
      </Text>
    </Box>
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

function BottomNav({ activeTab, bottom, onSelect }: { activeTab: ActiveTab; bottom: number; onSelect: (tab: ActiveTab) => void }) {
  const items: Array<{ tab: ActiveTab; label: string; icon: IconComponent }> = [
    { tab: "home", label: "首页", icon: Home },
    { tab: "conversation", label: "会话", icon: Bot },
    { tab: "settings", label: "设置", icon: Settings }
  ];

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
      {items.map((item) => {
        const active = activeTab === item.tab;
        const Icon = item.icon;
        return (
          <Pressable key={item.tab} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onSelect(item.tab)} style={{ flex: 1 }}>
            {({ pressed }) => (
              <Box minHeight={54} borderRadius="round" backgroundColor={active ? "navActive" : "surface"} alignItems="center" justifyContent="center" gap="xs" style={{ opacity: pressed ? 0.72 : 1 }}>
                <Icon color={active ? theme.colors.accent : theme.colors.inkMuted} size={22} strokeWidth={active ? 2.5 : 2} />
                <Text variant="caption" color={active ? "accent" : "inkMuted"}>
                  {item.label}
                </Text>
              </Box>
            )}
          </Pressable>
        );
      })}
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

function CommandChip({ label, icon: Icon, onPress }: { label: string; icon: IconComponent; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Box minHeight={36} borderRadius="round" backgroundColor="surface" borderWidth={1} borderColor="line" paddingHorizontal="m" flexDirection="row" alignItems="center" gap="xs" style={{ opacity: pressed ? 0.7 : 1 }}>
          <Icon color={theme.colors.accent} size={16} />
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
    <Box position="absolute" left={30} right={30} bottom={bottom} backgroundColor="ink" borderRadius="round" paddingHorizontal="l" paddingVertical="s" alignItems="center" zIndex={80}>
      <Text variant="caption" color="white">
        {message}
      </Text>
    </Box>
  );
}

function showToast(setToast: React.Dispatch<React.SetStateAction<ToastState>>, text: string) {
  const id = Date.now();
  setToast({ id, text });
  setTimeout(() => {
    setToast((current) => (current?.id === id ? null : current));
  }, 1400);
}

function softShadow(pressed: boolean) {
  return {
    opacity: pressed ? 0.72 : 1,
    shadowColor: "#1B1B20",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  };
}

function companionForState(state?: SessionState | null) {
  if (state === "running" || state === "thinking") return uiAssets.companionRunning;
  if (state === "waiting-approval") return uiAssets.companionFocus;
  if (state === "offline" || state === "failed") return uiAssets.companionOffline;
  if (state === "completed") return uiAssets.companionOnline;
  return uiAssets.companionIdle;
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
