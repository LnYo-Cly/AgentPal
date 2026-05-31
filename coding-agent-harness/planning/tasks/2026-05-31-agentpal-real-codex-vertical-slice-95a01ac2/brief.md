# AgentPal real Codex vertical slice

## Task ID

`2026-05-31-agentpal-real-codex-vertical-slice-95a01ac2`

## 创建日期

2026-05-31

## 一句话结果

完成 AgentPal 真实 Codex 垂直切片的项目架构设计、Codex 能力探测和实现计划，后续代码骨架按该任务包执行。

## 完成后能得到什么

完成后，下一轮 agent 可以直接按任务包搭建工程结构并实现真实 Codex 闭环，不再使用 `docs/plans` 或 mock demo。设计明确 monorepo 包边界、Codex app-server/remote-control 优先级、Windows daemon 限制、Host/Relay/Mobile 的第一版职责、协议事件映射和验证命令。代码实现前的关键不确定性也会被记录：Codex app-server 的稳定性、Windows 上 daemon lifecycle 不可用、以及是否需要 PTY fallback。

## 交付物

- 可见产物：真实 Codex 垂直切片设计、能力探测结果、实现计划、验证门槛。
- 修改位置：`coding-agent-harness/planning/tasks/2026-05-31-agentpal-real-codex-vertical-slice-95a01ac2/*`。
- 验证证据：`codex --version`、`codex app-server --help`、`codex app-server generate-json-schema/generate-ts`、`harness status --json .`。

## 第一眼应该看什么

先读 `task_plan.md` 的 Recommended Architecture 和 Implementation Slice，再读 `findings.md` 的 Codex 能力探测事实。实现时再读 `visual_map.md` 的数据流和阶段表。

## 边界

- 范围内：设计真实 Codex 垂直切片、探测本机 Codex/Node/Rust 能力、规划 monorepo 包边界和验证步骤。
- 范围外：不创建 `apps/`、`crates/`、Expo App 或 Rust crate；不提交 `tmp/` 生成物；不使用 `docs/plans`。
- 停止条件：如果要启动长期运行的 Codex app-server、打开网络端口、接入真实云 Relay 或修改 Codex 配置，先回到用户确认。

## 完成判断

- 任务包明确第一版工程结构：`apps/mobile`、`crates/host`、`crates/relay`、`crates/protocol`。
- Codex 能力探测证明本机存在 `codex-cli 0.134.0`、app-server、remote-control、schema/TS generation。
- 设计明确 Windows 上 app-server daemon lifecycle 不可用，Host 不能依赖 `codex app-server daemon`。
- 设计明确 Codex app-server/remote-control 是第一优先，PTY 仅作为 fallback。
- `harness status --json .` 通过，且本任务包不含 `docs/plans` 路径。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中；本轮仅提交设计，代码实现需下一步继续。
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

等待用户确认本任务包设计后，开始创建 monorepo 工程骨架并实现真实 Codex 最小闭环。
