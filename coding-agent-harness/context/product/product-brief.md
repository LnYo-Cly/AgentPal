# AgentPal Product Brief

Context Doc Type: product-brief
Owner: project coordinator
Last Verified: 2026-05-31
Confidence: medium

## Product Summary

AgentPal is a mobile AI coding agent workbench for developers. It connects a
phone to coding agents that are actually running on the user's computer, such as
Codex CLI, Claude Code CLI, OpenCode, OpenClaw, or compatible custom agents.

The product is not a phone terminal, not a generic AI chat app, not a remote
desktop, and not a self-hosted coding agent runtime on the phone. The computer
remains the execution environment for reading files, editing code, running
tests, generating diffs, and handling low-level permissions. The phone provides
a mobile-native control and review surface.

## Primary User

The primary user is a developer who already uses AI coding agents for long
running local development tasks and wants to stay in control after leaving the
computer.

Common situations:

- A Codex or Claude Code task is still editing files or running tests.
- The agent requests approval for a file operation or command.
- The user wants to inspect a diff without reading a full terminal transcript.
- The user wants to send a short follow-up instruction from the phone.
- The user wants a notification when the task completes, fails, or blocks.

## Core Jobs

AgentPal must help the user:

1. See which hosts and agent sessions are active.
2. See what each agent is doing now.
3. Review structured tool calls, command output, file changes, and diffs.
4. Approve or reject agent requests from the phone.
5. Continue the conversation with text first, voice later.
6. Resume relevant historical sessions by workspace when safe and supported.

## Product Shape

The mobile app should feel like a pocket agent workbench:

- Home shows host status, active sessions, pending approvals, recent activity,
  quick actions, and a light companion state.
- Session detail shows a structured event feed, not a terminal screen.
- Approval and diff review are first-class mobile cards.
- Companion visuals represent agent/session state, but do not dominate the UI.

The target balance is approximately 85-90 percent developer-tool clarity and
10-15 percent companion personality.

## Non-Goals

AgentPal does not:

- Reimplement Codex, Claude Code, OpenCode, or OpenClaw.
- Execute code directly on the phone.
- Provide a full phone terminal as the primary experience.
- Mirror a desktop terminal TUI pixel-for-pixel.
- Define its own approval policy engine independent of the underlying agent.
- Become a pet-raising or game-style app.
- Copy protected third-party mascot, game, or character IP.

## Source Evidence

| Evidence | Notes |
| --- | --- |
| User product brief in conversation, 2026-05-31 | User defined AgentPal as a mobile workbench for desktop/remote coding agents. |
| User UI reference image in `ui/` local ignored folder | Used only as visual direction for companion + workbench feel; not committed and not treated as production asset. |
