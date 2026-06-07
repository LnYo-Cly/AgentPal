# 执行策略

## Subagent Authorization

任务开始时先读这一段，并向用户说明当前授权状态。这里是授权记录，不是执行沙箱。

| Role | Status | Permission | Authorized By | Authorized At | Scope | Worktree / Branch | Reuse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reviewer subagent | allowed by default | read-only | harness task policy | task creation | current task review | n/a | allowed within this task |
| worker subagent | authorized | write within bounded slice | user | 2026-06-07 | mobile pairing parser / relay URL compatibility only | `G:\My_Project\python\gitlab\pocket_agent\.worktrees\openagentpal-cloud-relay-mvp` / `work/openagentpal-cloud-relay-mvp` | allowed within this task/scope |

## Subagent Delegation Decision

任务开始时，coordinator 必须根据用户目标主动做这个判断，即使用户完全没有提到 subagent。
不要假设用户知道 subagent 或 worker 是什么。如果分工有帮助，用白话说明收益，并向用户申请一次授权。
可以直接对用户说 subagent 或 worker subagent；关键规则是 agent 不能等用户主动提出 subagent。
如果任务已经明显拆成互不重叠的独立切片，implementation 前就应判断为 `ask-user`。如果还不知道精确文件路径，先确认路径，然后立刻申请独立执行助手授权。

| Question | Decision | Reason | Next Action |
| --- | --- | --- | --- |
| Should a reviewer subagent be used? | yes | Cloud Relay 改变公网安全边界，需要对抗性审查；本轮先由 coordinator self-adversarial review，必要时再加只读 reviewer。 | 在 `review.md` 写 Confidence Challenge 和安全 findings。 |
| Would a worker subagent materially help? | already-authorized | Rust protocol/relay/host 与 mobile pairing parser 写入范围可拆分；用户明确要求可并行就并行。 | 已派 worker 处理移动端 pairing 兼容切片。 |

## User Authorization Decision

如果上方 worker 决策是 `ask-user`，implementation 必须暂停，直到这里记录用户答案。
已解决状态只能是 `authorized`、`denied` 或 `not-needed`。选择 `ask-user` 后不得继续保持 `pending`。

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | authorized | user | 2026-06-07 | `apps/mobile/src/lib/pairing.ts`, `apps/mobile/src/lib/relay.ts`, `apps/mobile/src/hooks/useAgentPalRelay.ts` | `.worktrees/openagentpal-cloud-relay-mvp` / `work/openagentpal-cloud-relay-mvp` | worker 不得修改 Rust crates 或 Harness 文件。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责编排顺序、冲突判断和最终收口。 |
| Subagent 模式 | worker-worktree + self adversarial review | 用户授权并行；worker 只处理移动端解析兼容，coordinator 处理 Rust 和集成。 |
| 审查模型 | adversarial review | Cloud Relay 涉及公网连接和配对 token，必须挑战安全边界与残余。 |
| Worktree 策略 | dedicated worktree | 主 checkout 只保留任务生命周期状态，所有实现集中在隔离 worktree 分支。 |
| 冲突控制 | coordinator owns shared files | subagent 不得直接编辑 coordinator 管理的全局表或共享文件，除非获得明确锁。 |
| 证据深度 | L2 | 覆盖 Rust workspace check、mobile typecheck、本地 WebSocket smoke、Harness check。 |

## 子代理 / Worker 合同

如使用 subagent 或 worker，在这里写清楚输入包、写入范围、handoff 格式和最终集成 owner。

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| worker | C-004 | mobile pairing/relay files only | commit SHA, changed files, typecheck result, residual risk | worker subagent |
| reviewer | C-001..C-005 + diff | read-only | material findings or no-finding statement | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `cargo fmt --check`; `git diff --check` | `progress.md` | 无格式/whitespace error。 |
| L1 | `cargo check --workspace`; `npm --prefix apps/mobile run typecheck` | `progress.md` 或 `artifacts/INDEX.md` | Rust 和 mobile 类型检查通过。 |
| L2 | 本地启动 `agentpal-relay`，用 Host/Mobile mock 或 CLI 完成 pair create/claim/command route smoke | `artifacts/INDEX.md` | 证明 mobile-style command 只路由到绑定 Host。 |
| L3 | 不做生产发布；安全对抗审查写入 `review.md` | `review.md` 与 walkthrough | 公开 Beta 前残余风险明确列出。 |

## 暂停 / 升级条件

- 所需工作超出已批准写入范围。
- 共享表需要更新，但没有 coordinator lock。
- 实际风险高于原计划，证据深度需要升级。
- reviewer 发现会改变范围或方案的 P0/P1/P2 问题。
- 环境无法提供关键证据，继续执行会变成猜测。
