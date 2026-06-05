# AgentPal Host pairing MVP

## Task ID

`2026-06-01-agentpal-host-pairing`

## 创建日期

2026-06-01

## 一句话结果

Host 配对之后，手机可以通过 Relay 连接电脑端 Codex 会话，查看状态、发送输入，并拉取历史消息。

## 完成后能得到什么

用户得到一条可以直接复用的个人工作流：电脑端 Host 生成配对地址，手机端保存后接入同一台机器上的真实 Codex 会话，能继续输入、看到 agent 回复和会话历史。下一轮 agent 可以据此继续扩展审批、会话列表、Diff 视图和更完整的移动端控制面。

## 交付物

- 可见产物：`agentpal://pair?...` 配对地址、移动端配对弹窗、会话详情页、历史分页请求。
- 修改位置：`crates/host/src/codex.rs`、`crates/relay/src/main.rs`、`apps/mobile/app/index.tsx`、`apps/mobile/src/hooks/useAgentPalRelay.ts`。
- 验证证据：mobile typecheck、cargo check、Expo iOS export、真实 Codex probe、history probe。

## 第一眼应该看什么

先看 `progress.md` 的 2026-06-02 记录，再看 `review.md` 的证据表，最后看 `task_plan.md` 和 `walkthrough.md`。

## 边界

- 范围内：Host pairing、Relay 注册、真实 Codex 会话输入、历史分页、移动端会话 UI、Expo Go 安全降级。
- 范围外：账号系统、生产 token 鉴权、E2EE、云端持久化、原生 Live Activity 完整实现。
- 停止条件：需要生产级鉴权、跨设备同步或原生能力时，回到 coordinator 另开任务。

## 完成判断

- Host 可以打印可扫码/可复制的配对地址。
- 手机保存配对后能连上同一台电脑上的 Relay。
- 手机向 `agentpal-codex-local` 发送输入后能看到同一 session 的 agent 回复和 completed 状态。
- `history-request` 能拉回同一 session 的历史事件。

## 执行合同

- Owner：coordinator
- 生命周期状态：审查中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

把真实验证结论交给用户，让用户在手机上刷新 Expo Go 并复测配对与会话。
