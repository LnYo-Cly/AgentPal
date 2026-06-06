# AgentPal mobile sessions and conversation layout correction

Task Contract: harness-task/v1
Task Package Index: required

## 目标

修正 AgentPal mobile 会话索引和会话详情的信息架构，使工作台、会话列表、会话详情各自承担清晰职责。

## 范围

- 做什么：调整 `apps/mobile/app/index.tsx` 中 `SessionsPage`、项目 session row、`ConversationPage` 面板切换和项目 / 变更面板布局。
- 不做什么：不改 Relay / Host 协议，不新增原生模块，不重做 Markdown 渲染库，不实现完整 diff viewer。
- 主要风险：移动端真实机型的安全区、底部输入框和长列表滚动可能仍需用户真机复测。

## 预算选择

选择预算：standard

选择理由：影响单个移动端入口文件和 Harness 任务材料，属于中等范围 UI/UX 修正，需要完整静态验证但不需要后端联调。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/app/index.tsx | 会话索引、详情页、项目面板、变更面板都在此文件内 | coordinator |
| C-002 | private-plan | TARGET:coding-agent-harness/planning/tasks/2026-06-06-agentpal-mobile-workspace-session-browser-redesi-80719f34 | 前一轮会话索引改造的边界和残余问题 | coordinator |
| C-003 | private-plan | TARGET:coding-agent-harness/planning/tasks/2026-06-06-agentpal-project-explorer-expand-and-file-previe-393118ff | 项目目录展开和文件预览已实现，本轮只调整呈现 | coordinator |

## 步骤

1. 将会话页收敛为项目 / session 索引，减少重复统计和大型状态卡。
2. 将会话详情的聊天 / 项目 / 变更入口整合到顶部上下文，去掉内容区笨重分段栏。
3. 精简项目和变更面板顶部概览，保证底部输入框不遮挡列表终点。
4. 运行 TypeScript、Expo export、diff check 和 Harness check，记录证据。

## 验收标准

- [ ] 会话页按项目分组展示 sessions，项目和 session 层级清晰。
- [ ] 会话详情页面板切换不会遮挡标题或聊天内容。
- [ ] 项目 / 变更面板能滚动到底并避开 composer。
- [ ] 验证命令通过，任务记录更新。

## 工作树（Worktree）

- 路径：当前 checkout
- 分支：当前分支
- Worker owner：coordinator
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：单文件移动端 UI 修正，不使用 worker subagent，当前工作区已确认干净。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：若需要新增后端协议或原生能力，暂停并拆新任务。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：无 P0/P1/P2 布局或功能阻塞。

## 关联

- 相关 Regression Gate：mobile typecheck、Expo export
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`2026-06-06-agentpal-mobile-workspace-session-browser-redesi-80719f34`、`2026-06-06-agentpal-project-explorer-expand-and-file-previe-393118ff`

## 模块关联（启用模块并行时填写）

- Module：[module key，例如 reader / graph / 不适用]
- Step：[step ID，例如 RDR-02 / 不适用]
- Module Plan：[link to module_plan.md / 不适用]

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator / 不适用
- Global sync status：pending-coordinator-pass / synced / n/a
- Registry update needed：[module key, step, status, branch, updated / 不适用]
- Harness Ledger update needed：[task plan path, review path, closeout status / 不适用]
- Closeout / Regression update needed：[路径或 n/a]
