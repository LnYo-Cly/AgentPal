# OpenAgentPal CLI cloud relay MVP

Task Contract: harness-task/v1
Task Package Index: required

## 目标

实现 CLI-first 的 OpenAgentPal Cloud Relay MVP：Host 和 Mobile 都主动连公网 Relay，`oap/agentpal-host ... pair` 输出可扫码的云配对 payload，并用本地集成 smoke 证明 mobile -> relay -> host 的通路可用。

## 范围

- 做什么：扩展 Rust protocol/relay/host 的配对与注册消息；让 `agentpal-relay` 支持 one-time pair create/claim、host/mobile binding 和定向路由；让 `agentpal-host codex connect --create-pair` 与源码态 `oap pair` 支持 cloud-first pairing payload；让移动端 pairing parser 兼容 `pairId/deviceId/deviceToken` 字段；补最小 smoke/self-test 与证据。
- 不做什么：不做桌面安装包、不做账号系统、不接入真实生产域名、不承诺完整端到端加密、不部署公网 VPS、不做 App Store/TestFlight 发布。
- 主要风险：公网默认 Relay 是安全边界变化，MVP 只能做到 TLS/短期 token/绑定路由的结构预留；完整 E2E、设备撤销、审计、限流需要后续任务完成。

## 预算选择

选择预算：complex

选择理由：该任务跨 Rust protocol、Relay、Host CLI、Expo mobile pairing 与 Harness 证据；还需要 worker 并行、集成 smoke 和对抗性审查，属于复杂交付切片。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:crates/protocol/src/lib.rs | Relay/Host/Mobile 共用消息契约。 | coordinator / reviewer |
| C-002 | code | TARGET:crates/relay/src/main.rs | 当前本地 Relay，需要演进为 Cloud Relay MVP。 | coordinator / reviewer |
| C-003 | code | TARGET:crates/host/src/main.rs;TARGET:crates/host/src/codex.rs | 当前 Host CLI、Codex connect 和 QR pair 入口。 | coordinator / reviewer |
| C-004 | code | TARGET:apps/mobile/src/lib/pairing.ts;TARGET:apps/mobile/src/lib/relay.ts;TARGET:apps/mobile/src/hooks/useAgentPalRelay.ts | 移动端配对和 WebSocket 连接入口。 | worker / coordinator / reviewer |
| C-005 | context | TARGET:coding-agent-harness/context/architecture/service-catalog.md | 记录 Relay/Host/Mobile 服务边界。 | coordinator / reviewer |

## 步骤

1. 更新任务执行策略、worker 授权、worktree 策略和证据计划。
2. 扩展 protocol：pair create/created/claim/claimed、device token、route envelope 所需类型。
3. 改造 relay：维护 in-memory pairing TTL、host/mobile connection registry、targeted routing、health/smoke 可观测日志。
4. 改造 host CLI：新增 cloud pair/connect 参数与二维码 payload，保持 LAN/自定义 Relay 兼容。
5. 并行处理 mobile pairing parser：兼容新字段，不破坏旧局域网配对。
6. 运行 Rust fmt/check/test、mobile typecheck、local relay/host/mobile-sim smoke、对抗性 review，并记录证据。

## 验收标准

- [x] `oap pair` 源码态 wrapper 可用；`agentpal-host codex connect --create-pair --relay-url ...` 会请求 Relay 生成包含 `pairId`、`pairToken`、`hostId`、`relayUrl` 的 `agentpal://pair` URL 和二维码。
- [x] `agentpal-relay` 可以在无 Redis/Postgres 的本地模式中完成 pair create/claim，并只把 host-targeted command 路由给已绑定的对应 Host。
- [x] 移动端 parser 能解析新旧 payload，claim 后持久化 device token，`npm --prefix apps/mobile run typecheck` 通过。
- [x] `cargo fmt --check`、`cargo check --workspace`、`cargo test -p agentpal-relay` 和本地 relay pairing smoke 通过。
- [x] `review.md` 记录对抗性安全审查，明确 MVP 残余风险和后续 E2E/设备撤销要求。

## 工作树（Worktree）

- 路径：`G:\My_Project\python\gitlab\pocket_agent\.worktrees\openagentpal-cloud-relay-mvp`
- 分支：`work/openagentpal-cloud-relay-mvp`
- Worker owner：coordinator + worker subagent for mobile pairing slice
- Worker handoff commit required：yes
- Coordinator integration branch：`work/openagentpal-cloud-relay-mvp`
- 未使用 worktree 的原因：不适用，已使用隔离 worktree。

## 长程任务判定

- 是否属于长程任务：是，用户授权连续实现、并行 worker、自测和对抗验证
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：已授权，本任务在当前对话内连续推进
- Stop Condition 摘要：若需要真实公网部署、生产密钥、账号系统、完整 E2E 加密实现或超出 MVP 安全边界，必须停下并拆后续任务。

## 审查判定

- 是否需要对抗性审查：是
- 若是，报告文件：`review.md`
- Reviewer：self adversarial review + worker handoff review
- No-finding 要求：无 P0/P1/P2 open finding；若存在安全残余，必须明确标为 MVP accepted residual 且不阻塞本地 smoke。

## 关联

- 相关 Regression Gate：Rust workspace check、mobile typecheck、relay pairing smoke、Harness check
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：本地 Host/Relay/Mobile loop、mobile pairing、session IA polish 相关历史任务

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：pending-review
- Registry update needed：不适用
- Harness Ledger update needed：由 lifecycle CLI 同步
- Closeout / Regression update needed：`progress.md`、`review.md`、`walkthrough.md`
