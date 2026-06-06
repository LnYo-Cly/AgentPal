# AgentPal mobile workspace session browser redesign

Task Contract: harness-task/v1
Task Package Index: required

## 目标

移动端会话入口采用“项目/工作区 -> sessions -> 会话详情”的信息架构，避免把 Codex 桌面端侧栏直接搬到手机上。

## 范围

- 做什么：在手机端新增/替换 `会话` 页面为项目分组 session 浏览器；调整底部导航和会话详情返回路径；把详情内 `项目` 分段改名为 `文件`；保留当前文件树和变更能力。
- 不做什么：不新增真实新会话协议，不扫描电脑全盘 session，不接入 Claude Code/OpenCode 新协议，不重做现有主题设置。
- 主要风险：当前 Relay sessions 的 workspace 信息可能不足；移动端屏幕空间有限，项目卡和 session 列表需要保持密度而不堆卡；变更只应触碰当前 UI 信息架构。

## 预算选择

选择预算：standard

选择理由：改动集中在移动端单文件 UI 和任务材料，不涉及 Host/Relay 协议，风险中等。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/app/index.tsx | 当前移动端导航、会话详情、文件树、变更视图都在此文件中 | coordinator |
| C-002 | user-reference | 用户提供的 Codex 桌面端截图 | 证明 Codex 的项目结构是“项目下挂 session”，手机端应学习信息结构而不是桌面布局 | coordinator |
| C-003 | private-plan | TARGET:coding-agent-harness/planning/tasks/2026-06-06-agentpal-mobile-workspace-session-browser-redesi-80719f34/visual_map.md | 阶段、门禁和验证收口 | coordinator / reviewer |

## 步骤

1. 梳理移动端 IA：底部 `首页 / 会话 / 设置`，其中 `会话` 为项目分组 session 浏览器，详情页为从列表进入的工作界面。
2. 修改 `ActiveTab`、`BottomNav` 和页面渲染，让底部 `会话` 进入新浏览页，详情页通过 session 卡片进入。
3. 新增项目/工作区分组组件，按 session.workspace/root 聚合并展示最近会话、状态、时间和当前标记。
4. 调整当前会话详情的分段标签为 `聊天 / 文件 / 变更`，并让返回路径回到 `会话` 浏览页。
5. 运行 TypeScript、Expo export、Harness check，记录证据并提交。

## 验收标准

- [ ] 底部 `会话` 页面不再直接显示当前会话详情，而是显示项目/工作区分组的 session 列表。
- [ ] 用户可以从某个 session 卡片进入会话详情，并从详情返回 session 浏览页。
- [ ] 会话详情分段栏显示 `聊天 / 文件 / 变更`，其中 `文件` 保持目录展开和文件预览能力，`变更` 保持 worktree/diff 摘要能力。
- [ ] UI 支持明/暗主题现有设置，不硬编码为单一主题。
- [ ] `npm --prefix apps/mobile run typecheck`、Expo export、Harness check 有记录。

## 工作树（Worktree）

- 路径：当前 checkout `G:\My_Project\python\gitlab\pocket_agent`
- 分支：`master`
- Worker owner：coordinator
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：本轮改动集中在一个移动端入口文件和当前任务材料，未启用写入型 worker subagent。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：如果需要新增 Host/Relay 协议或真实新 session 能力，则停止并拆分后端任务。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self；必要时可做只读 reviewer 检查
- No-finding 要求：无 P0/P1/P2 UI 逻辑回归，验证命令通过。

## 关联

- 相关 Regression Gate：移动端 typecheck、Expo export、Harness check
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`2026-06-06-agentpal-project-explorer-expand-and-file-previe-393118ff`，`2026-06-06-agentpal-conversation-view-switcher-redesign-e3cce4c7`

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：pending-coordinator-pass
- Registry update needed：不适用
- Harness Ledger update needed：由 lifecycle CLI 同步
- Closeout / Regression update needed：`progress.md`、`review.md`、`walkthrough.md`
