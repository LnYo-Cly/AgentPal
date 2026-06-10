# AgentPal npm public release

## Task ID

`2026-06-10-agentpal-npm-public-release-f0c0ca12`

## 创建日期

2026-06-10

## 一句话结果

将 AgentPal 以 `agentpal` npm 包公开发布，使外部用户可以通过 `npx agentpal@latest pair` 或全局安装后 `agentpal pair` 启动手机配对。

## 完成后能得到什么

完成后，大众用户不需要 clone 仓库即可使用 AgentPal 的公开 CLI：`npx agentpal@latest pair` 会使用当前目录作为默认 workspace，通过已部署的 Cloud Relay 输出手机可扫码的配对地址和二维码；高级用户仍可运行 `agentpal relay` 或 `agentpal host ...`。发布包会收窄到 CLI 必需源码和 Rust workspace，不包含 mobile app、Harness 文档、Android keystore 或本地开发产物。

## 交付物

- 可见产物：npm package `agentpal@0.1.0`；公开命令 `agentpal`；README 安装和使用说明。
- 修改位置：`package.json`、`bin/agentpal.mjs`、`Cargo.toml`、`README.md`、`LICENSE`、当前任务包。
- 验证证据：npm pack 内容审查、CLI help、workspace 参数包装测试、cargo 检查、临时安装验证、npm publish 后 registry / npx 验证。

## 第一眼应该看什么

先看 `progress.md` 的发布证据，再看 `review.md` 的 release 审查和 `npm view agentpal version` 结果。代码入口看 `bin/agentpal.mjs`，发布边界看 `package.json` 的 `files` 白名单。

## 边界

- 范围内：npm 包元数据、公开 CLI 包装、默认 workspace 解析、发布包白名单、README / LICENSE、npm 发布和发布后验证。
- 范围外：移动端功能改版、Relay 生产域名更名、预编译二进制分发、GitHub Release、VPS 部署、历史 Harness 任务批量改写。
- 停止条件：npm 要求 OTP/2FA 且当前会话无法提供；`npm pack` 包含敏感或明显无关文件；cargo / CLI 验证失败且无法在本任务范围内修复。

## 完成判断

- `npm pack --dry-run --json` 只包含预期 CLI 源码、Rust workspace、README、LICENSE 和 package metadata。
- 临时安装后的 `agentpal --help`、`agentpal host codex connect --help` 和 workspace 参数包装验证通过。
- `cargo fmt --check`、`cargo check --workspace` 和相关 relay tests 通过或有明确残余说明。
- `npm publish --access public` 成功，且 `npm view agentpal version` 返回 `0.1.0`。
- 发布后 `npx agentpal@latest --help` 可运行。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

启动 Harness 任务，完成 npm 包边界修复并执行发布前验证。
