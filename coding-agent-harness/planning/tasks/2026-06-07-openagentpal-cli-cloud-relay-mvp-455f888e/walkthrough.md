# 收口记录：OpenAgentPal CLI cloud relay MVP

## 摘要

完成 CLI-first Cloud Relay MVP 的源码态实现：`oap pair` wrapper 和 `agentpal-host codex connect --create-pair` 可向 Relay 请求一次性 pair payload 并输出 URL/QR；移动端可扫码解析、claim、保存 device token；Relay 本地内存模式验证 Host/Mobile 绑定并定向路由。

## 范围

| 范围 | 详情 |
| --- | --- |
| 变更模块 | protocol, relay, host CLI, mobile pairing/relay hook, source-mode npm CLI wrapper, Harness task materials |
| 新增文件 | `bin/oap.mjs` |
| 删除文件 | none |
| 不在范围内 | production Relay deployment, Redis/Postgres, account system, full E2E, device revocation UI, npm production package release, desktop installer |

## 验证

| 检查 | 命令或过程 | 结果 | 证据 |
| --- | --- | --- | --- |
| Rust format | `cargo fmt --check` | pass | ART-001 |
| Rust compile | `cargo check --workspace` | pass | ART-002 |
| Relay pairing tests | `cargo test -p agentpal-relay` | pass, 2 tests | ART-003 |
| Mobile typecheck | `npm --prefix apps/mobile run typecheck` | pass | ART-004 |
| Real WebSocket smoke | local `agentpal-relay.exe` + Node WebSocket clients | pass | ART-005 |
| Source CLI wrapper | `npm exec -- oap --help` | pass | ART-006 |
| Harness check | `harness check --profile target-project .` | pass with dirty-state warning | progress.md |
| Lifecycle task-phase | `harness task-phase ... EXEC-01 --state done --completion 100 --evidence present .` | blocked before commit by dirty governance write scope protection | progress.md |

## 审查结论

| 来源 | 重要发现 | 处理 | 证据 |
| --- | --- | --- | --- |
| coordinator adversarial review | F-001: cloud Host must not route by hostId alone | route now requires deviceToken binding for cloud-pair hosts | `review.md` |
| worker handoff | mobile parser/hook residual: claim token not persisted | coordinator added claim persistence and SecureStore/localStorage persistence | `review.md`; ART-007 |

## 残余风险

| 风险 | Owner | 是否接受 | 跟进 |
| --- | --- | --- | --- |
| No production Cloud Relay deployment | backend owner | yes for MVP | public beta deployment task |
| In-memory Relay pair/device state | backend owner | yes for MVP | Redis/Postgres persistence task |
| No full E2E/replay/device revocation | security owner | yes for MVP | security hardening task |
| Source-mode `oap` wrapper only | release owner | yes for MVP | npm binary distribution task |
| Existing mobile dependency audit residual | mobile owner | yes for MVP | dependency audit/upgrade task |

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
| 产物索引 | `artifacts/INDEX.md` |
