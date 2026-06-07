# Harness task lifecycle repair

Task Contract: harness-task/v1
Task Package Index: required

## 目标

修复当前 Harness 队列里由模板残留、pending lesson、手工 review packet 不被 scanner 识别、以及过期 dirty blocker 引起的任务不足，让任务状态恢复为可审计、可继续推进的形态。

## 范围

- 做什么：修复 Host pairing、mobile cold visual redesign、reusable task presets、project tree/worktree diff visibility 及本修复任务的治理材料。
- 不做什么：不改产品代码，不执行 human review-confirm，不关闭仍需人工验收的产品任务。
- 主要风险：历史任务可能仍需要真实设备验收；本任务只能修复治理材料，不能替代用户确认。

## 预算选择

选择预算：standard

选择理由：涉及多个历史任务包、review/lesson route 和 status/check 证据，需要完整任务材料。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | private-plan | TARGET:coding-agent-harness/planning/tasks | 扫描当前 missing-materials、blocked、unknown 和 active/review 队列。 | coordinator |
| C-002 | private-plan | TARGET:coding-agent-harness/planning/tasks/2026-06-01-agentpal-mobile-cold-visual-redesign-b37239ca | 修复唯一 Harness check warning 和 stale blocker。 | coordinator |
| C-003 | private-plan | TARGET:coding-agent-harness/planning/tasks/2026-06-01-agentpal-host-pairing | 修复 lesson route 和 scanner 可识别 review submission。 | coordinator |
| C-004 | private-plan | TARGET:coding-agent-harness/planning/tasks/2026-06-04-agentpal-reusable-task-presets-92745a25 | 修复 blocked/unknown queue 和 preset local-only residual。 | coordinator |
| C-005 | private-plan | TARGET:coding-agent-harness/planning/tasks/2026-06-05-agentpal-project-tree-and-worktree-diff-visibili-9aceaeb2 | 修复 unknown state 和过期 dirty blocker。 | coordinator |

## 步骤

1. 创建并启动本修复任务。
2. 修复 missing-materials 任务的 lesson decision、brief 模板残留和 strict review submission。
3. 修复 blocked/unknown 任务的状态字段、review routing 和 stale dirty blocker disposition。
4. 运行 `harness status --json .`、`harness check --profile target-project .`、`git diff --check`。
5. 记录证据、提交修复、执行本任务 `task-review`。

## 验收标准

- [ ] `harness check --profile target-project .` failures=0，且不再出现 `mobile-cold` unedited-template warning。
- [ ] 原 missing-materials 任务不再由 lesson/review 缺口进入 Missing Materials。
- [ ] 原 blocked/unknown 任务不再由过期 dirty blocker 或不可解析 progress 状态进入异常队列。
- [ ] 本任务 progress/review/walkthrough 记录证据和残余。

## 工作树（Worktree）

- 路径：当前 checkout
- 分支：当前分支
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：共享 Harness 任务目录需要 coordinator 顺序修复，避免并行写状态冲突。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：不适用
- Stop Condition 摘要：发现需要人工产品验收或 review-confirm 时停止，不代办 human gate。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：不适用
- Reviewer：self
- No-finding 要求：Harness check/status 无新增材料缺口。

## 关联

- 相关 Regression Gate：Harness status/check
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：无

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：由 task lifecycle CLI 同步
- Closeout / Regression update needed：本任务 `walkthrough.md`
