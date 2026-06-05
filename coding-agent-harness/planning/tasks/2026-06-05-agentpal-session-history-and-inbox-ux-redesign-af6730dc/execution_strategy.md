# 执行策略

## Subagent Authorization

任务开始时先读这一段，并向用户说明当前授权状态。这里是授权记录，不是执行沙箱。

| Role | Status | Permission | Authorized By | Authorized At | Scope | Worktree / Branch | Reuse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reviewer subagent | allowed by default | read-only | harness task policy | task creation | current task review | n/a | allowed within this task |
| worker subagent | not-needed | not requested | n/a | n/a | n/a | n/a | n/a |

## Subagent Delegation Decision

| Question | Decision | Reason | Next Action |
| --- | --- | --- | --- |
| Should a reviewer subagent be used? | no | 本轮仍在交互式 UI/协议修复阶段，主要风险由 typecheck、Rust check、Expo export 和真实 WebSocket/Codex history probe 覆盖。 | coordinator 自检并记录证据；需要最终 human 真机截图确认。 |
| Would a worker subagent materially help? | no | 修改点横跨同一移动端入口、Relay hook、共享协议和 Host/Relay 事件链，拆 worker 会增加 dirty worktree 合并风险。 | 不申请 worker；coordinator 单线执行。 |

## User Authorization Decision

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-05 12:22 +08:00 | `apps/mobile/*`; `crates/{protocol,relay,host}` history/picker path | same checkout | 用户要求直接推进，当前任务不拆 worker。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责设计、代码、验证和收口。 |
| Subagent 模式 | none | 当前共享文件多且 dirty tree 已存在，不引入并行写入。 |
| 审查模型 | self-check + human visual confirmation | 机器验证覆盖协议和 bundle；移动 UI 仍需要用户真机截图确认。 |
| Worktree 策略 | same checkout | 新任务已由 CLI 创建并提交任务包，后续只在当前 checkout 控制范围修改。 |
| 冲突控制 | coordinator owns shared files | 不回滚无关 dirty；提交前单独整理边界。 |
| 证据深度 | L2 | 需要静态检查、bundle、Rust check 和真实 history-request probe。 |

## 子代理 / Worker 合同

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| n/a | C-001..C-008 | n/a | n/a | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `git diff --check` scoped to touched files | `progress.md` | exit 0；允许 Windows 行尾 warning 时需注明。 |
| L1 | `npm --prefix apps/mobile run typecheck` | `progress.md` | `tsc --noEmit` exit 0。 |
| L1 | `cargo check -p agentpal-protocol -p agentpal-relay -p agentpal-host` 或 `cargo check --workspace` | `progress.md` | Rust 编译检查通过。 |
| L2 | `npx expo export --platform ios --output-dir ../../tmp/expo-export-agentpal-session-ux --clear` | `progress.md` | Expo bundle 导出成功。 |
| L2 | WebSocket `history-request` probe | `progress.md` | 目标 session 返回可见 `user-message` / `agent-message` / tool 事件，或明确记录 Codex 侧无 turns。 |
| L3 | 用户 iOS/Android 真机截图复测 | `review.md` | 用户确认核心页面视觉、滚动、代码块和 picker 可接受。 |

## 暂停 / 升级条件

- 所需工作超出移动端会话体验和最小历史 hydration。
- Codex app-server API 返回结构与当前假设不一致，无法从 thread turns 转换历史。
- Expo Go 因新依赖红屏，必须回退到 Expo Go 兼容实现。
- Rust 协议改动影响其它调用方但无法完成联调。
- 无法安全区分本任务改动和无关 dirty 变更。
