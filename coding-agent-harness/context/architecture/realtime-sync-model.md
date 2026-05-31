# AgentPal Realtime Sync Model

Context Doc Type: realtime-sync-model
Owner: project coordinator
Last Verified: 2026-05-31
Confidence: medium

## Summary

AgentPal uses standard WebSocket as the realtime foreground channel. Stability
comes from durable event logs and replay, not from assuming sockets stay alive.

## Connection Model

```text
Mobile foreground <-> Relay WebSocket <-> Host WebSocket
Mobile background  <- Push notification <- Relay
Mobile reopen      -> resume(last_seq)  -> Relay replay from Postgres
```

Mobile apps should not depend on background WebSocket persistence. iOS and
Android can suspend network activity during backgrounding, lock screen, weak
network, or network switching.

## Event Guarantees

Every session event must have:

- globally unique event id
- host id
- session id
- monotonic session sequence
- event type
- created timestamp
- encrypted payload

The phone stores the last processed sequence per session. On reconnect it sends
`resume(session_id, last_seq)`. Relay replays missed events from PostgreSQL.

## Command Guarantees

Every command from phone to Host must have:

- command id
- target host id
- target session id
- command type
- created timestamp
- encrypted payload
- idempotency semantics

Approval commands also include an approval id. Host must reject stale or already
resolved approval ids.

## Storage Responsibility

| Component | Stores |
| --- | --- |
| Host SQLite | local sessions, local host sequence, pending outbound events, adapter state, workspace index |
| Relay PostgreSQL | routed event log, command log, delivery state, user/host/device mapping |
| Relay Redis | presence, socket routing, short-lived fanout state |
| Mobile SQLite | recent sessions, event cache, last processed sequence, UI cache |
| Object storage | encrypted large artifacts such as large diffs, logs, screenshots, reports |

## Background and Push

Push notifications are a wake-up and attention mechanism, not the source of
truth. Push payloads should contain minimal metadata and never contain sensitive
code content unless an explicit encrypted payload design exists.

Push event examples:

- approval requested
- task completed
- task failed
- host disconnected
- session waiting for user

## Large Payload Rule

Large diffs, long logs, and artifacts should not be pushed through the primary
event stream as inline text. The event carries summary metadata and an encrypted
artifact pointer. The mobile app lazily fetches and decrypts expanded content.

## Failure Model

| Failure | Expected behavior |
| --- | --- |
| Mobile socket drops | Reconnect and resume from `last_seq`. |
| Mobile app killed | On reopen, load local cache first, then replay missed events. |
| Host socket drops | Host keeps writing local events to SQLite and flushes on reconnect. |
| Relay restart | Durable event log remains in PostgreSQL; sockets reconnect and resume. |
| Duplicate command delivery | Host deduplicates by command id. |
| Duplicate approval tap | Host deduplicates by approval id and resolved state. |

## Source Evidence

| Evidence | Notes | Last Verified | Confidence |
| --- | --- | --- | --- |
| User WebSocket stability question and architecture discussion | Establishes WebSocket as realtime channel with durable replay instead of always-on assumptions. | 2026-05-31 | medium |
| `coding-agent-harness/context/architecture/technical-stack-decision.md` | Confirms Relay uses Rust + Axum WebSocket and reliability is protocol-level. | 2026-05-31 | medium |
