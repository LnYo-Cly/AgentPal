# AgentPal mobile sessions IA cleanup

## Task ID

`2026-06-07-agentpal-mobile-sessions-ia-cleanup-ddf847e4`

## 创建日期

2026-06-07

## 一句话结果

AgentPal 移动端底部三个入口的职责被重新收敛：待处理只显示需要用户关注的事项，会话页按项目浏览和恢复 session，设置页保留连接与偏好。

## 完成后能得到什么

用户打开手机后能明确区分“我现在需要处理什么”和“我要恢复哪个项目的哪个会话”。待处理页不再重复展示普通会话列表，会话页成为面向 Codex、Claude Code、OpenCode 的项目分组 session browser，减少 Host 卡片、指标卡和普通卡片堆砌。下一轮开发可以在这个结构上继续扩展审批详情、项目目录、worktree diff 和新建会话，而不需要再推翻底部导航的信息架构。

## 交付物

- 可见产物：`待处理 / 会话 / 设置` 三入口职责更清晰的 Expo 移动端 UI。
- 修改位置：`apps/mobile/app/index.tsx`；当前任务记录文件。
- 验证证据：`progress.md` 记录的 typecheck、Expo export、diff check 和 Harness check。

## 第一眼应该看什么

先读本任务 `progress.md` 的验证记录，再看 `apps/mobile/app/index.tsx` 中 `HomePage`、`SessionsPage`、`ProjectSessionGroupCard`、`BottomNav` 的 diff。

## 边界

- 范围内：移动端首页/待处理页、会话页、底部导航和相关小组件的布局、文案、视觉层级与空状态。
- 范围外：Host 协议、真实审批回传、项目目录和 diff 数据模型、iOS 原生 Liquid Glass/灵动岛原生能力、旧任务模板 warning。
- 停止条件：如果需要改 Relay/Host 协议、引入新的导航架构或重做多文件路由，必须先重新评估范围。

## 完成判断

- 待处理页不再展示普通“可继续会话”列表，也不再承担最近事件 dashboard。
- 会话页按项目/工作区组织 session，并能处理项目名为 `.`、未知路径等可读性问题。
- 搜索框和列表内容不会贴到 iOS 状态栏或被底部浮动导航遮住。
- 底部导航标签与页面职责一致，且仍可进入设置与会话详情。
- 相关类型检查和构建导出验证通过，证据已落盘。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

补齐任务合同后启动 lifecycle，随后重构 `apps/mobile/app/index.tsx` 的待处理页和会话页。
