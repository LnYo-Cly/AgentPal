# AgentPal Host pairing MVP

Task Contract: harness-task/v1
Task Package Index: required

## 目标

实现 AgentPal Host 配对 MVP：电脑端能生成二维码/配对地址，移动端设置页能扫码或手动输入并持久化配对信息，随后按配对 Host/Relay 重连，并能在已配对 Host 上打开真实 Codex 会话、发送输入、展示实时回复和分页历史。

## 范围

- 做什么：Host `codex pair` 命令、移动端配对弹窗、扫码/手动输入解析、AsyncStorage 持久化、已配对 Host 注册与连接选择、基础权限配置、当前 Codex 会话输入、实时事件映射、Relay 历史分页。
- 不做什么：账号体系、生产级 token 鉴权、端到端加密、云 Relay 设备绑定后台、推送通知。
- 主要风险：Expo Go 和 Dev Build 的摄像头行为可能不同；当前 pair token 只随 payload 保存，尚未被 Relay/Host 强校验。

## 预算选择

选择预算：standard

选择理由：跨 Host、protocol、mobile、依赖和本地验证，但属于 MVP 小闭环，不需要拆分为长程任务。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:crates/host/src/codex.rs | Host Codex adapter and CLI command surface. | coordinator |
| C-002 | code | TARGET:apps/mobile/app/index.tsx | Settings page and mobile connection UI. | coordinator |
| C-003 | code | TARGET:apps/mobile/src/hooks/useAgentPalRelay.ts | WebSocket registration, active Host selection, and reconnect lifecycle. | coordinator |
| C-004 | contract | TARGET:coding-agent-harness/context/architecture/realtime-sync-model.md | Confirms WebSocket foreground channel and replay-oriented model. | coordinator |

## 步骤

1. Add shared pairing payload shape and Host command that prints `agentpal://pair?...` plus terminal QR.
2. Add mobile parser, persistence, settings UI, camera scanner, and manual address entry.
3. Validate typecheck, Rust check, QR output, relay registration smoke, real Codex conversation probe, and history pagination probe.

## 验收标准

- [x] Host can emit a pairing URL and QR code without starting a fake Agent.
- [x] Mobile Settings can open a pairing flow, scan or accept manual input, store pairing, and reconnect through the paired relay URL.
- [x] `npm --prefix apps/mobile run typecheck`, `cargo check --workspace`, and `git diff --check` pass.
- [x] A real Codex input submitted through Relay/Host returns agent messages and completed state to the same App session.
- [x] Relay `history-request` can return the latest events for the current App session.

## 工作树（Worktree）

- 路径：same checkout
- 分支：current branch
- Worker owner：coordinator
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：改动集中在同一协议/Host/mobile connection slice，拆分会增加接口同步成本。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：不适用
- Stop Condition 摘要：如果需要生产账号/鉴权体系或云 Relay 持久化设计，应停止并另开架构任务。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：self review 无阻塞发现。

## 关联

- 相关 Regression Gate：mobile typecheck；cargo workspace check；relay register smoke；Expo export；real Codex probe；history pagination probe
- 审查报告：TARGET:coding-agent-harness/planning/tasks/2026-06-01-agentpal-host-pairing/review.md
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：无

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：dirty worktree blocked lifecycle CLI sync after implementation
- Closeout / Regression update needed：`walkthrough.md`
