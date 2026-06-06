# 执行策略

## Subagent Authorization

| Role | Status | Permission | Authorized By | Authorized At | Scope | Worktree / Branch | Reuse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reviewer subagent | allowed by default | read-only | harness task policy | task creation | current task review | n/a | allowed within this task |
| worker subagent | not authorized | write only after user approval | pending | pending | pending | pending | allowed only within approved task/scope |

## Subagent Delegation Decision

| Question | Decision | Reason | Next Action |
| --- | --- | --- | --- |
| Should a reviewer subagent be used? | no | 本任务是单文件移动端 IA 修正，风险主要来自视觉/交互一致性；TypeScript、Expo export 和 Harness check 足以覆盖本轮。 | 自检并在 `review.md` 记录无开放发现。 |
| Would a worker subagent materially help? | no | 改动集中在 `apps/mobile/app/index.tsx` 的相邻组件，拆给 worker 会增加同文件冲突，不会显著提速。 | coordinator 直接实现。 |

## User Authorization Decision

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-06 | single-file mobile IA correction | master | 用户已要求继续，当前不拆分 worker。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责信息架构、实现和验证。 |
| Subagent 模式 | none | 单文件相邻 UI 改动，不适合并行 worker。 |
| 审查模型 | self-check | 结合用户截图、ui-ux-pro-max 规则、TypeScript 和 Expo export 验证。 |
| Worktree 策略 | same checkout | 当前 git 干净，改动边界明确。 |
| 冲突控制 | coordinator owns shared files | 只改当前任务文档和移动端入口文件。 |
| 证据深度 | L1 | UI/IA 修正用 typecheck、Expo export、Harness check 验证。 |

## 子代理 / Worker 合同

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| n/a | C-001/C-002/C-003 | n/a | n/a | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `git diff --check` | `progress.md` | 无 whitespace/diff 错误 |
| L1 | `npm --prefix apps/mobile run typecheck` | `progress.md` | TypeScript 通过 |
| L1 | `npx expo export --platform ios --output-dir ../../tmp/expo-export-ia-correction --clear` | `progress.md` | Expo export 成功 |
| L1 | `npx --yes coding-agent-harness check --profile target-project .` | `progress.md` | Harness check 无失败 |

## 暂停 / 升级条件

- 需要新增 Host/Relay 协议字段。
- 发现会话数据缺少必要 workspace/session 元信息，无法仅靠前端修正。
- Expo/TypeScript 失败并暴露非 UI 范围的系统问题。
