# 执行策略

## Subagent Authorization

| Role | Status | Permission | Authorized By | Authorized At | Scope | Worktree / Branch | Reuse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reviewer subagent | allowed by default | read-only | harness task policy | task creation | current task review | n/a | allowed within this task |
| worker subagent | not authorized | write only after user approval | pending | pending | none | none | not used |

## Subagent Delegation Decision

| Question | Decision | Reason | Next Action |
| --- | --- | --- | --- |
| Should a reviewer subagent be used? | no | 本轮是单文件 UI 布局修正，验证重点是 typecheck 和 Expo export。 | coordinator self-review。 |
| Would a worker subagent materially help? | no | 修改集中在 `ConversationPage` 和 `ConversationPanelTabs`，worker 并行会增加冲突。 | 不使用 worker subagent。 |

## User Authorization Decision

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-06 | apps/mobile/app/index.tsx | master | 单 coordinator 实现。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责设计判断、实现和验证。 |
| Subagent 模式 | none | 不使用 worker 或 reviewer subagent。 |
| 审查模型 | self-check plus automated verifier | TypeScript 和 Expo export 覆盖运行层风险。 |
| Worktree 策略 | same checkout | 单文件改动，无并行 worktree。 |
| 冲突控制 | coordinator owns shared files | 只修改 `apps/mobile/app/index.tsx`。 |
| 证据深度 | L1 | UI 布局修正，使用 typecheck、bundle export 和 diff check。 |

## 子代理 / Worker 合同

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| n/a | C-001 | n/a | n/a | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `git diff --check -- apps/mobile/app/index.tsx` | `progress.md` | 无空白错误 |
| L1 | `npm --prefix apps/mobile run typecheck` | `progress.md` | TypeScript 通过 |
| L1 | `npx expo export --platform ios --output-dir ../../tmp/expo-export-switcher-redesign --clear` | `progress.md` | Expo iOS bundle export 通过 |

## 暂停 / 升级条件

- 需要重构路由或主导航。
- 需要新增 UI/native 依赖。
- Expo export 失败且无法在当前 turn 内定位。
