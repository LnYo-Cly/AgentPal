# AgentPal mobile session IA follow-up polish

## Task ID

`2026-06-07-agentpal-mobile-session-ia-follow-up-polish-0fef8c3e`

## 创建日期

2026-06-07

## 一句话结果

移动端会话页的信息架构 follow-up 已完成：新建 Codex 会话入口脱离项目分组，项目路径与状态文案在移动宽度下更清晰。

## 完成后能得到什么

用户重新打开移动端会话页后，可以先看到独立的“新建 Codex 会话”操作，再按真实项目进入已有会话。`pocket_agent` 和 `pocket_agent\.` 这类同一工作区不会被拆成两个项目；普通空闲会话不再在右侧显示“就绪”，当前会话只保留必要的“当前”标记；路径压缩为移动端可读的 `G:\...\pocket_agent` 形式。Web 导出已用于截图级自检，原生 iOS bundle 导出也已通过。

## 交付物

- 可见产物：会话页项目列表、新建会话入口、空闲会话状态、移动端路径展示和设置按钮视觉状态更新。
- 修改位置：`apps/mobile/app/index.tsx`，commit `e2b22d0`。
- 验证证据：`progress.md`、`review.md`、`artifacts/INDEX.md`，以及 `tmp/web-home-ui-polish-followup-cdp.png`、`tmp/web-sessions-ui-polish-followup-cdp.png`。

## 第一眼应该看什么

先看 `tmp/web-sessions-ui-polish-followup-cdp.png` 和 `progress.md` 的 2026-06-07 20:15 记录，再看 `review.md` 的 Evidence Checked。代码入口是 `apps/mobile/app/index.tsx` 中 `SessionsPage`、`ProjectSessionRow`、工作区路径 helper 和 `SettingsButton`。

## 边界

- 范围内：移动端首页/会话页的 UI 信息架构 follow-up、web 自验证兼容修复、任务证据记录。
- 范围外：Relay/Host 协议、会话详情页业务逻辑、后端连接策略、真机 Expo Go 网络排障。
- 停止条件：web 页面无法渲染、原生导出失败、或需要扩大到后端/协议层时暂停并回到用户确认。

## 完成判断

- 会话页只显示 1 个 `pocket_agent` 项目，不再出现 `当前项目` 的重复项目。
- “新建 Codex 会话”显示为项目列表上方的独立操作卡。
- 普通 idle 会话行右侧不显示 `就绪`，当前选中行仅保留轻量 `当前` 标记。
- web 导出页面不再白屏，并生成首页/会话页截图。
- TypeScript、web export、iOS export 和 `git diff --check` 均通过。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中，待 Agent Review Submission
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

提交审查材料包，等待 Human Review Confirmation。
