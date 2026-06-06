# AgentPal mobile workspace session browser redesign

## Task ID

`2026-06-06-agentpal-mobile-workspace-session-browser-redesi-80719f34`

## 创建日期

2026-06-06

## 一句话结果

把 AgentPal 手机端的“会话”入口从单一会话详情改造成按项目/工作区分组的 session 浏览器，并把当前会话详情内的“项目”语义收敛为“文件”。

## 完成后能得到什么

用户在手机端会先看到一个接近 Codex 桌面端信息结构、但适合移动端的会话入口：项目/工作区作为 session 容器，每个项目下面列出最近会话、运行状态和可继续入口。当前会话详情仍负责聊天、项目文件浏览和 worktree/diff 查看，但分段命名改为 `聊天 / 文件 / 变更`，避免把“项目”同时表示 session 容器和文件树。下一轮可以在这个结构上继续接入新建会话、Claude Code、OpenCode、多 Host 和审批队列。

## 交付物

- 可见产物：移动端底部 `会话` 页面显示按项目/工作区分组的 session 浏览器；会话详情分段改为 `聊天 / 文件 / 变更`。
- 修改位置：`apps/mobile/app/index.tsx`；本任务 Harness 材料。
- 验证证据：TypeScript 检查、Expo export、Harness check、git diff 检查和提交记录。

## 第一眼应该看什么

先看 `apps/mobile/app/index.tsx` 中 `SessionsPage`、`ProjectSessionGroupCard`、`BottomNav`、`ConversationPanelTabs` 和 `ConversationPage` 的入口关系，再看 `progress.md` 中记录的验证命令。

## 边界

- 范围内：移动端信息架构、会话入口、项目/工作区分组展示、当前会话详情的分段命名与返回路径。
- 范围外：新增 Host 协议、新建真实 Codex session 的后端能力、全量搜索、Claude Code/OpenCode 协议接入、完整审批中心、重做视觉主题系统。
- 停止条件：需要改 Relay/Host 协议才能表达数据；或发现当前 session 数据缺少 workspace/session id 导致无法稳定分组。

## 完成判断

- 底部导航的 `会话` 进入 session 浏览页，而不是直接进入当前会话详情。
- session 浏览页以项目/工作区为一级容器，项目下展示该工作区的最近会话和状态。
- 当前会话详情保留聊天、文件树、变更视图，并把分段标签呈现为 `聊天 / 文件 / 变更`。
- 从会话浏览页进入任一会话后，返回按钮回到会话浏览页。
- TypeScript、Expo export 和 Harness check 通过或明确记录环境 blocker。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

修改 `apps/mobile/app/index.tsx` 的导航状态和会话页面组件，先实现项目分组 session 浏览器，再调整会话详情分段语义。
