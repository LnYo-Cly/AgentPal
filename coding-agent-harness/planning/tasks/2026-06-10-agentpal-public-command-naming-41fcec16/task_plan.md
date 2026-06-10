# AgentPal public command naming

Task Contract: harness-task/v1
Task Package Index: required

## 目标

将当前公开命令和产品表面统一到 `AgentPal` / `agentpal`，删除未发布阶段的 `oap` 与 `openagentpal` 用户入口。

## 范围

- 做什么：更新 CLI bin/script、help 文案、移动端设备名、配对 URL scheme 解析和活跃开发上下文，使对外路径变为 `agentpal pair --workspace .` / `agentpal://pair`。
- 不做什么：不执行 `npm publish`，不改 Railway 平台域名，不重命名 GitHub 仓库，不批量改写历史 Harness 任务。
- 主要风险：误删现网 Relay 域名会导致手机连接失败；机械替换历史审计文本会降低可追溯性。

## 预算选择

选择预算：standard

选择理由：改动小但触及发布入口、移动端文案和 Harness 记录，需要有明确边界、设计记录和验证证据。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:package.json | 当前 npm bin/script 入口。 | coordinator |
| C-002 | code | TARGET:bin/oap.mjs | 当前 CLI wrapper 和 help 文案。 | coordinator |
| C-003 | code | TARGET:apps/mobile/src/hooks/useAgentPalRelay.ts; TARGET:apps/mobile/src/lib/pairing.ts | 当前 mobile deviceName 与配对 URL scheme。 | coordinator |
| C-004 | private-plan | TARGET:coding-agent-harness/context/development/local-setup.md | 活跃本地开发命令说明。 | coordinator |
| C-005 | code | TARGET:apps/mobile/src/lib/relay.ts; TARGET:crates/host/src/codex.rs | 当前 Railway Relay URL，确认不改。 | coordinator |

## 步骤

1. 写短设计，明确命名与不改项。
2. 将源码态入口从 `oap` 改为 `agentpal`，并更新 help 文案、mobile deviceName 和 pairing scheme。
3. 更新活跃开发上下文，不改历史任务审计文本。
4. 运行 CLI、mobile typecheck、diff 和 Harness 检查，并记录证据。

## 验收标准

- [ ] `npm run agentpal -- --help` 通过并展示 `agentpal pair`。
- [ ] `rg` 检查当前代码入口和移动端表面没有 `oap` / `openagentpal://pair` / `OpenAgentPal CLI` / npm bin 别名残留；Railway 平台域名允许保留。
- [ ] `npm --prefix apps/mobile run typecheck` 通过。
- [ ] `git diff --check` 和 `harness check --profile target-project .` 通过。

## 工作树（Worktree）

- 路径：不适用
- 分支：`master`
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：`master`
- 未使用 worktree 的原因：改动集中且没有 worker subagent；当前 checkout 干净，使用主 checkout 可降低发布入口改名的集成开销。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：需要真实 npm 发布、GitHub 重命名或 Relay 域名替换时停止。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：自检确认没有误改现网 Relay 域名或历史任务 ID。

## 关联

- 相关 Regression Gate：RG-001 Cloud Relay Beta pair/create/claim/scoped-route；本任务不改协议和 Relay URL，仅验证未误改。
- 审查报告：TARGET:coding-agent-harness/planning/tasks/2026-06-10-agentpal-public-command-naming-41fcec16/review.md
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：TASKS/2026-06-10-default-public-relay-endpoint-fc62feae

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
