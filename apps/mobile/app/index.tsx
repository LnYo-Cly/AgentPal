import React from "react";
import { Image, ImageBackground, Pressable, ScrollView, View } from "react-native";
import { ThemeProvider } from "@shopify/restyle";
import { ArrowRight, ChevronRight, Layers3, Pause, Play, Plus, Search } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { useAgentPalRelay } from "@/hooks/useAgentPalRelay";
import { SessionSummary } from "@/lib/relay";
import { uiAssets } from "@/lib/uiAssets";
import { Box, Text, theme } from "@/theme";

const demoSessions: SessionSummary[] = [
  {
    sessionId: "demo-codex",
    agentKind: "codex",
    workspace: "G:/My_Project/python/gitlab/pocket_agent",
    title: "修复移动端审批流",
    state: "running",
    pendingApprovals: 1,
    updatedAt: new Date().toISOString()
  },
  {
    sessionId: "demo-claude",
    agentKind: "claude-code",
    workspace: "G:/My_Project/python/gitlab/pocket_agent",
    title: "重构 Relay 协议说明",
    state: "waiting-approval",
    pendingApprovals: 1,
    updatedAt: new Date().toISOString()
  },
  {
    sessionId: "demo-opencode",
    agentKind: "open-code",
    workspace: "G:/My_Project/python/gitlab/pocket_agent",
    title: "整理 README 和入口文档",
    state: "idle",
    pendingApprovals: 0,
    updatedAt: new Date().toISOString()
  }
];

type SessionTone = "amber" | "blue" | "green" | "danger" | "neutral";
type ThemeColorName = keyof typeof theme.colors;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const relay = useAgentPalRelay();
  const hostOnline = relay.connectionState === "online" && !!relay.activeHost?.online;
  const sessions = relay.sessions.length > 0 ? relay.sessions.slice(0, 3) : demoSessions;
  const pendingApprovals = Math.max(relay.sessions.reduce((sum, item) => sum + item.pendingApprovals, 0), relay.sessions.length ? 0 : 2);

  return (
    <ThemeProvider theme={theme}>
      <Box flex={1} backgroundColor="canvas">
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 124 }}>
          <Box style={{ paddingTop: insets.top + 8 }} paddingHorizontal="l">
            <Box flexDirection="row" alignItems="flex-start" justifyContent="space-between" marginBottom="m">
              <Box flex={1} paddingRight="m">
                <Text variant="screenTitle" color="white">
                  早上好，训练师！
                </Text>
                <Text variant="body" color="white">
                  今天也和你的伙伴一起推进任务吧
                </Text>
              </Box>
              <Box flexDirection="row" gap="s">
                <CircleAction icon={<Search color={theme.colors.cobalt} size={20} />} />
                <CircleAction icon={<Plus color={theme.colors.cobalt} size={20} />} />
              </Box>
            </Box>

            <Box alignItems="center" marginBottom="m">
              <DynamicIsland online={hostOnline} />
            </Box>

            <Box
              minHeight={486}
              borderRadius="l"
              overflow="hidden"
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 30,
                shadowOffset: { width: 0, height: 18 }
              }}
            >
              <ImageBackground source={uiAssets.heroBackground} resizeMode="cover" style={{ flex: 1 }}>
                <Box flex={1} padding="l" justifyContent="space-between">
                  <Box flexDirection="row" justifyContent="space-between" alignItems="flex-start">
                    <HeroBubble
                      title={relay.activeHost?.name ?? "云绒"}
                      status={hostOnline ? "在线" : "离线"}
                      body={hostOnline ? "专注模式已开启\n准备协助你完成任务！" : "正在等待本地 Host 连接"}
                    />
                    <Box alignItems="center" justifyContent="center" width={54} height={54} borderRadius="round" backgroundColor="white" style={{ shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } }}>
                      <Image source={uiAssets.companionOnline} style={{ width: 36, height: 36 }} />
                    </Box>
                  </Box>

                  <Box alignItems="center" marginTop="xl" marginBottom="s">
                    <Image source={uiAssets.heroMascot} style={{ width: 300, height: 340, resizeMode: "contain" }} />
                  </Box>

                  <Box alignItems="flex-end">
                    <Pressable accessibilityRole="button">
                      <Box flexDirection="row" alignItems="center" gap="s" paddingHorizontal="l" paddingVertical="m" borderRadius="round" backgroundColor="white" style={{ opacity: 0.92 }}>
                        <Text variant="section">进入口袋</Text>
                        <ArrowRight color={theme.colors.ink} size={18} />
                      </Box>
                    </Pressable>
                  </Box>
                </Box>
              </ImageBackground>
            </Box>

            <Box marginTop="l">
              <Card>
                <Box flexDirection="row" alignItems="center" justifyContent="space-between" marginBottom="m">
                  <Box flexDirection="row" alignItems="center" gap="s">
                    <Layers3 color={theme.colors.cobalt} size={18} />
                    <Text variant="section">活跃会话</Text>
                    <CountPill value={String(sessions.length)} />
                  </Box>
                  <Box flexDirection="row" alignItems="center" gap="xs">
                    <Text variant="caption">全部</Text>
                    <ChevronRight color={theme.colors.inkMuted} size={18} />
                  </Box>
                </Box>

                <Box gap="s">
                  {sessions.map((session) => (
                    <SessionRow key={session.sessionId} session={session} />
                  ))}
                </Box>

                <Box alignItems="center" marginTop="m">
                  <Text variant="caption">上次同步：1 分钟前</Text>
                </Box>
              </Card>
            </Box>

            <Box marginTop="l">
              <Text variant="section" marginBottom="s">
                快捷操作
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
                <ShortcutTile label="待审批" image={uiAssets.shortcutApproval} badge={pendingApprovals > 0 ? String(pendingApprovals) : undefined} />
                <ShortcutTile label="查看 Diff" image={uiAssets.shortcutDiff} />
                <ShortcutTile label="终端" image={uiAssets.shortcutTerminal} />
                <ShortcutTile label="主机" image={uiAssets.shortcutHost} active={hostOnline} />
                <ShortcutTile label="语音输入" image={uiAssets.shortcutVoice} />
              </ScrollView>
            </Box>

            <Box marginTop="l">
              <Box flexDirection="row" alignItems="center" justifyContent="space-between" marginBottom="s">
                <Text variant="section">我的伙伴（5/12）</Text>
                <Box flexDirection="row" alignItems="center" gap="xs">
                  <Text variant="caption">管理</Text>
                  <ChevronRight color={theme.colors.inkMuted} size={18} />
                </Box>
              </Box>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                <CompanionTile label="滴滴" status="在线" image={uiAssets.companionOnline} active />
                <CompanionTile label="星绒" status="专注" image={uiAssets.companionFocus} />
                <CompanionTile label="焰焰" status="运行中" image={uiAssets.companionRunning} />
                <CompanionTile label="芽芽" status="空闲" image={uiAssets.companionIdle} />
                <CompanionTile label="影影" status="离线" image={uiAssets.companionOffline} />
              </ScrollView>
            </Box>
          </Box>
        </ScrollView>

        <Box
          position="absolute"
          left={16}
          right={16}
          bottom={insets.bottom + 12}
          backgroundColor="surface"
          borderWidth={1}
          borderColor="line"
          borderRadius="l"
          paddingVertical="s"
          paddingHorizontal="xs"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.09,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 10 }
          }}
        >
          <Box flexDirection="row" justifyContent="space-between" alignItems="center">
            <NavTile label="口袋" image={uiAssets.navPocket} active />
            <NavTile label="会话" image={uiAssets.navSessions} />
            <NavTile label="伙伴" image={uiAssets.navCompanions} />
            <NavTile label="探索" image={uiAssets.navExplore} />
            <NavTile label="我的" image={uiAssets.navProfile} />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

function DynamicIsland({ online }: { online: boolean }) {
  return (
    <Box
      width={240}
      height={46}
      borderRadius="round"
      style={{ backgroundColor: "#000000" }}
      flexDirection="row"
      alignItems="center"
      paddingHorizontal="m"
      justifyContent="space-between"
    >
      <Image source={uiAssets.companionOnline} style={{ width: 30, height: 30 }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        {[8, 14, 6, 18, 9, 24, 11, 30].map((height, index) => (
          <View
            key={index}
            style={{
              width: 4,
              height,
              borderRadius: 999,
              backgroundColor: online ? "#8C6CFF" : "#4A5A6F",
              opacity: index % 2 === 0 ? 0.9 : 0.7
            }}
          />
        ))}
      </View>
    </Box>
  );
}

function HeroBubble({ title, status, body }: { title: string; status: string; body: string }) {
  return (
    <Box
      maxWidth={184}
      backgroundColor="surface"
      borderRadius="l"
      padding="m"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 }
      }}
    >
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" marginBottom="xs">
        <Text variant="section" color="cobalt">
          {title}
        </Text>
        <StatusPill label={status} tone={status === "在线" ? "green" : "neutral"} />
      </Box>
      <Text variant="body" color="ink">
        {body}
      </Text>
    </Box>
  );
}

function SessionRow({ session }: { session: SessionSummary }) {
  const image = sessionImage(session.agentKind);
  const tone: SessionTone =
    session.state === "waiting-approval"
      ? "amber"
      : session.state === "running" || session.state === "thinking"
        ? "blue"
        : session.state === "completed"
          ? "green"
          : session.state === "failed"
            ? "danger"
            : "neutral";
  const actionIcon = session.state === "waiting-approval" ? <Pause color={theme.colors.amber} size={18} /> : <Play color={toneIconColor(tone)} size={18} />;
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="m"
      backgroundColor="surface"
      borderRadius="m"
      borderWidth={1}
      borderColor="line"
      padding="m"
    >
      <Image source={image} style={{ width: 76, height: 76, borderRadius: 18 }} />

      <Box flex={1} gap="xs">
        <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s">
          <Text variant="title" numberOfLines={1} flex={1}>
            {sessionTitle(session.agentKind)}
          </Text>
          <StatusPill label={sessionStateLabel(session.state)} tone={tone} />
        </Box>

        <Text variant="caption" numberOfLines={1}>
          {session.workspace}
        </Text>
        <Text variant="body" color="inkMuted" numberOfLines={2}>
          {sessionSummary(session)}
        </Text>

        <Box flexDirection="row" alignItems="center" gap="s" marginTop="xs">
          <Box flex={1} height={7} borderRadius="round" backgroundColor="surfaceMuted" overflow="hidden">
            <Box style={{ width: `${sessionProgress(session.state)}%`, height: 7, borderRadius: 999, backgroundColor: toneFill(tone) }} />
          </Box>
          <Text variant="caption" color={toneToken(tone)}>
            {sessionProgress(session.state)}%
          </Text>
        </Box>
      </Box>

      <Pressable accessibilityRole="button">
        <Box width={44} height={44} borderRadius="round" backgroundColor={buttonToneBackground(tone)} alignItems="center" justifyContent="center">
          {actionIcon}
        </Box>
      </Pressable>
    </Box>
  );
}

function ShortcutTile({
  label,
  image,
  badge,
  active = true
}: {
  label: string;
  image: number;
  badge?: string;
  active?: boolean;
}) {
  return (
    <Pressable style={{ width: 96 }} accessibilityRole="button">
      <Box
        minHeight={104}
        backgroundColor="surface"
        borderRadius="m"
        borderWidth={1}
        borderColor={active ? "line" : "surfaceMuted"}
        alignItems="center"
        justifyContent="center"
        padding="s"
      >
        <Box position="absolute" right={8} top={8} opacity={badge ? 1 : 0}>
          <CountPill value={badge ?? ""} />
        </Box>
        <Image source={image} style={{ width: 54, height: 54, opacity: active ? 1 : 0.45 }} />
        <Text variant="caption" color={active ? "ink" : "inkMuted"} marginTop="xs">
          {label}
        </Text>
      </Box>
    </Pressable>
  );
}

function CompanionTile({ label, status, image, active = false }: { label: string; status: string; image: number; active?: boolean }) {
  return (
    <Pressable style={{ width: 124 }} accessibilityRole="button">
      <Box
        backgroundColor={active ? "surface" : "surfaceMuted"}
        borderWidth={1}
        borderColor={active ? "cobalt" : "line"}
        borderRadius="m"
        padding="s"
        alignItems="center"
      >
        <Image source={image} style={{ width: 92, height: 92 }} />
        <Text variant="caption" color="ink" marginTop="xs">
          {label}
        </Text>
        <Text variant="label" color={statusColor(status)}>
          {status}
        </Text>
      </Box>
    </Pressable>
  );
}

function NavTile({ label, image, active = false }: { label: string; image: number; active?: boolean }) {
  return (
    <Pressable style={{ flex: 1 }} accessibilityRole="button">
      <Box alignItems="center" gap="xs">
        <Image source={image} style={{ width: 28, height: 28, opacity: active ? 1 : 0.36 }} />
        <Text variant="caption" color={active ? "cobalt" : "inkMuted"}>
          {label}
        </Text>
      </Box>
    </Pressable>
  );
}

function CircleAction({ icon }: { icon: React.ReactNode }) {
  return (
    <Box width={46} height={46} borderRadius="round" backgroundColor="surface" alignItems="center" justifyContent="center" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
      {icon}
    </Box>
  );
}

function CountPill({ value }: { value: string }) {
  if (!value) {
    return null;
  }
  return (
    <Box minWidth={24} height={24} paddingHorizontal="xs" borderRadius="round" backgroundColor="surfaceMuted" alignItems="center" justifyContent="center">
      <Text variant="caption">{value}</Text>
    </Box>
  );
}

function StatusPill({ label, tone }: { label: string; tone: SessionTone }) {
  const backgroundColor =
    tone === "green"
      ? "successSoft"
      : tone === "amber"
        ? "amberSoft"
        : tone === "blue"
          ? "cobaltSoft"
          : tone === "danger"
            ? "dangerSoft"
            : "surfaceMuted";
  const color =
    tone === "green"
      ? "success"
      : tone === "amber"
        ? "amber"
        : tone === "blue"
          ? "cobalt"
          : tone === "danger"
            ? "danger"
            : "inkMuted";
  return (
      <Box flexDirection="row" alignItems="center" gap="xs" paddingHorizontal="s" paddingVertical="xs" borderRadius="round" backgroundColor={backgroundColor}>
      <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: theme.colors[color] }} />
      <Text variant="caption" color={color}>
        {label}
      </Text>
    </Box>
  );
}

function sessionImage(kind: SessionSummary["agentKind"]) {
  if (kind === "claude-code") return uiAssets.sessionClaude;
  if (kind === "open-code") return uiAssets.sessionOpenCode;
  return uiAssets.sessionCodex;
}

function sessionTitle(kind: SessionSummary["agentKind"]) {
  if (kind === "claude-code") return "Claude Code";
  if (kind === "open-code") return "OpenCode";
  return "Codex CLI";
}

function sessionStateLabel(state: SessionSummary["state"]) {
  if (state === "waiting-approval") return "等待审批";
  if (state === "running") return "运行中";
  if (state === "thinking") return "思考中";
  if (state === "completed") return "完成";
  if (state === "failed") return "失败";
  if (state === "offline") return "离线";
  return "空闲中";
}

function sessionSummary(session: SessionSummary) {
  if (session.title) return session.title;
  if (session.state === "waiting-approval") return "正在等待你批准当前变更";
  if (session.state === "running") return "正在执行命令和工具调用";
  if (session.state === "thinking") return "正在读取上下文并生成下一步";
  if (session.state === "completed") return "最近一次任务已经完成";
  if (session.state === "failed") return "最近一次运行遇到错误";
  if (session.state === "offline") return "会话已断开，等待 Host 恢复连接";
  return "准备好继续接收你的指令";
}

function sessionProgress(state: SessionSummary["state"]) {
  if (state === "waiting-approval") return 72;
  if (state === "running") return 68;
  if (state === "thinking") return 42;
  if (state === "completed") return 100;
  if (state === "failed") return 24;
  if (state === "offline") return 0;
  return 16;
}

function toneFill(tone: SessionTone) {
  if (tone === "amber") return theme.colors.amber;
  if (tone === "green") return theme.colors.success;
  if (tone === "danger") return theme.colors.danger;
  if (tone === "neutral") return theme.colors.line;
  return theme.colors.cobalt;
}

function toneToken(tone: SessionTone): ThemeColorName {
  if (tone === "amber") return "amber";
  if (tone === "green") return "success";
  if (tone === "danger") return "danger";
  if (tone === "neutral") return "inkMuted";
  return "cobalt";
}

function toneIconColor(tone: SessionTone) {
  if (tone === "amber") return theme.colors.amber;
  if (tone === "green") return theme.colors.success;
  if (tone === "danger") return theme.colors.danger;
  if (tone === "neutral") return theme.colors.inkMuted;
  return theme.colors.white;
}

function buttonToneBackground(tone: SessionTone): ThemeColorName {
  if (tone === "amber") return "amberSoft";
  if (tone === "green") return "successSoft";
  if (tone === "danger") return "dangerSoft";
  if (tone === "neutral") return "surfaceMuted";
  return "cobalt";
}

function statusColor(status: string) {
  if (status === "在线") return "success";
  if (status === "运行中") return "cobalt";
  if (status === "专注") return "amber";
  return "inkMuted";
}
