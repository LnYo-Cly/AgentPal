# OpenAgentPal CLI cloud relay MVP

## Task ID

`2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e`

## 创建日期

2026-06-07

## 一句话结果

OpenAgentPal 获得源码态 `oap pair` / `agentpal-host codex connect --create-pair` 云配对 MVP：终端输出 URL 与二维码，手机扫码后经 Relay claim 并绑定到 Host。

## 完成后能得到什么

用户或下一轮 agent 可以在源码 checkout 中启动本地 Relay，并通过 `oap pair --workspace . --relay-url ...` 或 `agentpal-host codex connect --create-pair` 生成云配对地址和二维码。移动端能解析 `pairId/deviceId/deviceToken`，完成一次性 claim 后持久化设备凭据并重连。Relay 在本地内存模式下验证 Host 发起配对、Mobile claim、设备 token 绑定和定向路由。该结果可用于继续做公网 Relay 部署、npm 二进制分发、安全加固和真机公网测试。

## 交付物

- 可见产物：`oap pair` 源码态 CLI wrapper；`agentpal-host codex connect --create-pair`；Relay pair create/claim WebSocket flow；移动端 cloud pairing parser 和 claim persistence。
- 修改位置：`bin/oap.mjs`; `package.json`; `crates/protocol/src/lib.rs`; `crates/relay/src/main.rs`; `crates/host/src/codex.rs`; `apps/mobile/src/lib/pairing.ts`; `apps/mobile/src/lib/relay.ts`; `apps/mobile/src/hooks/useAgentPalRelay.ts`。
- 验证证据：`cargo fmt --check`; `cargo check --workspace`; `cargo test -p agentpal-relay`; `npm --prefix apps/mobile run typecheck`; real local WebSocket smoke; `npm exec -- oap --help`。

## 第一眼应该看什么

先读 `task_plan.md` 的范围和残余，再读 `review.md` 的安全边界。实现入口看 `crates/protocol/src/lib.rs` 的 pair message、`crates/relay/src/main.rs` 的 registry/claim/route、`crates/host/src/codex.rs` 的 `--create-pair`，以及 `apps/mobile/src/hooks/useAgentPalRelay.ts` 的 claim persistence。

## 边界

- 范围内：协议消息、Relay 内存配对和路由、Host CLI cloud pair、移动端 pairing/relay 兼容、源码态 npm wrapper、任务证据与本地 smoke。
- 范围外：生产公网部署、账号系统、Redis/Postgres 持久化、完整端到端加密、设备撤销 UI、限流、审计、npm 发布流水线、桌面安装包。
- 停止条件：需要生产密钥、公网域名、真实账户、完整 E2E 或超出 MVP 安全边界时，拆后续任务。

## 完成判断

- Rust workspace 编译和 relay 单测通过。
- 移动端 typecheck 通过，cloud payload 字段可解析并保存 claim 后 device token。
- 真实本地 `/ws` smoke 证明 Host create、Mobile claim、未配对拒绝、带 device token 重连后路由。
- 对抗审查记录 MVP 残余且无 open P0/P1/P2 阻塞发现。

## 执行合同

- Owner：coordinator
- 生命周期状态：审查中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

提交实现与任务材料，运行 Harness lifecycle gate；若 CLI 因 dirty/sync 拒绝写入，记录 no-commit reason 和下一步。
