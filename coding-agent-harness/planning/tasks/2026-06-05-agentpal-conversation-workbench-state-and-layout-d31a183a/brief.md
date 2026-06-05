# AgentPal conversation workbench state and layout repair

## Task ID

`2026-06-05-agentpal-conversation-workbench-state-and-layout-d31a183a`

## 创建日期

2026-06-05

## 一句话结果

会话页的聊天、项目目录和 worktree 变更面板能展示最新状态，并避免底部输入框遮挡和重复刷新入口。

## 完成后能得到什么

用户在手机端进入当前 Codex 会话后，可以在同一会话工作台里切换聊天、项目和变更视图。项目和变更视图会在进入时主动刷新 workspace snapshot，显示可读的 Windows 路径、目录摘要、干净或有变更的 worktree 状态，并为底部输入区保留空间。下一轮开发可以在此基础上继续做完整 diff viewer、文件详情和更深层目录导航。

## 交付物

- 可见产物：会话页项目/变更面板、会话选择器和 workspace snapshot 刷新行为。
- 修改位置：`apps/mobile/app/index.tsx`
- 验证证据：`progress.md` 中记录的 TypeScript、Expo iOS export 和 diff check。

## 第一眼应该看什么

先读 `progress.md` 的 `[2026-06-06 00:01]` 证据，再读 `apps/mobile/app/index.tsx` 的 `ConversationPage`、`WorkspacePanel`、`WorktreeChangesPanel` 和 `SessionPickerSheet`。

## 边界

- 范围内：会话页 workspace snapshot 刷新、项目/变更布局、路径显示、底部遮挡、会话选择器密度、任务证据文档。
- 范围外：完整 diff patch viewer、文件详情、项目目录钻取、新 Host 协议字段、原生通知和灵动岛。
- 停止条件：如果需要改变 Host/Relay 协议或新增 native Expo module，先回到 coordinator 或用户确认。

## 完成判断

1. 项目/变更页进入或 App 回前台时会请求最新 workspace snapshot。
2. 顶部只保留一个上下文相关刷新入口，tab 内不再重复放刷新按钮。
3. 项目/变更内容不会被底部输入框遮挡。
4. Git 干净和 dirty worktree 有不同呈现，不继续展示旧 dirty 卡片。
5. TypeScript、Expo iOS export 和 diff check 通过。

## 执行合同

- Owner：coordinator
- 生命周期状态：审查中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

等待用户在手机端复核会话、项目、变更和会话选择器交互；如通过，由用户执行人工确认。
