# 本地启动 / Local Setup

Context Doc Type: local-setup
Owner: project coordinator
Last Verified: 2026-06-07
Confidence: medium

## Commands

| Task | Command | Expected Result | Source Evidence | Last Verified | Confidence |
| --- | --- | --- | --- | --- | --- |
| Start local Relay | `npm run relay:dev` | Runs `agentpal-relay` on `0.0.0.0:8790` with `/healthz` and `/ws`. | task `2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e` ART-005 | 2026-06-07 | medium |
| Start strict local Relay | `npm run relay:dev:strict` | Runs local Relay with `OAP_RELAY_REQUIRE_PAIRING` equivalent, so mobile commands require verified pairing. | task `2026-06-08-openagentpal-production-cloud-relay-beta-0b7c75f0` | 2026-06-08 | medium |
| Source-mode public CLI pairing | `npm run agentpal -- pair --workspace . --relay-url ws://127.0.0.1:8790/ws` | Starts Host Codex connect flow and requests Relay-created pairing payload; requires local Codex and Relay. | task `2026-06-10-agentpal-public-command-naming-41fcec16` | 2026-06-10 | medium |
| Source-mode background daemon | `npm run agentpal -- daemon start --workspace .` | Builds `agentpal-host`, launches the workspace Host in the background, and records pid/log/profile under `~/.agentpal/workspaces/<workspace-key>/`. | task `2026-06-11-agentpal-daemon-cli-17c94a23` | 2026-06-11 | medium |
| Host cloud pair directly | `cargo run -p agentpal-host -- codex connect --workspace . --relay-url ws://127.0.0.1:8790/ws --create-pair` | Host registers, requests pair-create, prints URL/QR on pair-created, then serves mobile commands. | task `2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e` | 2026-06-07 | medium |
| Mobile typecheck | `npm --prefix apps/mobile run typecheck` | TypeScript check passes for mobile app. | task `2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e` ART-004 | 2026-06-07 | high |

## Environment

| Variable | Required | Purpose | Source Evidence |
| --- | --- | --- | --- |
| `AGENTPAL_RELAY_URL` | no | Default Relay URL for source-mode `agentpal pair` when `--relay-url` is not supplied. | `bin/agentpal.mjs` |
| `AGENTPAL_HOME` | no | Overrides where CLI workspace profiles, daemon state, and logs are stored. | `bin/agentpal.mjs` |
| `OAP_REDIS_URL` | no | Enables Redis-backed Relay pair/device store for beta deployments. | `crates/relay/src/main.rs` |
| `OAP_REDIS_KEY_PREFIX` | no | Prefix for Redis keys; defaults to `agentpal:relay`. | `crates/relay/src/main.rs` |
| `OAP_RELAY_REQUIRE_PAIRING` | no | Requires mobile commands to come from verified device pairing. | `crates/relay/src/main.rs` |
