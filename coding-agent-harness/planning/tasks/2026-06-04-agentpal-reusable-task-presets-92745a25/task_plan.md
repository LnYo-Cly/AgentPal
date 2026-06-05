# AgentPal reusable task presets

Task Contract: harness-task/v1
Task Package Index: required

## 目标

新增 AgentPal 项目级 Harness preset，让重复任务自动获得合适的任务方法、证据要求、README/CHANGELOG 判断和提交边界协议。

## 范围

- 做什么：创建 `agentpal-feature`、`agentpal-mobile-ui`、`agentpal-runtime-probe` preset，并验证它们能创建可扫描任务。
- 不做什么：不修改 AgentPal runtime/mobile 产品代码，不安装全局 npm 包，不重写历史任务正文，不执行跨任务混合提交。
- 主要风险：preset manifest schema 边界有限；当前仓库已有大量无关 dirty，提交必须严格隔离。

## 预算选择

选择预算：standard

选择理由：本任务只新增 Harness preset 配置和任务文档，不改产品 runtime；但需要 CLI 校验和 smoke task。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:.coding-agent-harness/presets/standard-task/preset.yaml | 最小 declarative preset manifest 参考 | coordinator |
| C-002 | code | TARGET:.coding-agent-harness/presets/release-closeout/preset.yaml | 复杂 preset 的 evidence/audit/writeScopes 参考 | coordinator |
| C-003 | standard | TARGET:.agents/skills/coding-agent-harness/skills/preset-creator/references/structure-aware-paths.md | 确认 `{{paths.*}}` 写法和 write scope 规则 | coordinator |
| C-004 | standard | TARGET:coding-agent-harness/context/architecture/service-catalog.md | AgentPal surface、Relay、Host、protocol、adapter 边界 | coordinator |

## 步骤

1. 读取现有 preset manifest 和 preset-creator 路径规则。
2. 创建 3 个项目级 preset 包和对应模板。
3. 对每个 preset 执行 `harness preset check`。
4. 用每个 preset 创建 smoke task，验证生成任务进入 `status` / `task-index`。
5. 记录证据、残余风险和提交边界。

## 验收标准

- [ ] `agentpal-feature`、`agentpal-mobile-ui`、`agentpal-runtime-probe` manifest 校验通过。
- [ ] smoke task 证明模板、metadata、audit evidence 可生成。
- [ ] 生成任务材料包含 README/CHANGELOG 判断和 commit/no-commit 规则。
- [ ] 本任务没有混入已有移动端/Host dirty 改动。

## 工作树（Worktree）

- 路径：当前 checkout
- 分支：当前分支
- Worker owner：coordinator
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：只新增 Harness preset 配置和本任务记录，文件切片小且不需要 worker 并行。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：CLI preset 校验无法通过或提交边界无法隔离无关 dirty 时暂停。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self + CLI preset/check 验证
- No-finding 要求：无未解释的 preset check / status / task-index 失败。

## 关联

- 相关 Regression Gate：不适用
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：用户确认将 README/CHANGELOG/commit closeout 规则沉淀为 preset。

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：task lifecycle commands / governance rebuild
- Closeout / Regression update needed：本任务 walkthrough / review
