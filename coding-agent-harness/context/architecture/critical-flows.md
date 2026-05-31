# 关键流程 / Critical Flows

Context Doc Type: critical-flows
Owner: project coordinator
Last Verified: 2026-05-31
Confidence: medium

## Flow Index

| Flow ID | Name | Trigger | Services | Business Impact | Source Evidence | Last Verified | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FLOW-001 | Pair phone with Host | User runs `agentpal pair` and scans QR code | mobile-app, relay, host, auth | Establishes trusted control path. | `product-brief.md`, `realtime-sync-model.md` | 2026-05-31 | medium |
| FLOW-002 | Start managed session | User starts an agent from Host CLI or mobile workspace action | mobile-app, relay, host, adapter-* | Creates live controllable agent session. | `host-session-model.md`, `agent-adapter-contract.md` | 2026-05-31 | medium |
| FLOW-003 | Resume historical session | User selects a workspace historical session and resumes it | mobile-app, relay, host, adapter-* | Turns resumable history into managed live session. | `host-session-model.md` | 2026-05-31 | medium |
| FLOW-004 | Approval from phone | Underlying agent requests approval | mobile-app, relay, host, adapter-* | Allows user to unblock agent away from computer. | `agent-adapter-contract.md`, `realtime-sync-model.md` | 2026-05-31 | medium |
| FLOW-005 | Reconnect and replay | Mobile or Host reconnects after network/background interruption | mobile-app, relay, host | Prevents lost events and duplicate commands. | `realtime-sync-model.md` | 2026-05-31 | medium |
| FLOW-006 | Command/skill picker | User types `/` or `$` in mobile input | mobile-app, relay, host, adapter-* | Preserves CLI command affordances with mobile-native UI. | `agent-adapter-contract.md`, `ux-principles.md` | 2026-05-31 | medium |

## FLOW-004 Phone Approval Sequence

```mermaid
sequenceDiagram
  participant Agent
  participant Host
  participant Relay
  participant Phone

  Agent->>Host: native approval request
  Host->>Host: assign approval_id and normalize payload
  Host->>Relay: event approval.requested(seq)
  Relay->>Phone: WebSocket event or push notification
  Phone->>Relay: command approval.approve/reject(command_id, approval_id)
  Relay->>Host: deliver command
  Host->>Host: dedupe command_id and approval_id
  Host->>Agent: native approve/reject
  Host->>Relay: event approval.resolved(seq)
  Relay->>Phone: update approval card
```

## FLOW-005 Reconnect And Replay

```mermaid
sequenceDiagram
  participant Phone
  participant Relay
  participant Host
  participant DB as PostgreSQL

  Phone--xRelay: socket drops
  Host->>Relay: events continue when online
  Relay->>DB: persist event log
  Phone->>Relay: reconnect resume(last_seq)
  Relay->>DB: read events where seq > last_seq
  Relay->>Phone: replay missed events
  Phone->>Relay: ack processed seq
```
