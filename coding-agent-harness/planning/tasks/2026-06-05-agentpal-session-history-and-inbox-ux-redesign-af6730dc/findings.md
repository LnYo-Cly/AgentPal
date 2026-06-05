# AgentPal session history and inbox UX redesign - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### 会话首屏空白不是纯 UI 问题

- 背景：用户反馈直接进入“会话”时无法加载历史，发一条消息后才出现内容。
- 发现：前序 live probe 显示当前 session 的 `history-page` 经常只包含内部 `session-started` / `state-changed`；移动端 `shouldShowConversationEvent` 会过滤这些事件，因此 UI 变成空白或“暂无最近消息”。
- 影响：只改前端 loading 文案不够，Relay/Host 需要在 history-request 时从 Codex thread detail hydration 出 `user-message`、`agent-message`、`command-output`、tool 等结构化事件。
- 后续：实现最小 Host/Relay history hydration，并用 WebSocket probe 验证。

### 会话页应是 Agent 时间线，不是普通聊天页

- 背景：截图显示 composer、技能/命令标签和“新消息”按钮遮挡内容，工具/代码展示割裂。
- 发现：AgentPal 的核心任务是远程控制 Codex/Claude/OpenCode，多 session、多状态、多工具事件比普通 IM 更重要。
- 影响：会话详情应采用固定上下文 header + 虚拟列表 timeline + 非遮挡 composer；工具、命令、代码块默认压缩，详情用 bottom sheet。
- 后续：重构列表 bottom inset、自动滚动策略、代码块预览和详情弹层。

### 首页应是待处理收件箱

- 背景：此前首页使用 hero + 指标卡，用户认为不适合“口袋 Agent”长期工作台。
- 发现：远程 Agent 产品首页最重要的是“是否需要我操作”：审批、失败、运行中、Host 离线和最近完成。
- 影响：首页不应展示营销式 hero 或重复大卡片；应以 attention queue 和可继续 session 为主。
- 后续：调整首页文案和布局层级，减少装饰性视觉。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| 历史加载 | App -> Relay history-request，Relay 内存不足时向 Host 请求 hydration | 保持手机端协议简单，并让 Host 负责 Codex thread 细节。 | App 直接连接 Codex app-server；不可取，破坏 Host 执行边界。 | accepted |
| Markdown | 继续使用 `markdown-it` + `react-native-render-html`，代码块拆出自定义卡片 | 避免自研 Markdown，同时掌控代码块移动端交互。 | 换库或完整 HTML code 渲染；Expo Go 风险更高。 | accepted |
| 代码高亮 | 继续 Prism JS 纯 JS 高亮，避免 native 依赖 | Expo Go 可运行，已解决缺少组件导入红屏风险。 | 引入 WebView/Shiki/native highlighter；复杂度和兼容风险较高。 | accepted |
| 主题 | 只使用 theme token 和系统/明/暗偏好 | 用户明确要求不能硬性写死主题。 | 固定 dark / happy clone；不符合产品和用户要求。 | accepted |
| Worker | 不使用 | 共享文件高度耦合，当前 dirty tree 大。 | 拆 worker 做 UI 或 Rust；合并风险高。 | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| Codex thread/resume 是否可稳定返回 turns | 先用 `excludeTurns: false` 或等价 detail 请求验证；若不可行记录 blocker。 | coordinator | Rust probe 阶段 |
| 真机视觉是否达到预期 | 机器无法替代 iOS/Android 视觉确认。 | human | L3 复测 |
