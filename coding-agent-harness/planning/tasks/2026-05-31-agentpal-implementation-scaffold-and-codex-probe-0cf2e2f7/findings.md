# AgentPal implementation scaffold and Codex probe - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### Codex app-server 探测边界

- 背景：AgentPal Host 需要优先使用 Codex 的结构化接口，而不是直接解析终端 TUI。
- 发现：本机 `codex-cli 0.134.0` 可生成 app-server schema/types，`ClientRequest` 包含 `initialize`、`thread/start`、`turn/start`、`turn/steer`、`skills/list`、`plugin/list`；`ServerNotification` 包含 `thread/started`、`turn/started`、`turn/completed`、`turn/diff/updated`、`item/agentMessage/delta` 等事件。临时实验中，Windows daemon lifecycle 返回仅支持 Unix；`codex app-server --listen ws://127.0.0.1:<port>` 的根路径 WebSocket 连接返回 non-101。
- 影响：本任务实现真实 probe，但不把连接成功作为假设；Host 必须输出 phase/error/report，便于下一轮定位 app-server URL/path/header 或 Windows 支持差异。
- 后续：如果 probe 仍 non-101，下一轮应围绕 Codex app-server 官方入口或 proxy/control socket 继续定位，不应退回纯 PTY 解析作为主路径。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| 首版项目骨架 | Expo RN + Rust Host/Relay + shared protocol crate | 与已确认技术栈一致，覆盖 iOS/Android、桌面长驻进程、Relay 和类型边界。 | Flutter、Node Host、纯 WebView | accepted |
| Codex probe 行为 | 真实启动/连接 Codex app-server，失败也结构化输出 | 用户明确不要 mock；真实失败是有价值证据。 | mock Codex server、硬编码成功 | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| Codex app-server Windows listen URL/path 是否另有要求 | 当前只确认根路径曾返回 non-101，需由真实 probe 记录最新结果 | coordinator | 完整 Codex adapter 前 |
