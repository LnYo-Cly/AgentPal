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
| Should a reviewer subagent be used? | no | 本轮主要是同一协议链路和真实本地探针验证，self-review 加真实 Codex probe 足够覆盖风险。 | 记录 self-review 到 `review.md`。 |
| Would a worker subagent materially help? | no | 改动集中在 Host/Relay/mobile 协议闭环，拆 worker 会增加同步成本和 dirty worktree 冲突风险。 | coordinator 直接实现和验证。 |

## User Authorization Decision

如果上方 worker 决策是 `ask-user`，implementation 必须暂停，直到这里记录用户答案。
已解决状态只能是 `authorized`、`denied` 或 `not-needed`。选择 `ask-user` 后不得继续保持 `pending`。

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-02 01:21 Asia/Shanghai | Host/Relay/mobile pairing and session slice | same checkout | 单人 coordinator 执行更稳。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责编排顺序、冲突判断和最终收口。 |
| Subagent 模式 | none | 任务接口强耦合且已有 dirty worktree，保持 coordinator 单线执行。 |
| 审查模型 | self-check + real integration probes | TypeScript/Rust/static checks之外，增加真实 Codex realtime 和 history WebSocket 探针。 |
| Worktree 策略 | same checkout | 用户当前在同一项目真机测试，切换 worktree 会让 Expo/Host 运行路径复杂化。 |
| 冲突控制 | coordinator owns shared files | subagent 不得直接编辑 coordinator 管理的全局表或共享文件，除非获得明确锁。 |
| 证据深度 | L2 | 涉及 mobile + Relay + Host + Codex，本轮需要真实本地集成探针。 |

## 子代理 / Worker 合同

如使用 subagent 或 worker，在这里写清楚输入包、写入范围、handoff 格式和最终集成 owner。

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| n/a | C-001..C-004 | n/a | n/a | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `git diff --check` | `progress.md` | 无空白错误；Windows LF/CRLF 警告可接受。 |
| L1 | `npm --prefix apps/mobile run typecheck`; `CARGO_TARGET_DIR=tmp/target-pairing cargo check --workspace` | `progress.md` | 退出码 0。 |
| L2 | Expo iOS export；Node WebSocket real Codex probe；Node WebSocket history probe | `progress.md` 和 `review.md` | 同一 session 收到 `PONG`，history page 返回当前 session 事件。 |
| L3 | 用户真机确认 | `review.md` / Dashboard confirmation | 用户确认手机端 UI 与连接行为符合预期。 |

## 暂停 / 升级条件

- 所需工作超出已批准写入范围。
- 共享表需要更新，但没有 coordinator lock。
- 实际风险高于原计划，证据深度需要升级。
- reviewer 发现会改变范围或方案的 P0/P1/P2 问题。
- 环境无法提供关键证据，继续执行会变成猜测。
