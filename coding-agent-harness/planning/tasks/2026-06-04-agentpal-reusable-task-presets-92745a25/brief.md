# AgentPal reusable task presets

## Task ID

`2026-06-04-agentpal-reusable-task-presets-92745a25`

## 创建日期

2026-06-04

## 一句话结果

为 AgentPal 新增一组项目级 Harness preset，用来标准化功能开发、移动端 UI 修复和真实运行链路验证任务的证据、README/CHANGELOG 判断和提交边界。

## 完成后能得到什么

下一轮 agent 可以直接用 `harness new-task --preset ...` 创建 AgentPal 专用任务，而不是每次手写收口规则。Preset 会把任务类型、必需证据、README/CHANGELOG 更新判断、自动提交前的 dirty 边界检查、以及移动端或运行时特定验证要求写进任务材料。这样功能开发、UI 修复、Relay/Host/Codex 链路验证都能以一致的方式被 dashboard、status 和 review 流程识别。

## 交付物

- 可见产物：`agentpal-feature`、`agentpal-mobile-ui`、`agentpal-runtime-probe` 三个项目级 preset。
- 修改位置：`.coding-agent-harness/presets/agentpal-*/` 与本任务记录。
- 验证证据：`harness preset check`、smoke `new-task`、`status/task-index/check`。

## 第一眼应该看什么

先看 `.coding-agent-harness/presets/agentpal-feature/preset.yaml`、`.coding-agent-harness/presets/agentpal-mobile-ui/preset.yaml`、`.coding-agent-harness/presets/agentpal-runtime-probe/preset.yaml`。再看本任务 `progress.md` 中的 preset 校验和 smoke task 证据。

## 边界

- 范围内：新增项目级 preset manifest、append/seed 模板、本任务记录和验证证据。
- 范围外：不修改 AgentPal 产品代码，不重写已有历史任务，不改变 Harness CLI 源码，不把之前移动端 dirty 改动混进本任务提交。
- 停止条件：preset schema 不支持所需行为、CLI 校验失败且无法用 declarative manifest 表达，或提交边界无法排除无关 dirty。

## 完成判断

- 三个 preset 能被 `harness preset check` 识别并通过。
- 每个 preset 的 `entrypoints.newTask.writes` 与 `writeScopes` 使用 `{{paths.tasksRoot}}/**` 且完全匹配。
- 至少创建 smoke task 验证 preset 能生成任务材料并进入 status/task-index。
- README/CHANGELOG/commit closeout 规则出现在生成任务材料中。
- 本任务记录包含验证命令、残余风险和 no-commit/commit 边界说明。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、`progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

运行 preset 校验和 smoke task，确认新 preset 能被 Harness CLI 创建、扫描和检查。
