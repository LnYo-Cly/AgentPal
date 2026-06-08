# 回归 SSoT - [项目名称]

> 回归覆盖面、固定 gate、证据深度和未关闭风险的单一事实源。新增 gate、改变触发规则或调整证据深度时必须更新。

## 活跃回归 Gate

| Gate ID | 覆盖面 | 主入口 | 触发场景 | 证据深度 | 上次验证 | 当前结果 | 负责人 | 残余路由 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RG-001 | Cloud Relay Beta pair/create/claim/scoped-route | `cargo test -p agentpal-relay`; Redis targeted test; real local WebSocket+Redis strict smoke from task `2026-06-08-openagentpal-production-cloud-relay-beta-0b7c75f0` | protocol/relay/host/mobile pairing, Redis store, registration, scoped snapshot/history, routing, device-token, or public Relay default changes | L2-local-smoke | 2026-06-08 | pass-with-residual | coordinator | R-001; R-003; R-004; R-005; R-006 |

## 未关闭回归残余

| 残余 ID | Gate ID | 问题 | 严重级别 | 负责人 | 创建日期 | 路由 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | RG-001 | No live production Cloud Relay DNS/TLS/VPS deployment evidence | P2 | deployment owner | 2026-06-07 | deploy `relay.openagentpal.com` and run L3 live smoke | open |
| R-003 | RG-001 | No full E2E encryption, replay protection, device revocation, rate limiting, account boundary, or audit log | P2 | security/product/backend owners | 2026-06-07 | public beta security hardening task | open |
| R-004 | RG-001 | `oap` is source-mode wrapper, not production npm/package distribution | P3 | release owner | 2026-06-07 | npm/package distribution task; no desktop installer | open |
| R-005 | RG-001 | Redis pair claim and device binding are not a single atomic store transaction | P2 | backend owner | 2026-06-08 | atomic claim-and-bind store API or Redis Lua transaction | open |
| R-006 | RG-001 | Docker Compose deployment package was not runtime-verified because Docker is unavailable in the current environment | P3 | deployment owner | 2026-06-08 | run `docker compose -f deploy/relay/docker-compose.yml up --build` on a Docker-capable deployment host | open |

## 已关闭 / Superseded 回归残余

| 残余 ID | Gate ID | 问题 | 关闭日期 | 处理 | 证据 |
| --- | --- | --- | --- | --- | --- |
| R-002 | RG-001 | Relay pair/device state is in-memory only | 2026-06-08 | superseded by Redis-backed pairing/device store; in-memory remains local/dev fallback only | task `2026-06-08-openagentpal-production-cloud-relay-beta-0b7c75f0` ART-002, ART-004, ART-005 |

不要保留示例残余。只有真实未关闭回归风险才新增行。

## 证据深度说明

| 等级 | 名称 | 说明 |
| --- | --- | --- |
| L1-tests | 自动化测试或静态检查通过，但没有运行时验证。 |
| L2-local-smoke | 本地环境完成关键路径冒烟。 |
| L3-live | 真实或准真实环境完成端到端验证。 |
| L4-browser-human-proxy | 浏览器或 UI 自动化覆盖接近真人操作的关键流程。 |
| L5-hard-gate | 结构化判定、可重复运行，并以非零退出或明确 verdict 阻断发布。 |

## 归档索引

> 废弃 gate、已关闭残余和历史批次移入 `coding-agent-harness/governance/regression/_archive/Regression-SSoT-archive-YYYY-QN.md`。活跃表只保留仍会影响当前开发和发布判断的内容。

| 归档文件 | 覆盖范围 | 移入日期 | 说明 |
| --- | --- | --- | --- |
| `coding-agent-harness/governance/regression/_archive/Regression-SSoT-archive-YYYY-QN.md` | RG-... / R-... | YYYY-MM-DD | [说明] |

## 结果状态

- `pass`：本次验证通过，无未路由问题。
- `pass-with-residual`：主路径通过，但存在已路由或已接受残余。
- `fail`：验证失败，阻塞相关合并、发布或收口。
- `inconclusive`：证据不足，不能作为通过依据。
- `paused`：gate 暂停执行，必须写清原因和恢复条件。
- `retired`：gate 已废弃，必须归档并说明替代覆盖面。

## 路由规则

1. Cadence Ledger 决定“什么时候触发哪些 gate”；本文件记录 gate 本身和当前事实。
2. 任何 `fail` 或 `inconclusive` 都必须写入未关闭回归残余，除非立即修复并有新证据。
3. 发布阻塞级问题必须同步到 Harness Ledger 和对应任务计划。
4. 接受风险必须有负责人、原因、期限或复查条件。
5. 提升或降低证据深度时，必须记录原因和最近一次验证证据。
