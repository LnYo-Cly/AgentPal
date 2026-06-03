# 收口记录：Harness v1 legacy migration

## 摘要

已完成受控 Harness legacy migration 基线：项目保持 v2 manifest，新增 safe-adoption capability，生成 migration session/dashboard，创建 `legacy-migration` preset 任务并归档证据。历史任务正文未被自动重写。Full-cutover verify 已执行但未通过，后续需要 clean-tree / strict-zero 后再切换。

## 范围

| 范围 | 详情 |
| --- | --- |
| 变更模块 | Harness manifest、当前 migration task package、Harness Ledger、Git ignore rules |
| 新增文件 | `coding-agent-harness/planning/tasks/2026-06-03-harness-v1-migration-0fc6d60f/**` |
| 删除文件 | 无 |
| 不在范围内 | mobile/host/relay 业务 dirty、历史任务正文重写、human review-confirm、外部资料摄取 |

## 验证

| 检查 | 命令或过程 | 结果 | 证据 |
| --- | --- | --- | --- |
| Structure apply | `npx --yes coding-agent-harness migrate-structure --apply --json .` | passed, already-v2 | terminal output |
| Target check | `npx --yes coding-agent-harness check --profile target-project .` | passed with dirty-state warning | evidence bundle normal/strict check |
| Migration run | `npx --yes coding-agent-harness migrate-run --allow-dirty --locale zh-CN --session-dir /tmp/cah-migration-project --out-dir /tmp/cah-migration-project/dashboard .` | complete | `evidence/.../session.json` |
| Migration verify | `npx --yes coding-agent-harness migrate-verify /tmp/cah-migration-project/session.json` | pass | `evidence/.../migrate-verify.json` |
| Full-cutover verify | `npx --yes coding-agent-harness migrate-verify --full-cutover /tmp/cah-migration-project/session.json` | failed: dirty-state warning and `fullCutoverEligible=false` | terminal output |
| Preset task | `npx --yes coding-agent-harness new-task --budget complex --preset legacy-migration --from-session /tmp/cah-migration-project/session.json .` | task created, evidence archived, auto commit made | commit `d9062b5daa4f7646c04c3ae54969e4817d1d6ebc` |
| Human confirmation | local workbench | confirmed, `HRC-202606031420` | commits `dfa09b5`, `e30a9a3` |
| Task complete | `harness task-complete 2026-06-03-harness-v1-migration-0fc6d60f ...` | failed: write-scope git status error | terminal output |

## 审查结论

| 来源 | 重要发现 | 处理 | 证据 |
| --- | --- | --- | --- |
| self review | none | submitted for human confirmation | `review.md` |
| Harness checks | dirty-state warning only | accepted residual, not mixed into migration commit | `progress.md` |

## 残余风险

| 风险 | Owner | 是否接受 | 跟进 |
| --- | --- | --- | --- |
| 既有业务 dirty 仍存在 | coordinator / user | yes | 后续按功能切片验证并提交 |
| human review confirmation pending | user | yes | 通过本地 workbench 确认 |
| lifecycle CLI write-scope failure | coordinator | yes | clean-tree 后可重试 task-start/task-review |
| closeout CLI write-scope failure | coordinator | yes | clean-tree 后可重试 task-complete |
| full-cutover not eligible | coordinator | yes | clean-tree 且 strict warning 清零后重新运行 migration session |

## 经验沉淀反思

| 问题 | 答案 |
| --- | --- |
| 是否完成经验候选检查？ | 已完成，无候选 |
| 经验候选详情文件 | `lesson_candidates.md` |

## 收口链接

| 产物 | 链接 |
| --- | --- |
| 任务计划 | `task_plan.md` |
| 审查记录 | `review.md` |
| 进度记录 | `progress.md` |
| Migration session | `evidence/2026-06-03T14-03-14-991Z/session.json` |
| Migration plan | `evidence/2026-06-03T14-03-14-991Z/migrate-plan.json` |
