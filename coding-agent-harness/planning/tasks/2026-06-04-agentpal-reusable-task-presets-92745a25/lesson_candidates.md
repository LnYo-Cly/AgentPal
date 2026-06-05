# AgentPal reusable task presets - 教训候选

本文件是任务本地 lesson candidate queue。人工审查需要决定候选是留在任务内、拒绝、进入 dry-run promotion、创建 promoted lesson 详情文档，还是创建单独的沉淀任务。

## Candidate Status

| Field | Value |
| --- | --- |
| Schema version | lesson-candidate-v1 |
| Task-level status | no-candidate-accepted |
| Review gate | candidate-file-present |
| Review decision | agent-checked-no-candidate |
| Promotion state | not-promoted |
| Closeout token | no-candidate |
| Source task | 2026-06-04-agentpal-reusable-task-presets-92745a25 |
| Owner | coordinator |
| Last updated | 2026-06-04 |

## Schema

允许的任务级状态：

- `missing`：候选文件不存在。
- `pending-review`：候选文件存在，但人工判定还没完成。
- `no-candidate-accepted`：人工接受本任务没有可复用候选的理由。
- `needs-promotion`：至少一个候选已排队等待治理沉淀。
- `promoted`：所有接受的候选都已写入已确认的治理目标。
- `rejected`：所有候选都已带理由拒绝或归档。

允许的行级状态：

- `ready-for-review`：agent 认为这个候选可能有复用价值。
- `needs-promotion`：人工标记这个候选值得通过 dry-run promotion 或后续沉淀任务保留。
- `promoted`：维护 CLI 或已批准的后续任务已把候选写入确认的治理目标。
- `rejected`：人工带理由拒绝这个候选。

## Candidates

| ID | Row Status | Title | Scope | Module Key | Detail Artifact | Boundary Reason | Why It Might Matter | Review Decision | Promotion Target | Conflict Check | Required Standard Update | Follow-up Task |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## No-Candidate Reason

本轮新增的是 AgentPal 项目局部 preset 包，而不是需要沉淀到全局 Harness standards 的通用经验。关键判断已经直接写入三个 preset 的 closeout 协议，不需要 promoted lesson。

## Promotion Notes

- 如果人工审查认为候选值得沉淀，把对应行标记为 `needs-promotion`，并记录目标治理位置。
- 候选标记为 `needs-promotion` 时，必须趁源任务上下文还新鲜写出完整 task-local detail artifact，并在 `Detail Artifact` 中链接。
- 默认 promotion 行为是先 dry-run 或创建后续沉淀任务。不要写共享 Lessons 表；被接受的候选应成为 promoted lesson 详情文档。

## Queue Routing

| Queue | When this task enters it | Exit condition |
| --- | --- | --- |
| Lessons | 任意候选是 `ready-for-review` 或 `needs-promotion`。 | 人工拒绝、保留在任务内、创建沉淀任务或批准 promotion。 |
| Missing Materials | 文件缺失、状态非法，或缺少必需的 no-candidate reason。 | Agent 修复候选文件。 |
| Confirmed / Finalized | 已人工确认，但候选仍有延后的治理事项。 | 记录后续任务或 dry-run 决策。 |
