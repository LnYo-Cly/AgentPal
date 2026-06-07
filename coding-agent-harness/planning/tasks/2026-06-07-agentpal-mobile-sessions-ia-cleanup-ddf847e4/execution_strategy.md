# 执行策略

## Subagent Authorization

任务开始时先读这一段，并向用户说明当前授权状态。这里是授权记录，不是执行沙箱。

| Role | Status | Permission | Authorized By | Authorized At | Scope | Worktree / Branch | Reuse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reviewer subagent | allowed by default | read-only | harness task policy | task creation | current task review | n/a | allowed within this task |
| worker subagent | not-needed | no worker used | coordinator | 2026-06-07 14:56 | current task UI/IA cleanup | TARGET:. | not applicable |

## Subagent Delegation Decision

任务开始时，coordinator 必须根据用户目标主动做这个判断，即使用户完全没有提到 subagent。
不要假设用户知道 subagent 或 worker 是什么。如果分工有帮助，用白话说明收益，并向用户申请一次授权。
可以直接对用户说 subagent 或 worker subagent；关键规则是 agent 不能等用户主动提出 subagent。
如果任务已经明显拆成互不重叠的独立切片，implementation 前就应判断为 `ask-user`。如果还不知道精确文件路径，先确认路径，然后立刻申请独立执行助手授权。

| Question | Decision | Reason | Next Action |
| --- | --- | --- | --- |
| Should a reviewer subagent be used? | no | 本轮是单文件移动端 UI/IA 调整，主要风险在视觉判断与真机体验；self-review 加类型/导出检查足够，最终审美确认由用户真机完成。 | 不调用 reviewer subagent。 |
| Would a worker subagent materially help? | no | 可写范围集中在 `apps/mobile/app/index.tsx` 和当前任务材料，并行会增加共享文件冲突。 | coordinator 直接实现。 |

## User Authorization Decision

如果上方 worker 决策是 `ask-user`，implementation 必须暂停，直到这里记录用户答案。
已解决状态只能是 `authorized`、`denied` 或 `not-needed`。选择 `ask-user` 后不得继续保持 `pending`。

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-07 14:56 | `apps/mobile/app/index.tsx` 和当前任务材料 | TARGET:. | 单文件 UI 结构调整，不需要 worker。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责编排顺序、冲突判断和最终收口。 |
| Subagent 模式 | none | 修改集中，用户要求继续执行，不拆 worker。 |
| 审查模型 | self-check + predefined verifier | 使用 TypeScript、Expo export、diff check、Harness check 验证基础正确性，人工真机判断视觉结果。 |
| Worktree 策略 | same checkout | 当前只有本任务相关 dirty，避免额外 worktree 带来 Expo 依赖和端口复杂度。 |
| 冲突控制 | coordinator owns shared files | subagent 不得直接编辑 coordinator 管理的全局表或共享文件，除非获得明确锁。 |
| 证据深度 | L1 | 单文件 UI 行为调整，使用类型检查、导出和 Harness 检查作为证据。 |

## 子代理 / Worker 合同

如使用 subagent 或 worker，在这里写清楚输入包、写入范围、handoff 格式和最终集成 owner。

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| n/a | C-001, C-002, C-003 | n/a | n/a | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `git diff --check` | `progress.md` | 无 whitespace/error diff 问题。 |
| L1 | `npm --prefix apps/mobile run typecheck` | `progress.md` | TypeScript 检查通过。 |
| L1 | `npx expo export --platform ios --output-dir ../../tmp/expo-export-sessions-ia --clear` | `progress.md` | Expo bundle/export 成功。 |
| L1 | `npx --yes coding-agent-harness check --profile target-project .` | `progress.md` | 当前任务无新阻塞；历史 warning 如仍存在需标明非本轮范围。 |

## 暂停 / 升级条件

- 所需工作超出已批准写入范围。
- 共享表需要更新，但没有 coordinator lock。
- 实际风险高于原计划，证据深度需要升级。
- reviewer 发现会改变范围或方案的 P0/P1/P2 问题。
- 环境无法提供关键证据，继续执行会变成猜测。
