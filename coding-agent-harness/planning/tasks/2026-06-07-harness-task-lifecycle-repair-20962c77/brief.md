# Harness task lifecycle repair

## Task ID

`2026-06-07-harness-task-lifecycle-repair-20962c77`

## 创建日期

2026-06-07

## 一句话结果

清理当前 Harness 任务队列里的缺材料、unknown/blocked 生命周期和过期 dirty blocker，让剩余任务只处于可解释的 active、review、finalized 或 human gate 状态。

## 完成后能得到什么

下一轮 agent 打开 Harness dashboard/status 时，不再需要从历史 dirty blocker、模板占位或 scanner unknown 状态里猜测任务真实进度。Host pairing、mobile cold visual redesign、reusable task presets、project tree/worktree diff visibility 等历史任务会拥有明确的 lesson 路由、review submission 或 blocker disposition；仍需人工确认的任务继续保留 human gate，不由本任务代办。

## 交付物

- 可见产物：修复后的任务材料、review/lesson 状态、Harness check/status 证据。
- 修改位置：`coding-agent-harness/planning/tasks/*` 中被 scanner 标记为 missing-materials、blocked、unknown 的任务包，以及本修复任务包。
- 验证证据：`harness status --json .`、`harness check --profile target-project .`、`git diff --check`。

## 第一眼应该看什么

先读本任务 `progress.md` 的修复清单和验证记录，再用 `harness status --json .` 查看最终队列；目标是 missing-materials/blocked/unknown 不再由过期治理材料造成。

## 边界

- 范围内：修复 Harness 任务材料、lesson route、review packet、visual_map/progress 生命周期字段和过期 dirty blocker 记录。
- 范围外：修改 AgentPal 产品代码、伪造人工 review-confirm、把仍需真实用户验收的任务标成已人工确认。
- 停止条件：发现任务缺少真实实现证据、需要人工产品验收，或需要跨任务删除/归档时，保留 residual 而不是强行关闭。

## 完成判断

- `harness check --profile target-project .` 不再报告 `mobile-cold` brief 模板 warning。
- 原 missing-materials 任务不再因为 lesson/review packet 缺口进入 Missing Materials。
- 原 unknown/blocked 任务拥有可解释状态或明确 residual。
- 本任务记录验证证据，并进入 Agent Review Submission；human review-confirm 仍由用户执行。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、`progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

修复 `mobile-cold` brief/lesson/open finding，再修复 Host pairing、preset 和 project tree 任务的 scanner 状态。
