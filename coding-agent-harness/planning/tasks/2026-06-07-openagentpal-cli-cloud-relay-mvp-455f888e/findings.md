# OpenAgentPal CLI cloud relay MVP - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### Cloud Relay MVP must not rely on Host ID alone

- 背景：公网 Relay 改变信任边界，旧 LAN 模式中 mobile register 带 `hostId` 即可路由，不适合 cloud pair。
- 发现：实现中为发起过 `pair-create` 的 Host 标记 cloud mode，命令路由必须同时满足 mobile client 绑定和 Relay 颁发的 `deviceToken/deviceId` binding；真实 WebSocket smoke 覆盖未配对 mobile 被拒绝。
- 影响：Cloud Pair Host 不再仅凭 `hostId` 接受 mobile command；旧 LAN/manual/discovered Host 仍可保持兼容。
- 后续：生产版本仍需 E2E、设备撤销、限流、防重放和持久化。

### Source-mode oap wrapper is not npm production distribution

- 背景：用户希望大众通过 `oap pair` 一步得到 URL/二维码。
- 发现：本任务新增 `bin/oap.mjs` 和 package `bin`，在源码 checkout 中 `npm exec -- oap --help` 可用；它调用 `cargo run`，还不是面向大众发布的预构建 npm 包。
- 影响：MVP 已证明命令形态和 Host/Relay 协议；大众分发仍需独立任务设计 Rust binary packaging 或 downloader。
- 后续：后续创建 npm distribution / release pipeline 任务。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| Cloud Pair API | `pair-create` 只能由已注册 Host connection 发起，`pair-claim` 生成 device credentials | 防止 mobile/第三方伪造 Host pair session | 任何 client 都可 create pair | accepted |
| Relay storage | MVP 使用内存 HashMap | 足够本地 smoke 和协议验证，不引入 Redis/Postgres 运维面 | 直接接 Postgres/Redis | accepted |
| CLI entry | `agentpal-host codex connect --create-pair` + source-mode `oap pair` wrapper | 复用现有 Host/Codex loop，同时贴近最终大众命令 | 新写 Node Host 或桌面安装包 | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| npm 公网分发如何携带 Rust host/relay binary | 需要后续 release pipeline 任务 | coordinator | 公测前 |
| 生产 Relay 是否自建 VPS/云服务 | 需要自有 Cloud Relay 服务，MVP 未部署 | product/backend owner | 公测前 |
