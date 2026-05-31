# AgentPal real Codex vertical slice

Task Contract: harness-task/v1
Task Package Index: required

## 目标

把 AgentPal 真实 Codex 垂直切片的项目架构、Codex 接入策略和验证门槛写入 harness 任务包，为后续代码实现提供可执行合同。

## 范围

- 做什么：探测本机 Codex/Node/Rust 能力；设计第一版 monorepo 结构；定义 Host/Relay/Mobile/protocol 边界；明确真实 Codex app-server 优先、PTY fallback 的策略；写入任务包。
- 不做什么：本轮不创建 `apps/` 或 `crates/` 代码；不创建 `docs/plans`；不提交 `tmp/` 下的 Codex 生成物；不启动长期运行服务。
- 主要风险：Codex app-server 是 experimental；Windows 上 `codex app-server daemon` lifecycle 不可用；移动端到 Host 的真实闭环需要后续端到端验证。

## 预算选择

选择预算：standard

选择理由：本任务需要完整设计、能力探测、证据记录和后续 review，但不需要复杂 artifact 或多 agent 并行实现。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:coding-agent-harness/context/product/product-brief.md | 产品定位要求真实手机工作台，不是 terminal/mock demo。 | coordinator / reviewer |
| C-002 | code | TARGET:coding-agent-harness/context/architecture/technical-stack-decision.md | 固定技术栈和不重复造轮子的边界。 | coordinator / reviewer |
| C-003 | code | TARGET:coding-agent-harness/context/integrations/agent-adapter-contract.md | Host adapter 和 Codex 事件/命令映射的既有 SSoT。 | coordinator / reviewer |
| C-004 | command | `codex --help`, `codex app-server --help`, generated schema/types under ignored `tmp/` | 真实 Codex 接入能力和 Windows 限制的来源。 | coordinator / reviewer |

## 步骤

1. 创建并启动 harness 任务。
2. 探测 Codex CLI、app-server、remote-control、schema/type generation、Node/Rust 工具链。
3. 在任务包内写真实 Codex 垂直切片设计。
4. 跑 `harness status --json .`，提交设计任务。
5. 用户确认设计后，下一步开始代码实现。

## 验收标准

- [x] 不使用 `docs/plans`，设计写入当前 harness task package。
- [x] Codex app-server 能力已探测并记录。
- [x] Windows daemon lifecycle 限制已记录。
- [x] 第一版工程结构、数据流和验证门槛已写明。
- [ ] `harness status --json .` 通过并提交。

## 工作树（Worktree）

- 路径：当前 checkout `G:\My_Project\python\gitlab\pocket_agent`
- 分支：当前分支
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：本轮只写设计任务包，不改实现代码。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：启动长期服务、开放非本地端口、写真实 app/host/relay 代码或修改 Codex 配置前需进入实现任务或重新确认。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：设计不能依赖不可用的 Windows daemon lifecycle；不能把 `tmp/` 生成物提交。

## 关联

- 相关 Regression Gate：`harness status --json .`
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`2026-05-31-agentpal-foundation-product-architecture-and-sta-8c4cfcfe`

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：synced
- Registry update needed：不适用
- Harness Ledger update needed：由 lifecycle CLI 生成
- Closeout / Regression update needed：本轮设计任务提交后进入 review/确认

## Recommended Architecture

第一版代码实现应采用以下 monorepo 结构：

```text
apps/mobile      Expo React Native + TypeScript mobile app
crates/protocol  AgentPal protocol SSoT and Codex mapping types
crates/relay     Rust Axum WebSocket relay
crates/host      Rust Host CLI/daemon and Codex adapter
```

Host 不直接把 Codex TUI 当作第一选择。优先顺序：

1. `codex app-server --listen ws://127.0.0.1:<port>` or equivalent structured transport.
2. `codex remote-control` / app-server remote-control protocol where available.
3. `codex app-server proxy` for stdio/control-socket bridge where compatible.
4. PTY/TUI fallback only when structured app-server path is blocked.

Windows caveat: `codex app-server daemon` lifecycle reports "only supported on Unix platforms" on this machine, so Host must not rely on daemon bootstrap/start/stop for Windows MVP. It should own a child `codex app-server --listen ...` process or use a documented non-daemon connection path.

## Implementation Slice

第一版真实闭环应证明：

1. Relay accepts Host and Mobile WebSocket connections.
2. Host launches or connects to real Codex app-server for one workspace.
3. Host starts a real Codex thread/turn using app-server protocol.
4. Mobile sends text input through Relay to Host.
5. Host sends the input into Codex and streams structured status/message/diff/approval events back.
6. Mobile renders one real session feed and input box.

Do not include Supabase Auth, cloud deployment, push notifications, Claude/OpenCode adapters, or rich UI polish in the first implementation slice.
