import { Bot, CheckCircle2, Clock3, Code2, GitPullRequestArrow, ShieldCheck, TerminalSquare } from "lucide-react-native";

export type SessionStatus = "running" | "approval" | "complete";

export type Session = {
  id: string;
  agent: "Codex" | "Claude";
  title: string;
  workspace: string;
  status: SessionStatus;
  summary: string;
  changedFiles: number;
  approvals: number;
};

export type FeedItem = {
  id: string;
  kind: "message" | "tool" | "command" | "diff" | "approval" | "done";
  title: string;
  body: string;
  meta: string;
  tone: "neutral" | "blue" | "amber" | "green";
  icon: typeof Bot;
};

export const sessions: Session[] = [
  {
    id: "codex-main",
    agent: "Codex",
    title: "修复移动端审批流",
    workspace: "G:/My_Project/python/gitlab/pocket_agent",
    status: "approval",
    summary: "等待确认 3 个文件的 diff，测试尚未继续运行。",
    changedFiles: 3,
    approvals: 1
  },
  {
    id: "claude-docs",
    agent: "Claude",
    title: "整理 Relay 协议说明",
    workspace: "~/work/agentpal-docs",
    status: "running",
    summary: "正在读取协议草案和历史会话记录。",
    changedFiles: 1,
    approvals: 0
  }
];

export const feed: FeedItem[] = [
  {
    id: "approval",
    kind: "approval",
    title: "文件修改需要审批",
    body: "Codex 想更新 Host probe 和协议 DTO。涉及 Rust crate 与移动端类型边界。",
    meta: "1 项待处理",
    tone: "amber",
    icon: ShieldCheck
  },
  {
    id: "diff",
    kind: "diff",
    title: "Diff 摘要",
    body: "新增 6 个文件，修改 2 个文件。主要变化集中在 crates/host 与 apps/mobile。",
    meta: "+428 / -12",
    tone: "blue",
    icon: GitPullRequestArrow
  },
  {
    id: "command",
    kind: "command",
    title: "命令执行",
    body: "cargo check --workspace 正在排队，Relay health check 待执行。",
    meta: "running",
    tone: "neutral",
    icon: TerminalSquare
  },
  {
    id: "tool",
    kind: "tool",
    title: "工具调用",
    body: "Codex app-server schema 已读取，用于确认 initialize、thread/start 和 picker 能力。",
    meta: "structured",
    tone: "green",
    icon: Code2
  },
  {
    id: "done",
    kind: "done",
    title: "最近完成",
    body: "AgentPal 技术栈和 Host session 模型已沉淀到 harness SSoT。",
    meta: "done",
    tone: "green",
    icon: CheckCircle2
  }
];

export const quickStats = [
  { label: "在线 Host", value: "1", icon: Clock3 },
  { label: "活跃会话", value: "2", icon: Bot },
  { label: "待审批", value: "1", icon: ShieldCheck }
];
