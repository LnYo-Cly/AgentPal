# AgentPal foundation product architecture and stack SSoT

## Task ID

`2026-05-31-agentpal-foundation-product-architecture-and-sta-8c4cfcfe`

## 创建日期

2026-05-31

## 一句话结果

把 AgentPal 的产品定位、MVP 范围、UX 原则、固定技术栈、实时同步模型、会话模型和 Agent adapter 契约沉淀为 harness SSoT。

## 完成后能得到什么

完成后，下一轮 agent 不需要重新翻对话来理解 AgentPal。项目会拥有一组可引用的产品与架构事实源：AgentPal 是手机端 AI coding agent 工作台，不是手机终端；手机负责结构化查看、审批、Diff、指令输入，电脑 Host 负责真实执行；Relay 负责可靠转发和通知。技术路线固定为 Expo React Native + Rust Host/Relay + WebSocket/event-log/replay，并明确 UI 组件边界、session 管理方式、`/` 和 `$` 的移动端体验。

## 交付物

- 可见产物：产品 brief、MVP scope、UX principles、架构 SSoT、系统图谱、服务目录、关键流程、固定技术栈、实时同步模型、Host/session 模型、Agent adapter contract。
- 修改位置：`coding-agent-harness/context/product/*`、`coding-agent-harness/context/architecture/*`、`coding-agent-harness/context/integrations/agent-adapter-contract.md`。
- 验证证据：`harness status --json .`。

## 第一眼应该看什么

先读 `coding-agent-harness/context/product/product-brief.md`，再读 `coding-agent-harness/context/architecture/technical-stack-decision.md`、`coding-agent-harness/context/architecture/realtime-sync-model.md`、`coding-agent-harness/context/architecture/host-session-model.md` 和 `coding-agent-harness/context/integrations/agent-adapter-contract.md`。

## 边界

- 范围内：仅沉淀 AgentPal 需求、产品定位、固定技术选型、架构边界、实时通信、会话管理、移动端 UI 原则和 adapter 契约。
- 范围外：不创建移动 App、Host、Relay 代码；不提交 `ui/` 原型图；不重新扫描或导入全部历史 Codex/Claude session；不实现生产加密或推送。
- 停止条件：如果要改变已确认的固定技术路线、提交本地 UI 原型图、或把人工 review 当成 agent 自审，必须回到用户确认。

## 完成判断

- SSoT 文档明确 AgentPal 的目标、非目标和 MVP 范围。
- 技术栈文档明确 mobile、Host、Relay、protocol、storage、UI component strategy 和不重复造轮子的边界。
- realtime/session/adapter 文档覆盖 WebSocket 稳定性、workspace-first session 模型、`/` 与 `$` 的移动端实现方式。
- `harness status --json .` 通过，且任务包记录证据、review 和 lessons 路由。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中；完成材料后提交 Agent Review Submission，人工确认不由 agent 代办。
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

修正文档结构字段，运行 `harness status --json .`，再提交本轮 SSoT 沉淀。
