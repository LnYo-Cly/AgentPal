# AgentPal mobile workbench UI repair

## Task ID

`2026-06-01-agentpal-mobile-workbench-ui-repair-5316c918`

## 创建日期

2026-06-01

## 一句话结果

把 AgentPal 手机首页从原型图拼接页修成真实移动端工作台，并修正真机连接电脑端 Relay 的开发链路。

## 完成后能得到什么

完成后，手机端首页不再显示页面级 Dynamic Island、不再拼接 image2 切图，也不再使用 mock 会话冒充真实状态。用户打开 App 会先看到 Host 状态、真实会话空状态或当前会话卡片、审批入口、最近动态、底部会话/审批/主机导航和输入栏。所有主要入口都有按压反馈和 toast。真实手机连接时，App 会从 Expo 开发服务器地址推断电脑局域网 IP，并连接 `ws://<电脑IP>:8790/ws`；本地 Relay 开发脚本也改为监听 `0.0.0.0:8790`。

## 交付物

- 可见产物：移动端首页工作台 UI、真实空状态、底部输入和导航、Host/Relay 连接状态。
- 修改位置：`apps/mobile/app/index.tsx`、`apps/mobile/src/hooks/useAgentPalRelay.ts`、`apps/mobile/src/lib/relay.ts`、`package.json`。
- 验证证据：`npm --prefix apps/mobile run typecheck`、`git diff --check`、端口监听检查。

## 第一眼应该看什么

先读 `apps/mobile/app/index.tsx` 看 UI 结构，再读 `apps/mobile/src/lib/relay.ts` 看真机 Relay 地址推断。验证细节在 `progress.md` 和 `walkthrough.md`。

## 边界

- 范围内：移动端首页结构、交互反馈、真实会话空状态、发送到选中 session、真机开发连接配置。
- 范围外：完整审批协议、Diff 详情页、命令面板、语音输入、生产认证和推送。
- 停止条件：需要访问用户手机屏幕、系统防火墙放行或人工确认视觉质量时，必须回到用户确认。

## 完成判断

- 首页不再引用 `uiAssets`、`ImageBackground` 或页面级 Dynamic Island。
- 没有真实会话时显示真实空状态，而不是 mock 会话。
- 主要可点控件有 `Pressable` 反馈和 toast。
- 手机真机默认 Relay URL 能从 Expo `hostUri` 推断电脑 IP。
- TypeScript 检查和 diff whitespace 检查通过。

## 执行合同

- Owner：coordinator
- 生命周期状态：已完成；等待用户手机端视觉确认不阻塞代码修复提交
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

等待用户在手机端重新连接 Expo Go 并反馈真实截图；代码侧已完成当前修复切片。
