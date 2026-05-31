import { ChevronRight, FileDiff, ShieldCheck } from "lucide-react-native";

import { SessionSummary } from "@/lib/relay";
import { Box, Text, theme } from "@/theme";

import { AgentAvatar } from "./AgentAvatar";
import { Card } from "./Card";

type Props = {
  session: SessionSummary;
  changedFiles?: number;
  summary?: string;
};

export function SessionCard({ session, changedFiles = 0, summary }: Props) {
  const status = sessionStateToAvatar(session.state);

  return (
    <Card>
      <Box flexDirection="row" gap="l" alignItems="center">
        <AgentAvatar status={status} agent={agentLabel(session.agentKind)} />
        <Box flex={1} gap="s">
          <Box flexDirection="row" alignItems="center" gap="s">
            <Text variant="title" flex={1} numberOfLines={2}>
              {session.title ?? "AgentPal Codex 会话"}
            </Text>
            <ChevronRight color={theme.colors.inkMuted} size={22} />
          </Box>
          <Text variant="caption" numberOfLines={1}>
            {session.workspace}
          </Text>
          <Text variant="body" color="inkMuted">
            {summary ?? stateSummary(session.state)}
          </Text>
          <Box flexDirection="row" gap="s" marginTop="xs">
            <Box
              minHeight={36}
              borderRadius="m"
              backgroundColor="cobaltSoft"
              paddingHorizontal="m"
              flexDirection="row"
              alignItems="center"
              gap="xs"
            >
              <FileDiff color={theme.colors.cobalt} size={16} />
              <Text variant="caption" color="cobalt">
                {changedFiles} files
              </Text>
            </Box>
            <Box
              minHeight={36}
              borderRadius="m"
              backgroundColor={session.pendingApprovals > 0 ? "amberSoft" : "successSoft"}
              paddingHorizontal="m"
              flexDirection="row"
              alignItems="center"
              gap="xs"
            >
              <ShieldCheck color={session.pendingApprovals > 0 ? theme.colors.amber : theme.colors.success} size={16} />
              <Text variant="caption" color={session.pendingApprovals > 0 ? "amber" : "success"}>
                {session.pendingApprovals} approvals
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Card>
  );
}

function agentLabel(kind: SessionSummary["agentKind"]) {
  if (kind === "codex") {
    return "Codex";
  }
  if (kind === "claude-code") {
    return "Claude";
  }
  return kind;
}

function sessionStateToAvatar(state: SessionSummary["state"]) {
  switch (state) {
    case "running":
    case "thinking":
      return "running";
    case "waiting-approval":
      return "approval";
    case "completed":
      return "complete";
    case "failed":
      return "failed";
    case "offline":
      return "offline";
    case "idle":
    default:
      return "idle";
  }
}

function stateSummary(state: SessionSummary["state"]) {
  switch (state) {
    case "running":
      return "Codex 正在执行手机端发来的指令。";
    case "thinking":
      return "Codex 正在分析上下文。";
    case "waiting-approval":
      return "等待你处理审批请求。";
    case "completed":
      return "最近一次任务已完成。";
    case "failed":
      return "最近一次任务失败，请查看会话流。";
    case "offline":
      return "Host 或 Codex 会话已离线。";
    case "idle":
    default:
      return "会话已连接，等待你的下一条指令。";
  }
}
