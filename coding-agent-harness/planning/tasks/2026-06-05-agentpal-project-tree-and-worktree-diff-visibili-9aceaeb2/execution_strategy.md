# 执行策略

## Subagent Authorization

| Role | Status | Permission | Authorized By | Authorized At | Scope | Worktree / Branch | Reuse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reviewer subagent | allowed by default | read-only | harness task policy | task creation | current task review | n/a | allowed within this task |
| worker subagent | not authorized | write only after user approval | pending | pending | pending | pending | allowed only within approved task/scope |

## Subagent Delegation Decision

| Question | Decision | Reason | Next Action |
| --- | --- | --- | --- |
| Should a reviewer subagent be used? | no | 本任务是只读功能切片，验证重点是协议链路和本地实测；self-review 足够覆盖当前风险。 | 在 `review.md` 记录 self-review。 |
| Would a worker subagent materially help? | no | 协议、Host、Relay、App 必须保持一致，拆给 worker 容易产生数据契约漂移；当前 dirty tree 也不适合并行写入。 | coordinator 独立实现并验证。 |

## User Authorization Decision

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-05 | n/a | n/a | 任务不使用 worker subagent。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 维护协议和 UI 一致性。 |
| Subagent 模式 | none | 不拆分写任务。 |
| 审查模型 | self-check | 以类型检查、Rust 检查和真实 WebSocket probe 为主要证据。 |
| Worktree 策略 | same checkout | 用户正在同一项目持续测试；不切换工作树影响运行服务。 |
| 冲突控制 | coordinator owns shared files | 共享协议、Host 和 App hook 由 coordinator 单点修改。 |
| 证据深度 | L2 | 需要跨 Relay/Host/App 的集成验证。 |

## 子代理 / Worker 合同

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| n/a | C-001..C-004 | n/a | n/a | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `git diff --check` | `progress.md` | 无空白错误。 |
| L1 | `npm --prefix apps/mobile run typecheck` | `progress.md` | TypeScript 通过。 |
| L1 | `cargo fmt --all` 与 `cargo check --workspace` | `progress.md` | Rust 格式和编译通过。 |
| L2 | `npx expo export --platform ios` | `progress.md` | Expo Go 可加载的 bundle 导出成功。 |
| L2 | WebSocket workspace request probe | `progress.md` | Relay/Host 返回真实 workspace snapshot。 |

## 暂停 / 升级条件

- 需要读取完整文件内容或传输完整 patch。
- 需要执行写操作，如 checkout、stash、commit。
- Expo Go 因新增依赖红屏。
- Git worktree 扫描命令在 Windows 路径上无法稳定解析。
