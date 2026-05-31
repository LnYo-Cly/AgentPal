import { FlashList } from "@shopify/flash-list";
import { ThemeProvider } from "@shopify/restyle";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock3,
  Code2,
  FileDiff,
  GitPullRequestArrow,
  ShieldCheck,
  TerminalSquare,
  Wifi,
  WifiOff
} from "lucide-react-native";
import { Pressable, ScrollView, TextInput } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { EventCard } from "@/components/EventCard";
import { InputBar } from "@/components/InputBar";
import { SessionCard } from "@/components/SessionCard";
import { useAgentPalRelay } from "@/hooks/useAgentPalRelay";
import { defaultRelayUrl, DiffSummary, normalizeRelayUrl, SessionEvent, SessionState, usbRelayUrl } from "@/lib/relay";
import { Box, Text, theme } from "@/theme";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [relayUrlDraft, setRelayUrlDraft] = useState(defaultRelayUrl());
  const [relayUrl, setRelayUrl] = useState(relayUrlDraft);
  const relay = useAgentPalRelay(relayUrl);
  const active = relay.activeSession;
  const changedFiles = latestChangedFiles(relay.timeline.map((item) => item.event));
  const quickStats = [
    { label: "在线 Host", value: String(relay.hosts.filter((host) => host.online).length), icon: Clock3 },
    { label: "活跃会话", value: String(relay.sessions.length), icon: Bot },
    { label: "待审批", value: String(relay.sessions.reduce((sum, item) => sum + item.pendingApprovals, 0)), icon: ShieldCheck }
  ];
  const feed = relay.timeline.map((item) => eventToFeedItem(item.event, item.createdAt));
  const hostOnline = relay.connectionState === "online" && !!relay.activeHost?.online;

  return (
    <ThemeProvider theme={theme}>
      <Box flex={1} backgroundColor="canvas" paddingTop="l">
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 20,
            gap: 16
          }}
        >
          <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="m">
            <Box flex={1}>
              <Text variant="label">AgentPal</Text>
              <Text variant="screenTitle">口袋工作台</Text>
            </Box>
            <Box
              minHeight={44}
              borderRadius="m"
              backgroundColor={hostOnline ? "successSoft" : "dangerSoft"}
              paddingHorizontal="m"
              flexDirection="row"
              alignItems="center"
              gap="s"
            >
              {hostOnline ? <Wifi color={theme.colors.success} size={18} /> : <WifiOff color={theme.colors.danger} size={18} />}
              <Text variant="caption" color={hostOnline ? "success" : "danger"}>
                {hostOnline ? "Host online" : relay.connectionState}
              </Text>
            </Box>
          </Box>

          <Box flexDirection="row" gap="s">
            {quickStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Box
                  key={stat.label}
                  flex={1}
                  minHeight={86}
                  backgroundColor="surface"
                  borderRadius="m"
                  borderWidth={1}
                  borderColor="line"
                  padding="m"
                  justifyContent="space-between"
                >
                  <Icon color={theme.colors.accent} size={20} />
                  <Box>
                    <Text variant="title">{stat.value}</Text>
                    <Text variant="caption">{stat.label}</Text>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Card muted>
            <Box gap="s">
              <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="m">
                <Text variant="section">Relay 连接</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Use USB relay address"
                  onPress={() => {
                    setRelayUrlDraft(usbRelayUrl);
                    setRelayUrl(usbRelayUrl);
                  }}
                >
                  <Box minHeight={36} justifyContent="center" paddingHorizontal="m" borderRadius="m" backgroundColor="accentSoft">
                    <Text variant="caption" color="accent">
                      USB
                    </Text>
                  </Box>
                </Pressable>
              </Box>
              <Box
                minHeight={48}
                borderRadius="m"
                borderWidth={1}
                borderColor="line"
                backgroundColor="surface"
                paddingHorizontal="m"
                justifyContent="center"
              >
                <TextInput
                  value={relayUrlDraft}
                  onChangeText={setRelayUrlDraft}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="ws://127.0.0.1:8790/ws"
                  placeholderTextColor={theme.colors.inkMuted}
                  style={{
                    color: theme.colors.ink,
                    fontSize: 14,
                    minHeight: 46
                  }}
                  onSubmitEditing={() => {
                    const next = normalizeRelayUrl(relayUrlDraft);
                    setRelayUrlDraft(next);
                    setRelayUrl(next);
                  }}
                />
              </Box>
              <Box flexDirection="row" gap="s">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reconnect relay"
                  onPress={() => {
                    const next = normalizeRelayUrl(relayUrlDraft);
                    setRelayUrlDraft(next);
                    setRelayUrl(next);
                  }}
                >
                  <Box minHeight={40} justifyContent="center" paddingHorizontal="m" borderRadius="m" backgroundColor="accent">
                    <Text variant="caption" color="white">
                      重连
                    </Text>
                  </Box>
                </Pressable>
                <Box flex={1} justifyContent="center">
                  <Text variant="caption">当前：{relay.relayUrl}</Text>
                </Box>
              </Box>
            </Box>
          </Card>

          <Box gap="s">
            <Text variant="section">当前会话</Text>
            {active ? (
              <SessionCard session={active} changedFiles={changedFiles} summary={latestSummary(relay.timeline.map((item) => item.event))} />
            ) : (
              <Card>
                <Box gap="s">
                  <Text variant="title">等待 Host 连接</Text>
                  <Text variant="body" color="inkMuted">
                    先启动本地 Relay 和 `agentpal-host codex connect`，App 会自动显示真实 Codex 会话。
                  </Text>
                  <Text variant="caption">{relay.relayUrl}</Text>
                </Box>
              </Card>
            )}
          </Box>

          <Card muted>
            <Box gap="s">
              <Text variant="section">快捷入口</Text>
              <Box flexDirection="row" gap="s">
                {["连接主机", "查看审批", "打开 Diff"].map((label) => (
                  <Box
                    key={label}
                    flex={1}
                    minHeight={44}
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor="surface"
                    borderRadius="m"
                    borderWidth={1}
                    borderColor="line"
                    paddingHorizontal="s"
                  >
                    <Text variant="caption" color="ink">
                      {label}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          </Card>

          <Box gap="s">
            <Text variant="section">会话流</Text>
            {feed.length > 0 ? (
              <Box height={Math.max(feed.length * 124, 124)}>
                <FlashList
                  data={feed}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <Box height={8} />}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <EventCard item={item} />}
                />
              </Box>
            ) : (
              <Card muted>
                <Box flexDirection="row" gap="m" alignItems="center">
                  <AlertCircle color={theme.colors.inkMuted} size={22} />
                  <Text variant="body" color="inkMuted" flex={1}>
                    暂无会话事件。发送一条指令后，这里会出现用户消息、Codex 状态和 Agent 回复。
                  </Text>
                </Box>
              </Card>
            )}
          </Box>

          {relay.lastError ? (
            <Text variant="caption" color="danger">
              {relay.lastError}
            </Text>
          ) : null}
          <InputBar disabled={!hostOnline} onSubmit={relay.submit} />
        </ScrollView>
      </Box>
    </ThemeProvider>
  );
}

type FeedItem = React.ComponentProps<typeof EventCard>["item"];

function eventToFeedItem(event: SessionEvent, createdAt: string): FeedItem {
  const id = `${createdAt}-${event.type}`;
  switch (event.type) {
    case "user-message":
      return {
        id,
        kind: "message",
        title: "你发出的指令",
        body: event.text,
        meta: timeLabel(createdAt),
        tone: "neutral",
        icon: Bot
      };
    case "agent-message":
      return {
        id,
        kind: "message",
        title: "Codex 回复",
        body: event.text,
        meta: timeLabel(createdAt),
        tone: "green",
        icon: Bot
      };
    case "state-changed":
      return {
        id,
        kind: "tool",
        title: stateTitle(event.state),
        body: stateBody(event.state),
        meta: timeLabel(createdAt),
        tone: stateTone(event.state),
        icon: stateIcon(event.state)
      };
    case "tool-started":
      return {
        id,
        kind: "tool",
        title: "工具开始",
        body: event.name,
        meta: timeLabel(createdAt),
        tone: "blue",
        icon: Code2
      };
    case "tool-finished":
      return {
        id,
        kind: "tool",
        title: event.ok ? "工具完成" : "工具失败",
        body: event.summary,
        meta: event.name,
        tone: event.ok ? "green" : "amber",
        icon: Code2
      };
    case "command-output":
      return {
        id,
        kind: "command",
        title: "命令输出",
        body: event.summary,
        meta: event.command,
        tone: "neutral",
        icon: TerminalSquare
      };
    case "diff-updated":
      return {
        id,
        kind: "diff",
        title: "Diff 摘要",
        body: diffBody(event.summary),
        meta: `+${event.summary.additions} / -${event.summary.deletions}`,
        tone: "blue",
        icon: GitPullRequestArrow
      };
    case "approval-requested":
      return {
        id,
        kind: "approval",
        title: "审批请求",
        body: "Codex 请求你处理一次操作审批。",
        meta: "pending",
        tone: "amber",
        icon: ShieldCheck
      };
    case "approval-resolved":
      return {
        id,
        kind: "approval",
        title: "审批已处理",
        body: event.approved ? "你已批准该操作。" : "你已拒绝该操作。",
        meta: event.approvalId,
        tone: event.approved ? "green" : "amber",
        icon: ShieldCheck
      };
    case "session-started":
      return {
        id,
        kind: "done",
        title: "会话已启动",
        body: event.summary.workspace,
        meta: event.summary.agentKind,
        tone: "green",
        icon: CheckCircle2
      };
    case "error":
      return {
        id,
        kind: "command",
        title: "运行错误",
        body: event.message,
        meta: event.phase ?? "error",
        tone: "amber",
        icon: AlertCircle
      };
  }
}

function latestChangedFiles(events: SessionEvent[]) {
  return events.find((event) => event.type === "diff-updated")?.summary.filesChanged ?? 0;
}

function latestSummary(events: SessionEvent[]) {
  const last = events.find((event) => event.type === "agent-message" || event.type === "state-changed");
  if (!last) {
    return undefined;
  }
  if (last.type === "agent-message") {
    return last.text;
  }
  return stateBody(last.state);
}

function stateTitle(state: SessionState) {
  switch (state) {
    case "running":
      return "Codex 正在运行";
    case "completed":
      return "任务完成";
    case "failed":
      return "任务失败";
    case "waiting-approval":
      return "等待审批";
    case "offline":
      return "Host 离线";
    case "thinking":
      return "Codex 思考中";
    case "idle":
    default:
      return "会话空闲";
  }
}

function stateBody(state: SessionState) {
  switch (state) {
    case "running":
      return "Host 已把手机端指令转发给真实 Codex app-server。";
    case "completed":
      return "Codex 已完成最近一次 turn。";
    case "failed":
      return "Codex 最近一次 turn 失败。";
    case "waiting-approval":
      return "需要你在手机端处理审批请求。";
    case "offline":
      return "本地 Host 或 Codex app-server 已断开。";
    case "thinking":
      return "Codex 正在读取上下文并生成下一步。";
    case "idle":
    default:
      return "连接已准备好，可以继续输入指令。";
  }
}

function stateTone(state: SessionState): FeedItem["tone"] {
  if (state === "waiting-approval") {
    return "amber";
  }
  if (state === "completed") {
    return "green";
  }
  if (state === "running" || state === "thinking") {
    return "blue";
  }
  return "neutral";
}

function stateIcon(state: SessionState) {
  if (state === "completed") {
    return CheckCircle2;
  }
  if (state === "waiting-approval") {
    return ShieldCheck;
  }
  if (state === "running" || state === "thinking") {
    return TerminalSquare;
  }
  return Clock3;
}

function diffBody(summary: DiffSummary) {
  return `${summary.filesChanged} 个文件发生变化，新增 ${summary.additions} 行，删除 ${summary.deletions} 行。`;
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "now";
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
