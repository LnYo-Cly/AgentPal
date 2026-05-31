# AgentPal implementation scaffold and Codex probe

Task Contract: harness-task/v1
Task Package Index: required

## 目标

建立 AgentPal 第一版可验证工程骨架，并实现真实 Codex app-server 连接探测。

## 范围

- 做什么：创建 `apps/mobile` Expo React Native 骨架；创建 Rust `crates/protocol`、`crates/host`、`crates/relay`；实现 Relay `/healthz` 和 `/ws`；实现 Host `codex probe`，真实启动/连接 Codex app-server 并输出结构化报告；记录验证证据。
- 不做什么：不实现生产登录、云部署、加密传输、完整会话恢复、Claude/OpenCode adapter、真机推送、完整设计系统、App Store/Play 打包。
- 主要风险：Codex app-server 在 Windows 上的 WebSocket listen/path 行为可能与生成 schema 不一致；移动端依赖安装可能受网络影响；本轮只保证脚手架和探测，不保证完整远程控制闭环。

## 预算选择

选择预算：standard

选择理由：本轮同时改代码、任务包和验证证据，覆盖移动端、Host、Relay、协议四个边界，但仍是第一版骨架和真实探测，不需要 complex artifacts。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | private-plan | TARGET:coding-agent-harness/context/product/product-brief.md | 固定产品边界：手机端是结构化工作台，不是终端或 Agent 替代品。 | coordinator |
| C-002 | private-plan | TARGET:coding-agent-harness/context/architecture/technical-stack-decision.md | 固定 Expo RN、Rust Host/Relay、AgentPal 自有 UI cards 的技术栈。 | coordinator |
| C-003 | private-plan | TARGET:coding-agent-harness/context/architecture/host-session-model.md | 固定 workspace-first session 模型，避免扫描所有历史会话作为主路径。 | coordinator |
| C-004 | private-plan | TARGET:coding-agent-harness/context/architecture/realtime-sync-model.md | 固定 WebSocket + replay 的实时同步边界。 | coordinator |
| C-005 | private-plan | TARGET:coding-agent-harness/context/integrations/agent-adapter-contract.md | 固定 Host adapter、`/` 和 `$` picker、审批/diff 正规化边界。 | coordinator |
| C-006 | code | TARGET:tmp/codex-app-server-ts | Codex app-server 生成类型，只作为本机探测参考，不提交。 | coordinator |

## 步骤

1. 补齐任务包：明确范围、证据深度、Codex app-server 当前已知风险和 no-candidate lesson routing。
2. 创建 Rust workspace：协议 DTO、Host CLI、Codex probe、Relay `/healthz` + `/ws`。
3. 创建 Expo React Native 移动端：工作台首屏、会话卡片、事件卡片、输入栏、基础 token。
4. 运行验证：格式化、编译、Relay health、Host 真实 Codex probe、移动端 typecheck、harness status。
5. 更新 progress/review/walkthrough，提交本轮实现和 harness 任务包。

## 验收标准

- [ ] `cargo fmt --all` 和 `cargo check --workspace` 通过。
- [ ] `agentpal-relay` 能启动，`/healthz` 返回结构化 JSON。
- [ ] `agentpal-host codex probe` 对本机 Codex app-server 进行真实探测，成功或失败都输出结构化 JSON。
- [ ] `apps/mobile` 依赖安装和 TypeScript 检查通过，首屏体现 AgentPal 移动端工作台。
- [ ] `harness status --json .` 通过，且忽略目录未被提交。

## 工作树（Worktree）

- 路径：same checkout
- 分支：当前分支
- Worker owner：coordinator
- Worker handoff commit required：no
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：本轮是单人、单仓初始脚手架，文件边界清晰；使用 worker worktree 会增加协调成本。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：不适用
- Stop Condition 摘要：需要外部账号、云资源、未公开协议猜测或破坏性操作时停止并记录 residual。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：不适用
- Reviewer：self
- No-finding 要求：`review.md` 必须记录已检查命令、残余风险和无阻塞发现声明。

## 关联

- 相关 Regression Gate：`coding-agent-harness/governance/regression/Regression-SSoT.md`
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`2026-05-31-agentpal-foundation-product-architecture-and-sta-8c4cfcfe`；`2026-05-31-agentpal-real-codex-vertical-slice-95a01ac2`

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：pending-coordinator-pass
- Registry update needed：不适用
- Harness Ledger update needed：由 lifecycle closeout 记录
- Closeout / Regression update needed：`walkthrough.md`、`review.md`
