# AgentPal conversation view switcher redesign

## Task ID

`2026-06-06-agentpal-conversation-view-switcher-redesign-e3cce4c7`

## 创建日期

2026-06-06

## 一句话结果

会话页的 `聊天 / 项目 / 变更` 切换器从固定顶部栏改为内容区内的轻量视图切换器。

## 完成后能得到什么

用户进入会话详情时，顶部 header 只表达会话身份、在线状态和刷新动作，不再被第二条重型导航栏打断。`聊天 / 项目 / 变更` 被降级为当前会话内的视图切换控件，放在内容区第一块位置，宽度跟随内容边距，active 状态使用轻量填充和边框。项目数量与变更数量不再挤在切换器内，而留在各自内容面板展示，减少顶部拥挤和语义冲突。

## 交付物

- 可见产物：会话页顶部不再出现横跨全宽的分段栏；切换器成为聊天、项目、变更面板的内容入口。
- 修改位置：`apps/mobile/app/index.tsx`
- 验证证据：TypeScript typecheck、Expo iOS export、diff check。

## 第一眼应该看什么

先看代码提交 `9a09f31 fix(agentpal): refine conversation view switcher`，再看 `progress.md` 里的验证记录。

## 边界

- 范围内：会话页视图切换器的布局层级、尺寸、active 状态、badge 移除和内容 inset 调整。
- 范围外：重做会话页整体设计、重构消息列表、调整项目目录/文件预览功能、底部输入框改版。
- 停止条件：需要改变主导航、session 路由或引入新 UI 依赖时停止。

## 完成判断

- 顶部 header 下方不再有固定全宽分段栏。
- `聊天 / 项目 / 变更` 切换器在内容区第一块渲染。
- 切换器不再展示项目/变更数字 badge。
- 三个视图仍可正常切换，项目/变更视图仍触发 workspace 刷新逻辑。
- TypeScript 和 Expo export 均通过。

## 执行合同

- Owner：coordinator
- 生命周期状态：审查中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、`progress.md`、`findings.md`、`review.md`
- 完成条件：代码提交、验证证据和 agent review 均完成；人工确认 gate 由用户处理。

## 当前下一步

等待用户在 Expo Go 中刷新后检查会话页顶部切换器的视觉和交互。
