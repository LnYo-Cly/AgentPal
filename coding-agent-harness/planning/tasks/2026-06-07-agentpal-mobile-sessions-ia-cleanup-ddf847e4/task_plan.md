# AgentPal mobile sessions IA cleanup

Task Contract: harness-task/v1
Task Package Index: required

## 目标

让 AgentPal 手机端三个主入口职责稳定：待处理页聚焦需要用户操作或关注的 Agent 状态，会话页按项目浏览和恢复 session，设置页继续管理连接和偏好。

## 范围

- 做什么：调整 `apps/mobile/app/index.tsx` 中待处理页、会话页、项目 session 卡片、底部导航和相关空状态。
- 不做什么：不改 Host/Relay 协议，不新增后端接口，不实现新建会话、审批回传、项目 diff 的新数据能力。
- 主要风险：当前截图问题主要是 IA/布局问题，代码层验证不能替代真机审美确认；旧任务仍有历史 adoption warning，不属于本轮修复范围。

## 预算选择

选择预算：standard

选择理由：单文件移动端 UI/IA 调整，但影响底部主入口和会话浏览核心路径，需要类型检查、Expo 导出和 Harness 证据记录。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/app/index.tsx | 当前移动端主界面、会话列表、底部导航和相关组件的事实源。 | coordinator |
| C-002 | private-plan | TARGET:coding-agent-harness/planning/tasks/2026-06-07-agentpal-mobile-sessions-ia-cleanup-ddf847e4 | 本轮任务边界、证据和 review 记录。 | coordinator |
| C-003 | skill | PRIVATE:C:/Users/1/.agents/skills/ui-ux-pro-max/SKILL.md | 用户指定的 UI/UX 设计技能，用于信息架构和移动端布局判断。 | coordinator |

## 步骤

1. 收敛待处理页职责：只呈现 Host 离线、审批、等待确认、失败、运行中等需要关注事项，并提供清晰空状态。
2. 重构会话页：以项目/工作区分组 session，弱化 Host 管理和指标卡，优化搜索、项目标题、session 行和底部安全区。
3. 调整底部导航标签和图标，使页面职责与用户心理模型一致。
4. 运行类型检查、Expo 导出、diff check 和 Harness check，并把结果记录到任务材料。

## 验收标准

- [x] 待处理页没有普通 resumable session 列表或最近事件 dashboard。
- [x] 会话页可以按项目显示多 session，并能从 session 行进入会话详情。
- [x] 顶部安全区、底部浮动导航和列表内容有足够间距。
- [x] `npm --prefix apps/mobile run typecheck` 通过。
- [x] Expo 导出、`git diff --check`、Harness check 结果已记录。

## 工作树（Worktree）

- 路径：TARGET:.
- 分支：当前工作分支
- Worker owner：coordinator
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：修改集中在一个移动端入口文件和当前任务材料，worker 并行没有明显收益。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：如果需要改协议或引入新数据模型，停止并重新确认范围。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：self-review 无 P0/P1/P2 重要发现；真机视觉感受留给用户人工确认。

## 关联

- 相关 Regression Gate：移动端 typecheck、Expo export、diff check、Harness check
- 审查报告：TARGET:coding-agent-harness/planning/tasks/2026-06-07-agentpal-mobile-sessions-ia-cleanup-ddf847e4/review.md
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：2026-06-06-agentpal-project-explorer-expand-and-file-previe-393118ff；07981e3 workspace session browser commit

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：由 lifecycle CLI 重建
- Closeout / Regression update needed：progress/review/walkthrough/lesson_candidates 在本任务内更新
