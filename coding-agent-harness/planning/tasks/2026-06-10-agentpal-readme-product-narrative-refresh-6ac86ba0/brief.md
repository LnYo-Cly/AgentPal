# AgentPal README product narrative refresh

## Task ID

`2026-06-10-agentpal-readme-product-narrative-refresh-6ac86ba0`

## 创建日期

2026-06-10

## 一句话结果

根目录 README 从简短 CLI 说明升级为有产品叙事的 GitHub / npm 首页文案试稿。

## 完成后能得到什么

完成后，外部访问者打开 GitHub 或 npm 页面时，能更快理解 AgentPal 的核心价值：本地 coding agent 继续在电脑上工作，用户可以通过手机保持进度感知、审查和控制。README 会保留真实的 `npx agentpal@latest pair` 入口、当前 0.1.0 的限制，以及贡献者需要的最小开发说明。

## 交付物

- 可见产物：更有产品味道的 `README.md`。
- 修改位置：`README.md`、当前任务包。
- 验证证据：Markdown 内容审查、关键命令存在性检查、Harness check。

## 第一眼应该看什么

先看根目录 `README.md` 的第一屏和 Quick Start，再看 `progress.md` 的验证记录。

## 边界

- 范围内：README 文案结构、产品叙事、公开安装命令、当前能力和限制说明。
- 范围外：代码逻辑、npm 版本号、移动端功能承诺、官网落地页、图片资产。
- 停止条件：README 需要宣称尚未实现的移动端能力，或需要改产品定位。

## 完成判断

- README 第一屏清楚表达 AgentPal 是手机上的本地 coding agent 控制面。
- Quick Start 使用已发布的 `npx agentpal@latest pair`。
- 当前 release 限制写清楚，不误导用户以为移动端和全部 adapter 已完成。
- 文档通过基础检查并提交推送。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

重写 README 并进行文档验证。
