# AgentPal mobile cold visual redesign - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。阻塞性问题写入 `review.md`。

## 研究发现

### Mobile session stream should not render state changes as chat messages

- 背景：用户截图中同一轮输入后出现多个「运行中」和「完成」胶囊，挤占消息区并造成“重复回复”的错觉。
- 发现：`state-changed` 是 session 状态同步事件，不是对话内容；状态已经由 header/context chip 承载。
- 影响：会话流只保留用户消息、Agent 回复、工具/命令/Diff/审批/错误，状态事件从 conversation list 过滤。
- 后续：若后续需要展示失败或审批状态，应使用专门的错误/审批卡片，而不是通用状态胶囊堆叠。

### Real-time events can satisfy visible loading state

- 背景：用户截图中历史加载行停留在「加载历史...」。
- 发现：Relay 实时事件进入 `sessionHistory` 后，旧的 loading 状态没有被清除，视觉上像历史请求卡住。
- 影响：`mergeRealtimeEnvelope` 在合并实时事件后清除 `loading`、`error` 和 `latestRequestId`，避免 UI 持续显示 loading。
- 后续：更完整的分页实现可以区分 initial load 与 older-page load。

### Expo Go is not a native capability verifier

- 背景：用户希望验证 Liquid Glass / 灵动岛，但当前使用 Expo Go。
- 发现：Expo Go 能验证 React Native 页面和 fallback；原生 `expo-glass-effect` / Live Activity 需要 Dev Build 或原生构建。
- 影响：设置页保留诊断和测试面板，但不把 Expo Go 结果当成系统级能力结论。
- 后续：原生构建阶段再验证系统 Liquid Glass 和灵动岛行为。

### Expo Go runtime must match the local SDK

- 背景：用户 iOS 截图出现 Expo 白页 `There was a problem running "AgentPal"`，没有显示 JS 红屏堆栈。
- 发现：设备端错误页随后明确显示用户安装的 Expo Go 支持 SDK 54，而项目一度被降到 SDK 53，因此正确方向是让项目保持 `runtimeVersion=exposdk:54.0.0`。
- 影响：Expo Go 真机调试阶段必须以设备错误页显示的 installed SDK 为准；本轮恢复 mobile 到 SDK 54，并保留 `markdown-it` Markdown 修复。
- 后续：如果再次出现兼容错误，先读取设备错误页和 `/manifest?platform=ios` 的 `runtimeVersion`，不要只依据旧 Metro 日志推断。

### Tool events need mobile-specific compaction

- 背景：用户 iOS 截图中 `commandExecution` 以两张大卡展示，标题是内部 tool name，长 PowerShell 命令占据过多纵向空间。
- 发现：Codex tool start / finish 是过程事件，不应该等同于聊天消息，也不应该直接展示原始工具标识。
- 影响：合并相邻工具 start / finish，翻译常见工具名，并提取命令核心摘要，保持消息流可扫读。
- 后续：如果后续要支持展开完整日志，应给工具卡增加详情页或 bottom sheet，而不是默认展开整段命令。

### Saved pairing and discovered host are separate states

- 背景：用户截图中首页显示在线，但设置页显示 `等待配对 / 未配对`，造成“实际已连接但设置页说没连接”的矛盾。
- 发现：当前 App 可以通过 Relay 发现在线 Host，但本地 pairing 可能尚未保存；这不是离线或失败态。
- 影响：设置页状态机区分 `Host 已发现` 与 `等待配对`，连接列表也显示 `已发现 <host>`，避免把发现态误判成未配对失败。
- 后续：后续可以增加“一键保存已发现 Host”为固定 pairing 的操作，但本轮先修正文案和状态一致性。

### Composer shortcuts should be contextual, not persistent chrome

- 背景：用户截图中 `$ Skills`、`/ 命令`、`工具` 三个入口默认常驻，并在会话底部和键盘场景中压住最新消息。
- 发现：这些入口本质是输入前缀触发的候选面板，不应该在空输入时占据主会话区域。
- 影响：只有输入 `$` 或 `/` 时才展示对应 shortcut hint；发送成功 toast 也移除，避免覆盖消息流。
- 后续：真正接入 slash command / skills picker 时，应作为候选列表或 bottom sheet，而不是常驻三按钮。

### Agent messages should use a React Native Markdown library

- 背景：用户指出 Agent 回复没有 Markdown 渲染，并明确要求使用现成库，不要自研解析器。
- 发现：React Native/Expo 可使用现成库组合，不需要 WebView，也不需要手写 Markdown parser。`react-native-markdown-display` 有旧 `react-native-fit-image` 兼容风险；`react-native-marked` 在 Expo Metro 下会走源码入口并出现 `./hooks/useMarkdown` resolve 失败；`marked` 在当前 Metro 环境下出现包解析问题。因此最终使用成熟 CommonJS 解析器 `markdown-it` 解析 Markdown，`react-native-render-html` 渲染 React Native 内容。
- 影响：Agent bubble 由纯文本改为 `markdown-it.render` + `RenderHTML` 渲染；代码块、inline code、列表、链接等基础样式统一在 `markdownTagStyles` 中定义。
- 后续：如果后续需要语法高亮或复制代码按钮，应作为代码块增强组件处理，而不是替换 Markdown parser。

### Skills and slash commands need real Host capability data

- 背景：用户希望在输入框上方点击 `技能` / `命令`，弹出当前 Agent 含有的内容，点选后插入输入框。
- 发现：当前 Relay/Host 协议还没有下发 session capability list，前端不能伪造真实 skills / slash commands。
- 影响：本轮先提供 bottom sheet 交互骨架和 `$` / `/` 插入入口；真实列表为空时明确提示 `Host 暂未提供列表`。
- 后续：Host adapter 需要从 Codex / Claude / OpenCode 获取实际 skills、plugins、slash commands 后，通过协议同步给 App。

### Markdown list newlines were lost in Host delta filtering

- 背景：用户截图中 Agent 回复里的 `1. ...2. ...3. ...` 被渲染成一行，用户指出应先排查原始 Agent 输出和移动端接收文本是否一致。
- 发现：直连 Codex app-server 的 raw probe 证明 `item/agentMessage/delta` 原始流和 `item/completed.agentMessage.text` 均能保留列表换行；Relay 旧历史中换行丢失，是 Host 旧逻辑用 `delta.trim().is_empty()` 过滤纯换行 delta 导致。
- 影响：Host 改为只过滤真正空字符串，不再丢 `"\n"`；并且在 `item/completed` 时发布 `complete=true` 的完整 `agent-message`，移动端用 completed text 替换同一轮流式 delta，避免历史或中间流式事件成为最终渲染依据。
- 后续：排查 Markdown 显示问题时，先用 raw app-server probe 和 Relay history probe 比对 `delta.join("")` 与 completed text，再判断是否需要调 Markdown 样式。

### Picker registry should be Host-sourced, not frontend hardcoded

- 背景：用户要求 `技能` / `命令` 列表必须是真实 agent 能力，不接受 mock 或前端假数据。
- 发现：Codex app-server schema 暴露 `skills/list` 和 `plugin/list`；slash command 暂未发现同类公开 list 接口。
- 影响：新增 `PickerRegistry` 协议；Host 使用 `skills/list` / `plugin/list` 获取真实 skills/plugins 后经 Relay snapshot 下发；Codex slash commands 暂由 Host adapter 提供注册表，不在移动端硬编码。
- 后续：如果 Codex 后续暴露 slash command list 接口，应把 Host adapter 中的内置 slash registry 替换为 app-server 源。

### Conversation auto-scroll must respect reading position

- 背景：用户指出会话不会在底部自动跟随新内容，但用户向上翻阅时也不应该被强制拉回底部。
- 发现：移动端 Agent 会话同时像聊天和日志，必须区分用户是否接近底部。
- 影响：接近底部或发送用户消息时自动滚到底部；用户离开底部时显示 `新消息` 按钮，不强制滚动。
- 后续：如果后续改用 FlashList，需要复刻同样的 bottom-distance 判断和 new-message affordance。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| 会话状态展示 | 只在 header/context chip 展示 `state-changed` | 减少消息流噪音，符合移动端会话阅读习惯 | 在消息流中继续渲染状态胶囊 | accepted |
| 首页最近动态 | 使用可见事件过滤器 | 避免 `reasoning` 等内部 tool event 污染首页 | 直接使用 `relay.timeline[0]` | accepted |
| 配对成功态 | 连接成功时隐藏三步配对流程 | 设置页减少重复信息和纵向占用 | 继续展示完整步骤列表 | accepted |
| command chips | 标注为待接入 | 避免占位入口被误认为完整功能 | 立即实现完整 picker | accepted |
| 工具事件展示 | 合并 start/finish 并压缩长命令 | 移动端会话流需要快速扫读，不适合终端式日志块 | 每个事件独立大卡展示 | accepted |
| 工具详情交互 | 点击轻量工具行打开底部详情面板 | 默认列表保持扫读效率，详情面板承载完整命令和原始输出 | 在列表卡片内展开全部内容 | accepted |
| 工具详情密度 | 隐藏重复摘要，重命名调试标签，限制完整输出高度 | 详情页应该先服务用户理解，不暴露过多内部调试语气 | 全量展示所有字段且不折叠 | accepted |
| 会话焦点排序 | 审批、运行、失败、完成、新近优先 | 首页主视觉应该反映当前最需要关注的 Agent，而不是固定默认 session | 始终显示 `agentpal-codex-local` | accepted |
| 配对状态文案 | 区分 discovered host 与 saved pairing | Relay 已发现 Host 时不能继续显示纯 `未配对` | 强制要求先扫码才算在线 | accepted |
| Composer shortcut 展示 | 按 `$` 或 `/` 前缀触发 | 避免空输入时的常驻按钮遮挡消息和键盘场景 | 三个入口常驻底部 | accepted |
| Markdown 渲染 | 使用 `markdown-it` + `react-native-render-html` | 符合用户要求，避免自研 parser、WebView、旧 fit-image 兼容风险、`react-native-marked` Metro 源码入口问题和 `marked` 包解析问题 | 手写 Markdown 解析器；`react-native-markdown-display`；`react-native-marked`；`marked` | accepted |
| Expo Go 调试 SDK | 对齐到 Expo SDK 54 | 用户当前 iOS Expo Go 错误页明确显示 installed SDK 为 54；SDK 54 依赖通过 `expo install --check`、typecheck、iOS export 和 manifest 检查 | SDK 53；Dev Build；EAS iOS 包 | accepted |
| 会话自动滚动 | 只在接近底部时跟随，新消息按钮手动回底 | 兼顾实时跟随和人工翻阅历史 | 每次新消息都强制滚到底部 | accepted |
| 技能/命令面板 | 使用 Host 下发 `PickerRegistry` | Codex app-server 提供 `skills/list` / `plugin/list`；前端只展示 Host registry，不伪造列表 | 前端硬编码全部列表；继续显示待接入 | accepted |
| Agent 消息最终文本 | completed `agentMessage.text` 作为最终权威 | 流式 delta 用于实时显示，但旧 Host 会丢纯换行；completed text 可校正最终 Markdown | 只拼 delta；前端猜测修复所有 Markdown | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| 新界面在 iOS Expo Go / Android 真机视觉是否可接受 | 需要用户刷新后截图确认 | user / coordinator | 下一轮真机测试 |
| dirty-state 如何拆分提交 | 不能在本轮混合提交 | coordinator | 用户确认提交边界或清理归属后 |
