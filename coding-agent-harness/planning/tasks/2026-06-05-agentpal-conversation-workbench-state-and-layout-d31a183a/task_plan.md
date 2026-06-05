# AgentPal conversation workbench state and layout repair

Task Contract: harness-task/v1
Task Package Index: required

## 目标

修复 AgentPal 会话工作台中聊天、项目目录和 worktree 变更视图的状态刷新、布局密度和底部遮挡问题，让手机端看到可信的当前会话工作区状态。

## 范围

- 做什么：改造 `apps/mobile/app/index.tsx` 中会话页的 workspace snapshot 获取策略、项目/变更面板呈现、路径显示、底部 inset 和会话选择器布局，并记录 Harness 证据。
- 不做什么：不实现完整文件内容查看、patch diff viewer、Host/Relay 协议扩展、原生通知或新 Agent 类型接入。
- 主要风险：真机滚动手感和视觉密度需要用户手机复核；workspace snapshot 仍依赖 Host 返回数据。

## 预算选择

选择预算：standard

选择理由：单一移动端入口文件内的中等 UI/state 修复，涉及验证与 Harness 收口，但不需要跨服务协议变更。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/app/index.tsx | 会话页、项目/变更面板、会话选择器和 markdown/code block UI 的实现入口。 | coordinator |
| C-002 | code | TARGET:apps/mobile/src/lib/relay.ts | workspace snapshot、worktree summary 和 session event 类型定义。 | coordinator |
| C-003 | private-plan | TARGET:coding-agent-harness/planning/tasks/2026-06-05-agentpal-conversation-workbench-state-and-layout-d31a183a/progress.md | 记录本任务验证证据。 | coordinator |

## 步骤

1. 读取当前会话页实现，确认 workspace snapshot、history loading、panel tabs、bottom composer 的数据和布局边界。
2. 实现 workspace snapshot 自动刷新、统一刷新入口、路径展示清理、项目/变更面板底部安全空间和 clean/dirty worktree 分流。
3. 压缩会话选择器为更密集的 session list。
4. 运行 TypeScript、Expo iOS export 和 diff check。
5. 更新 Harness progress/review 并提交代码，进入用户真机复核。

## 验收标准

- [x] 进入项目/变更视图或 App 回前台会触发最新 workspace snapshot 请求，并带节流避免重复请求。
- [x] 会话页只保留顶部刷新入口，刷新语义随聊天/项目/变更上下文切换。
- [x] 项目/变更页面使用可读 Windows 路径，并增加底部安全空间。
- [x] Git clean 与 dirty worktree 分开展示。
- [x] TypeScript、Expo iOS export 和 diff check 通过。

## 工作树（Worktree）

- 路径：当前 checkout `G:\My_Project\python\gitlab\pocket_agent`
- 分支：`master`
- Worker owner：coordinator
- Worker handoff commit required：不适用
- Coordinator integration branch：`master`
- 未使用 worktree 的原因：单文件集中修复，未使用 worker subagent。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：需要新增 native module 或改变 Host/Relay 协议时必须停下确认。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self，随后用户真机复核
- No-finding 要求：self review 无 P0/P1/P2 阻塞发现。

## 关联

- 相关 Regression Gate：无
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：无

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：不适用
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：由 Harness CLI 重建或同步
- Closeout / Regression update needed：用户真机确认后更新 walkthrough/closeout
