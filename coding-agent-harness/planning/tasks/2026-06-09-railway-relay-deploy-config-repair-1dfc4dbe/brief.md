# Railway Relay deploy config repair

## Task ID

`2026-06-09-railway-relay-deploy-config-repair-1dfc4dbe`

## 创建日期

2026-06-09

## 一句话结果

Railway 会按 Relay Dockerfile 构建 OpenAgentPal Relay，并由容器入口自动读取 Railway `PORT` 启动服务。

## 完成后能得到什么

本任务完成后，GitHub 仓库包含 Railway 可直接读取的部署配置、Relay 容器启动入口和 Railway Redis 配置说明。用户可先在 Railway 上重新部署公网 Relay，手机端随后使用 Railway 域名对应的 `wss://<railway-domain>/ws` 连接。VPS、自托管和更完整的公网 hardening 保留到后续任务，不混入本轮修复。

## 交付物

- 可见产物：Railway config-as-code、Relay Docker entrypoint、Railway 部署说明。
- 修改位置：`railway.toml`、`deploy/relay/relay.Dockerfile`、`deploy/relay/start-agentpal-relay.sh`、`deploy/relay/README.md`、任务材料。
- 验证证据：记录在 `progress.md` 和最终 `walkthrough.md`。

## 第一眼应该看什么

先读 `railway.toml` 和 `deploy/relay/README.md` 的 Railway 章节，再看 `progress.md` / `walkthrough.md` 中的验证结果。

## 边界

- 范围内：Railway Relay 部署配置、Docker 启动入口、Redis/healthcheck 文档、相关 Harness 任务记录。
- 范围外：真实 Railway 控制台操作、VPS 部署、真实密钥或 Redis URL、移动端功能改造。
- 停止条件：需要 Railway 账号控制台、真实 Redis 连接串或 live 域名部署结果时，交给用户在托管平台操作。

## 完成判断

- `railway.toml` 显式使用 Dockerfile builder 和 `deploy/relay/relay.Dockerfile`。
- Docker entrypoint 默认监听 `0.0.0.0:${PORT:-8790}`。
- README 写清 Railway Redis 变量、重部署、healthcheck 和 WebSocket endpoint。
- 本地格式、Relay 测试、workspace 检查、diff 检查和 Harness 检查完成或记录残余。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：simple budget 使用 `INDEX.md`、`brief.md`、`task_plan.md`、`visual_map.md`、
  `progress.md`、`walkthrough.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

运行验证命令，记录证据，按 `visual_map.md` 的 agent gate 推进任务并提交。
