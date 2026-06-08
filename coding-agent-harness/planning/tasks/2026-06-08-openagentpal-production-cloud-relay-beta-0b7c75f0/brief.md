# OpenAgentPal Production Cloud Relay Beta

## Task ID

`2026-06-08-openagentpal-production-cloud-relay-beta-0b7c75f0`

## 创建日期

2026-06-08

## 一句话结果

让 `oap pair` 面向公网 Beta：默认使用公网 Relay 端点，Relay 支持 Redis 持久化配对/设备绑定，并提供可部署的 Relay+Redis 运行包。

## 完成后能得到什么

完成后，OpenAgentPal 会从“本地 Cloud Relay MVP”推进到“公网 Beta 可部署基础”。用户侧路径仍是 CLI-first：主机执行 `oap pair`，终端输出 URL 与二维码，手机扫码进入云端配对。工程侧会获得 Redis-backed pair session / device binding、生产模式配对强制开关、默认公网 Relay URL、部署说明和自测证据。实际上线仍需要域名、TLS、服务器或托管平台凭据，本任务提供可部署代码和配置，不代替真实基础设施开通。

## 交付物

- 可见产物：`oap pair` 默认公网端点、Relay Redis 配置、部署包、设计文档、验证记录。
- 修改位置：`crates/relay`、`crates/host`、`bin/oap.mjs`、`deploy/relay`、`docs/plans`、当前 Harness task。
- 验证证据：Rust check/test、CLI help、local Redis/in-memory smoke、Harness check。

## 第一眼应该看什么

先读 `docs/plans/2026-06-08-production-cloud-relay-beta-design.md`，再看 `task_plan.md`、`review.md`、`artifacts/INDEX.md`。

## 边界

- 范围内：Relay pair/device 持久化、生产配对强制开关、CLI 默认公网端点、部署配置、验证材料。
- 范围外：桌面安装包、真实公网 DNS/TLS 开通、账号系统、计费、完整 E2E 加密、设备管理 UI、多实例跨节点路由。
- 停止条件：需要真实服务器凭据、域名 DNS、云平台账号、或会改变公网安全模型时，必须回到 coordinator 或用户确认。

## 完成判断

- `oap pair` 默认指向公网 Relay URL，且仍允许 `OAP_RELAY_URL` / `--relay-url` 覆盖。
- Relay 在 `OAP_REDIS_URL` 存在时使用 Redis 存储 pair session、device binding 和 cloud host marker。
- Relay production pairing mode 能拒绝未验证 mobile command。
- 提供 `deploy/relay` Docker Compose 部署包和 README。
- 自测和对抗审查证据已记录到当前任务。

## 执行合同

- Owner：coordinator
- 生命周期状态：未开始
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

提交设计记录，随后在 `.worktrees/production-cloud-relay-beta` / `work/production-cloud-relay-beta` 内实现。
