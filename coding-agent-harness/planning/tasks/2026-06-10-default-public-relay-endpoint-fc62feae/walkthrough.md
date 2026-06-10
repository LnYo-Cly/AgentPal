# 收口记录：Default public relay endpoint

## 摘要

完成默认公网 Relay 切换：`oap pair`、Rust Host CLI 和手机端默认 fallback 都指向已验证的 Railway Relay `wss://openagentpal-production.up.railway.app/ws`。大众路径变成电脑端运行配对命令后直接扫码；高级用户仍可通过 `OAP_RELAY_URL`、`--relay-url` 或手机端手动输入改用本地、Tailscale 或 VPS Relay。

## 范围

| 范围 | 详情 |
| --- | --- |
| 变更模块 | CLI wrapper, Rust Host CLI, mobile Relay fallback, Relay deployment docs, Regression SSoT, Harness task materials |
| 新增文件 | `docs/plans/2026-06-10-default-public-relay-endpoint-design.md` |
| 删除文件 | none |
| 不在范围内 | VPS 部署、品牌域名 `relay.openagentpal.com`、npm 生产分发、移动端 UI 重构、真实手机扫码人工验证 |

## 验证

| 检查 | 命令或过程 | 结果 | 证据 |
| --- | --- | --- | --- |
| CLI default help | `npm run oap -- --help` | pass; shows Railway default | progress.md |
| Rust Host help | `CARGO_TARGET_DIR=target/default-public-relay-check cargo run -p agentpal-host -- codex connect --help` | pass; shows Railway default | progress.md |
| Rust format | `cargo fmt --check` | pass | progress.md |
| Workspace compile | `CARGO_TARGET_DIR=target/default-public-relay-check cargo check --workspace` | pass | progress.md |
| Relay tests | `CARGO_TARGET_DIR=target/default-public-relay-check cargo test -p agentpal-relay` | pass, 9 tests | progress.md |
| Mobile typecheck | `npm --prefix apps/mobile run typecheck` | pass | progress.md |
| Whitespace check | `git diff --check` | pass | progress.md |
| Live Relay healthcheck | `https://openagentpal-production.up.railway.app/healthz` | pass, HTTP 200 | progress.md |
| Harness check | `harness check --profile target-project .` | pass; dirty-state warning expected before commit | progress.md |

## 审查结论

| 来源 | 重要发现 | 处理 | 证据 |
| --- | --- | --- | --- |
| coordinator self-check | Default URL was split across JS CLI, Rust CLI, and mobile fallback | Updated all three to the same Railway endpoint and verified help/typecheck | progress.md |
| coordinator self-check | Existing `target/debug/agentpal-host.exe` was locked by another process | Re-ran Rust help/check/test with isolated `CARGO_TARGET_DIR` instead of killing a user-owned process | progress.md |

## 残余风险

| 风险 | Owner | 是否接受 | 跟进 |
| --- | --- | --- | --- |
| Current public default uses Railway platform domain, not branded `relay.openagentpal.com` or VPS | deployment owner | yes for Railway-first rollout | Follow-up branded domain/VPS deployment task; tracked as R-007 |
| Source-mode `oap` wrapper is not a production npm package yet | release owner | yes | npm/package distribution task; tracked as R-004 |
| Real phone QR scan not executed in this local session | product/testing owner | yes | User/device smoke with Expo Go after pulling this commit |

## 经验沉淀反思

| 问题 | 答案 |
| --- | --- |
| 是否完成经验候选检查？ | yes, checked-no-candidate |
| 经验候选详情文件 | simple budget 未生成 `lesson_candidates.md` |

## 收口链接

| 产物 | 链接 |
| --- | --- |
| 任务计划 | `task_plan.md` |
| 设计说明 | `docs/plans/2026-06-10-default-public-relay-endpoint-design.md` |
| 进度记录 | `progress.md` |
| Regression SSoT | `coding-agent-harness/governance/regression/Regression-SSoT.md` |

Closeout Status: closed
