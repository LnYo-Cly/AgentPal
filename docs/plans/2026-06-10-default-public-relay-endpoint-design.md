# Default Public Relay Endpoint Design

## Goal

Make the public path usable without requiring users to set `OAP_RELAY_URL` or
copy a WebSocket endpoint by hand. The default command should create a pairing
QR that already points at the live Railway Relay.

## Approach

Use `wss://openagentpal-production.up.railway.app/ws` as the production default
Relay URL in the source-mode CLI wrapper, the Rust Host CLI, and the mobile
fallback. Keep `OAP_RELAY_URL`, `--relay-url`, and manual mobile input as
advanced overrides for VPS, Tailscale, and local Relay development.

## Expected User Flow

1. User runs `oap pair` or `npm run oap -- pair --workspace .`.
2. The host connects to the Railway Relay by default and prints a pairing URL
   plus terminal QR code.
3. The mobile app scans the QR and stores the exact Relay URL, host id, pair id,
   and pair token.

## Validation

Verify CLI help/default wiring, Rust format/tests/checks, mobile typecheck, and
the live Railway `/healthz` endpoint.
