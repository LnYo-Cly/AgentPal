# AgentPal CLI update notice

## Task ID

`2026-06-10-agentpal-cli-update-notice-403bf715`

## 创建日期

2026-06-10

## 一句话结果

AgentPal CLI 在用户运行实际命令时能轻量提示新版可用，且网络失败不会影响配对或本地开发。

## 完成后能得到什么

完成后，全局安装用户运行 `agentpal pair` 等真实命令时，如果 npm registry 上存在更新版本，会看到一行明确的更新命令。`npx agentpal@latest` 用户天然使用最新版；全局安装用户则能被提醒。检查必须短超时、静默失败，并支持环境变量关闭，避免公网不可达、包尚未发布或 npm registry 抖动时影响核心配对流程。

## 交付物

- 可见产物：新版提示文案，例如 `AgentPal 0.1.1 is available. Update with: npm install -g agentpal@latest`。
- 修改位置：`bin/agentpal.mjs`、当前任务材料。
- 验证证据：CLI help 不触发提示、mock latest 触发提示、npm 404 静默、mobile typecheck、Harness check。

## 第一眼应该看什么

先看 `task_plan.md` 的行为边界，再看 `bin/agentpal.mjs` 的 `maybeShowUpdateNotice` 和 `progress.md` 里的命令证据。

## 边界

- 范围内：CLI 更新检查、提示文案、关闭开关、超时/失败策略和验证。
- 范围外：真实 npm 发布、自动自更新、写入用户全局配置、后台守护进程、预编译二进制分发。
- 停止条件：需要真实发布凭据或改变安装分发策略。

## 完成判断

- `agentpal --help` / `npm run agentpal -- --help` 不触发网络检查。
- mock registry 返回更高版本时，真实命令前输出更新提示。
- npm registry 404、超时或网络失败时静默继续。
- `AGENTPAL_NO_UPDATE_CHECK=1` 能关闭提示。
- Harness 和相关检查通过。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

补齐任务计划后实现 `bin/agentpal.mjs` 的更新提示逻辑。
