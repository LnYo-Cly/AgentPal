# AgentPal mobile cold visual redesign

## Task ID

`2026-06-01-agentpal-mobile-cold-visual-redesign-b37239ca`

## 创建日期

2026-06-01

## 一句话结果

修复 AgentPal 移动端冷启动后的会话可读性、状态噪音、Markdown 渲染、工具事件密度和设置页连接状态一致性。

## 完成后能得到什么

用户刷新移动端后，可以在会话页看到更像真实移动工作台的 Agent 对话：状态变更不再挤占消息流，Agent 回复按 Markdown 渲染，工具/命令事件被压缩成可扫读条目，历史加载和自动滚动行为更稳定。下一轮 agent 可以从 `findings.md` 读取 Host/Relay/Markdown/PickerRegistry 的关键判断，从 `progress.md` 读取 typecheck、Expo export 和 Relay probe 证据。

## 交付物

- 可见产物：移动端首页、会话页、工具详情、设置页状态文案和输入 shortcut 行为调整。
- 修改位置：`apps/mobile/app/index.tsx`、`apps/mobile/src/hooks/useAgentPalRelay.ts` 及相关 Host/Relay capability 同步代码。
- 验证证据：TypeScript 检查、Expo iOS export、Relay history / PickerRegistry probe、用户真机截图反馈。

## 第一眼应该看什么

先读 `findings.md` 的移动端 UI/Relay 决策，再读 `review.md` 的残余风险；真机视觉仍以用户设备确认作为最终门禁。

## 边界

- 范围内：移动端会话流、首页最近动态、设置页连接态、Markdown 渲染、工具事件压缩、picker registry 接入骨架。
- 范围外：原生 Dev Build、生产 pairing auth、完整 Live Activity / 灵动岛发布、完整 slash command picker 后端协议。
- 停止条件：Expo Go 与本地 SDK 不匹配、真机截图仍显示 P0 布局问题，或 Host 不能提供真实 capability 数据。

## 完成判断

- `state-changed` / reasoning 等内部事件不再作为普通聊天消息显示。
- Agent Markdown 基础元素可以在移动端正确渲染。
- 工具/命令事件默认压缩，详情通过 bottom sheet 查看。
- 设置页区分 saved pairing 与 discovered host。
- TypeScript、Expo export 和 Relay probe 证据记录在 `progress.md` / `review.md`。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、`progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

等待用户真机视觉确认；Harness 生命周期材料在 2026-06-07 修复任务中补齐。
