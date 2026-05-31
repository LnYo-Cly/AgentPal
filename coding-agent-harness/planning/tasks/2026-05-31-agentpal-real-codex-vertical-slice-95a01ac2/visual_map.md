# Visual Map / 可视化图谱

Visual Map Contract: v1.0

本文件是任务图表集合，不只是阶段路线图。只有对人或 agent 理解任务有实际帮助的图才放进来。

## 图表索引（Map Index）

| ID | Type | Purpose | Required For Understanding | Source Evidence | Promotion Candidate |
| --- | --- | --- | --- | --- | --- |
| MAP-01 | phase | 展示执行阶段和依赖关系 | yes | `task_plan.md` | no |
| MAP-02 | architecture | 展示真实 Codex 垂直切片结构 | yes | `task_plan.md`, `findings.md` | yes |
| MAP-03 | sequence | 展示手机输入到 Codex turn 的最小闭环 | yes | `task_plan.md`, `agent-adapter-contract.md` | yes |

## 阶段关系图（Phase Graph）

```mermaid
flowchart LR
  INIT01["INIT-01 范围与上下文\nkind=init"] --> EXEC01["EXEC-01 实现切片\nkind=execution"]
  EXEC01 --> GATE01["GATE-01 Agent 提交审查\nkind=gate"]
  GATE01 --> GATE02["GATE-02 人工审查确认\nkind=gate"]
```

## 阶段表（Phase Table，表头供 checker 解析）

| Phase ID | Kind | Depends On | State | Completion | Output | Required Evidence | Exit Command | Actor | Evidence Status | Blocking Risk | Owner / Handoff |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| INIT-01 | init | none | done | 100 | 任务计划和执行策略已确认 | `task_plan.md`; `execution_strategy.md` | `harness task-start 2026-05-31-agentpal-real-codex-vertical-slice-95a01ac2` | agent | present | none | coordinator |
| EXEC-01 | execution | INIT-01 | done | 100 | 真实 Codex 垂直切片设计和能力探测 | diff、commands、task package updates | `harness task-phase 2026-05-31-agentpal-real-codex-vertical-slice-95a01ac2 EXEC-01 --state done --completion 100 --evidence present` | agent | present | final harness status pending | coordinator |
| GATE-01 | gate | EXEC-01 | planned | 0 | Agent Review Submission | `review.md`、progress update、lesson routing | `harness task-review 2026-05-31-agentpal-real-codex-vertical-slice-95a01ac2 --message "<summary>"` | agent | missing | waits for final validation | coordinator |
| GATE-02 | gate | GATE-01 | planned | 0 | Human Review Confirmation | review packet 和人工确认 | `harness review-confirm 2026-05-31-agentpal-real-codex-vertical-slice-95a01ac2 --confirm 2026-05-31-agentpal-real-codex-vertical-slice-95a01ac2` | human | missing | Agent 不能代办人工确认 | human |

允许的 `State`：`planned`, `in_progress`, `review`, `blocked`, `done`, `skipped`。

允许的 `Evidence Status`：`missing`, `partial`, `present`, `waived`。

允许的 `Kind`：`init`, `execution`, `gate`。

允许的 `Actor`：`agent`, `human`, `coordinator`。

`Completion` 使用 `0..100` 的整数；`done` 应为 `100`，`planned` 应为 `0`，`skipped` 不计入 dashboard 总完成度。dashboard 的实现完成度只由非 skipped 的 `execution` 阶段计算；`init` 和 `gate` 阶段表达生命周期门禁、下一步命令和责任人，不拉低实现完成度。

## 支持性图表（Supporting Maps）

按需添加，不要求每类都存在：

- architecture：模块、组件、服务结构。
- sequence：前端、后端、服务、数据库、agent 时序。
- data-flow：数据流转和所有权。
- state：状态机或生命周期。
- topology：repo、服务、worker、worktree 拓扑。
- decision：方案分叉和决策树。

### MAP-02 Architecture

```mermaid
flowchart LR
  mobile["apps/mobile\nExpo RN"] <-->|AgentPal WS| relay["crates/relay\nAxum WS"]
  relay <-->|AgentPal WS| host["crates/host\nRust Host"]
  host <-->|structured protocol| codex["Codex app-server\nws://127.0.0.1:<port>"]
  host -.fallback.-> pty["Codex TUI/PTy fallback"]
  protocol["crates/protocol\nAgentPal protocol + Codex mapping"] -.types.-> mobile
  protocol -.types.-> host
  protocol -.types.-> relay
```

### MAP-03 First Real Loop

```mermaid
sequenceDiagram
  participant Phone
  participant Relay
  participant Host
  participant Codex as Codex app-server

  Host->>Codex: start/connect app-server for workspace
  Phone->>Relay: input.submit(text)
  Relay->>Host: deliver command
  Host->>Codex: thread.start / turn.start / turn.steer
  Codex->>Host: thread/turn/status/message/diff/approval events
  Host->>Relay: AgentPal normalized events
  Relay->>Phone: session feed updates
```
