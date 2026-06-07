# OpenAgentPal CLI cloud relay MVP - 审查

## 审查者身份（Reviewer Identity）

| Reviewer | Type | Scope |
| --- | --- | --- |
| coordinator | self adversarial | protocol, relay pairing, route authorization, Host CLI, mobile pairing persistence, evidence |
| Einstein worker | worker handoff | mobile pairing parser / relay URL compatibility |

## 审查范围

- 审查类型：adversarial / security / regression / architecture
- 范围内：`crates/protocol/src/lib.rs`; `crates/relay/src/main.rs`; `crates/host/src/codex.rs`; `bin/oap.mjs`; `package.json`; `apps/mobile/src/lib/pairing.ts`; `apps/mobile/src/lib/relay.ts`; `apps/mobile/src/hooks/useAgentPalRelay.ts`; local WebSocket smoke。
- 范围外：公网部署、真实账号系统、Redis/Postgres、full E2E encryption、npm production package release、App Store/TestFlight。
- 来源材料：task plan、worker handoff commit `4fc7e91`、current diff、Rust/mobile checks、real local WebSocket smoke。

## Agent Review Submission（Agent 提交审查）

本节由 agent 或 coordinator 在审查材料包准备好时填写。它只表示“提交待审”，不表示人工批准。

| Field | Value |
| --- | --- |
| Submission ID | pending-task-review-cli |
| Submitted At | 2026-06-07 23:46 +08:00 |
| Submitted By | coordinator |
| Task Key | 2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e |
| Materials Checklist Hash | pending-task-review-cli |
| Evidence Summary | `cargo fmt --check`; `cargo check --workspace`; `cargo test -p agentpal-relay`; `npm --prefix apps/mobile run typecheck`; real local WebSocket smoke; `npm exec -- oap --help`; worker handoff `4fc7e91`. |
| Open Findings Count | 0 P0/P1/P2 |
| Scanner Version | manual pre-submit; task-review CLI pending |

### Material Checklist（材料清单）

| Material | Required? | Status | Evidence |
| --- | --- | --- | --- |
| Brief | yes | present | `brief.md` |
| Task plan | yes | present | `task_plan.md` |
| Progress and evidence | yes | present | `progress.md`; `artifacts/INDEX.md` |
| Visual map | yes | present | `visual_map.md` |
| Lesson candidate decision | yes | present | `lesson_candidates.md` checked-no-candidate |
| Walkthrough or closeout link | yes | present | `walkthrough.md` |

## 信心挑战（Confidence Challenge）

直接回答：你是否对当前计划、实现和策略有 100% 信心？

- Verdict：no
- 如果不是 100%，剩余漏洞或证据缺口：
  - MVP 没有生产 Relay 部署、账号系统、Redis/Postgres、完整 E2E 加密、防重放 nonce、设备撤销 UI、限流和审计。
  - `oap` 是源码态 wrapper，未完成面向大众的 npm binary distribution。
  - Codex app-server 实际 `oap pair` 全链路依赖本机 Codex 可启动；本轮真实 smoke 验证 Relay/WS/pair/route，不验证 Codex agent turn。
- Fix loop count：2
- 当前结论：本地 Cloud Relay MVP 可以进入 agent review；生产公网 Beta 必须拆后续安全/部署/分发任务，不能将本轮描述为 production-ready。

## 重要发现（Material Findings，表头供 checker 解析）

| ID | Severity | Finding | Evidence Checked | Required Action | Open | Disposition | Blocks Release | Follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-001 | P2 | Cloud Pair Host 不能仅靠 `hostId` 接受 mobile command；否则公网模式中知道 hostId 即可尝试路由。 | self review of relay route logic; ART-003; ART-005 | Route requires pair-claimed deviceToken binding for cloud-pair hosts. | no | mitigated | no | Add production auth/E2E hardening task. |

## 非阻塞备注（Non-Material Notes）

- Source-mode `oap` wrapper calls `cargo run`; public npm package must not require end users to compile Rust by default.
- Current Relay in-memory state is intentionally MVP-only and unsuitable for multi-instance/cloud production.
- Worker found existing mobile dependency audit reports 13 moderate vulnerabilities; not changed by this slice.

## 已检查证据（Evidence Checked）

| Evidence ID | Type | Path | Summary |
| --- | --- | --- | --- |
| E-001 | command | TARGET:. | `cargo fmt --check` passed. |
| E-002 | command | TARGET:. | `cargo check --workspace` passed. |
| E-003 | command | TARGET:. | `cargo test -p agentpal-relay` passed 2 tests covering pair create/claim/route and unauthorized pair-create rejection. |
| E-004 | command | TARGET:apps/mobile | `npm --prefix apps/mobile run typecheck` passed. |
| E-005 | command | TARGET:. | Real local WebSocket smoke passed: pair-create, pair-claim, intruder reject, deviceToken reconnect, command route. |
| E-006 | command | TARGET:. | `npm exec -- oap --help` passed. |
| E-007 | review | TARGET:. | Worker handoff `4fc7e91` reviewed; coordinator fixed deviceToken persistence residual. |
| E-008 | command | TARGET:. | `harness check --profile target-project .` passed; `task-phase` initially blocked by dirty governance write scope before commit. |

## 无重要发现声明

本轮已检查上述证据，F-001 已修复并由 relay tests 与 real WebSocket smoke 覆盖；未发现阻塞 MVP 目标的重要发现。

## 残余风险

| Risk | Owner | Accepted? | Follow-up |
| --- | --- | --- | --- |
| No production Cloud Relay deployment | backend owner | yes for MVP | Deploy Relay behind TLS with domain, env/secrets, observability. |
| In-memory pair/device state | backend owner | yes for MVP | Add Redis/Postgres and multi-instance routing before public beta. |
| No full E2E encryption / replay protection / device revocation | security owner | yes for MVP | Security hardening task before public beta. |
| Source-mode `oap` wrapper only | release owner | yes for MVP | npm package with Rust binary packaging or downloader. |
| Mobile dependency audit residual | mobile owner | yes for MVP | Separate dependency audit/upgrade task. |

## Lifecycle Queue Routing（生命周期队列路由）

| Queue | Applies? | Reason | Exit condition |
| --- | --- | --- | --- |
| Review | yes | 已提交审查材料包，且可等待人工确认。 | 人工确认或退回。 |
| Missing Materials | no | 任务材料、证据和 lesson decision 已补齐。 | n/a |
| Blocked | no | 无 open P0/P1/P2 blocking finding；生产风险已按 MVP residual 接受。 | n/a |
| Lessons | no | Agent 判定没有新的可复用治理 lesson；`lesson_candidates.md` checked-no-candidate。 | n/a |
| Confirmed / Finalized | no | 尚未人工确认；Agent 不执行 `review-confirm`。 | 人工确认后 closeout。 |
| Soft-deleted / Superseded | no | 任务仍活跃。 | n/a |

## 后续路由（Follow-Up Routing）

- 任务计划：已更新 `task_plan.md`
- Progress：见 `progress.md` 2026-06-07 23:46 条目
- 发现记录：已写入 `findings.md`
- Regression SSoT：新增/更新 Cloud Relay MVP gate
- Lessons：checked-none: no reusable governance lesson proposed by agent
- 收口记录：`walkthrough.md`

## 最终信心依据（Final Confidence Basis）

最终信心来自 Rust workspace check、relay unit tests、mobile typecheck、真实 WebSocket smoke、worker handoff review 和 coordinator adversarial pass。F-001 已修复并由 smoke 验证。发布前仍需要独立 security review 和 production deployment evidence；本轮只支持 MVP/local smoke confidence。
