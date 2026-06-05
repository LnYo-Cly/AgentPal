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
| Should a reviewer subagent be used? | no | 变更是 declarative preset 和模板文件，主要风险由 `harness preset check`、smoke task、`status/task-index/check` 覆盖。 | 使用 CLI 和人工可读 diff 自检。 |
| Would a worker subagent materially help? | no | 三个 preset 文件结构相同但共享 closeout 规则，串行编辑能更好保持一致；并行 worker 会增加共享模板口径冲突。 | 不申请 worker 授权。 |

## User Authorization Decision

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-04 | `.coding-agent-harness/presets/agentpal-*` and current task package | current checkout | 小范围 declarative 文件，不需要并行 worker。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责编排顺序、冲突判断和最终收口。 |
| Subagent 模式 | none | 不使用 worker；不需要只读 reviewer。 |
| 审查模型 | predefined verifier | `harness preset check`、smoke task、`status/task-index/check` 是主要验证器。 |
| Worktree 策略 | same checkout | 只触达 Harness preset 和本任务包；无 worker 写入。 |
| 冲突控制 | coordinator owns shared files | subagent 不得直接编辑 coordinator 管理的全局表或共享文件，除非获得明确锁。 |
| 证据深度 | L1 | 配置/模板变更需要 manifest 校验和生成任务 smoke test。 |

## 子代理 / Worker 合同

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| n/a | C-001..C-004 | n/a | n/a | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `git status --short`; inspect preset manifests | `progress.md` | 写入范围只包含 preset 和当前任务记录。 |
| L1 | `harness preset check`; `harness new-task --preset ...`; `harness status --json`; `harness task-index --json`; `harness check --profile target-project` | `progress.md` | 三个 preset 均能创建可扫描任务。 |
| L2 | 不适用 | n/a | n/a |
| L3 | 不适用 | n/a | n/a |

## 暂停 / 升级条件

- 所需工作超出已批准写入范围。
- preset manifest 需要非 declarative 行为或脚本 action 才能表达。
- 共享表需要更新，但没有 coordinator lock。
- 当前 dirty 状态无法排除无关文件。
- 环境无法提供关键证据，继续执行会变成猜测。
