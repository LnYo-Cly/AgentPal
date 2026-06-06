# AgentPal mobile workbench and sessions IA correction

Task Contract: harness-task/v1
Task Package Index: required

## 目标

把 `工作台` 和 `会话` 的信息架构从“重复展示 session”修正为“工作台处理关注事项，会话按项目恢复 session”。

## 范围

- 做什么：重构 `apps/mobile/app/index.tsx` 的 `HomePage`、`SessionsPage`、项目分组卡和底部导航文案。
- 不做什么：不新增 Host/Relay 协议，不实现真实新 session 创建，不改聊天详情的 Markdown/代码渲染。
- 主要风险：单文件 UI 过大，布局修正可能影响会话详情入口和底部导航。

## 预算选择

选择预算：standard

选择理由：这是一个单文件但涉及顶层导航和两个页面职责的中等 UI/交互修正，需要 Harness 记录和 Expo 验证。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/app/index.tsx | 当前所有移动端页面、导航和 session UI 都集中在此文件 | coordinator |
| C-002 | private-plan | TARGET:coding-agent-harness/planning/tasks/2026-06-06-agentpal-mobile-workbench-and-sessions-ia-correc-a2978171/visual_map.md | 固化“工作台 vs 会话”的页面职责 | coordinator |
| C-003 | external | user screenshots | 用户提供的当前手机截图和 Codex desktop 参考，用于判定 IA 是否合理 | coordinator |

## 步骤

1. 定义新 IA：`工作台` 只显示 Host/当前焦点/待处理队列/最近事件；`会话` 只显示项目分组 session 浏览器。
2. 修改 `apps/mobile/app/index.tsx`：移除工作台完整 session 列表；会话页移除重复 HostStrip/指标卡；压缩项目卡；修复 `.` workspace 名。
3. 验证：运行 `npm --prefix apps/mobile run typecheck`、Expo iOS export、`git diff --check`、Harness check。

## 验收标准

- [x] `工作台` 不再出现“可继续会话”整列表。
- [x] `会话` 页面不再重复 HostStrip 和三张指标卡。
- [x] 项目分组卡更紧凑，并能展示项目下的最近 session。
- [x] `.` workspace 被映射为路径末段或“当前项目”。
- [x] 底部浮动导航不会遮挡列表末尾内容。

## 工作树（Worktree）

- 路径：当前 checkout
- 分支：master
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：master
- 未使用 worktree 的原因：改动集中在单一移动端 UI 文件和当前任务文档，拆 worktree 会增加合并冲突。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：不适用
- Stop Condition 摘要：需要新增协议字段或跨 Host/Relay 数据模型时停止。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：不适用
- Reviewer：self
- No-finding 要求：TypeScript、Expo export、Harness check 通过，且 review.md 记录无开放 P0/P1/P2。

## 关联

- 相关 Regression Gate：移动端 Expo export / typecheck
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`2026-06-06-agentpal-mobile-workspace-session-browser-redesi-80719f34`

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：由 lifecycle CLI 生成
- Closeout / Regression update needed：n/a
