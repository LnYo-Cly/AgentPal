# AgentPal terminal QR output guard

## Task ID

`2026-06-11-agentpal-terminal-qr-output-guard-85f60655`

## 创建日期

2026-06-11

## 一句话结果

`agentpal pair` 默认直接输出可扫描的终端二维码，云配对载荷改为短参数和短 token，避免窗口变化把二维码弄坏。

## 完成后能得到什么

这次交付把配对入口收敛成一条默认可用的终端路径：用户运行 `agentpal pair` 就能看到二维码，不需要先找二维码文件，也不需要切换额外模式。对于公共 relay 场景，二维码载荷也被压短，减少终端换行和窗口重排导致的二维码失真。公共 relay 已经部署到 `0.1.2` 并验证短配对串；剩余发布动作是 npm `agentpal@0.1.2`，目前受本机 npm CLI 登录态阻塞。

## 交付物

- 可见产物：默认终端二维码输出、短配对串、`--qr-file` 作为显式可选项
- 修改位置：`crates/host/src/codex.rs`、`crates/relay/src/main.rs`、`apps/mobile/src/lib/pairing.ts`、`README.md`、`bin/agentpal.mjs`
- 验证证据：host 单测、本地 relay 烟测、公共 relay healthcheck、CLI help 输出、npm pack dry-run

## 第一眼应该看什么

先看 `progress.md`，再看 `visual_map.md` 和 `review.md`。如果要复现行为，先跑 `cargo test -p agentpal-host pair_url_ -- --nocapture`，再看本地 relay 烟测输出。

## 边界

- 范围内：二维码默认输出、载荷压缩、手机端短参数兼容、文档和帮助文本、验证证据
- 范围外：移动端界面重做、部署流水线改造、用户迁移、功能扩展
- 停止条件：如果 npm 发布仍缺登录权限，记录为 release/auth residual，不要假装 `latest` 已更新

## 完成判断

- `agentpal pair` 默认输出终端二维码
- 不再默认打印二维码 SVG 文件路径
- 公共 relay 配对串使用短参数和短 token
- 手机端同时兼容短格式和旧格式配对串
- Rust 单测、本地 relay 烟测和公共 relay healthcheck 都通过

## 执行合同

- Owner：coordinator
- 生命周期状态：已完成实现，待人工确认
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、`progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

等待 npm CLI 重新登录后发布 `agentpal@0.1.2`，并等待人工确认当前 review packet。
