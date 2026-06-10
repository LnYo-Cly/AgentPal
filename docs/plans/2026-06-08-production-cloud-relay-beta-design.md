# OpenAgentPal Production Cloud Relay Beta Design

Date: 2026-06-08
Task: `2026-06-08-openagentpal-production-cloud-relay-beta-0b7c75f0`

## Goal

Make the CLI-first pairing path viable for a public beta: a host can run
`oap pair`, receive a URL and QR code, and a phone can pair through a hosted
Relay endpoint without being on the same LAN. This task does not ship a desktop
installer.

## Approaches Considered

1. Hosted Relay with Redis-backed pairing and device bindings.
   This is the recommended beta path. It keeps the user flow simple, supports
   restart-safe pairing state, and can be deployed on a VPS or container
   platform behind TLS.

2. Fully local tunnel by default.
   This avoids operating a public service, but it pushes Tailscale/ngrok-style
   setup onto mainstream users. It remains an advanced option only.

3. Full account-backed cloud service.
   This is the eventual product path, but it requires accounts, billing,
   revocation UI, audit, abuse controls, and support operations. It is too large
   for this first beta slice.

## Chosen Design

The beta Relay remains a Rust service with WebSocket `/ws` and HTTP
`/healthz`. It gains an optional Redis-backed store selected by
`OAP_REDIS_URL` / `--redis-url`. If Redis is absent, the existing in-memory path
still works for local development.

Pair sessions and device bindings are stored by hashes of bearer tokens, not
raw token values. Pair sessions expire and are consumed on first successful
claim. Device bindings persist across Relay process restarts and are used to
authorize mobile reconnection. A production mode flag,
`OAP_RELAY_REQUIRE_PAIRING`, forces mobile commands to require a verified
pairing token instead of accepting a bare `hostId`.

The public CLI default changes to `wss://openagentpal-production.up.railway.app/ws`, with
`OAP_RELAY_URL` and `--relay-url` remaining overrides. Local developers can run
`oap relay` or pass `--relay-url ws://127.0.0.1:8790/ws`.

Deployment artifacts live under `deploy/relay/` and provide a Docker Compose
profile with Relay plus Redis. Real public operation still needs domain, TLS,
DNS, secrets, monitoring, and a host platform account outside this repository.

## Data Flow

1. Host starts `oap pair`.
2. Host registers with Relay and sends `pair-create`.
3. Relay stores a hashed pair token with a TTL and returns an
   `agentpal://pair` payload containing the one-time pair token.
4. Mobile scans the QR code and sends `pair-claim`.
5. Relay verifies the pair token hash, consumes the pair session, issues a
   device token, stores only its hash, and notifies Host and Mobile.
6. Mobile reconnects with `deviceId` and `deviceToken`; Relay verifies the
   hash before routing commands to Host.

## Error Handling

Expired, unknown, already consumed, or mismatched pair tokens return Relay
errors to the requesting connection. Missing Redis in a Redis-configured
deployment is startup-fatal, because silently falling back to memory would make
production behavior unsafe.

## Verification

Required checks:

- `cargo fmt --check`
- `cargo check --workspace`
- `cargo test -p agentpal-relay`
- `npm exec -- oap --help`
- local WebSocket smoke covering Redis/in-memory pair create, claim,
  unauthorized mobile rejection, and command routing after verified
  registration.

## Explicit Non-Goals

- No desktop installer.
- No production account system.
- No public DNS/TLS deployment without credentials.
- No multi-instance cross-node WebSocket routing; beta deployment should run a
  single Relay process or use sticky routing until a pub/sub routing layer is
  added.
