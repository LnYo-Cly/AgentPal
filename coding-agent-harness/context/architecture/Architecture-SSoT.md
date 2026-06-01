# 架构事实源 / Architecture SSoT

Context Doc Type: architecture-ssot
Owner: project coordinator
Last Verified: 2026-05-31
Confidence: medium

## System Summary

AgentPal is planned as a mobile AI coding agent workbench. The phone app
connects through a Relay to a desktop Host daemon. The Host starts, resumes, or
tracks local coding agents such as Codex CLI, Claude Code CLI, OpenCode,
OpenClaw, and compatible custom agents. The phone renders structured events,
approvals, diffs, tool calls, and commands; the desktop remains the execution
environment.

## Current Architecture Facts

| ID | Fact | Source Evidence | Last Verified | Confidence | Read Before |
| --- | --- | --- | --- | --- | --- |
| ARCH-001 | The fixed high-level topology is Mobile App <-> Relay <-> Desktop Host <-> Agent Adapter <-> underlying coding agent. | User architecture discussion; `technical-stack-decision.md` | 2026-05-31 | medium | `coding-agent-harness/context/architecture/technical-stack-decision.md` |
| ARCH-002 | Mobile must support both iOS and Android from one codebase using Expo React Native with development builds. | User requirement: mobile must adapt to iOS and Android; `technical-stack-decision.md` | 2026-05-31 | medium | `coding-agent-harness/context/product/mvp-scope.md` |
| ARCH-003 | Host and Relay are fixed to Rust for long-term distribution, process control, and protocol strictness. | Stack decision discussion; `technical-stack-decision.md` | 2026-05-31 | medium | `coding-agent-harness/context/architecture/technical-stack-decision.md` |
| ARCH-004 | Standard WebSocket is the realtime channel, but reliability comes from event log, seq, ack, replay, idempotent commands, and push wake-up. | WebSocket stability discussion; `realtime-sync-model.md` | 2026-05-31 | medium | `coding-agent-harness/context/architecture/realtime-sync-model.md` |
| ARCH-005 | AgentPal's primary session model is workspace-first managed sessions; global historical session scanning is only a discovery/resume feature. | Session management discussion; `host-session-model.md` | 2026-05-31 | medium | `coding-agent-harness/context/architecture/host-session-model.md` |
| ARCH-006 | The mobile app consumes structured AgentPal events and must not depend on raw terminal TUI output. | Product brief and adapter contract | 2026-05-31 | medium | `coding-agent-harness/context/integrations/agent-adapter-contract.md` |
| ARCH-007 | `/` and `$` terminal affordances are supported as mobile-native command and skill/plugin pickers backed by Host adapter registry data. | User screenshot and command picker discussion; adapter contract | 2026-05-31 | medium | `coding-agent-harness/context/integrations/agent-adapter-contract.md` |
| ARCH-008 | `ui/` is a local ignored folder for prototype images and visual references; it is not production asset storage. | User instruction and `.gitignore` update | 2026-05-31 | high | `coding-agent-harness/context/product/ux-principles.md` |
| ARCH-009 | Live Surface is a system-level abstraction for iOS Live Activities / Dynamic Island and Android Live Updates / ongoing notifications; red means user confirmation is required, yellow means the agent is working, and green idle clears the live surface instead of publishing. | User Live Surface status decision; `live-surface-status-model.md`; Apple, Expo, and Android documentation | 2026-06-01 | medium | `coding-agent-harness/context/architecture/live-surface-status-model.md` |

## Promotion Log

| Source Task | Promoted Fact | Destination | Decision | Date |
| --- | --- | --- | --- | --- |
| `2026-05-31-agentpal-foundation-product-architecture-and-sta-8c4cfcfe` | AgentPal foundation product, architecture, stack, realtime, host/session, and adapter decisions | `context/product/*`, `context/architecture/*`, `context/integrations/agent-adapter-contract.md` | accepted as initial SSoT | 2026-05-31 |
| `2026-06-01-agentpal-live-surface-status-model-185ce36f` | Live Surface status priority and red/yellow/green publishing rule | `context/architecture/live-surface-status-model.md`, `context/product/mvp-scope.md`, `context/product/ux-principles.md`, `context/architecture/technical-stack-decision.md` | accepted as Live Surface design contract | 2026-06-01 |
