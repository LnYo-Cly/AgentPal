# Visual Map / 可视化图谱

Visual Map Contract: v1.0

本文件是任务图表集合，不只是阶段路线图。只有对人或 agent 理解任务有实际帮助的图才放进来。

## 图表索引（Map Index）

| ID | Type | Purpose | Required For Understanding | Source Evidence | Promotion Candidate |
| --- | --- | --- | --- | --- | --- |
| MAP-01 | phase | 展示执行阶段和依赖关系 | yes | `task_plan.md` | no |
| MAP-02 | decision | 展示 Codex 桌面信息结构如何投影到手机端 | yes | 用户截图、`task_plan.md` | no |

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
| INIT-01 | init | none | done | 100 | 任务计划和执行策略已确认 | `task_plan.md`; `execution_strategy.md` | `harness task-start 2026-06-06-agentpal-mobile-workspace-session-browser-redesi-80719f34` | agent | present | none | coordinator |
| EXEC-01 | execution | INIT-01 | planned | 0 | 移动端会话入口改为项目分组 session 浏览器，并调整详情分段语义 | diff、typecheck、Expo export、Harness check | `harness task-phase 2026-06-06-agentpal-mobile-workspace-session-browser-redesi-80719f34 EXEC-01 --state done --completion 100 --evidence present` | agent | missing | session workspace 数据不足时需降级为单组 | coordinator |
| GATE-01 | gate | EXEC-01 | planned | 0 | Agent Review Submission | `review.md`、progress update、lesson routing | `harness task-review 2026-06-06-agentpal-mobile-workspace-session-browser-redesi-80719f34 --message "<summary>"` | agent | missing | [risk] | coordinator |
| GATE-02 | gate | GATE-01 | planned | 0 | Human Review Confirmation | review packet 和人工确认 | `harness review-confirm 2026-06-06-agentpal-mobile-workspace-session-browser-redesi-80719f34 --confirm 2026-06-06-agentpal-mobile-workspace-session-browser-redesi-80719f34` | human | missing | Agent 不能代办人工确认 | human |

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

## MAP-02 Codex Desktop 到 AgentPal Mobile 的信息结构投影

```mermaid
flowchart TB
  desktop["Codex desktop\nleft project sidebar"] --> concept["Project / workspace is the session container"]
  concept --> mobileSessions["AgentPal bottom tab: 会话\nproject-grouped session browser"]
  mobileSessions --> projectGroup["Project card\nworkspace path + active sessions + recent sessions"]
  projectGroup --> sessionDetail["Session detail\n聊天 / 文件 / 变更"]
  sessionDetail --> chat["聊天\nmessages + tools + approvals"]
  sessionDetail --> files["文件\ncurrent workspace tree + file preview"]
  sessionDetail --> diff["变更\ncurrent repo worktree/diff summary"]
```

设计约束：

- `项目` 在全局导航层代表工作区/session 容器。
- `文件` 在会话详情层代表当前工作区目录树。
- `变更` 在会话详情层代表当前仓库 worktree/diff。
- 手机端不复制桌面左侧栏；用底部 `会话` 入口和项目分组卡片承载同样的信息关系。
