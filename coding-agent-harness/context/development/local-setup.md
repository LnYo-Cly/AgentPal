# 本地启动 / Local Setup

Context Doc Type: local-setup
Owner: project coordinator
Last Verified: 2026-06-07
Confidence: medium

## Commands

| Task | Command | Expected Result | Source Evidence | Last Verified | Confidence |
| --- | --- | --- | --- | --- | --- |
| Start local Relay | `npm run relay:dev` | Runs `agentpal-relay` on `0.0.0.0:8790` with `/healthz` and `/ws`. | task `2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e` ART-005 | 2026-06-07 | medium |
| Source-mode public CLI pairing | `npm exec -- oap pair --workspace . --relay-url ws://127.0.0.1:8790/ws` | Starts Host Codex connect flow and requests Relay-created pairing payload; requires local Codex and Relay. | task `2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e` | 2026-06-07 | medium |
| Host cloud pair directly | `cargo run -p agentpal-host -- codex connect --workspace . --relay-url ws://127.0.0.1:8790/ws --create-pair` | Host registers, requests pair-create, prints URL/QR on pair-created, then serves mobile commands. | task `2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e` | 2026-06-07 | medium |
| Mobile typecheck | `npm --prefix apps/mobile run typecheck` | TypeScript check passes for mobile app. | task `2026-06-07-openagentpal-cli-cloud-relay-mvp-455f888e` ART-004 | 2026-06-07 | high |

## Environment

| Variable | Required | Purpose | Source Evidence |
| --- | --- | --- | --- |
| `OAP_RELAY_URL` | no | Default Relay URL for source-mode `oap pair` when `--relay-url` is not supplied. | `bin/oap.mjs` |
