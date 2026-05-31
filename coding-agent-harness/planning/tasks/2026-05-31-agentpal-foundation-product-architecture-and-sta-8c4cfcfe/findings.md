# AgentPal foundation product architecture and stack SSoT - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### AgentPal 应是移动端结构化工作台，不是手机终端

- 背景：用户反复强调手机端应处理会话、审批、Diff 和继续输入，而不是复制 Terminal。
- 发现：产品边界已写入 `product-brief.md`、`mvp-scope.md` 和 `ux-principles.md`。
- 影响：后续 UI/Host/Relay 实现都应围绕结构化事件和卡片，不以终端滚屏作为主界面。
- 后续：进入移动端实现任务时按 screen set 生成原型和组件清单。

### WebSocket 可用但不能被当作可靠性本身

- 背景：用户询问 WebSocket 是否稳定、更好。
- 发现：固定 WebSocket 作为前台实时通道，但可靠性由 Postgres event log、seq/ack/replay、idempotency 和 push wake-up 提供。
- 影响：Relay 和 Host 需要从第一版就按事件日志和重放设计，避免后期大改通信模型。
- 后续：实现协议时补充 schema fixture 和 reconnect/idempotency 测试。

### Session 管理应 workspace-first

- 背景：用户询问一台电脑上多个 Codex/Claude sessions 是否应全量扫描管理，还是按目录启动/恢复。
- 发现：主路径应是 Host -> Workspace -> start/resume managed session；历史扫描只是 discovery/resume 功能。
- 影响：首页不应展示巨大扁平历史列表，Host 也不应默认全文扫描所有 transcript。
- 后续：Host adapter 实现时建立 workspace index，并为历史 session 标记 resumable/read-only。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| Mobile stack | Expo React Native + TypeScript + Development Build | 同一代码库覆盖 iOS/Android，适合通知、扫码、secure store、本地缓存和后续 native 扩展。 | Flutter、Swift/Kotlin 双原生、WebView | accepted |
| UI strategy | Shopify Restyle + AgentPal-owned product UI Kit | 通用组件库无法表达 Approval/Diff/Session/EventFeed 等领域组件，基础能力仍用成熟库。 | React Native Paper、Tamagui、gluestack 作为主 UI 层 | accepted |
| Host/Relay stack | Rust + Tokio/Axum/sqlx | 长驻进程、进程控制、单二进制分发和协议严谨性更重要。 | Node Host/Relay | accepted |
| Realtime | WebSocket + event log/replay/idempotency/push | 兼顾实时体验和移动端后台/弱网恢复。 | Socket.IO-only、纯 push、轮询 | accepted |
| Session model | workspace-first managed sessions | 避免全局历史列表噪声，符合 cwd/workspace 作为上下文边界的实际情况。 | 启动即扫描并管理所有历史 sessions | accepted |
| CLI affordances | `/` 和 `$` 映射到移动端 picker | 保留 Codex/Claude 的命令体验，但避免终端 TUI 镜像。 | 直接渲染 terminal TUI | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| UI 原型图是否作为生产资产 | 当前判断：`ui/` 仅作本地参考，生产资产后续另行生成/授权/提交。 | product/design | 移动端 App asset tree 创建前 |
| Codex/Claude adapter 最优结构化入口 | 当前判断：优先官方结构化 API/SDK/hooks，PTY/TUI parsing 仅 fallback。 | host owner | Host adapter 实现前 |
| 端到端加密详细 threat model | 当前判断：使用标准 crypto primitives，不自研算法；具体密钥生命周期后续补 contract。 | security/backend owner | Relay 协议实现前 |
