# 收口记录：Railway Relay deploy config repair

## 摘要

完成 Railway 首阶段托管修复：仓库根目录新增 `railway.toml`，强制 Railway 使用 Relay Dockerfile；Relay 容器入口改为读取 Railway `PORT` 并绑定 `0.0.0.0`；部署文档补齐 Railway Redis 变量、健康检查和 WebSocket endpoint。真实 Railway redeploy、Redis 变量绑定和域名验证仍由用户在 Railway 控制台执行。

## 范围

| 范围 | 详情 |
| --- | --- |
| 变更模块 | Relay deployment config/docs, Harness task materials |
| 新增文件 | `.gitattributes`; `railway.toml`; `deploy/relay/start-agentpal-relay.sh`; `docs/plans/2026-06-09-railway-relay-deploy-config-repair-design.md` |
| 删除文件 | none |
| 不在范围内 | Railway 控制台操作、真实 Redis URL、VPS 部署、移动端功能改造、生产域名/DNS/TLS |

## 验证

| 检查 | 命令或过程 | 结果 | 证据 |
| --- | --- | --- | --- |
| Rust format | `cargo fmt --check` | pass | progress.md |
| Relay tests | `cargo test -p agentpal-relay` | pass, 9 tests | progress.md |
| Workspace compile | `cargo check --workspace` | pass | progress.md |
| Whitespace check | `git diff --check` | pass | progress.md |
| Harness check | `harness check --profile target-project .` | pass; dirty-state warning expected before commit | progress.md |
| Shell LF rule | `git check-attr text eol -- deploy/relay/start-agentpal-relay.sh` and hex inspection | pass; `eol: lf` | progress.md |
| Docker/bash availability | `docker --version`; `bash -n deploy/relay/start-agentpal-relay.sh` | not run locally; commands unavailable on current Windows host | progress.md |

## 审查结论

| 来源 | 重要发现 | 处理 | 证据 |
| --- | --- | --- | --- |
| coordinator self-check | Railway custom start command would override Dockerfile entrypoint semantics | removed `startCommand` from `railway.toml`; Dockerfile entrypoint uses absolute path | `task_plan.md`; diff |
| coordinator self-check | Shell scripts can be damaged by Windows CRLF conversion | added `.gitattributes` LF rule for `deploy/relay/*.sh` and verified Git attributes | progress.md |

## 残余风险

| 风险 | Owner | 是否接受 | 跟进 |
| --- | --- | --- | --- |
| Real Railway redeploy and `/healthz` live check not executed in this local session | deployment owner | yes | Push to GitHub, trigger Railway redeploy, then verify `https://<railway-domain>/healthz` |
| Local Docker image build not executed because Docker is unavailable on this Windows host | deployment owner | yes | Railway build or any Docker-capable host should run `docker build -f deploy/relay/relay.Dockerfile .` |
| Local shell syntax check not executed because `bash`/`sh` is unavailable | deployment owner | yes | Covered by LF rule and Railway/Linux container execution |

## 经验沉淀反思

| 问题 | 答案 |
| --- | --- |
| 是否完成经验候选检查？ | yes, checked-no-candidate |
| 经验候选详情文件 | simple budget 未生成 `lesson_candidates.md` |

## 收口链接

| 产物 | 链接 |
| --- | --- |
| 任务计划 | `task_plan.md` |
| 设计说明 | `docs/plans/2026-06-09-railway-relay-deploy-config-repair-design.md` |
| 进度记录 | `progress.md` |
| Railway 配置 | `railway.toml` |
| Relay 部署说明 | `deploy/relay/README.md` |
