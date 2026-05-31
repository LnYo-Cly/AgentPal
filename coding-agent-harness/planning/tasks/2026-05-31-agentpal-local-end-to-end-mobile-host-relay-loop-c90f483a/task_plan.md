# AgentPal local end-to-end mobile host relay loop

Task Contract: harness-task/v1
Task Package Index: required

## 目标

跑通 AgentPal 的本地真实端到端回路：移动端 UI -> Relay -> Host -> Codex app-server -> Relay -> 移动端 UI。

## 范围

- 做什么：补齐 AgentPal 本地 Relay 消息合同、Host Codex connect 命令、移动端 WebSocket 数据流和文本指令入口，并用真实 Codex app-server 验证一次 thread/turn。
- 不做什么：不实现云 Relay、登录、二维码配对、推送、E2EE、Claude/OpenCode 适配、完整审批/Diff 处理、生产移动构建发布。
- 主要风险：Codex app-server 仍是快速演进接口；本地 WebSocket 在真机上需要替换为电脑局域网 IP；长回答会产生大量事件，本轮只做结构化摘要。

## 预算选择

选择预算：standard

选择理由：本轮跨 Rust protocol/relay/host 和 React Native UI 四个边界，但目标是单一垂直切片，不需要 complex 任务的外部 artifact 索引。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:crates/protocol/src/lib.rs | 定义移动端、Relay、Host 之间的结构化 DTO。 | coordinator / reviewer |
| C-002 | code | TARGET:crates/relay/src/main.rs | 当前 Relay 只做 echo/broadcast，需要升级为角色注册和事件转发。 | coordinator / reviewer |
| C-003 | code | TARGET:crates/host/src/codex.rs | 已有真实 Codex app-server probe，可复用 initialize/thread/start/turn/start 逻辑。 | coordinator / reviewer |
| C-004 | code | TARGET:apps/mobile/app/index.tsx | 当前移动端首屏使用静态样例，需要接入 WebSocket 状态源。 | coordinator / reviewer |
| C-005 | reference | TARGET:tmp/codex-app-server-ts/ServerNotification.ts | 已生成的 Codex app-server TS 类型，仅作为本地协议核对输入，不提交。 | coordinator |

## 步骤

1. 将任务包占位内容替换为本轮真实目标、范围和验证计划。
2. 在 `agentpal-protocol` 中增加 Relay 注册、Host 状态、移动端命令、事件广播消息类型。
3. 升级 `agentpal-relay`：接受 WebSocket 客户端，记录最近 Host 状态，广播角色消息，向新连接发送 snapshot。
4. 增加 `agentpal-host codex connect`：连接 Relay，启动真实 Codex app-server，接收移动端文本指令并执行 `thread/start` / `turn/start`。
5. 改造移动端首屏：用 WebSocket hook 驱动 Host 状态、会话卡片、事件流和文本输入。
6. 运行格式、构建、类型检查和本地真实 Codex 冒烟，并把证据写入 `progress.md`。

## 验收标准

- [ ] Relay 可以在本地启动，并支持 Host/mobile 两类客户端同时连接。
- [ ] Host 可以通过 Relay 接收移动端提交的文本指令，并用真实 Codex app-server 创建 thread/turn。
- [ ] 移动端 App 能显示 Host 在线、活动会话、用户消息、Agent 消息/状态事件，并能发送文本指令。
- [ ] `cargo fmt --all --check`、`cargo check --workspace`、`npm --prefix apps/mobile run typecheck` 通过。
- [ ] 真实 Codex app-server 冒烟结果、限制和残余风险记录到 `progress.md`。

## 工作树（Worktree）

- 路径：当前 checkout
- 分支：当前分支
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：用户已授权 coordinator 直接执行；切片虽跨模块但文件边界少，单 checkout 更适合保持协议和 UI 同步。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：遇到真实 Codex 协议阻塞、登录/权限阻塞、或必须引入云端服务时停止。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：自检无 P0/P1/P2 open finding，人工确认仍按 harness 生命周期执行。

## 关联

- 相关 Regression Gate：TARGET:coding-agent-harness/governance/regression/Regression-SSoT.md
- 审查报告：TARGET:coding-agent-harness/planning/tasks/2026-05-31-agentpal-local-end-to-end-mobile-host-relay-loop-c90f483a/review.md
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：TASKS/2026-05-31-agentpal-implementation-scaffold-and-codex-probe-0cf2e2f7；TASKS/2026-05-31-agentpal-real-codex-vertical-slice-95a01ac2

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：pending-coordinator-pass
- Registry update needed：不适用
- Harness Ledger update needed：由 lifecycle CLI 同步
- Closeout / Regression update needed：本任务 closeout 时记录命令证据
