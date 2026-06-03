# 执行策略

## Subagent Authorization

任务开始时先读这一段，并向用户说明当前授权状态。这里是授权记录，不是执行沙箱。

| Role | Status | Permission | Authorized By | Authorized At | Scope | Worktree / Branch | Reuse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reviewer subagent | allowed by default | read-only | harness task policy | task creation | current task review | n/a | allowed within this task |
| worker subagent | not authorized | write only after user approval | pending | pending | pending | pending | allowed only within approved task/scope |

## Subagent Delegation Decision

| Question | Decision | Reason | Next Action |
| --- | --- | --- | --- |
| Should a reviewer subagent be used? | no | 本轮变更是 Harness CLI 迁移和证据归档，已有 normal/strict/full-cutover 机器验证；无需额外只读 reviewer。 | 使用 self-check，并把 human confirmation 留给 workbench。 |
| Would a worker subagent materially help? | no | 写入范围集中，且当前 checkout 有既有 dirty；并行 worker 会增加共享 Harness 文件冲突。 | coordinator 单线程收口。 |

## User Authorization Decision

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-03 | Harness migration task package only | current checkout / master | 用户已同意迁移，但本任务不需要 worker。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责迁移命令、证据归档、dirty 边界和最终汇报。 |
| Subagent 模式 | none | 不拆 worker；human review gate 由用户确认。 |
| 审查模型 | self-check plus harness verifier | 使用 `check`、`migrate-verify`、full-cutover verify 和 dashboard 证据。 |
| Worktree 策略 | same checkout | 只改 Harness migration scope 和 `.gitignore`；不碰业务 dirty。 |
| 冲突控制 | coordinator owns shared files | Ledger 和 manifest 由 coordinator 管理；不混入 mobile/host/relay dirty。 |
| 证据深度 | L2 | 项目级迁移需要 CLI 运行证据、dashboard 和 full-cutover session 验证。 |

## 子代理 / Worker 合同

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| n/a | C-001..C-004 | n/a | n/a | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `git status --short --branch` | `progress.md` | 区分迁移改动、业务 dirty 和本地 skill 缓存。 |
| L1 | `harness check --profile target-project .` | evidence bundle / `progress.md` | failures 0，dirty-state warning 已解释。 |
| L2 | `harness migrate-run --allow-dirty ...`、`harness migrate-verify ...`、dashboard/workbench | evidence bundle / `walkthrough.md` | session complete，dashboard 可读，verify pass。 |
| L3 | human review confirmation | local workbench | 用户明确确认后才能执行 review-confirm。 |

## 暂停 / 升级条件

- 需要回滚或修改 mobile/host/relay 既有 dirty。
- 需要将外部资料投影到 architecture/development/integrations。
- `migrate-verify --full-cutover` 失败或 strict check 出现 failure。
- 需要执行 human `review-confirm`。

## Legacy Migration Preset Strategy

This preset keeps migration inside the Complex Task contract.

| Area | Rule |
| --- | --- |
| Write boundary | Do not rewrite historical task bodies unless the user explicitly confirms that phase. |
| Evidence source | Use `coding-agent-harness/planning/tasks/2026-06-03-harness-v1-migration-0fc6d60f/evidence/2026-06-03T14-03-14-991Z/` as the handoff bundle. Absolute session paths are origin data only. |
| Target level | `migration-baseline` |
| Achieved level | `migration-baseline` |

## Subagent Lane Table

| Lane ID | Allowed globs | Forbidden globs | Shared file owner | Worktree / branch | Handoff path | Merge order | Verification command |
| --- | --- | --- | --- | --- | --- | --- | --- |
| coordinator | `.gitignore`, `coding-agent-harness/harness.yaml`, current migration task package | mobile/host/relay code dirty and unrelated prior task docs | coordinator | current / master | `walkthrough.md` | 1 | `harness check --profile target-project .` |
