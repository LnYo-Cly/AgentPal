# AgentPal MVP Scope

Context Doc Type: product-scope
Owner: project coordinator
Last Verified: 2026-05-31
Confidence: medium

## MVP Goal

Build the first personal-use AgentPal path: pair one phone with one computer
host, view and control hosted agent sessions, review approvals and diffs, and
send text follow-up instructions.

## Included

MVP includes:

- iOS and Android mobile app.
- Desktop Host pairing by QR code.
- Relay-backed realtime connection.
- Host online/offline status.
- Workspace-aware session list.
- AgentPal-managed live sessions.
- Historical session discovery as a resume entry point.
- Codex adapter.
- Claude Code adapter.
- Session detail event feed.
- Text input.
- Slash command picker for `/`.
- Skill/plugin/preset picker for `$`.
- Tool call cards.
- Command cards.
- Diff summary cards.
- Approval cards with approve/reject.
- Basic push notifications for approval, completion, failure, and host disconnect.
- Live Surface v1 for the currently tracked active session: red for user
  confirmation, yellow for agent work, green idle as clear/no display.
- Simple companion avatar states.

## Deferred

Deferred from MVP:

- Full pet progression, levels, achievements, or game loops.
- Team collaboration and team permissions.
- Full terminal mirroring as the default interface.
- Mobile-side code execution.
- Multi-session concurrent Live Activities / Live Updates.
- Vendor-private Android island APIs, floating-window hacks, or accessibility
  overlays that imitate a system island.
- Android home-screen widgets.
- Advanced voice workflows.
- Full offline authoring.
- Rich animated companion runtime as a core dependency.
- Direct P2P transport as primary transport.

## MVP Success Criteria

MVP is successful when a developer can:

1. Pair a phone to a desktop Host.
2. Start or resume a Codex/Claude session from a workspace.
3. Watch structured progress on the phone.
4. Receive an approval notification.
5. Inspect the approval and diff summary.
6. Approve or reject from the phone.
7. Send a follow-up text command.
8. Reopen the app after backgrounding and recover missed events.

## Scope Guardrails

- Workflows are workspace-first, not global-history-first.
- The phone consumes structured events, not raw terminal scrollback.
- Large diffs and logs are summarized first and expanded lazily.
- AgentPal can expose original CLI-like commands, but with mobile-native UI.
- Host and Relay reliability comes from event logs, sequence numbers, ack, and
  replay, not from assuming an always-on socket.
- Live Surface is system-level only. Do not draw a fake Dynamic Island inside
  the mobile app. Idle green status must not keep a Live Activity, Dynamic
  Island, Live Update, or ongoing notification alive.
