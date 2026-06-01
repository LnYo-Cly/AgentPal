# AgentPal mobile three-tab conversation redesign

## Task ID

`2026-06-01-agentpal-mobile-three-tab-conversation-redesign-e4e15f3e`

## 创建日期

2026-06-01

## 一句话结果

AgentPal 移动端入口重构为首页、会话、设置三页，并让会话页直接成为当前 Agent Session 的聊天工作台。

## 完成后能得到什么

用户打开手机后不再看到重复的卡片式页面，而是按任务职责进入三个清晰区域：首页只展示当前 Host / Session 状态和关键入口；会话页直接进入当前 session 的消息流、工具 / Diff / 审批事件和输入区；设置页只处理 Relay、Host、通知和偏好。下一轮 agent 可以在这个结构上继续接入真实 session 切换面板、审批回传、slash command 和 skill/plugin 选择，而不需要重新拆分移动端信息架构。

## 交付物

- 可见产物：三页移动端 UI、会话详情页、移动输入栏、命令 chip、基础按钮反馈。
- 修改位置：`apps/mobile/app/index.tsx`、`apps/mobile/src/theme/index.ts`。
- 验证证据：`npm --prefix apps/mobile run typecheck`、`git diff --check`、`agent-browser` 390x844 移动视口检查、`harness status --json .`。

## 第一眼应该看什么

先看 `apps/mobile/app/index.tsx` 的 `HomePage`、`ConversationPage`、`SettingsPage` 和 `BottomNav`，确认三页职责边界；再看 `progress.md` 与 `review.md`，确认 typecheck、静态检查和移动视口交互检查证据。

## 边界

- 范围内：移动端首页 / 会话 / 设置的信息架构、视觉布局、基本交互反馈和任务包证据。
- 范围外：原生 iOS Dynamic Island、Android 类灵动岛、Relay 协议变更、真实审批回传、完整 session selector sheet。
- 停止条件：如果需要新增原生模块、改变 Relay 协议或引入新的 UI 库，先回到用户确认。

## 完成判断

- 底部导航只保留首页、会话、设置。
- 会话 tab 直接打开当前 session 详情，而不是会话列表。
- 首页、会话、设置各自承担不同工作，不再重复堆同类卡片。
- 输入栏、命令 chip、附件、语音和审批按钮都有可见交互反馈。
- typecheck、diff check、移动视口 smoke 和 harness status 均有证据记录。

## 执行合同

- Owner：coordinator
- 生命周期状态：审查中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

等待用户在手机上确认当前三页 UI 的视觉和手感；如确认通过，再进入 Human Review Confirmation。
