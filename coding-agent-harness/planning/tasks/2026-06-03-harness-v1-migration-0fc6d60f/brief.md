# Harness v1 legacy migration

## Task ID

`2026-06-03-harness-v1-migration-0fc6d60f`

## 创建日期

2026-06-03

## 一句话结果

把当前旧版 Harness 状态接入 v2 manifest / safe-adoption 迁移轨道，并留下可审计的 migration session、dashboard、normal/strict check 和 preset evidence bundle。

## 完成后能得到什么

本任务完成后，后续 agent 可以直接从迁移任务包读取项目 Harness 的当前状态、迁移计划、full-cutover 验证结果、dirty-state 残余和 legacy-migration preset 审计材料。历史任务正文不会被自动重写；当前交付只建立受控迁移基线，并把后续是否深度重写、是否摄取外部资料、是否清理既有 dirty 改动留给明确的后续工作队列。

## 交付物

- 可见产物：`legacy-migration` 任务包、migration evidence bundle、临时 dashboard、safe-adoption capability。
- 修改位置：`coding-agent-harness/harness.yaml`、本任务目录、`coding-agent-harness/governance/generated/Harness-Ledger.md`、`.gitignore`。
- 验证证据：`/tmp/cah-migration-project/session.json`、`/tmp/cah-migration-project/dashboard/index.html`、任务 evidence 目录内的 normal/strict check 与 `migrate-verify` 输出。

## 第一眼应该看什么

先读 `evidence/2026-06-03T14-03-14-991Z/session.json` 和 `migrate-plan.json`，再看 `review.md` 的残余风险与 `walkthrough.md` 的收口摘要。需要人工确认时，使用本地 workbench，而不是静态 dashboard。

## 边界

- 范围内：执行结构迁移 apply、migration run/verify、创建 legacy-migration 任务、记录 full-cutover 证据、忽略本地 skill 安装缓存。
- 范围外：重写历史任务正文、确认 human review gate、清理 mobile/host/relay 既有 dirty 改动、摄取尚未提供的外部资料。
- 停止条件：需要回滚他人改动、需要确认外部资料可信来源、或需要执行 human review-confirm 时必须回到用户。

## 完成判断

- `migrate-structure --apply` 完成，确认当前已是 v2 manifest 布局。
- `migrate-run --allow-dirty --locale zh-CN` 完成并生成 session/dashboard。
- `migrate-verify` 和 full-cutover verify 通过，normal/strict check 只有 dirty-state warning。
- `legacy-migration` preset 任务已创建，并保存 session、plan、checks、preset audit 和 write-scope 证据。
- `.agents/` 与 `skills-lock.json` 已加入忽略策略，不进入项目提交边界。

## 执行合同

- Owner：coordinator
- 生命周期状态：审查中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、`progress.md`、`findings.md`、`review.md`、`walkthrough.md`
- 完成条件：验证证据必须记录到 `progress.md`，人工确认只能由用户通过 workbench 完成。

## 当前下一步

等待用户在 workbench 中进行 human review confirmation；后续再决定是否开展 status-aware rewrite 的深度任务正文对齐。
