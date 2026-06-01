# AgentPal live surface status model

Task Contract: harness-task/v1
Task Package Index: required

## 目标

把 AgentPal Live Surface 状态模型写入架构和产品 SSoT，明确红色待确认、黄色工作中、绿色空闲不上岛的系统级发布规则。

## 范围

- 做什么：新增 Live Surface 架构决策文档，更新 MVP、UX、技术栈、Architecture SSoT 和任务包。
- 不做什么：不写 iOS/Android 原生实现，不修改 React Native 页面，不新增依赖。
- 主要风险：把普通 App 页面 UI 和系统级 Live Surface 混淆；把 Android 厂商私有“类灵动岛”能力误当成跨设备主路线。

## 预算选择

选择预算：standard

选择理由：本任务跨产品、UX、架构和平台能力边界，但当前交付物是文档 SSoT，不需要 complex 预算。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | product | TARGET:coding-agent-harness/context/product/mvp-scope.md | 确认 MVP 对通知和 Live Surface 的范围表达。 | coordinator |
| C-002 | ux | TARGET:coding-agent-harness/context/product/ux-principles.md | 记录红黄绿只约束系统 Live Surface，不扩散到普通页面。 | coordinator |
| C-003 | architecture | TARGET:coding-agent-harness/context/architecture/technical-stack-decision.md | 记录 iOS/Android Live Surface 技术路线。 | coordinator |
| C-004 | external | URL:https://docs.expo.dev/versions/latest/sdk/widgets/ | Expo iOS widgets / Live Activities 能力来源。 | coordinator |
| C-005 | external | URL:https://developer.android.com/develop/ui/views/notifications/live-update | Android Live Updates 来源。 | coordinator |
| C-006 | external | URL:https://developer.apple.com/design/human-interface-guidelines/live-activities | Apple Live Activities UX 来源。 | coordinator |

## 步骤

1. 新增 `context/architecture/live-surface-status-model.md`，定义状态优先级、平台映射、事件合同和 UX 约束。
2. 更新 MVP、UX、技术栈、Architecture SSoT 和架构 README。
3. 更新任务包的 brief、plan、findings、progress、review、walkthrough 和 lesson decision。
4. 运行 `rg`、`git diff --check`、`harness status --json .` 验证。
5. 提交变更并提交 Agent Review Submission。

## 验收标准

- [x] Live Surface 被定义为系统级能力，不是页面内假 Dynamic Island。
- [x] 红色、黄色、绿色状态发布规则写入架构文档。
- [x] iOS 和 Android 平台映射及 fallback 边界写入 SSoT。
- [x] 验证命令通过并记录到 `progress.md`。
- [ ] 任务进入 review queue，等待人工确认。

## 工作树（Worktree）

- 路径：same checkout
- 分支：master
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：只修改少量 SSoT 文档和本任务包，由 coordinator 串行处理更低风险。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：需要实现原生能力或引入新依赖时停止，另开实现任务。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：无 open P0/P1/P2 finding。

## 关联

- 相关 Regression Gate：文档一致性检查。
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`2026-06-01-agentpal-mobile-workbench-ui-repair-5316c918` 对页面级假 Dynamic Island 的移除。

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
