# AgentPal conversation view switcher redesign

Task Contract: harness-task/v1
Task Package Index: required

## 目标

修正会话页 `聊天 / 项目 / 变更` 分段栏的层级和布局，使它成为内容区内的轻量切换器，而不是压在 header 下方的第二导航条。

## 范围

- 做什么：移动切换器位置、压缩视觉重量、移除 badge、调整内容顶部 inset、保持三个 panel 的切换行为。
- 不做什么：不重做首页/设置页，不重构会话消息渲染，不改变项目目录和文件预览协议。
- 主要风险：切换器从 absolute 改为内容内组件后，聊天列表和项目 ScrollView 都必须保留可切换入口；内容不能被 header 或 composer 遮挡。

## 预算选择

选择预算：standard

选择理由：这是单文件 UI 布局修正，但影响会话页三种 view 的入口和滚动布局，需要验证 Expo bundle。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/app/index.tsx | 包含 `ConversationPage`、`ConversationPanelTabs` 和 `WorkspacePanel` | coordinator |

## 步骤

1. 移除固定在 header 下方的 absolute `ConversationPanelTabs`。
2. 将 `ConversationPanelTabs` 放入聊天列表 `ListHeaderComponent`。
3. 将 `ConversationPanelTabs` 放入项目/变更 ScrollView 内容顶部。
4. 简化切换器样式：去掉数量 badge，使用轻量 border、active fill 和 34px touch target。
5. 调整 `contentTopInset`，避免内容顶部保留旧固定栏高度。
6. 运行 typecheck、Expo iOS export 和 diff check。

## 验收标准

- [x] Header 下方没有全宽固定分段栏。
- [x] 聊天、项目、变更三个视图都有切换入口。
- [x] 切换器不显示数量 badge，数量信息留给各自内容面板。
- [x] `npm --prefix apps/mobile run typecheck` 通过。
- [x] `npx expo export --platform ios --output-dir ../../tmp/expo-export-switcher-redesign --clear` 通过。

## 工作树（Worktree）

- 路径：`G:\My_Project\python\gitlab\pocket_agent`
- 分支：`master`
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：`master`
- 未使用 worktree 的原因：单文件布局修正，worker 并行没有收益。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：不适用
- Stop Condition 摘要：若需要改变路由、主导航或新增依赖则停止。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：不适用
- Reviewer：self
- No-finding 要求：无阻塞当前目标的重要发现。

## 关联

- 相关 Regression Gate：移动端 typecheck、Expo iOS export。
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI 同步
- 前置任务：`2026-06-06-agentpal-project-explorer-expand-and-file-previe-393118ff`

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：synced
- Registry update needed：不适用
- Harness Ledger update needed：已由 Harness CLI 同步
- Closeout / Regression update needed：`walkthrough.md`
