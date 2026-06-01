import { ThemeProvider } from "@shopify/restyle";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  FileDiff,
  Home,
  Mic,
  Monitor,
  MoreHorizontal,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  TerminalSquare,
  Wifi,
  WifiOff
} from "lucide-react-native";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAgentPalRelay } from "@/hooks/useAgentPalRelay";
import { SessionEvent, SessionState, SessionSummary } from "@/lib/relay";
import { Box, Text, theme } from "@/theme";

type ActiveTab = "home" | "sessions" | "approvals" | "host";
type ToastState = { id: number; text: string } | null;
type Tone = "blue" | "amber" | "green" | "danger" | "neutral";
type ThemeColorName = keyof typeof theme.colors;
type IconComponent = React.ComponentType<{ color?: string; size?: number }>;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const relay = useAgentPalRelay();
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [composerText, setComposerText] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const hostOnline = relay.connectionState === "online" && !!relay.activeHost?.online;
  const sessions = relay.sessions;
  const selectedSession = sessions.find((session) => session.sessionId === selectedSessionId) ?? sessions[0] ?? null;
  const pendingApprovals = sessions.reduce((sum, item) => sum + item.pendingApprovals, 0);
  const activeSessions = sessions.filter((session) => session.state !== "completed" && session.state !== "offline").length;
  const timelineEvents = relay.timeline.slice(0, 4).map((item) => item.event);
  const displayEvents = timelineEvents;

  const submitPrompt = () => {
    const trimmed = composerText.trim();
    if (!trimmed) {
      showToast(setToast, "先输入一条指令");
      return;
    }
    const sent = relay.submit(trimmed, selectedSession?.sessionId);
    if (sent) {
      setComposerText("");
      showToast(setToast, "已发送到当前 Agent");
      return;
    }
    showToast(setToast, hostOnline ? "当前没有可用会话" : "Host 未连接，指令暂未发送");
  };

  return (
    <ThemeProvider theme={theme}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Box flex={1} backgroundColor="canvas">
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: insets.top + 14,
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 172,
              gap: 14
            }}
          >
            <Header
              hostOnline={hostOnline}
              connectionState={relay.connectionState}
              onPair={() => showToast(setToast, "主机配对入口待接入")}
              onSettings={() => showToast(setToast, "设置入口待接入")}
            />

            <OverviewPills activeSessions={activeSessions} pendingApprovals={pendingApprovals} hostOnline={hostOnline} />

            {relay.lastError ? <InlineNotice message={relay.lastError} tone="danger" /> : null}

            {selectedSession ? (
              <ActiveSessionPanel
                session={selectedSession}
                onDiff={() => showToast(setToast, "Diff 详情页待接入")}
                onApproval={() => {
                  setActiveTab("approvals");
                  showToast(setToast, "已切换到审批视图");
                }}
              />
            ) : (
              <EmptyState
                title="等待 Agent 会话"
                body={hostOnline ? "在电脑端启动或恢复 Codex / Claude Code 会话后，这里会显示真实任务状态。" : "先连接本地 Host，手机端会同步电脑上的真实 Agent 会话。"}
                icon={Bot}
                tone={hostOnline ? "blue" : "neutral"}
              />
            )}

            {pendingApprovals > 0 ? (
              <ApprovalBanner
                count={pendingApprovals}
                onPress={() => {
                  setActiveTab("approvals");
                  showToast(setToast, "已切换到审批视图");
                }}
              />
            ) : null}

            <SectionHeader title={activeTabTitle(activeTab)} action="全部" onPress={() => showToast(setToast, "列表筛选待接入")} />

            {activeTab === "approvals" ? (
              <ApprovalList sessions={sessions} onResolve={(approved) => showToast(setToast, approved ? "已记录批准操作" : "已记录拒绝操作")} />
            ) : activeTab === "host" ? (
              <HostPanel
                online={hostOnline}
                hostName={relay.activeHost?.name ?? "本地 Host"}
                relayUrl={relay.relayUrl}
                sessionCount={sessions.length}
                onReconnect={() => showToast(setToast, "正在等待 Host 重连")}
              />
            ) : (
              <SessionList
                sessions={sessions.slice(0, activeTab === "sessions" ? 8 : 3)}
                selectedSessionId={selectedSession?.sessionId ?? null}
                hostOnline={hostOnline}
                onSelect={(session) => {
                  setSelectedSessionId(session.sessionId);
                  showToast(setToast, `已选择 ${agentLabel(session.agentKind)}`);
                }}
              />
            )}

            <SectionHeader title="最近动态" action="清理" onPress={() => showToast(setToast, "动态清理待接入")} />
            {displayEvents.length > 0 ? (
              <Box gap="s">
                {displayEvents.map((event, index) => (
                  <ActivityRow key={`${event.type}-${index}`} event={event} />
                ))}
              </Box>
            ) : (
              <EmptyState title="暂无动态" body="真实工具调用、命令输出、Diff 和审批请求会在这里按时间出现。" icon={Clock3} tone="neutral" compact />
            )}
          </ScrollView>

          <ComposerBar
            value={composerText}
            disabled={!hostOnline}
            onChangeText={setComposerText}
            onSubmit={submitPrompt}
            onCommand={() => showToast(setToast, "命令面板待接入")}
            onVoice={() => showToast(setToast, "语音输入待接入")}
            bottom={insets.bottom + 72}
          />

          <BottomNav
            activeTab={activeTab}
            bottom={insets.bottom + 10}
            onSelect={(tab) => {
              setActiveTab(tab);
              showToast(setToast, `${activeTabTitle(tab)} 已选中`);
            }}
          />

          {toast ? <Toast message={toast.text} bottom={insets.bottom + 152} /> : null}
        </Box>
      </KeyboardAvoidingView>
    </ThemeProvider>
  );
}

function Header({
  hostOnline,
  connectionState,
  onPair,
  onSettings
}: {
  hostOnline: boolean;
  connectionState: string;
  onPair: () => void;
  onSettings: () => void;
}) {
  return (
    <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="m">
      <Box flex={1}>
        <Text variant="title">AgentPal</Text>
        <Text variant="caption">移动端 Agent 工作台</Text>
        <Box flexDirection="row" alignItems="center" gap="xs" marginTop="xs">
          {hostOnline ? <Wifi color={theme.colors.success} size={16} /> : <WifiOff color={theme.colors.danger} size={16} />}
          <Text variant="caption" color={hostOnline ? "success" : "danger"}>
            {hostOnline ? "Host 在线" : `Host ${connectionState}`}
          </Text>
        </Box>
      </Box>
      <Box flexDirection="row" gap="s">
        <IconButton icon={<Plus color={theme.colors.cobalt} size={20} />} label="配对主机" onPress={onPair} />
        <IconButton icon={<Settings color={theme.colors.inkMuted} size={20} />} label="设置" onPress={onSettings} muted />
      </Box>
    </Box>
  );
}

function OverviewPills({
  activeSessions,
  pendingApprovals,
  hostOnline
}: {
  activeSessions: number;
  pendingApprovals: number;
  hostOnline: boolean;
}) {
  return (
    <Box flexDirection="row" gap="s">
      <OverviewPill label="Host" value={hostOnline ? "在线" : "离线"} tone={hostOnline ? "green" : "neutral"} icon={Monitor} />
      <OverviewPill label="会话" value={`${activeSessions}`} tone="blue" icon={Bot} />
      <OverviewPill label="审批" value={`${pendingApprovals}`} tone={pendingApprovals > 0 ? "amber" : "neutral"} icon={ShieldCheck} />
    </Box>
  );
}

function OverviewPill({ label, value, tone, icon: Icon }: { label: string; value: string; tone: Tone; icon: IconComponent }) {
  return (
    <Box flex={1} minHeight={54} backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" paddingHorizontal="m" flexDirection="row" alignItems="center" gap="s">
      <Box width={32} height={32} borderRadius="s" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
        <Icon color={theme.colors[toneToken(tone)]} size={17} />
      </Box>
      <Box flex={1}>
        <Text variant="section" numberOfLines={1}>
          {value}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {label}
        </Text>
      </Box>
    </Box>
  );
}

function InlineNotice({ message, tone }: { message: string; tone: Tone }) {
  return (
    <Box borderRadius="m" borderWidth={1} borderColor={toneToken(tone)} backgroundColor={toneSoftToken(tone)} padding="m">
      <Text variant="caption" color={toneToken(tone)}>
        {message}
      </Text>
    </Box>
  );
}

function ActiveSessionPanel({
  session,
  onDiff,
  onApproval
}: {
  session: SessionSummary;
  onDiff: () => void;
  onApproval: () => void;
}) {
  const tone = sessionTone(session.state);
  const progress = progressForState(session.state);

  return (
    <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor={tone === "amber" ? "amber" : "line"} padding="l" gap="m">
      <Box flexDirection="row" alignItems="center" gap="m">
        <AgentMark label={agentLabel(session.agentKind)} tone={tone} />
        <Box flex={1} gap="xs">
          <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s">
            <Text variant="caption" color="inkMuted">
              当前会话
            </Text>
            <StatusPill label={stateLabel(session.state)} tone={tone} />
          </Box>
          <Text variant="title" numberOfLines={2}>
            {session.title ?? agentLabel(session.agentKind)}
          </Text>
        </Box>
      </Box>

      <Text variant="body" color="inkMuted" numberOfLines={2}>
        {stateSummary(session.state)}
      </Text>
      <Text variant="caption" numberOfLines={1}>
        {session.workspace}
      </Text>

      <Box flexDirection="row" alignItems="center" gap="s">
        <ProgressBar value={progress} tone={tone} />
        <Text variant="caption" color={toneToken(tone)}>
          {progress}%
        </Text>
      </Box>

      <Box flexDirection="row" gap="s">
        <PanelButton label="Diff" icon={FileDiff} tone="blue" onPress={onDiff} />
        <PanelButton
          label={session.pendingApprovals > 0 ? "处理审批" : "无审批"}
          icon={ShieldCheck}
          tone={session.pendingApprovals > 0 ? "amber" : "neutral"}
          onPress={onApproval}
        />
      </Box>
    </Box>
  );
}

function PanelButton({ label, icon: Icon, tone, onPress }: { label: string; icon: IconComponent; tone: Tone; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <Box minHeight={46} borderRadius="m" backgroundColor={toneSoftToken(tone)} flexDirection="row" alignItems="center" justifyContent="center" gap="s" style={{ opacity: pressed ? 0.68 : 1 }}>
          <Icon color={theme.colors[toneToken(tone)]} size={18} />
          <Text variant="caption" color={toneToken(tone)}>
            {label}
          </Text>
        </Box>
      )}
    </Pressable>
  );
}

function ApprovalBanner({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Box
          minHeight={76}
          borderRadius="m"
          backgroundColor="amberSoft"
          borderColor="amber"
          borderWidth={1}
          padding="m"
          flexDirection="row"
          alignItems="center"
          gap="m"
          style={{ opacity: pressed ? 0.74 : 1 }}
        >
          <Box width={44} height={44} borderRadius="m" backgroundColor="surface" alignItems="center" justifyContent="center">
            <ShieldCheck color={theme.colors.amber} size={23} />
          </Box>
          <Box flex={1}>
            <Text variant="section">有 {count} 项操作等待你确认</Text>
            <Text variant="caption">查看涉及文件、风险和 diff 摘要后再批准。</Text>
          </Box>
          <ChevronRight color={theme.colors.amber} size={22} />
        </Box>
      )}
    </Pressable>
  );
}

function SectionHeader({ title, action, onPress }: { title: string; action: string; onPress: () => void }) {
  return (
    <Box flexDirection="row" alignItems="center" justifyContent="space-between" marginTop="xs">
      <Text variant="section">{title}</Text>
      <Pressable accessibilityRole="button" onPress={onPress}>
        {({ pressed }) => (
          <Box flexDirection="row" alignItems="center" gap="xs" style={{ opacity: pressed ? 0.6 : 1 }}>
            <Text variant="caption">{action}</Text>
            <ChevronRight color={theme.colors.inkMuted} size={18} />
          </Box>
        )}
      </Pressable>
    </Box>
  );
}

function EmptyState({
  title,
  body,
  icon: Icon,
  tone,
  compact = false
}: {
  title: string;
  body: string;
  icon: IconComponent;
  tone: Tone;
  compact?: boolean;
}) {
  return (
    <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" padding={compact ? "m" : "l"} gap="s">
      <Box flexDirection="row" alignItems="center" gap="m">
        <Box width={compact ? 38 : 46} height={compact ? 38 : 46} borderRadius="m" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
          <Icon color={theme.colors[toneToken(tone)]} size={compact ? 19 : 23} />
        </Box>
        <Box flex={1}>
          <Text variant="section">{title}</Text>
          <Text variant="body" color="inkMuted">
            {body}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

function SessionList({
  sessions,
  selectedSessionId,
  hostOnline,
  onSelect
}: {
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  hostOnline: boolean;
  onSelect: (session: SessionSummary) => void;
}) {
  if (!sessions.length) {
    return (
      <EmptyState
        title="没有可显示的会话"
        body={hostOnline ? "电脑端 Host 已连接，但还没有上报 Agent 会话。" : "Host 未连接时不会显示会话。"}
        icon={Bot}
        tone={hostOnline ? "blue" : "neutral"}
        compact
      />
    );
  }

  return (
    <Box gap="s">
      {sessions.map((session) => (
        <SessionRow key={session.sessionId} session={session} selected={session.sessionId === selectedSessionId} onPress={() => onSelect(session)} />
      ))}
    </Box>
  );
}

function SessionRow({ session, selected, onPress }: { session: SessionSummary; selected: boolean; onPress: () => void }) {
  const tone = sessionTone(session.state);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Box
          backgroundColor="surface"
          borderRadius="m"
          borderWidth={1}
          borderColor={selected ? "cobalt" : "line"}
          padding="m"
          flexDirection="row"
          gap="m"
          alignItems="center"
          style={{ opacity: pressed ? 0.74 : 1 }}
        >
          <AgentMark label={agentLabel(session.agentKind)} tone={tone} />
          <Box flex={1} gap="xs">
            <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s">
              <Text variant="section" numberOfLines={1} flex={1}>
                {session.title ?? agentLabel(session.agentKind)}
              </Text>
              <StatusPill label={stateLabel(session.state)} tone={tone} />
            </Box>
            <Text variant="caption" numberOfLines={1}>
              {session.workspace}
            </Text>
            <Text variant="body" color="inkMuted" numberOfLines={2}>
              {stateSummary(session.state)}
            </Text>
            <Box flexDirection="row" alignItems="center" gap="s" marginTop="xs">
              <ProgressBar value={progressForState(session.state)} tone={tone} />
              <Text variant="caption" color={toneToken(tone)}>
                {progressForState(session.state)}%
              </Text>
            </Box>
          </Box>
        </Box>
      )}
    </Pressable>
  );
}

function AgentMark({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Box width={54} height={54} borderRadius="m" backgroundColor={toneSoftToken(tone)} alignItems="center" justifyContent="center">
      <Bot color={theme.colors[toneToken(tone)]} size={24} />
      <Text variant="label" color={toneToken(tone)}>
        {label.slice(0, 2)}
      </Text>
    </Box>
  );
}

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Box minHeight={28} borderRadius="round" backgroundColor={toneSoftToken(tone)} paddingHorizontal="s" flexDirection="row" alignItems="center" gap="xs">
      <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: theme.colors[toneToken(tone)] }} />
      <Text variant="caption" color={toneToken(tone)} numberOfLines={1}>
        {label}
      </Text>
    </Box>
  );
}

function ProgressBar({ value, tone }: { value: number; tone: Tone }) {
  return (
    <Box flex={1} height={7} borderRadius="round" backgroundColor="surfaceMuted" overflow="hidden">
      <View style={{ width: `${value}%`, height: 7, borderRadius: 999, backgroundColor: theme.colors[toneToken(tone)] }} />
    </Box>
  );
}

function ApprovalList({ sessions, onResolve }: { sessions: SessionSummary[]; onResolve: (approved: boolean) => void }) {
  const approvals = sessions.filter((session) => session.pendingApprovals > 0);

  if (!approvals.length) {
    return (
      <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" padding="l" gap="s">
        <Text variant="section">暂无待审批操作</Text>
        <Text variant="body" color="inkMuted">
          新的 Codex 或 Claude Code 审批请求会出现在这里。
        </Text>
      </Box>
    );
  }

  return (
    <Box gap="s">
      {approvals.map((session) => (
        <Box key={session.sessionId} backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" padding="m" gap="m">
          <Box flexDirection="row" alignItems="center" gap="m">
            <Box width={44} height={44} borderRadius="m" backgroundColor="amberSoft" alignItems="center" justifyContent="center">
              <FileDiff color={theme.colors.amber} size={22} />
            </Box>
            <Box flex={1}>
              <Text variant="section" numberOfLines={1}>
                {session.title ?? "审批请求"}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {session.workspace}
              </Text>
            </Box>
          </Box>
          <Text variant="body" color="inkMuted">
            Agent 请求继续执行涉及文件修改的操作。请在详情页查看 diff 后确认。
          </Text>
          <Box flexDirection="row" gap="s">
            <ActionButton label="拒绝" tone="neutral" onPress={() => onResolve(false)} />
            <ActionButton label="批准" tone="amber" onPress={() => onResolve(true)} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function HostPanel({
  online,
  hostName,
  relayUrl,
  sessionCount,
  onReconnect
}: {
  online: boolean;
  hostName: string;
  relayUrl: string;
  sessionCount: number;
  onReconnect: () => void;
}) {
  return (
    <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" padding="l" gap="m">
      <Box flexDirection="row" alignItems="center" gap="m">
        <Box width={52} height={52} borderRadius="m" backgroundColor={online ? "successSoft" : "surfaceMuted"} alignItems="center" justifyContent="center">
          <Monitor color={online ? theme.colors.success : theme.colors.inkMuted} size={25} />
        </Box>
        <Box flex={1}>
          <Text variant="section">{hostName}</Text>
          <Text variant="caption">{online ? "在线并可接收手机指令" : "等待本地 Host 连接"}</Text>
        </Box>
        <StatusPill label={online ? "在线" : "离线"} tone={online ? "green" : "neutral"} />
      </Box>
      <InfoLine label="Relay" value={relayUrl} />
      <InfoLine label="会话数" value={`${sessionCount}`} />
      <ActionButton label="重新连接" tone="blue" onPress={onReconnect} />
    </Box>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="m">
      <Text variant="caption">{label}</Text>
      <Text variant="caption" color="ink" numberOfLines={1} flex={1} textAlign="right">
        {value}
      </Text>
    </Box>
  );
}

function ActivityRow({ event }: { event: SessionEvent }) {
  const meta = eventMeta(event);
  const Icon = meta.icon;

  return (
    <Box backgroundColor="surface" borderRadius="m" borderWidth={1} borderColor="line" padding="m" flexDirection="row" gap="m">
      <Box width={42} height={42} borderRadius="m" backgroundColor={toneSoftToken(meta.tone)} alignItems="center" justifyContent="center">
        <Icon color={theme.colors[toneToken(meta.tone)]} size={21} />
      </Box>
      <Box flex={1} gap="xs">
        <Text variant="section" numberOfLines={1}>
          {meta.title}
        </Text>
        <Text variant="body" color="inkMuted" numberOfLines={2}>
          {meta.body}
        </Text>
      </Box>
    </Box>
  );
}

function ComposerBar({
  value,
  disabled,
  bottom,
  onChangeText,
  onSubmit,
  onCommand,
  onVoice
}: {
  value: string;
  disabled: boolean;
  bottom: number;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onCommand: () => void;
  onVoice: () => void;
}) {
  const canSubmit = value.trim().length > 0 && !disabled;

  return (
    <Box
      position="absolute"
      left={16}
      right={16}
      bottom={bottom}
      minHeight={58}
      backgroundColor="surface"
      borderRadius="m"
      borderWidth={1}
      borderColor="line"
      padding="s"
      flexDirection="row"
      alignItems="center"
      gap="s"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 }
      }}
    >
      <IconButton icon={<Code2 color={theme.colors.cobalt} size={20} />} label="命令" onPress={onCommand} compact />
      <Box flex={1} minHeight={42} justifyContent="center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          placeholder={disabled ? "等待 Host 连接..." : "继续指挥 Agent..."}
          placeholderTextColor={theme.colors.inkMuted}
          multiline
          style={{ color: theme.colors.ink, fontSize: 15, lineHeight: 21, minHeight: 42, paddingVertical: 9 }}
        />
      </Box>
      <IconButton icon={<Mic color={theme.colors.inkMuted} size={20} />} label="语音" onPress={onVoice} compact muted />
      <IconButton icon={<Send color={canSubmit ? theme.colors.white : theme.colors.inkMuted} size={19} />} label="发送" onPress={onSubmit} compact filled={canSubmit} muted={!canSubmit} />
    </Box>
  );
}

function BottomNav({ activeTab, bottom, onSelect }: { activeTab: ActiveTab; bottom: number; onSelect: (tab: ActiveTab) => void }) {
  const items: Array<{ tab: ActiveTab; label: string; icon: typeof Home }> = [
    { tab: "home", label: "首页", icon: Home },
    { tab: "sessions", label: "会话", icon: Bot },
    { tab: "approvals", label: "审批", icon: ShieldCheck },
    { tab: "host", label: "主机", icon: Monitor }
  ];

  return (
    <Box
      position="absolute"
      left={16}
      right={16}
      bottom={bottom}
      minHeight={56}
      backgroundColor="surface"
      borderRadius="m"
      borderWidth={1}
      borderColor="line"
      padding="xs"
      flexDirection="row"
      alignItems="center"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 }
      }}
    >
      {items.map((item) => {
        const active = activeTab === item.tab;
        const Icon = item.icon;
        return (
          <Pressable key={item.tab} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onSelect(item.tab)} style={{ flex: 1 }}>
            {({ pressed }) => (
              <Box minHeight={46} borderRadius="m" backgroundColor={active ? "accentSoft" : "surface"} alignItems="center" justifyContent="center" style={{ opacity: pressed ? 0.7 : 1 }}>
                <Icon color={active ? theme.colors.cobalt : theme.colors.inkMuted} size={20} />
                <Text variant="caption" color={active ? "cobalt" : "inkMuted"}>
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

function IconButton({
  icon,
  label,
  onPress,
  compact = false,
  filled = false,
  muted = false
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  compact?: boolean;
  filled?: boolean;
  muted?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {({ pressed }) => (
        <Box
          width={compact ? 42 : 44}
          height={compact ? 42 : 44}
          borderRadius="m"
          backgroundColor={filled ? "accent" : muted ? "surfaceMuted" : "accentSoft"}
          alignItems="center"
          justifyContent="center"
          style={{ opacity: pressed ? 0.65 : 1 }}
        >
          {icon}
        </Box>
      )}
    </Pressable>
  );
}

function ActionButton({ label, tone, onPress }: { label: string; tone: Tone; onPress: () => void }) {
  const filled = tone === "amber" || tone === "blue";
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <Box
          minHeight={44}
          borderRadius="m"
          backgroundColor={filled ? toneToken(tone) : "surfaceMuted"}
          alignItems="center"
          justifyContent="center"
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

function Toast({ message, bottom }: { message: string; bottom: number }) {
  return (
    <Box position="absolute" left={32} right={32} bottom={bottom} backgroundColor="ink" borderRadius="round" paddingHorizontal="l" paddingVertical="s" alignItems="center">
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

function activeTabTitle(tab: ActiveTab) {
  if (tab === "sessions") return "全部会话";
  if (tab === "approvals") return "待审批";
  if (tab === "host") return "主机状态";
  return "当前会话";
}

function agentLabel(kind: SessionSummary["agentKind"]) {
  if (kind === "claude-code") return "Claude";
  if (kind === "open-code") return "OpenCode";
  if (kind === "open-claw") return "OpenClaw";
  if (kind === "custom") return "Custom";
  return "Codex";
}

function sessionTone(state: SessionState): Tone {
  if (state === "waiting-approval") return "amber";
  if (state === "running" || state === "thinking") return "blue";
  if (state === "completed") return "green";
  if (state === "failed") return "danger";
  return "neutral";
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

function stateSummary(state: SessionState) {
  if (state === "waiting-approval") return "需要你确认操作后，Agent 才会继续执行。";
  if (state === "running") return "Agent 正在执行命令、修改文件或运行测试。";
  if (state === "thinking") return "Agent 正在读取上下文并准备下一步。";
  if (state === "completed") return "最近一次任务已经完成，可以继续追加指令。";
  if (state === "failed") return "最近一次运行失败，需要查看错误并恢复。";
  if (state === "offline") return "会话已断开，等待 Host 恢复连接。";
  return "会话已就绪，等待你的下一条指令。";
}

function progressForState(state: SessionState) {
  if (state === "waiting-approval") return 72;
  if (state === "running") return 64;
  if (state === "thinking") return 38;
  if (state === "completed") return 100;
  if (state === "failed") return 24;
  if (state === "offline") return 0;
  return 12;
}

function toneToken(tone: Tone): ThemeColorName {
  if (tone === "amber") return "amber";
  if (tone === "green") return "success";
  if (tone === "danger") return "danger";
  if (tone === "neutral") return "inkMuted";
  return "cobalt";
}

function toneSoftToken(tone: Tone): ThemeColorName {
  if (tone === "amber") return "amberSoft";
  if (tone === "green") return "successSoft";
  if (tone === "danger") return "dangerSoft";
  if (tone === "neutral") return "surfaceMuted";
  return "cobaltSoft";
}

function eventMeta(event: SessionEvent): { title: string; body: string; tone: Tone; icon: typeof Bot } {
  if (event.type === "approval-requested") {
    return { title: "审批请求", body: "Agent 请求你确认一次操作。", tone: "amber", icon: ShieldCheck };
  }
  if (event.type === "diff-updated") {
    return {
      title: "Diff 已更新",
      body: `${event.summary.filesChanged} 个文件，+${event.summary.additions} / -${event.summary.deletions}`,
      tone: "blue",
      icon: FileDiff
    };
  }
  if (event.type === "command-output") {
    return { title: "命令输出", body: event.summary, tone: event.exitCode ? "danger" : "neutral", icon: TerminalSquare };
  }
  if (event.type === "tool-finished") {
    return { title: event.ok ? "工具完成" : "工具失败", body: event.summary, tone: event.ok ? "green" : "danger", icon: Code2 };
  }
  if (event.type === "agent-message") {
    return { title: "Agent 回复", body: event.text, tone: "green", icon: Bot };
  }
  if (event.type === "user-message") {
    return { title: "你发送了指令", body: event.text, tone: "blue", icon: Send };
  }
  if (event.type === "state-changed") {
    return { title: stateLabel(event.state), body: stateSummary(event.state), tone: sessionTone(event.state), icon: Clock3 };
  }
  if (event.type === "error") {
    return { title: "运行错误", body: event.message, tone: "danger", icon: MoreHorizontal };
  }
  return { title: "会话更新", body: event.type, tone: "neutral", icon: CheckCircle2 };
}
