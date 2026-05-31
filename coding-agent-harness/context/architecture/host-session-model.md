# AgentPal Host And Session Model

Context Doc Type: host-session-model
Owner: project coordinator
Last Verified: 2026-05-31
Confidence: medium

## Core Position

AgentPal should not auto-manage every historical Codex or Claude session as the
primary product model. The primary model is workspace-first managed sessions.
Historical scan is a discovery and resume feature.

## Session Classes

| Class | Meaning | Phone control |
| --- | --- | --- |
| Managed live session | Started or resumed through AgentPal Host and currently tracked by Host. | Full realtime view and control. |
| Resumable historical session | Existing Codex/Claude/OpenCode session found by workspace metadata and supported by adapter resume. | User may select it and turn it into a managed live session. |
| Read-only historical record | Old or unsupported session that can be indexed but not safely resumed. | View metadata and summary only. |

## Workspace-First UX

The primary user path is:

```text
Choose Host -> choose Workspace -> start or resume agent session
```

Not:

```text
Scan all global sessions -> show huge flat list
```

Reasons:

- Local agent histories can contain many stale sessions.
- Sessions may not have reliable human-readable names.
- `cwd` is usually the most reliable grouping field.
- Different agents store sessions differently.
- Full transcript scanning is slow and noisy.

## Host Commands

Target command shape:

```bash
agentpal pair
agentpal daemon
agentpal codex
agentpal codex resume
agentpal codex resume --session <id>
agentpal claude
agentpal claude resume
agentpal opencode
```

Running `agentpal codex` in a directory means: create a new AgentPal-managed
Codex session for the current workspace.

## Session Discovery

Host may index historical sessions in the background. The discovery index should:

- scan recent windows first
- group by workspace root or cwd
- read metadata first
- avoid full transcript search by default
- mark entries as resumable or read-only
- expose only recent N per workspace by default

For Codex history, prior local inspection found session files under
`.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`, with `session_meta.payload.cwd` as
a reliable scope field. Do not assume every session exposes a title.

## Host Responsibilities

Host owns:

- process lifecycle for managed agents
- adapter state
- local workspace index
- local event capture
- file diff generation
- approval routing to the underlying agent
- event replay to Relay after reconnect

Host does not own:

- user account identity
- team permission model in MVP
- cloud event durability beyond local outbox
- mobile UI rendering decisions

## Mobile Session List

Home should prioritize:

1. Managed live sessions.
2. Pending approvals.
3. Recently active workspaces.
4. Resumable sessions within selected workspace.

Global historical sessions should live behind a workspace or host-level history
entry, not on the primary home list.

## Source Evidence

| Evidence | Notes | Last Verified | Confidence |
| --- | --- | --- | --- |
| User session-management questions in conversation | User asked whether to scan all Codex/Claude sessions or open/resume by directory; decision is workspace-first managed sessions with history as discovery. | 2026-05-31 | medium |
| Prior local Codex session inspection | Session metadata can include cwd, making workspace grouping a safer first-class model than a flat global history list. | 2026-05-31 | medium |
