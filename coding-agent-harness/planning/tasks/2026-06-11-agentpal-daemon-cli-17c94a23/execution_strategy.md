# 执行策略

## Subagent Authorization

任务开始时先读这一段，并向用户说明当前授权状态。这里是授权记录，不是执行沙箱。

| Role | Status | Permission | Authorized By | Authorized At | Scope | Worktree / Branch | Reuse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reviewer subagent | allowed by default | read-only | harness task policy | task creation | current task review | n/a | allowed within this task |
| worker subagent | not authorized | write only after user approval | pending | pending | pending | pending | allowed only within approved task/scope |

## Subagent Delegation Decision

任务开始时，coordinator 必须根据用户目标主动做这个判断，即使用户完全没有提到 subagent。
不要假设用户知道 subagent 或 worker 是什么。如果分工有帮助，用白话说明收益，并向用户申请一次授权。
可以直接对用户说 subagent 或 worker subagent；关键规则是 agent 不能等用户主动提出 subagent。
如果任务已经明显拆成互不重叠的独立切片，implementation 前就应判断为 `ask-user`。如果还不知道精确文件路径，先确认路径，然后立刻申请独立执行助手授权。

| Question | Decision | Reason | Next Action |
| --- | --- | --- | --- |
| Should a reviewer subagent be used? | yes | 这个切片涉及后台进程、状态文件和用户可见 CLI，适合做只读 adversarial review。 | 直接在实现后提交 review packet。 |
| Would a worker subagent materially help? | no | 任务边界很窄，且共享文件和 CLI 入口需要同一协调者顺序修改；并行收益不高。 | 不申请 worker。 |

## User Authorization Decision

如果上方 worker 决策是 `ask-user`，implementation 必须暂停，直到这里记录用户答案。
已解决状态只能是 `authorized`, `denied` 或 `not-needed`。选择 `ask-user` 后不得继续保持 `pending`。

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-11 15:50 | n/a | n/a | 任务未拆分并行切片。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | 由 coordinator 顺序修改 CLI、文档和 task package，避免共享状态漂移。 |
| Subagent 模式 | reviewer-only | 只需要一轮只读审查，不拆 worker。 |
| 审查模型 | adversarial review | 后台进程和状态文件容易在边界上出错，需要对抗性自检。 |
| Worktree 策略 | same checkout | 单切片顺序完成，不值得额外 worktree 成本。 |
| 冲突控制 | coordinator owns shared files | 任务文件、README 和 CLI 入口由 coordinator 统一写。 |
| 证据深度 | L2 | 需要本地 smoke + 后台进程验证，而不只是静态检查。 |

## 子代理 / Worker 合同

如使用 subagent 或 worker，在这里写清楚输入包、写入范围、handoff 格式和最终集成 owner。

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| reviewer | C-001..C-005 | read-only | review.md 里的发现和证据引用 | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | CLI help / task package 自检 | `progress.md` | 任务包字段完整，help 路由可见。 |
| L1 | targeted smoke | `progress.md` | `pair`、`daemon start|status|stop|logs` 路径至少做一次本地冒烟。 |
| L2 | detached process verification | `progress.md` + `review.md` | 证明关闭父终端后 daemon 仍在，且可以用 status/stop 回收。 |
| L3 | n/a | n/a | 本任务不做发布前等价验证。 |

## 暂停 / 升级条件

- 所需工作超出已批准写入范围。
- 共享表需要更新，但没有 coordinator lock。
- 实际风险高于原计划，证据深度需要升级。
- reviewer 发现会改变范围或方案的 P0/P1/P2 问题。
- 环境无法提供关键证据，继续执行会变成猜测。
