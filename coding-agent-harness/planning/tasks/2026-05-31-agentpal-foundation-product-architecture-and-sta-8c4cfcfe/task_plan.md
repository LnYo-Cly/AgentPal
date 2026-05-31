# AgentPal foundation product architecture and stack SSoT

Task Contract: harness-task/v1
Task Package Index: required

## 目标

把 AgentPal 的需求、产品边界、固定技术栈、架构模型和移动端交互原则写入 harness SSoT，作为后续建仓和实现的唯一初始上下文。

## 范围

- 做什么：新增和更新 `coding-agent-harness/context/product`、`context/architecture`、`context/integrations` 下的 AgentPal 产品与架构文档；更新本任务包的计划、进度、审查和收口记录。
- 不做什么：不实现 App/Host/Relay 代码；不提交 `ui/` 原型图；不改变已经确认的固定技术路线；不代替人工 review confirmation。
- 主要风险：如果 SSoT 只写抽象愿景，后续 agent 会重复讨论选型；如果遗漏移动端审批、Diff、session、picker 等关键决策，后续实现会偏向终端镜像或普通聊天 App。

## 预算选择

选择预算：standard

选择理由：本任务是多文档产品与架构沉淀，涉及 review、evidence 和 lesson routing，但不需要复杂 artifact 或多 worktree worker。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | private-plan | conversation:AgentPal requirements and stack discussion | 用户已经确认产品目标、iOS/Android、固定选型、UI 原型工作流、WebSocket 可靠性、session 模型和 `/` `$` 交互。 | coordinator / reviewer |
| C-002 | code | TARGET:coding-agent-harness/context | SSoT 写入位置。 | coordinator / reviewer |
| C-003 | code | TARGET:coding-agent-harness/planning/tasks/2026-05-31-agentpal-foundation-product-architecture-and-sta-8c4cfcfe | 当前任务包、证据与收口记录。 | coordinator / reviewer |

## 步骤

1. 读取当前 harness 结构和任务包，确认 v2 manifest 任务路径。
2. 将产品定位、MVP、UX、固定技术栈、实时同步、Host/session 和 adapter contract 写入 SSoT。
3. 补齐任务包中的 plan、progress、findings、review、lesson 和 walkthrough。
4. 运行 `harness status --json .` 验证 harness 结构。
5. 提交本轮文档沉淀。

## 验收标准

- [x] AgentPal 产品定位、非目标和 MVP 范围有明确 SSoT。
- [x] 技术栈固定为 Expo React Native + Rust Host/Relay + WebSocket/event-log/replay，并记录 UI 组件策略。
- [x] session 管理采用 workspace-first managed sessions，历史 session 是 discovery/resume 入口。
- [x] `/` 和 `$` 体验被定义为移动端 command/skill/plugin picker，而不是终端 TUI 镜像。
- [x] `harness status --json .` 通过并记录到 `progress.md`。

## 工作树（Worktree）

- 路径：当前 checkout `G:\My_Project\python\gitlab\pocket_agent`
- 分支：当前分支
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：本轮只改 harness 文档，范围集中且没有并行代码实现。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：如需改变固定技术栈、提交本地 UI 原型图或进行人工 review confirmation，必须停下交回用户。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：self-check 无阻塞目标的重要发现；人工确认由用户或 dashboard 后续完成。

## 关联

- 相关 Regression Gate：`harness status --json .`
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：无

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：synced
- Registry update needed：不适用
- Harness Ledger update needed：由 lifecycle/governance 后续重建；本轮提交任务包和 context SSoT。
- Closeout / Regression update needed：`walkthrough.md` 和 `progress.md`
