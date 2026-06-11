# 执行策略

## Subagent Authorization

任务开始时先读这一段，并向用户说明当前授权状态。这里是授权记录，不是执行沙箱。

| Role | Status | Permission | Authorized By | Authorized At | Scope | Worktree / Branch | Reuse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reviewer subagent | allowed by default | read-only | harness task policy | task creation | current task review | n/a | allowed within this task |
| worker subagent | not authorized | write only after user approval | pending | pending | pending | pending | allowed only within approved task/scope |

## Subagent Delegation Decision

这个任务没有拆出独立 worker 切片。host、relay 和 mobile 的改动互相耦合在同一条配对链路上，拆分并不会降低集成风险。

| Question | Decision | Reason | Next Action |
| --- | --- | --- | --- |
| Should a reviewer subagent be used? | no | 自检 + Rust 测试 + local relay 烟测已经足够验证这次变更 | coordinator 直接收口 |
| Would a worker subagent materially help? | no | 变更范围小但跨 host / relay / mobile，单人连续修改和验证更快 | 不申请 worker |

## User Authorization Decision

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-11 | n/a | n/a | 不需要额外 worker |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | 负责改代码、跑验证、提交 Harness 材料 |
| Subagent 模式 | none | 没有启用 worker，review 也由 coordinator 自检完成 |
| 审查模型 | self-check | 结合单测和 local relay smoke，能覆盖本次变更风险 |
| Worktree 策略 | same checkout | 当前改动集中，且不需要并行隔离 |
| 冲突控制 | coordinator owns shared files | 任务文档、进度和代码都由 coordinator 统一维护 |
| 证据深度 | L1/L2 | 先单测，再 local relay 冒烟，足以证明 QR 压缩和默认行为 |

## 子代理 / Worker 合同

不适用。

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `cargo fmt --all`、静态 diff 检查 | `progress.md` | 代码格式和变更边界稳定 |
| L1 | `cargo test -p agentpal-host pair_url_ -- --nocapture`、`cargo test -p agentpal-relay`、`cargo check -p agentpal-host -p agentpal-relay`、`npm --prefix apps/mobile run typecheck` | `progress.md` | host / relay / mobile 的关键路径通过 |
| L2 | 本地 relay 启动后运行 `npm run agentpal -- pair --workspace . --relay-url ws://127.0.0.1:8899/ws --timeout-seconds 3 --codex-port 38993` | `progress.md` | 打印出短配对串，证明载荷压缩生效 |
| L3 | 由 review / walkthrough 记录发布前残余风险 | `review.md` 与 `walkthrough.md` | 清楚写出 npm 发布认证阻塞 |

## 暂停 / 升级条件

- 如果 npm CLI 没有有效登录态，就把它记为 release/auth residual，不要假装 `latest` 已发布。
- 如果单测或 local relay 烟测失败，先修代码，再更新 progress。
- 如果材料文件再次回退成模板骨架，先修任务文档再提交审查。
