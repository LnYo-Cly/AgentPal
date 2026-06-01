# AgentPal mobile three-tab conversation redesign

Task Contract: harness-task/v1
Task Package Index: required

## 目标

把移动端主界面重构为“首页 / 会话 / 设置”三页结构，其中“会话”直接呈现当前 Agent 会话详情，避免各页面重复卡片堆砌。

## 范围

- 做什么：重构 `apps/mobile/app/index.tsx` 的一级导航、首页、会话详情页、设置页和主题色 token。
- 不做什么：不接入新的原生能力，不实现系统 Live Activity / 灵动岛，不改变 Relay 协议。
- 主要风险：页面职责仍不清晰；会话页底部输入栏遮挡内容；真实手机视觉仍需人工确认。

## 预算选择

选择预算：standard

选择理由：本任务影响核心移动端体验和 UI 信息架构，但当前主要修改单页 React Native UI 和主题，不需要 complex 预算。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/app/index.tsx | 主移动界面实现。 | coordinator |
| C-002 | code | TARGET:apps/mobile/src/theme/index.ts | 主题 token 和颜色体系。 | coordinator |
| C-003 | code | TARGET:apps/mobile/src/lib/relay.ts | 会话、Host、事件类型约束。 | coordinator |
| C-004 | asset | TARGET:apps/mobile/src/lib/uiAssets.ts | 现有伙伴和 UI 图像资产入口。 | coordinator |
| C-005 | product | TARGET:coding-agent-harness/context/product/ux-principles.md | 不做页面内假灵动岛，移动端不是终端。 | coordinator |

## 步骤

1. 把一级 Tab 收敛为首页、会话、设置。
2. 首页只展示当前需要关注的状态、关键指标和一个主行动入口。
3. 会话页直接显示当前会话详情、消息/工具/Diff/审批流、命令 chip 和输入栏。
4. 设置页只展示 Host、Relay、通知、语音和审批策略等配置。
5. 运行 typecheck、diff check、harness status，并提交 review。

## 验收标准

- [x] 一级导航只有首页、会话、设置。
- [x] 会话 Tab 直接进入当前会话详情，而不是重复会话列表页。
- [x] 首页、会话、设置各自承担不同任务，不再共享同一套卡片堆叠。
- [x] 页面内没有新增假 Dynamic Island / 灵动岛。
- [ ] `npm --prefix apps/mobile run typecheck` 通过。
- [ ] `harness status --json .` 通过。

## 工作树（Worktree）

- 路径：same checkout
- 分支：master
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：本轮主要修改单个移动端入口文件和主题，由 coordinator 串行处理更直接。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：需要新增原生模块、改 Relay 协议或做系统 Live Surface 时另开任务。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：无 open P0/P1/P2 finding。

## 关联

- 相关 Regression Gate：mobile typecheck；harness status。
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`2026-06-01-agentpal-mobile-workbench-ui-repair-5316c918`，`2026-06-01-agentpal-live-surface-status-model-185ce36f`

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：review submission 后由 lifecycle/governance 流程处理
- Closeout / Regression update needed：review confirmation 后再收口
