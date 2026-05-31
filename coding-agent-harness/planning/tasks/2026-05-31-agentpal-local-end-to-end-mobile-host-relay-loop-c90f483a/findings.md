# AgentPal local end-to-end mobile host relay loop - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### Relay 消息字段必须保持移动端友好的 camelCase

- 背景：Node 模拟手机端按 TypeScript/React Native 常规发送 `clientId`，Relay 初版 Rust enum 默认要求 `client_id`。
- 发现：真实 WebSocket smoke 返回 `invalid relay message: missing field client_id`，说明 serde enum variant 字段必须显式设置 `rename_all_fields = "camelCase"`。
- 影响：协议层统一为 variant type 使用 kebab-case，字段使用 camelCase，避免移动端和 Rust DTO 分裂。
- 后续：后续新增审批、Diff、picker 消息时沿用同一 serde 规则。

### Codex approvalsReviewer 不能臆造 client 值

- 背景：Host 初版为移动端审批预留 `approvalsReviewer: "client"`。
- 发现：本地生成的 Codex TS schema 中 `ApprovalsReviewer` 仅允许 `user`、`auto_review`、`guardian_subagent`。
- 影响：本轮删除该字段，保留 Codex 默认 reviewer；手机端审批回传需要后续基于真实 ServerRequest/approval API 单独设计。
- 后续：审批切片开始前必须先用 schema 和真实事件确认请求/响应方法。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| Relay message shape | `type` kebab-case + fields camelCase | 兼容 Rust tagged enum 和 React Native/JSON 常规字段名 | 全 snake_case；前端单独转换 | accepted |
| Host connect mode | 新增 `agentpal-host codex connect`，保留 `codex probe` | probe 继续做单点诊断，connect 参与真实 AgentPal 闭环 | 用 probe 直接承担 daemon 行为 | accepted |
| Mobile data source | WebSocket hook 派生 UI 状态 | 保持移动端结构化卡片，不复刻终端 | 静态 sample 或终端日志流 | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| 真机连接地址如何配置 | 本轮仅默认模拟器/本机地址，真机需要后续配对或设置页 | coordinator | Host pairing 任务前 |
| 审批回传方法 | 不在本轮实现，必须基于 Codex app-server 真实 server request schema | coordinator | Approval slice 前 |
