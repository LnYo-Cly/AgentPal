# AgentPal session history and inbox UX redesign

Task Contract: harness-task/v1
Task Package Index: required

## 目标

修复 AgentPal 会话页首屏历史加载和移动端交互问题，并把首页、会话、设置重排成符合“口袋 Agent 工作台”的三页结构。

## 范围

- 做什么：实现真实 Codex session 历史 hydration；改善会话页列表、composer、Markdown/代码块、工具详情、技能/命令 picker；调整首页和设置页的信息架构与视觉层级。
- 不做什么：不交付原生 Live Activity / 灵动岛系统集成；不扩展云 Relay；不完成 Claude Code/OpenCode 的全量 Host 协议；不引入需要 Dev Build 才能运行的强依赖。
- 主要风险：当前工作树已有大量 dirty 改动；历史 hydration 涉及 Host/Relay/Protocol；Expo Go 只能验证 JS 层体验；Codex app-server API 若返回结构不同，需要以 live probe 为准。

## 预算选择

选择预算：complex

选择理由：任务跨 React Native UI、Relay hook、协议类型、Rust Host/Relay，并需要真实 WebSocket/Codex 探针验证，已超过单屏 UI 修补。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/app/index.tsx | 三页 UI、会话列表、composer、Markdown/代码块、picker 和详情弹层的实现位置。 | coordinator |
| C-002 | code | TARGET:apps/mobile/src/hooks/useAgentPalRelay.ts | Relay 连接、history-request、sessionHistory 合并、超时和实时事件同步。 | coordinator |
| C-003 | code | TARGET:apps/mobile/src/lib/relay.ts | 移动端协议类型，必须与 Rust protocol 保持一致。 | coordinator |
| C-004 | code | TARGET:crates/protocol/src/lib.rs | Relay/Host/Mobile 共享协议事实源。 | coordinator |
| C-005 | code | TARGET:crates/relay/src/main.rs | 当前 history-page 只读 Relay 内存快照，需增加 Host hydration 协调。 | coordinator |
| C-006 | code | TARGET:crates/host/src/codex.rs | Codex thread list/resume/turns 转换、picker registry 和 session 映射。 | coordinator |
| C-007 | screenshot | EXTERNAL:user iPhone screenshots | 暴露首屏空白、composer 遮挡、代码块不佳、首页/设置职责混乱。 | coordinator |
| C-008 | skill | PRIVATE:ui-ux-pro-max search output | 约束移动端安全区、主题 token、触控、列表和 bottom sheet 设计。 | coordinator |

## 步骤

1. 记录设计决策：三页职责、会话详情结构、历史 hydration 边界、代码块和 picker 交互。
2. 修复历史数据链路：App 请求历史时，Relay 能在内存不足时向 Host 请求 Codex thread turns，Host 转成结构化 session events 后返回/发布。
3. 重构会话页：真实 session picker、首屏加载/空态区分、列表底部 inset、自动跟随新消息、Markdown/代码块/工具卡优化。
4. 调整首页和设置页：待处理收件箱优先，设置页只保留连接与偏好，主题 token 驱动。
5. 验证：typecheck、Rust check、Expo export、真实 WebSocket history probe，记录 residual 和 no-commit/commit 边界。

## 验收标准

- [ ] 直接进入会话页会加载并显示真实历史，或给出准确的“无历史/同步失败”状态。
- [ ] 新消息在用户停留底部时自动滚到底；用户上翻时不抢滚动，只显示“新消息”按钮。
- [ ] Composer、技能/命令标签、键盘和底部安全区不会遮挡最后一条消息。
- [ ] Markdown 列表/代码块显示稳定，代码块支持复制和完整查看，工具/命令详情不暴露 PowerShell 包装噪音。
- [ ] 首页、会话、设置各自职责清晰，支持明/暗/跟随系统主题。
- [ ] 移动端 typecheck、Rust check、Expo iOS export 和真实 history probe 通过或有清楚 residual。

## 工作树（Worktree）

- 路径：当前 checkout `G:\My_Project\python\gitlab\pocket_agent`
- 分支：当前工作分支
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：核心改动集中在同一移动端入口和 Host/Relay 事件链；当前 checkout 已有大量相关 dirty 状态，另建 worktree 会制造同步风险。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：不适用
- Stop Condition 摘要：如果 Codex app-server 无法返回 turns 或 Expo Go 因依赖红屏，先记录 blocker 并回到可运行方案。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：不适用
- Reviewer：self-check
- No-finding 要求：静态检查、bundle、Rust check、真实 Relay history probe 通过；用户真机截图确认视觉问题。

## 关联

- 相关 Regression Gate：移动端 TypeScript、Expo bundle、Host/Relay Rust check、真实 history-request smoke。
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`2026-06-01-agentpal-mobile-cold-visual-redesign-b37239ca`、`2026-06-01-agentpal-host-pairing`

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：任务完成后由 CLI 或 governance rebuild 更新
- Closeout / Regression update needed：完成验证后更新 `progress.md`、`review.md`、`walkthrough.md`
