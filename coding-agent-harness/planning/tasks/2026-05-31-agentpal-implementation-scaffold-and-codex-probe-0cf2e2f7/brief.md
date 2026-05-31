# AgentPal implementation scaffold and Codex probe

## Task ID

`2026-05-31-agentpal-implementation-scaffold-and-codex-probe-0cf2e2f7`

## 创建日期

2026-05-31

## 一句话结果

建立 AgentPal 第一版真实项目骨架，并用 Host CLI 对本机 Codex app-server 做真实连接探测。

## 完成后能得到什么

完成后，仓库不再只有 harness 文档，而是拥有可编译的 Rust workspace、可类型检查的 Expo React Native 移动端骨架、一个最小 Relay WebSocket 服务，以及一个 Host CLI 的 Codex app-server 探测命令。下一轮 agent 可以直接在这些边界上继续实现配对、会话事件、审批、diff 和移动端交互，不需要重新讨论技术栈或目录结构。本任务不会伪造 Codex 成功连接；如果当前 Windows 环境下 app-server WebSocket 入口仍不可达，Host 会输出结构化失败报告作为真实证据。

## 交付物

- 可见产物：`agentpal-host`、`agentpal-relay`、`agentpal-protocol` 和 `apps/mobile` 初始工程。
- 修改位置：根目录 workspace 文件、`crates/`、`apps/mobile/`、当前任务包。
- 验证证据：`cargo fmt`、`cargo check --workspace`、Relay `/healthz`、Host Codex probe、移动端 TypeScript 检查、`harness status --json .`。

## 第一眼应该看什么

先读根目录 `Cargo.toml`、`crates/host/src/codex.rs`、`crates/relay/src/main.rs`、`apps/mobile/app/index.tsx`，再看本任务 `progress.md` 和 `review.md` 中的验证结果。

## 边界

- 范围内：初始化项目骨架、定义 AgentPal 协议 DTO、实现最小 Host/Relay 可运行切片、实现移动端工作台静态结构、记录真实 Codex probe 结果。
- 范围外：账号体系、云部署、端到端加密、移动端真机通知、完整 Codex 会话控制、Claude/OpenCode 适配器、生产数据库迁移。
- 停止条件：需要用户凭证、远程云资源、App Store/Google Play 账号、或真实 Codex app-server 入口只能通过未公开协议继续猜测时，必须记录结构化 residual，不用假成功。

## 完成判断

- Rust workspace 可通过 `cargo check --workspace`。
- Relay 可启动并通过 `/healthz` 返回 JSON。
- Host Codex probe 会尝试启动真实 `codex app-server` 并输出 JSON 报告。
- Expo React Native app 可通过 TypeScript 检查，首屏是移动端结构化工作台而不是终端复制。
- Harness 任务包记录验证证据，且 `.coding-agent-harness/`、`tmp/`、`ui/` 仍不被提交。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`，审查证据写入 `review.md`。

## 当前下一步

补齐任务包执行合同后，创建 Rust workspace 与 Expo 移动端目录。
