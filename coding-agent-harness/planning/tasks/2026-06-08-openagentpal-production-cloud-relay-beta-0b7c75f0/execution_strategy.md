# 执行策略

## Subagent Authorization

任务开始时先读这一段，并向用户说明当前授权状态。这里是授权记录，不是执行沙箱。

| Role | Status | Permission | Authorized By | Authorized At | Scope | Worktree / Branch | Reuse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reviewer subagent | allowed by default | read-only | harness task policy | task creation | current task review | n/a | allowed within this task |
| worker subagent | not-needed | n/a | coordinator decision | 2026-06-08 | n/a | n/a | n/a |

## Subagent Delegation Decision

任务开始时，coordinator 必须根据用户目标主动做这个判断，即使用户完全没有提到 subagent。
不要假设用户知道 subagent 或 worker 是什么。如果分工有帮助，用白话说明收益，并向用户申请一次授权。
可以直接对用户说 subagent 或 worker subagent；关键规则是 agent 不能等用户主动提出 subagent。
如果任务已经明显拆成互不重叠的独立切片，implementation 前就应判断为 `ask-user`。如果还不知道精确文件路径，先确认路径，然后立刻申请独立执行助手授权。

| Question | Decision | Reason | Next Action |
| --- | --- | --- | --- |
| Should a reviewer subagent be used? | yes | 公网 Relay 和配对 token 改变安全边界，需要对抗性审查；先由 coordinator self-adversarial review，若发现高风险再加只读 reviewer。 | 在 `review.md` 写 Confidence Challenge、material findings 和 residual risk。 |
| Would a worker subagent materially help? | no | 本轮核心改动集中在 Relay store、路由授权和 CLI 默认端点，强耦合且文件面不大；拆 worker 会增加集成和安全审查成本。 | 不派 worker；coordinator 使用 dedicated worktree 完成。 |

## User Authorization Decision

如果上方 worker 决策是 `ask-user`，implementation 必须暂停，直到这里记录用户答案。
已解决状态只能是 `authorized`、`denied` 或 `not-needed`。选择 `ask-user` 后不得继续保持 `pending`。

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-08 | n/a | n/a | 用户允许可并行时并行；本轮判定无需 worker subagent。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责编排顺序、冲突判断和最终收口。 |
| Subagent 模式 | reviewer-only / self adversarial | 不使用可写 worker；保留只读审查能力。 |
| 审查模型 | adversarial review | Pair token、device token 和公网默认端点是安全敏感边界。 |
| Worktree 策略 | dedicated worktree | 使用 `.worktrees/production-cloud-relay-beta` / `work/production-cloud-relay-beta`。 |
| 冲突控制 | coordinator owns shared files | subagent 不得直接编辑 coordinator 管理的全局表或共享文件，除非获得明确锁。 |
| 证据深度 | L2 | 覆盖 Rust check/test、CLI help、local WebSocket smoke、Harness check；真实公网 TLS 上线记为 residual。 |

## 子代理 / Worker 合同

如使用 subagent 或 worker，在这里写清楚输入包、写入范围、handoff 格式和最终集成 owner。

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| reviewer | C-001..C-005 + diff | read-only | material findings or no-finding statement | coordinator |
| worker | n/a | n/a | n/a | n/a |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `cargo fmt --check`; `git diff --check` | `progress.md` | 无格式或 whitespace error。 |
| L1 | `cargo check --workspace`; `cargo test -p agentpal-relay`; `npm exec -- oap --help` | `progress.md` 或 `artifacts/INDEX.md` | Rust、Relay tests 和 CLI help 通过。 |
| L2 | local Relay smoke with in-memory store, plus Redis test when Redis is available | `artifacts/INDEX.md` | 证明未授权 mobile 被拒、pair claim 后 device token 可授权路由。 |
| L3 | production deployment review only | `review.md` 与 walkthrough | 域名/TLS/真实 VPS 未配置时记录 residual，不声称 live production。 |

## 暂停 / 升级条件

- 所需工作超出已批准写入范围。
- 共享表需要更新，但没有 coordinator lock。
- 实际风险高于原计划，证据深度需要升级。
- reviewer 发现会改变范围或方案的 P0/P1/P2 问题。
- 环境无法提供关键证据，继续执行会变成猜测。
