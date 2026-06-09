# Railway Relay Deploy Config Repair Design

## Goal

Fix the Railway deployment failure where Railway detects the repository as a
generic Rust/Railpack service and fails with "No start command detected".

## Approach

Use Railway config-as-code at the repository root to force Dockerfile builds
for the Relay service. Keep the service itself container-native by moving the
runtime start logic into a small shell entrypoint that reads Railway's `PORT`
environment variable and falls back to `8790` for local Docker usage.

## Components

- `railway.toml`: selects `DOCKERFILE`, points Railway at
  `deploy/relay/relay.Dockerfile`, sets `/healthz`, and keeps restart policy
  explicit. It deliberately leaves the start command unset so Railway uses the
  Dockerfile entrypoint.
- `deploy/relay/start-agentpal-relay.sh`: starts `agentpal-relay` on
  `0.0.0.0:${PORT:-8790}` when no command override is supplied.
- `deploy/relay/relay.Dockerfile`: copies the start script into the runtime
  image and uses it as the entrypoint.
- `deploy/relay/README.md`: documents the Railway Redis variable wiring and
  the manual fallback if Railway still uses Railpack.

## Validation

Run `cargo fmt --check`, `cargo test -p agentpal-relay`, `harness check`, and
`git diff --check`. Docker runtime validation remains environment-dependent if
Docker is unavailable locally.
