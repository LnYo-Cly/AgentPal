# AgentPal mobile session IA follow-up polish

Task Contract: harness-task/v1
Task Package Index: required

## 目标

修复最新会话页截图暴露的信息架构问题，并用 web 截图与 Expo 导出自行验证。

## 范围

- 做什么：调整 `apps/mobile/app/index.tsx` 中会话页分组、新建会话入口、空闲状态展示、路径压缩、设置按钮中性态；修复 web 导出白屏所需的 `AccessibilityInfo` 兼容 guard；记录 Harness 证据。
- 不做什么：不修改 Relay/Host 后端连接、不扩大会话详情页交互、不引入新设计系统或新依赖。
- 主要风险：web 导出与 Expo Go 原生渲染不完全等价；截图验证需要区分 app 错误和浏览器扩展噪声。

## 预算选择

选择预算：standard

选择理由：这是用户截图驱动的移动端 UI follow-up，包含代码改动、web 可视验证、原生导出和审查材料，超过 simple 任务但不需要 complex reference 包。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/app/index.tsx | 会话页、首页、按钮和工作区路径 helper 的唯一实现入口。 | coordinator / reviewer |
| C-002 | task | TARGET:coding-agent-harness/planning/tasks/2026-06-07-agentpal-mobile-session-ui-polish-from-screensho-f9bb2426 | 前一轮截图 polish 的上下文和残余真机验证风险。 | coordinator / reviewer |
| C-003 | screenshot | TARGET:tmp/web-sessions-ui-polish-followup-cdp.png | 本轮 web 自验证的移动宽度会话页结果。 | coordinator / reviewer |

## 步骤

1. 调整会话页 IA：将 fallback 新建会话入口从项目分组中移出，项目分组只统计真实历史会话。
2. 收敛状态与路径：普通 idle 行不显示右侧 `就绪`，当前行保留轻量标记，工作区路径去掉 `\.` 并压缩为移动端短路径。
3. 修复 web 导出兼容性：对 web 缺失的 `AccessibilityInfo.isReduceTransparencyEnabled` 做 guard，避免白屏。
4. 运行 TypeScript、web export、CDP 截图、iOS export、`git diff --check`，记录证据并提交。

## 验收标准

- [x] 会话页 DOM 文本显示 `项目\n1 个`，且不包含 `当前项目`。
- [x] “新建 Codex 会话”出现在项目列表上方，项目卡显示 `pocket_agent` 和短路径。
- [x] 普通 idle 会话不显示右侧 `就绪`，会话页 DOM 中 `就绪` 出现次数为 0。
- [x] `npm --prefix apps/mobile run typecheck`、web export、iOS export、`git diff --check` 均通过。
- [x] 首页和会话页 web 截图已生成并人工查看。

## 工作树（Worktree）

- 路径：`G:\My_Project\python\gitlab\pocket_agent`
- 分支：`master`
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：改动集中在单一移动端文件和当前任务材料，无并行 worker 切片。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：验证失败、范围扩大到后端/协议或需要人工视觉 waiver 时停止。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self，最终 Human Review Confirmation 由用户完成
- No-finding 要求：无 P0/P1/P2 open finding，证据覆盖代码、web 视觉和 iOS export。

## 关联

- 相关 Regression Gate：移动端 UI smoke / Expo export，本任务记录在 `progress.md`
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`2026-06-07-agentpal-mobile-session-ui-polish-from-screensho-f9bb2426`

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：不适用
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：由 lifecycle CLI 记录 task-start、task-phase、task-review
- Closeout / Regression update needed：`progress.md`、`review.md`、`walkthrough.md`
