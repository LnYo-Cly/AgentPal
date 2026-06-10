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
| Should a reviewer subagent be used? | no | 本任务需要 npm 登录态、发布凭据和实际 publish 验证；当前可用证据主要来自本地命令和 registry，使用 coordinator self release review 更直接。 | 写完整 `review.md` release/security 自审，最终等待 human review confirmation。 |
| Would a worker subagent materially help? | no | 改动集中在 package/CLI wrapper/任务包，且 publish 是单 owner 外部动作；并行 worker 会增加 shared release 文件和 npm 状态协调风险。 | 不申请 worker 授权。 |

## User Authorization Decision

如果上方 worker 决策是 `ask-user`，implementation 必须暂停，直到这里记录用户答案。
已解决状态只能是 `authorized`、`denied` 或 `not-needed`。选择 `ask-user` 后不得继续保持 `pending`。

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-10 | npm release packaging and publish | master / main checkout | 发布任务保持单 owner。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责编排顺序、冲突判断和最终收口。 |
| Subagent 模式 | none | 不使用 worker；发布前通过命令证据和 release review 控制风险。 |
| 审查模型 | adversarial release self-review | 检查发布包内容、敏感文件、CLI 路径解析、临时安装和 registry 结果。 |
| Worktree 策略 | same checkout | 当前 checkout 已承载 npm/GitHub 发布上下文；没有 worker 写入。 |
| 冲突控制 | coordinator owns shared files | subagent 不得直接编辑 coordinator 管理的全局表或共享文件，除非获得明确锁。 |
| 证据深度 | L3 | 真实外部 npm 发布需要发布前 tarball 审查、临时安装验证和发布后 registry/npx 验证。 |

## 子代理 / Worker 合同

如使用 subagent 或 worker，在这里写清楚输入包、写入范围、handoff 格式和最终集成 owner。

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| n/a | C-001..C-005 | n/a | n/a | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `node -e` parse package JSON; `npm run agentpal -- --help`; static tarball allow/deny list script | `progress.md` | 元数据和 CLI help 正常，包内容没有明显无关/敏感文件。 |
| L1 | `cargo fmt --check`; `cargo check --workspace`; `cargo test -p agentpal-relay` | `progress.md` | Rust workspace 可构建，relay 关键测试通过。 |
| L2 | `npm pack`; temporary npm prefix install; installed `agentpal --help` and host help | `progress.md` | 模拟外部用户安装路径成功。 |
| L3 | `npm publish --access public`; `npm view agentpal version`; `npx agentpal@latest --help` | `review.md` 与 walkthrough | registry 显示发布版本，npx 可运行公开包。 |

## 暂停 / 升级条件

- 所需工作超出已批准写入范围。
- 共享表需要更新，但没有 coordinator lock。
- 实际风险高于原计划，证据深度需要升级。
- reviewer 发现会改变范围或方案的 P0/P1/P2 问题。
- 环境无法提供关键证据，继续执行会变成猜测。
