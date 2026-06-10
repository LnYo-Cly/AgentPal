# Default public relay endpoint

## Task ID

`2026-06-10-default-public-relay-endpoint-fc62feae`

## 创建日期

2026-06-10

## 一句话结果

`oap pair` 默认使用已验证的 Railway 公网 Relay，并生成手机可直接扫码的配对二维码。

## 完成后能得到什么

大众用户不再需要记住或手动设置 `OAP_RELAY_URL`。电脑端运行 `oap pair` 或源码模式 `npm run oap -- pair --workspace .` 时，会默认连接 `wss://openagentpal-production.up.railway.app/ws` 并打印可扫码的配对 URL/二维码。高级用户仍可用 `OAP_RELAY_URL`、`--relay-url` 或手机端手动输入覆盖到 VPS、Tailscale 或本地 Relay。

## 交付物

- 可见产物：默认公网 Relay 配置、手机端默认 Relay fallback、设计说明和 Harness 证据。
- 修改位置：`bin/oap.mjs`、`crates/host/src/codex.rs`、`apps/mobile/src/lib/relay.ts`、Relay 文档、Regression SSoT、当前任务材料。
- 验证证据：记录在 `progress.md` 和 `walkthrough.md`。

## 第一眼应该看什么

先看 `docs/plans/2026-06-10-default-public-relay-endpoint-design.md`，再看 `bin/oap.mjs` / `crates/host/src/codex.rs` 的默认常量，以及 `progress.md` 里的验证结果。

## 边界

- 范围内：默认公网 Relay URL、手机端默认 fallback、相关文档/Regression SSoT、验证。
- 范围外：VPS 部署、品牌域名 `relay.openagentpal.com`、npm 生产分发、移动端 UI 重构、真实手机扫码操作。
- 停止条件：需要 Railway 控制台、手机设备实测或发布账号权限时，记录 residual 并交给用户/发布 owner。

## 完成判断

- `oap pair` help/default 展示 Railway Relay 域名。
- Rust Host 默认 `--relay-url` 与 CLI wrapper 一致。
- 手机端无输入时默认 Relay fallback 指向 Railway 域名。
- 本地检查、mobile typecheck、live `/healthz` 验证和 Harness 检查完成。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：simple budget 使用 `INDEX.md`、`brief.md`、`task_plan.md`、`visual_map.md`、
  `progress.md`、`walkthrough.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

运行验证命令，记录证据，按 `visual_map.md` 的 agent gate 收口。
