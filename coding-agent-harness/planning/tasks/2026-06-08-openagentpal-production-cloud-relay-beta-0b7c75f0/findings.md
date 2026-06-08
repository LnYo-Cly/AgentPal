# OpenAgentPal Production Cloud Relay Beta - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### 公网 Beta 不能复用本地 MVP 的身份边界

- 背景：用户目标是让大众使用 `oap pair` 得到公网 URL/二维码，而不是只在局域网或 Tailscale 下连接。
- 发现：Cloud Relay MVP 的 in-memory state、固定默认 host id、全局 snapshot/history 行为只能支撑本地验证；公网默认端点会把 host/mobile pairing、device token、history read 和 host-origin write 都变成安全边界。
- 影响：本轮必须补 Redis-backed store、token hash 存储、one-time claim、strict pairing gate、host-scoped route/snapshot/history，并把固定默认 host id 改成运行时生成。
- 后续：真实上线前仍需 DNS/TLS/VPS 或托管平台部署证据、rate limit、审计日志、设备撤销、账号/租户边界和多节点路由设计。

### Redis 持久化解决了 Beta 基础，但不等于完整生产级事务模型

- 背景：公网 Relay 不能依赖进程内 pair/device state，否则重启或多实例会破坏配对关系。
- 发现：本轮新增 Redis-backed pairing store，并保留 in-memory fallback 给本地开发；真实 Redis 定向测试和 WebSocket strict smoke 已通过。
- 影响：`OAP_REDIS_URL` + `OAP_RELAY_REQUIRE_PAIRING=true` 成为公网 Beta 的最低运行组合；不配置 Redis 时只能视为 local/dev fallback。
- 后续：pair claim 与 device binding 目前仍分两步写入，极端失败路径可能消费 pair session 但未写入 device binding，后续 hardening 需要改成 store-level atomic claim-and-bind。

### 源码态 CLI 可以验证产品流，但还不是大众分发形态

- 背景：用户明确不要桌面安装包，但希望大众可以用类似 Happy 的命令行入口得到扫码连接。
- 发现：`oap` wrapper 已默认指向 `wss://relay.openagentpal.com/ws`，并保留 `--relay-url` / 本地 override；`npm exec -- oap --help` 已验证展示公网默认值。
- 影响：仓库已具备 no-desktop-installer 的 CLI-first 产品方向，但当前仍是 source-mode wrapper，不是发布到 npm 的生产二进制包。
- 后续：需要单独做 npm/package distribution 或 downloader 任务，保持不做桌面安装包的约束。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| 公网默认 Relay URL | `wss://relay.openagentpal.com/ws` | 让 `oap pair` 默认输出可被手机扫码使用的公网端点；本地调试仍可 override。 | 继续默认 `ws://127.0.0.1:4318/ws`，但大众无法开箱即用。 | accepted |
| 配对存储 | Redis-backed store + in-memory fallback | Redis 满足单节点公网 Beta 的跨重启状态持久化；in-memory 保留本地开发体验。 | 立即引入 Postgres/账号系统，范围过大。 | accepted |
| token 存储 | pair token 和 device token 只存 SHA-256 hash | 降低 Redis 泄漏时的直接 token 暴露风险。 | 明文存储 token，实现简单但公网风险更高。 | accepted |
| strict pairing | `OAP_RELAY_REQUIRE_PAIRING` / `--require-pairing` | 公网 Relay 必须默认拒绝未授权 mobile read/write；本地开发可以关闭。 | 所有环境强制 strict，会影响本地快速调试。 | accepted |
| 路由范围 | host-scoped snapshot/history/command routing | 修复全局 broadcast/history 泄漏风险，保证 mobile 只看到已绑定 host。 | 保留全局广播，公网不可接受。 | accepted |
| host identity | 默认运行时生成 `agentpal-<uuid>`，并拒绝重复在线 host id | 避免多人共享公网 Relay 时固定 host id 被覆盖或劫持。 | 继续固定 `agentpal-local-host`，仅适合本地 MVP。 | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| `relay.openagentpal.com` 的真实部署方式 | 仓库已有单节点 Docker Compose 部署包，但没有真实 DNS/TLS/VPS 证据。 | deployment owner | 公网 Beta 对外试用前 |
| claim+bind 是否需要原子事务 | 本轮记录为非阻塞 residual；真实公网高并发和故障注入前必须修复。 | backend owner | public hardening task |
| 大众分发的 `oap` 形态 | 不做桌面安装包；后续应做 npm/package distribution 或 downloader。 | release owner | 面向非开发者发布前 |
| 账号、撤销、限流、审计、E2E | 本轮不做；只接受为 repo beta code residual。 | security/product/backend owners | broader public beta 前 |
