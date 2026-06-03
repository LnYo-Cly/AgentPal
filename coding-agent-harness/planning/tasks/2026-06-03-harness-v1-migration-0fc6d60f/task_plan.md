# Harness v1 legacy migration

Task Contract: harness-task/v1
Task Kind: project-migration
Task Preset: legacy-migration
Preset Version: 2
Migration Target Level: migration-baseline
Migration Achieved Level: migration-baseline
Evidence Bundle: coding-agent-harness/planning/tasks/2026-06-03-harness-v1-migration-0fc6d60f/evidence/2026-06-03T14-03-14-991Z
Task Package Index: required

## 目标

Create a controlled Harness v1 migration task from the recorded migrate-run session without rewriting history automatically.

## 范围

- 做什么：固定 `status-aware-rewrite` 迁移基线，执行结构 apply、target-project check、migration run/verify、legacy-migration preset 任务创建、证据归档和本地工具缓存忽略。
- 不做什么：不自动重写历史任务正文，不处理 mobile/host/relay 业务 dirty，不执行 human review-confirm，不把 `.agents/` 或 `skills-lock.json` 纳入提交。
- 主要风险：当前 checkout 存在既有 dirty；CLI lifecycle 命令的 write-scope 检查失败；外部资料尚未提供；full-cutover 语义只覆盖当前 migration session，不代表历史任务全部人工复核。

## 预算选择

选择预算：complex

选择理由：这是项目级 Harness 迁移，涉及 capability registry、migration session、dashboard、preset evidence、normal/strict check、Ledger 以及 human review gate。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | private-plan | TARGET:coding-agent-harness/harness.yaml | 确认 v2 manifest、locale 和 capability 状态 | coordinator |
| C-002 | private-plan | TARGET:coding-agent-harness/planning/tasks/ | 读取现有任务覆盖、状态和 review 队列 | coordinator |
| C-003 | report | TARGET:coding-agent-harness/planning/tasks/2026-06-03-harness-v1-migration-0fc6d60f/evidence/2026-06-03T14-03-14-991Z/session.json | 本次迁移 session 的核心证据 | coordinator / reviewer |
| C-004 | report | TARGET:coding-agent-harness/planning/tasks/2026-06-03-harness-v1-migration-0fc6d60f/evidence/2026-06-03T14-03-14-991Z/migrate-plan.json | 后续迁移队列和 residual 判断来源 | coordinator / reviewer |

## 步骤

1. 安装并确认全局 `harness` 命令，读取 preset 列表。
2. 执行 `migrate-structure --apply`，确认结构已是 v2 manifest。
3. 执行 `check --profile target-project`，记录 normal warning。
4. 执行 `migrate-run --allow-dirty --locale zh-CN`，生成 session、report、dashboard。
5. 执行 `migrate-verify` 和 full-cutover verify。
6. 用 `legacy-migration` preset 创建受控迁移任务并归档证据。
7. 处理本地 skill 缓存忽略策略，复查状态并暴露 workbench。

## 验收标准

- [x] `harness` 可用，`legacy-migration` preset 可发现。
- [x] v2 manifest 结构 apply 成功，实际无需移动文件。
- [x] migration session 结果为 `complete`，dashboard 可读。
- [x] `migrate-verify` 通过；full-cutover verify 已执行但未通过，原因是 strict 仍有 dirty-state warning 且 `fullCutoverEligible=false`。
- [x] `legacy-migration` preset 任务已创建并保存 evidence bundle。
- [x] `.agents/` 与 `skills-lock.json` 不再出现在普通 git status 中。

## 工作树（Worktree）

- 路径：当前 checkout `G:\My_Project\python\gitlab\pocket_agent`
- 分支：`master`
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：`master`
- 未使用 worktree 的原因：迁移写入范围集中在 Harness task package、manifest 和 `.gitignore`，不需要并行 worker。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：用户已确认本轮迁移继续执行
- Stop Condition 摘要：遇到 human gate、外部资料摄取决策或需要回滚他人 dirty 时停止。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：不适用
- Reviewer：self
- No-finding 要求：normal/strict/migrate-verify/full-cutover 验证通过，review 无 open P0/P1/P2。

## 关联

- 相关 Regression Gate：`harness check --profile target-project .`
- 审查报告：`review.md`
- Generated Ledger：`coding-agent-harness/governance/generated/Harness-Ledger.md`
- 前置任务：用户确认的迁移计划和 `migrate-plan` 扫描结果

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：synced for migration task creation; pending for unrelated dirty work
- Registry update needed：不适用
- Harness Ledger update needed：已由 `new-task --preset legacy-migration` 同步
- Closeout / Regression update needed：等待 human confirmation 后再 closeout

## Legacy Migration Preset

This Complex Task uses the `legacy-migration` preset package. The preset only scaffolds the migration task and records evidence at creation time. It does not run migration, rewrite historical task bodies, stage files, or commit arbitrary changes.

- Preset version: `2`
- Baseline session: `coding-agent-harness/planning/tasks/2026-06-03-harness-v1-migration-0fc6d60f/evidence/2026-06-03T14-03-14-991Z/session.json`
- Migration plan: `coding-agent-harness/planning/tasks/2026-06-03-harness-v1-migration-0fc6d60f/evidence/2026-06-03T14-03-14-991Z/migrate-plan.json`
- Strict deferred: no
- Full-cutover claim allowed now: no, because `migrate-verify --full-cutover` failed on dirty-state / strict warning gates
