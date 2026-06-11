# AgentPal daemon 常驻 CLI

Task Contract: harness-task/v1
Task Package Index: required

## 目标

在 `agentpal` CLI 中新增 workspace 级后台守护命令 `daemon start|stop|status|logs`，并让 `pair` 与 daemon 共用稳定的 host 身份、session id 和 workspace 配置。

## 范围

- 做什么：实现 daemon 子命令、workspace profile/state、日志与 pid 管理、帮助文案、README 更新、验证和收口记录。
- 不做什么：不做开机自启、不做桌面安装包、不改 mobile 配对协议、不做全局常驻守护。
- 主要风险：后台 detach 在 Windows 上的稳定性、pid/日志状态的一致性、workspace profile 重用是否足够可靠。

## 预算选择

选择预算：standard

选择理由：改动集中在单个 CLI 入口和少量状态文件，验证以本地冒烟为主，但涉及后台进程和持久状态，复杂度高于 simple。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | `bin/agentpal.mjs` | 现有 CLI 入口和 help 路由。 | coordinator |
| C-002 | code | `crates/host/src/codex.rs` | 现有 `connect` / `pair` 流程，daemon 需要复用。 | coordinator |
| C-003 | public-doc | `README.md` | 用户可见命令、说明和开发验证入口。 | coordinator |
| C-004 | plan | `docs/plans/2026-06-11-agentpal-daemon-cli-design.md` | 已确认的实现设计。 | coordinator |
| C-005 | harness | `coding-agent-harness/planning/tasks/2026-06-11-agentpal-daemon-cli-17c94a23/*` | 任务计划、证据和收口的单一事实源。 | coordinator / reviewer |

## 步骤

1. 落地 workspace profile / daemon state 读写，以及 `agentpal daemon` 子命令路由。
2. 实现后台启动、停止、状态、日志读取和稳定 hostId 复用。
3. 更新 README/help，做本地冒烟和对抗性自检，补齐 progress/review/walkthrough。

## 验收标准

- [x] `agentpal daemon --help` 能看到 start/stop/status/logs。
- [x] `agentpal daemon start` 能后台常驻，且 `status` / `stop` / `logs` 可用。
- [x] `pair` 与 daemon 共用稳定 host 身份，并在 README 里说明用户流程。
- [x] 验证结果写入 `progress.md`，收口材料补齐。

## 工作树（Worktree）

- 路径：不使用独立 worktree
- 分支：当前 checkout
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：这是单一 CLI 切片，未拆 worker，且当前改动可在同一 checkout 中顺序完成。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：不适用
- Stop Condition 摘要：如果后台进程 detach、pid 管理或验证无法稳定闭环，就停下来修正实现再继续。

## 审查判定

- 是否需要对抗性审查：是
- 若是，报告文件：`review.md`
- Reviewer：self + reviewer subagent
- No-finding 要求：review 不能留下阻塞级发现，后台进程与状态文件行为必须被证据覆盖。

## 关联

- 相关 Regression Gate：CLI help、daemon start/stop/status/logs 冒烟
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：无

## 模块关联（启用模块并行时填写)

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：`task_plan.md`, `review.md`, `walkthrough.md`, `progress.md`
- Closeout / Regression update needed：`walkthrough.md`
