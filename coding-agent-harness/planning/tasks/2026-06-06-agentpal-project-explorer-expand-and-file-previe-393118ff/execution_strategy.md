# 执行策略

## Subagent Authorization

任务开始时已读取本节。reviewer subagent 默认允许只读审查；worker subagent 未授权，不可写文件。

| Role | Status | Permission | Authorized By | Authorized At | Scope | Worktree / Branch | Reuse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reviewer subagent | allowed by default | read-only | harness task policy | task creation | current task review | n/a | allowed within this task |
| worker subagent | not authorized | write only after user approval | pending | pending | none | none | not used |

## Subagent Delegation Decision

| Question | Decision | Reason | Next Action |
| --- | --- | --- | --- |
| Should a reviewer subagent be used? | no | 本轮风险主要由类型检查、Rust 检查、Expo export 和真实 WebSocket probe 覆盖；没有独立审查输入包。 | coordinator self-review 并提交 `task-review`。 |
| Would a worker subagent materially help? | no | 改动集中在共享协议和会话页入口，拆分 worker 反而容易产生冲突；用户未授权 worker 写入。 | 不使用 worker subagent。 |

## User Authorization Decision

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-06 | shared protocol/mobile/host path | master | 单 coordinator 顺序实现。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责编排协议、Host、Relay、移动端和验证。 |
| Subagent 模式 | none | 本轮没有独立 worker 切片，也未使用 reviewer subagent。 |
| 审查模型 | self-check plus automated verifier | 自动检查和真实链路 probe 足以覆盖本轮功能风险。 |
| Worktree 策略 | same checkout | 只有 coordinator 修改，未使用并行 worktree。 |
| 冲突控制 | coordinator owns shared files | 共享协议和 UI 入口由 coordinator 单独编辑。 |
| 证据深度 | L2 | 除静态检查外，完成 Relay/Host 真实 WebSocket file-preview probe。 |

## 子代理 / Worker 合同

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| n/a | C-001..C-006 | n/a | n/a | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `git diff --check` | `progress.md` | 无空白错误，CRLF 提示可接受 |
| L1 | `npm --prefix apps/mobile run typecheck` | `progress.md` | TypeScript 检查通过 |
| L1 | `CARGO_TARGET_DIR=tmp/target-file-preview-check cargo check --workspace` | `progress.md` | Rust workspace 检查通过 |
| L1 | `cargo fmt` | `progress.md` | Rust 格式化完成 |
| L2 | `npx expo export --platform ios --output-dir ../../tmp/expo-export-file-preview --clear` | `progress.md` | Expo iOS bundle export 通过 |
| L2 | WebSocket file-preview probe | `progress.md` | 返回目标文件内容、语言和截断状态 |

## 暂停 / 升级条件

- 文件预览需要写入本地文件。
- 预览路径不能证明位于 workspace 内。
- Expo Go 需要新增 native module 才能运行。
- 真实 Relay/Host probe 无法证明链路可用。
- 用户要求把预览扩展为编辑、搜索、图片或二进制查看。
