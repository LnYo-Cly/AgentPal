# AgentPal mobile sessions and conversation layout correction

## Task ID

`2026-06-06-agentpal-mobile-sessions-and-conversation-layout-5c9c8fe4`

## 创建日期

2026-06-06

## 一句话结果

AgentPal mobile 的会话索引和会话详情页不再堆叠重复卡片，而是按远程 coding agent 的真实工作流展示：工作台处理阻塞、会话页按项目管理 session、详情页在聊天 / 项目 / 变更之间清晰切换。

## 完成后能得到什么

用户能在手机端更接近 Codex 桌面端的心智模型：先选择 Host 和项目，再恢复对应 session；进入会话后，聊天、项目文件、worktree 变更是同一会话的三个上下文面板，而不是互相挤压的卡片。下一轮 agent 可以继续在这个结构上接入 Claude Code / OpenCode、真实 diff 详情和更完整的项目目录浏览，不需要再推倒当前页面分工。

## 交付物

- 可见产物：移动端工作台、会话索引、会话详情的布局修正。
- 修改位置：`apps/mobile/app/index.tsx`；本任务 Harness 记录。
- 验证证据：TypeScript 检查、Expo iOS export、Harness check、git diff check。

## 第一眼应该看什么

先看 `apps/mobile/app/index.tsx` 的 `SessionsPage`、`ConversationPage`、`ConversationHeader`、`ProjectTreePanel` 和 `WorktreeChangesPanel`；再看 `progress.md` 里的验证命令。

## 边界

- 范围内：会话索引的信息层级、会话详情的面板切换、项目 / 变更面板的移动端布局、底部输入框遮挡修正、任务记录和验证。
- 范围外：新的后端协议、真实 diff 行级预览、Claude Code / OpenCode 接入、原生动态岛或 Liquid Glass 能力、重新设计 Markdown 渲染器。
- 停止条件：发现需要改 Relay / Host 协议或引入原生模块时先暂停，不在本任务里扩大范围。

## 完成判断

- 会话页以项目分组展示 sessions，不再把 Host 状态、统计卡和项目卡混在一屏。
- 会话详情页的聊天 / 项目 / 变更切换被收进详情上下文，不能再占用一条笨重的悬浮分段栏。
- 项目和变更面板底部留出输入框安全空间，列表内容可滚动到底。
- 相关静态检查通过，Harness 任务记录有证据。

## 执行合同

- Owner：coordinator
- 生命周期状态：未开始
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

读取当前 `apps/mobile/app/index.tsx` 的会话索引和会话详情组件，按确认的 IA 改版。
