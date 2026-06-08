# 收口记录：OpenAgentPal Production Cloud Relay Beta

## 摘要

完成 Production Cloud Relay Beta 的仓库侧基础：`oap pair` 默认面向公网 Relay，Relay 支持 Redis-backed pair/device store、hashed token、一次性 claim、strict pairing、host-scoped snapshot/history/command routing，并附带单节点 Docker Compose 部署包。真实公网 DNS/TLS/VPS 尚未执行，本轮不声明 live production。

## 范围

| 范围 | 详情 |
| --- | --- |
| 变更模块 | `crates/relay`, `crates/host`, `bin/oap.mjs`, `package.json`, Relay deployment docs, Harness task materials |
| 新增文件 | `deploy/relay/README.md`; `deploy/relay/docker-compose.yml`; `deploy/relay/relay.Dockerfile` |
| 删除文件 | none |
| 不在范围内 | 桌面安装包、真实公网 DNS/TLS/VPS 上线、账号系统、设备撤销 UI、完整 E2E/replay protection、rate limit、审计日志、多节点 WebSocket routing、npm 生产分发 |

## 验证

| 检查 | 命令或过程 | 结果 | 证据 |
| --- | --- | --- | --- |
| Rust format | `cargo fmt --check` | pass | ART-001 |
| Relay tests | `cargo test -p agentpal-relay` | pass, 9 tests | ART-002 |
| Workspace compile | `cargo check --workspace` | pass | ART-003 |
| Redis store targeted test | `OAP_REDIS_TEST_URL=redis://127.0.0.1:6379 cargo test -p agentpal-relay redis_pairing_store_claim_consumes_and_persists_device_binding -- --nocapture` | pass | ART-004 |
| Real WebSocket + Redis strict smoke | local strict Relay with Redis and temporary WebSocket clients | pass | ART-005 |
| Source CLI wrapper | `npm exec -- oap --help` | pass; public default shown | ART-006 |
| Whitespace check | `git diff --check` | pass | ART-007 |
| Docker availability | `docker --version` | skipped-with-reason; Docker not installed | ART-008 |
| Harness phase commands | `harness task-phase ... EXEC-01`; `harness task-phase ... EXEC-02` | pass; phase commits created | progress.md |

## 审查结论

| 来源 | 重要发现 | 处理 | 证据 |
| --- | --- | --- | --- |
| Sartre read-only reviewer + coordinator adversarial review | F-001: 默认公网 Relay 不能复用固定 host id | 默认 host id 改为运行时生成，Relay 拒绝重复在线 host id | `review.md`; ART-009 |
| Sartre read-only reviewer + coordinator adversarial review | F-002: strict pairing 不能泄漏全局 snapshot/broadcast/history | 移除全局 broadcast，未授权初始 snapshot 为空，history 和授权后 snapshot 均 host-scoped | `review.md`; ART-002; ART-005 |
| Sartre read-only reviewer + coordinator adversarial review | F-003: Host-origin messages 必须校验注册连接身份 | HostStatus、SessionEvent、WorkspaceSnapshot、FilePreview、PickerRegistry 写入需要 registered host connection | `review.md`; ART-002 |
| Sartre read-only reviewer + coordinator adversarial review | F-004: Redis claim 与 device binding 不是单个原子事务 | 记录为非阻塞 residual，路由到 backend hardening | `review.md`; Regression SSoT |

## 残余风险

| 风险 | Owner | 是否接受 | 跟进 |
| --- | --- | --- | --- |
| No live public DNS/TLS/VPS deployment evidence | deployment owner | yes for repo beta code | Deploy `relay.openagentpal.com` and run L3 live smoke |
| Docker compose not runtime-verified in current environment | deployment owner | yes | Run `docker compose -f deploy/relay/docker-compose.yml up --build` on a Docker-capable host |
| Redis claim+bind is not atomic | backend owner | yes | Implement atomic claim-and-bind store API or Redis Lua transaction |
| No account/device revocation/rate limit/audit/full E2E/replay protection | security/product/backend owners | yes for this slice | Public beta hardening backlog |
| Single Relay process / sticky routing only | backend owner | yes | Multi-node WebSocket routing design |
| Source-mode `oap` wrapper only | release owner | yes | npm/package distribution task; no desktop installer per user preference |

## 经验沉淀反思

| 问题 | 答案 |
| --- | --- |
| 是否完成经验候选检查？ | yes, checked-no-candidate |
| 经验候选详情文件 | `lesson_candidates.md` |

## 收口链接

| 产物 | 链接 |
| --- | --- |
| 任务计划 | `task_plan.md` |
| 审查记录 | `review.md` |
| 进度记录 | `progress.md` |
| 发现记录 | `findings.md` |
| 产物索引 | `artifacts/INDEX.md` |
| 回归 Gate | `coding-agent-harness/governance/regression/Regression-SSoT.md` |
| Commit / Branch | `1ce3473`; `work/production-cloud-relay-beta` |
