# Harness task lifecycle repair - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### Missing-materials 主要来自 scanner contract 不一致

- 背景：Host pairing 和 reusable presets 都已有人工可读 review 内容，但 status 仍报告 missing review submission。
- 发现：scanner 需要严格的 `Agent Review Submission` 结构和 `TASKS/<shortId>` task key；部分历史任务只有 manual/self-review 或裸 shortId。
- 影响：本任务补充 scanner 可识别的 review submission，而不是重写历史验证证据。
- 后续：后续任务应优先使用 `harness task-review`，避免手写 review packet 漂移。

### Dirty-state blocker 已过期但仍污染队列

- 背景：多个历史任务记录了 `Governance sync owned path in write scope is already dirty`。
- 发现：2026-06-07 修复前工作树为 clean；这些 blocker 已是历史证据，不应继续把任务放入 blocked/unknown。
- 影响：关闭或降级 stale blocker，保留人工确认门禁。
- 后续：如果再次出现 dirty blocker，先提交/隔离当前任务改动，再运行 lifecycle CLI。

### Session history 任务仍是真 active

- 背景：`2026-06-05-agentpal-session-history-and-inbox-ux-redesign-af6730dc` 仍处于 in_progress。
- 发现：它不是 scanner abnormal queue 来源；review 模板和 lesson pending 符合未完成任务状态。
- 影响：本任务不把它伪装成 review/done，只在最终摘要里作为唯一历史 active residual 提示。
- 后续：另行完成或明确 supersede 该产品任务。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| 修复方式 | 最小化修复任务材料 | 保留历史证据，不重写产品实现记录 | 归档/删除旧任务 | accepted |
| Human gate | 不代办 | `review-confirm` 是 human actor gate | 由 agent 直接确认 | accepted |
| Preset distribution | local-only residual | `.coding-agent-harness/` 被忽略，当前只证明本机可用 | 本任务中设计共享分发 | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| review 队列任务是否逐个人工确认 | 等待用户 review-confirm 或退回 | human | dashboard review pass |
| session-history 任务是否继续、关闭或 supersede | 本任务不判断 | coordinator / user | 后续产品任务整理 |
