# AgentPal Agent Adapter Contract

Context Doc Type: integration-contract
Owner: project coordinator
Last Verified: 2026-05-31
Confidence: medium

## Contract Type

Host adapter protocol contract. This is an internal integration contract between
AgentPal Host adapters and the shared AgentPal protocol, not a public internet
API.

## Index Links

| Service Profile | Development Context | Contract Index | Last Verified | Confidence |
| --- | --- | --- | --- | --- |
| `coding-agent-harness/context/architecture/service-catalog.md` | `coding-agent-harness/context/architecture/host-session-model.md` | `coding-agent-harness/context/integrations/agent-adapter-contract.md` | 2026-05-31 | medium |

## Purpose

This contract defines how Host adapters normalize Codex, Claude Code, OpenCode,
OpenClaw, and compatible agents into AgentPal events and commands.

## Auth

Adapters run inside the trusted desktop Host process. They do not authenticate
mobile users directly. Phone-to-Host authority is checked by Relay and Host
session/device binding before a command reaches the adapter.

## Adapter Boundary

Each adapter converts an agent-specific interface into the common AgentPal
protocol. The mobile app must not depend on raw Codex, Claude, or OpenCode
terminal output.

```text
Agent-specific process/protocol
  -> Host adapter
  -> AgentPal event protocol
  -> Relay
  -> Mobile event feed
```

## Required Adapter Capabilities

| Capability | Required for MVP | Notes |
| --- | --- | --- |
| start session | yes | Start from workspace root. |
| resume session | yes, where supported | Mark unsupported sessions as read-only. |
| send input | yes | Text first. |
| interrupt / stop | yes | Adapter-specific graceful path preferred. |
| capture agent messages | yes | Structured where possible. |
| capture tool calls | yes | Convert to tool cards. |
| capture command output | yes | Summarize and chunk large logs. |
| capture approval request | yes | Convert to approval card with stable approval id. |
| resolve approval | yes | Approve/reject with idempotency. |
| generate diff summary | yes | Host may use git for canonical diff metadata. |
| enumerate commands | yes | Powers `/` mobile picker. |
| enumerate skills/plugins | yes, where applicable | Powers `$` mobile picker. |

## Common Event Types

Initial event type set:

- `session.started`
- `session.state_changed`
- `message.user`
- `message.agent`
- `tool.started`
- `tool.finished`
- `command.output`
- `diff.updated`
- `approval.requested`
- `approval.resolved`
- `error`

## Common Client Commands

Initial command set:

- `input.submit`
- `session.interrupt`
- `session.resume`
- `session.stop`
- `approval.approve`
- `approval.reject`
- `command.invoke`
- `picker.item_selected`

## Payload

Payloads are defined by the future `agentpal-protocol` SSoT and generated into
TypeScript for the mobile app. Initial normalized payload families:

| Payload | Required Fields | Notes |
| --- | --- | --- |
| Session event | event id, host id, session id, sequence, event type, timestamp, encrypted payload | Used for all session feed events. |
| Client command | command id, host id, session id, command type, timestamp, encrypted payload | Must be idempotent at Host boundary. |
| Approval request | approval id, requested action, files or command summary, risk summary, optional diff artifact pointer | Must map back to the native agent approval mechanism. |
| Diff summary | changed file list, added/deleted counts, risk flags, optional artifact pointer | Full diff is expanded lazily on mobile. |
| Picker registry item | id, trigger, label, kind, source, insert text, execute mode | Powers `/` and `$` mobile pickers. |

## Command And Skill Picker

The mobile app should support terminal-like triggers:

- `/` opens a mobile slash-command picker.
- `$` opens a mobile skill/plugin/preset picker.

This must be a native mobile command panel or bottom sheet. AgentPal should not
try to render the desktop terminal TUI. The adapter supplies a registry:

```text
id
trigger
label
kind: slash-command | skill | plugin | preset
description
source: codex | claude | opencode | agentpal
insert_text
execute_mode: insert | submit | host-action
```

## Adapter Source Preference

Adapters should prefer:

1. Official structured APIs or SDKs.
2. Local manifest/config/session metadata.
3. Stable machine-readable command output.
4. PTY/TUI parsing only as a fallback.

## Codex Notes

Codex should prefer structured app-server style interfaces when available.
Historical session discovery should use metadata first and group by cwd.

## Claude Code Notes

Claude Code should prefer SDK, hooks, or structured session mechanisms where
available. Approval handling must map back to Claude's native permission model.

## OpenCode / OpenClaw Notes

OpenCode and OpenClaw should prefer gateway or ACP-compatible protocols where
available. Gateway-native protocols should be bridged into the same AgentPal
event and approval model.

## Source Evidence

| Evidence | Notes | Last Verified | Confidence |
| --- | --- | --- | --- |
| User screenshots and discussion of `/` and `$` terminal affordances | Requires mobile command/skill/plugin picker that preserves CLI affordances without terminal TUI mirroring. | 2026-05-31 | medium |
| Product and architecture discussion in conversation | Requires Host adapters for Codex, Claude Code, OpenCode/OpenClaw and structured mobile event cards. | 2026-05-31 | medium |

## Errors

| Error Class | Expected Handling |
| --- | --- |
| Unsupported capability | Adapter reports capability as unavailable; mobile disables or hides the action. |
| Resume unsupported | Host marks the historical session as read-only rather than pretending it can be controlled. |
| Stale approval id | Host rejects the command and emits an `approval.resolved` or `error` event with current state. |
| Duplicate command id | Host deduplicates and returns the prior command result or current session state. |
| Adapter parse failure | Host emits an `error` event and keeps raw diagnostic details behind an expandable log/artifact. |
| Underlying agent missing | Host surfaces setup error and does not create a managed live session. |

## Contract Tests

| Test | Command / Path | Expected Result |
| --- | --- | --- |
| Harness structure validation | `harness status --json .` | Integration contract contains required sections and project status passes. |
| Future protocol fixture tests | future `agentpal-protocol` fixture suite | Each adapter maps native agent events into normalized session events, approval payloads, and picker registry items. |
| Future idempotency tests | future Host adapter test suite | Duplicate approval and command ids are rejected or deduplicated consistently. |
