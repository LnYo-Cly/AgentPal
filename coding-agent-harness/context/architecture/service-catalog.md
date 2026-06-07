# 服务目录 / Service Catalog

Context Doc Type: service-catalog
Owner: project coordinator
Last Verified: 2026-06-07
Confidence: medium

## Services

| Service Key | Service / Component | Owner | Repo / Path | Responsibility | Interfaces | Data Owned | Dependencies | Service Profile | Development Context | Source Pack | Contract Index | Source Evidence | Last Verified | Stale After | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mobile-app | AgentPal Mobile App | product/mobile owner | `apps/mobile` | iOS/Android UI for sessions, approvals, diffs, commands, host status, and companion state. Supports cloud pairing payload parse and stores Relay-issued device credentials. | WebSocket to Relay; HTTPS artifact fetch; push token registration | mobile cache, last processed seq, UI prefs, secure pairing/device token | Relay, APNs/FCM, Supabase Auth | client app | `product/*`, `technical-stack-decision.md` | n/a | `agent-adapter-contract.md`, future mobile API contract | product architecture discussion; task `2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e` | 2026-06-07 | 2026-09-07 | medium |
| relay | AgentPal Relay | backend owner | `crates/relay` | Routes encrypted events/commands between mobile and Host, stores durable event log in future, handles auth, presence, push notifications, artifact pointers. Current MVP supports in-memory pair create/claim and device-token-bound targeted routing. | WebSocket `/ws`, HTTP `/healthz`; future HTTPS API, PostgreSQL, Redis, APNs/FCM, object storage | event log metadata, command log, routing metadata, device/host mapping; MVP in-memory pair/device state | Mobile App, Host, Supabase Auth, Postgres, Redis, object storage | cloud service | `realtime-sync-model.md`; `local-setup.md` | n/a | future relay API/event contracts | product architecture discussion; task `2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e` | 2026-06-07 | 2026-09-07 | medium |
| host | AgentPal Desktop Host | host owner | `crates/host` | Starts/resumes/tracks local coding agents, normalizes adapter events, manages local workspace/session index and local outbox. Current CLI can request Relay-created cloud pairing with `codex connect --create-pair`. | WebSocket to Relay; local CLI; local SQLite future; agent process/protocol interfaces | local sessions, adapter state, local event outbox, workspace index | Codex, Claude Code, OpenCode/OpenClaw, Relay | desktop daemon/CLI | `host-session-model.md`; `local-setup.md` | n/a | `agent-adapter-contract.md` | product architecture discussion; task `2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e` | 2026-06-07 | 2026-09-07 | medium |
| protocol | agentpal-protocol | architecture owner | `crates/protocol` | Defines protocol SSoT for events, commands, approvals, diffs, picker registry, pairing, and device credentials. | Rust crate; generated TS types future | schema definitions | Host, Relay, Mobile | shared library | `technical-stack-decision.md` | n/a | future protocol schema docs | product architecture discussion; task `2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e` | 2026-06-07 | 2026-09-07 | medium |
| adapter-codex | Codex Adapter | host owner | future host adapter | Maps Codex sessions, events, approvals, diffs, commands, skills/plugins into AgentPal protocol. | Codex app-server/CLI/session metadata; Host adapter interface | adapter state only | Codex CLI/App Server, Host | adapter | `agent-adapter-contract.md` | n/a | `agent-adapter-contract.md` | product architecture discussion | 2026-05-31 | 2026-08-31 | medium |
| adapter-claude | Claude Code Adapter | host owner | future host adapter | Maps Claude Code sessions, permissions, messages, and commands into AgentPal protocol. | Claude Code SDK/hooks/CLI; Host adapter interface | adapter state only | Claude Code, Host | adapter | `agent-adapter-contract.md` | n/a | `agent-adapter-contract.md` | product architecture discussion | 2026-05-31 | 2026-08-31 | medium |
| adapter-opencode-openclaw | OpenCode/OpenClaw Adapter | host owner | future host adapter | Maps OpenCode/OpenClaw gateway or ACP-compatible sessions into AgentPal protocol. | Gateway/ACP/WebSocket where available; Host adapter interface | adapter state only | OpenCode/OpenClaw, Host | adapter | `agent-adapter-contract.md` | n/a | `agent-adapter-contract.md` | product architecture discussion | 2026-05-31 | 2026-08-31 | low |

## Boundary Rule

这个目录只放服务责任、接口摘要和跳转链接。Payload、auth、error code、event schema 放 `coding-agent-harness/context/integrations/`。

一个服务或微服务只占一行。只要该服务影响本仓开发或判断，就补 `services/<service-key>.md`、`coding-agent-harness/context/development/external-context/<service-key>.md` 和相关 `coding-agent-harness/context/integrations/<contract>.md` 链接。
