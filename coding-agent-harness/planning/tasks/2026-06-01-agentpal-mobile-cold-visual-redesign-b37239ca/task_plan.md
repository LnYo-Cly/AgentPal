# AgentPal mobile cold visual redesign

Task Contract: harness-task/v1
Task Package Index: required

## 目标

把 AgentPal 手机端从临时视觉稿推进到可测试的冷色开发者工具界面，并修复真实 Relay/Host/Codex 会话在手机端展示时的 P0 可用性问题。

## 范围

- 做什么：调整 `apps/mobile/app/index.tsx` 的首页、会话页、设置页 UI；修复会话历史加载状态、会话事件过滤、设置页底部导航遮挡和首页/设置计数口径；保持 Expo Go 可运行。
- 不做什么：不重写 Host/Relay 协议；不实现完整 slash command / skill picker；不接入原生 Live Activity 发布链路；不修改 `ui/` 原型资产。
- 主要风险：移动端真实视觉仍需 iOS/Android 真机截图确认；当前工作树已有多文件 dirty，提交边界需要单独整理；Expo Go 不能验证原生 Liquid Glass / 灵动岛能力。

## 预算选择

选择预算：standard

选择理由：改动集中在移动端单应用和一个 Relay hook，验证需要 TypeScript、Expo bundle 和真实 Relay history 探针，但不涉及跨服务协议重构。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | `apps/mobile/app/index.tsx` | 手机端首页、会话页、设置页的实际 UI 和交互逻辑。 | coordinator |
| C-002 | code | `apps/mobile/src/hooks/useAgentPalRelay.ts` | Relay 连接、history-request、sessionHistory 合并逻辑。 | coordinator |
| C-003 | evidence | 用户 iPhone 截图 | 暴露重复状态、历史加载、设置页遮挡、最近动态污染等 P0 问题。 | coordinator |

## 步骤

1. 过滤会话消息流，只展示用户消息、Agent 回复、命令、工具、Diff、审批和错误。
2. 修复 history 加载状态和实时事件合并，避免「加载历史...」在已有消息时卡住。
3. 调整首页和设置页的统计口径、底部安全区和连接成功态布局。
4. 保留待接入功能的显式状态，避免 command chip 被误解为完整功能。
5. 运行移动端 typecheck、Expo iOS export 和真实 Relay history-request 探针。

## 验收标准

- [x] 会话详情页不再把 `state-changed` 渲染成重复的「运行中 / 完成」消息。
- [x] Codex 内部 `userMessage`、`agentMessage`、`reasoning` 工具事件不会污染会话流或首页最近动态。
- [x] 历史加载行只在真正 loading、可加载更早消息或错误重试时显示。
- [x] 设置页底部内容不会被浮动导航遮挡，连接成功态不再重复展示三步配对流程。
- [x] `npm --prefix apps/mobile run typecheck` 通过。
- [x] `npx expo export --platform ios --output-dir ../../tmp/expo-export-check --clear` 通过。

## 工作树（Worktree）

- 路径：当前 checkout `G:\My_Project\python\gitlab\pocket_agent`
- 分支：当前工作分支
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：本次是同一移动端文件内的窄范围修复；没有授权 worker subagent；当前 dirty state 已经存在，另建 worktree 会增加同步成本。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：若 Expo Go red screen、Relay history 探针失败、或需要原生 Dev Build 才能验证的能力成为阻塞，则停止并记录。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：typecheck、Expo export、history-request 探针通过；真机视觉由用户继续截图确认。

## 关联

- 相关 Regression Gate：移动端 TypeScript、Expo iOS bundle、Relay history-request smoke
- 审查报告：`review.md` 后续按需要补充
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`2026-06-01-agentpal-host-pairing`

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：CLI lifecycle write blocked by dirty-state; see `progress.md`
- Closeout / Regression update needed：后续用户真机确认后再收口
