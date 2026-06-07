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
| Should a reviewer subagent be used? | no | 本次是单屏 UI polish，主要风险可由类型检查、Expo 导出和人工截图复核覆盖。 | coordinator 自检并记录证据。 |
| Would a worker subagent materially help? | no | 改动集中在 `apps/mobile/app/index.tsx` 的同一组布局和状态 helper，并行拆分会增加冲突风险。 | 不申请 worker 授权。 |

## User Authorization Decision

如果上方 worker 决策是 `ask-user`，implementation 必须暂停，直到这里记录用户答案。
已解决状态只能是 `authorized`、`denied` 或 `not-needed`。选择 `ask-user` 后不得继续保持 `pending`。

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-07 | `apps/mobile/app/index.tsx` UI polish | same checkout | 单文件同屏协调改动，不拆 worker。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责编排顺序、冲突判断和最终收口。 |
| Subagent 模式 | none | 选择能满足任务的最小协作模式。 |
| 审查模型 | self-check | 截图反馈驱动的局部 UI 调整，类型检查和 Expo 导出足够覆盖编译/打包风险。 |
| Worktree 策略 | same checkout | 会改代码的 subagent 必须使用独立 worktree，并提交 handoff commit。 |
| 冲突控制 | coordinator owns shared files | subagent 不得直接编辑 coordinator 管理的全局表或共享文件，除非获得明确锁。 |
| 证据深度 | L0 / L1 / L2 / L3 | 按变更风险匹配证据深度。 |

## 子代理 / Worker 合同

如使用 subagent 或 worker，在这里写清楚输入包、写入范围、handoff 格式和最终集成 owner。

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| reviewer / worker / n/a | C-001 | read-only / path list / n/a | report / commit SHA / n/a | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `git diff --check` | `progress.md` | 无 whitespace error。 |
| L1 | `npm --prefix apps/mobile run typecheck` | `progress.md` | TypeScript 通过。 |
| L2 | `npx expo export --platform ios --output-dir ../../tmp/expo-export-ui-polish --clear` | `progress.md` | iOS bundle 导出成功。 |
| L3 | [发布前 / 生产等价验证 / 外部审查] | `review.md` 与 walkthrough | [通过标准] |

## 暂停 / 升级条件

- 所需工作超出已批准写入范围。
- 共享表需要更新，但没有 coordinator lock。
- 实际风险高于原计划，证据深度需要升级。
- reviewer 发现会改变范围或方案的 P0/P1/P2 问题。
- 环境无法提供关键证据，继续执行会变成猜测。
