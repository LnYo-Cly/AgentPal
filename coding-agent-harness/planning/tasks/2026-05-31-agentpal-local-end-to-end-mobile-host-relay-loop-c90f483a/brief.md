# AgentPal local end-to-end mobile host relay loop

## Task ID

`2026-05-31-agentpal-local-end-to-end-mobile-host-relay-loop-c90f483a`

## 创建日期

2026-05-31

## 一句话结果

让 AgentPal 在本机跑通一个真实闭环：手机端 UI 连接本地 Relay，Host 接收指令并驱动真实 Codex app-server 创建 thread/turn，再把结构化事件回传到手机端。

## 完成后能得到什么

完成后，项目会有一个可以本地验证的端到端切片：`agentpal-relay` 提供本地 WebSocket 中转，`agentpal-host codex connect` 连接 Relay 并启动真实 Codex app-server，移动端 App 通过 WebSocket 显示 Host 在线、会话状态、用户指令、Codex 回答和错误/完成事件。这个结果用于确认核心产品链路没有停留在静态样例或网页演示上，后续可在同一协议上继续扩展审批卡片、Diff 摘要、picker、配对和云 Relay。

## 交付物

- 可见产物：本地 Relay + Host + 移动端 UI 的真实 Codex 指令闭环。
- 修改位置：`crates/protocol`、`crates/relay`、`crates/host`、`apps/mobile`、本任务包。
- 验证证据：Rust fmt/check、移动端 typecheck、Relay/Host/Codex 真实冒烟、可选 RN web 首屏 smoke。

## 第一眼应该看什么

先读 `progress.md` 的命令证据，再看 `crates/protocol/src/lib.rs` 的 Relay 消息合同、`crates/host/src/codex.rs` 的真实 Codex 连接逻辑、`crates/relay/src/main.rs` 的本地广播策略，以及 `apps/mobile/app/index.tsx` 的移动端会话呈现。

## 边界

- 范围内：本地 Relay 角色注册和事件广播；Host Codex connect 命令；Codex `initialize`、`thread/start`、`turn/start`；移动端 WebSocket 状态流和指令输入；任务包证据记录。
- 范围外：云 Relay、账号体系、设备配对二维码、推送通知、E2EE、Claude/OpenCode 适配、完整审批回传、完整 Diff 查看器、生产部署。
- 停止条件：真实 Codex app-server 协议不兼容、Codex 登录/权限阻塞、需要访问外部云服务、或必须修改范围外模块时停止并回到用户确认。

## 完成判断

- `agentpal-relay` 可启动并接受 WebSocket 连接。
- `agentpal-host codex connect` 可连接 Relay，启动真实 Codex app-server，并完成至少一次 `thread/start` + `turn/start`。
- 移动端 App 不再依赖静态样例作为主数据源，可显示 Relay/Host/session/event 状态并发送文本指令。
- `cargo fmt --all --check`、`cargo check --workspace`、`npm --prefix apps/mobile run typecheck` 通过。
- 所有验证命令和残余风险记录到 `progress.md`。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

先补齐协议层的 Relay 消息类型，再分别落地 Relay 广播、Host Codex connect 和移动端 WebSocket hook。
