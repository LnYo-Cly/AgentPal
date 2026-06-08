# OpenAgentPal Production Cloud Relay Beta

Task Contract: harness-task/v1
Task Package Index: required

## 目标

让 OpenAgentPal 具备公网 Beta 的 Relay 基础：默认 `oap pair` 面向公网端点，Relay 支持 Redis-backed pairing/device binding，并附带部署与验证材料。

## 范围

- 做什么：实现 Redis/in-memory store 抽象；存储 pair session、device binding、cloud host marker；增加生产配对强制开关；更新 CLI 默认 Relay URL；提供 Docker Compose 部署包；记录验证和对抗审查。
- 不做什么：不做桌面安装包；不真实开通公网服务器/DNS/TLS；不做账号系统、付费、设备撤销 UI、完整 E2E 加密或多实例跨节点 WebSocket 路由。
- 主要风险：公网安全边界扩大；Redis 配置错误会导致伪生产；默认公网 URL 在真实服务上线前只是产品默认值，不代表当前仓库已经有在线服务。

## 预算选择

选择预算：complex

选择理由：任务跨 Relay 后端、Host/CLI 默认行为、部署配置、Harness 证据和安全审查，且涉及公网配对安全边界。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | design | TARGET:docs/plans/2026-06-08-production-cloud-relay-beta-design.md | 固化已批准的 Beta 方案、边界和验证标准。 | coordinator / reviewer |
| C-002 | code | TARGET:crates/relay/src/main.rs | Relay pair create/claim、routing、state registry 实现位置。 | coordinator / reviewer |
| C-003 | code | TARGET:bin/oap.mjs; TARGET:crates/host/src/codex.rs | CLI 默认公网 Relay URL 和 Host create-pair 行为。 | coordinator / reviewer |
| C-004 | context | TARGET:coding-agent-harness/context/architecture/service-catalog.md; TARGET:coding-agent-harness/context/development/local-setup.md | 服务职责和本地命令 SSoT。 | coordinator |
| C-005 | prior task | TARGET:coding-agent-harness/planning/tasks/2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e/review.md | 复用 MVP 对抗发现和残余风险。 | coordinator / reviewer |

## 步骤

1. 设计和任务合同：补齐设计文档、brief、execution strategy、visual map，并启动 Harness task。
2. Relay store：增加 in-memory / Redis store，令 pair session 和 device binding 使用 token hash 存储，并支持 production require-pairing。
3. CLI / Host：把 `oap pair` 默认 Relay URL 改为公网 Beta URL，同时保留本地 override。
4. 部署材料：新增 `deploy/relay` Docker Compose / README，说明 Redis、TLS、域名和单实例边界。
5. 验证与审查：运行格式、编译、relay 单测、CLI help、local smoke，并写入 review / walkthrough / regression。

## 验收标准

- [ ] `cargo test -p agentpal-relay` 覆盖 store 行为、pair token 一次性消费、未配对 mobile 拒绝和已验证路由。
- [ ] `npm exec -- oap --help` 展示公网默认值与本地 override。
- [ ] `deploy/relay` 可说明如何用 Relay+Redis 运行单实例 Beta。
- [ ] 对抗审查确认没有 open P0/P1/P2 finding；生产残余明确记录。

## 工作树（Worktree）

- 路径：`.worktrees/production-cloud-relay-beta`
- 分支：`work/production-cloud-relay-beta`
- Worker owner：coordinator
- Worker handoff commit required：no
- Coordinator integration branch：`master`
- 未使用 worktree 的原因：不适用，已使用 dedicated worktree。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：需要真实公网服务器、域名或云平台凭据时停止，并记录 residual。

## 审查判定

- 是否需要对抗性审查：是
- 若是，报告文件：`review.md`
- Reviewer：self adversarial；必要时只读 reviewer
- No-finding 要求：无 open P0/P1/P2；所有生产残余必须写 owner / follow-up。

## 关联

- 相关 Regression Gate：Cloud Relay / public pairing beta gate，写入 Regression SSoT。
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`TASKS/2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e`

## 模块关联（启用模块并行时填写）

- Module：[module key，例如 reader / graph / 不适用]
- Step：[step ID，例如 RDR-02 / 不适用]
- Module Plan：[link to module_plan.md / 不适用]

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator / 不适用
- Global sync status：pending-coordinator-pass / synced / n/a
- Registry update needed：[module key, step, status, branch, updated / 不适用]
- Harness Ledger update needed：[task plan path, review path, closeout status / 不适用]
- Closeout / Regression update needed：[路径或 n/a]
