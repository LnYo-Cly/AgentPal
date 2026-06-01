# AgentPal UX Principles

Context Doc Type: ux-principles
Owner: project coordinator
Last Verified: 2026-05-31
Confidence: medium

## Principle 1: Mobile Is Not Terminal

The app must not default to a terminal transcript. Terminal output may exist as
an expandable detail, but the primary surface is structured cards and state.

Primary card types:

- Message card.
- Tool call card.
- Command card.
- Diff summary card.
- Diff file card.
- Approval card.
- File update card.
- Error recovery card.

## Principle 2: Companion Supports Status

Companion visuals create recognition and warmth. They should represent the
current session or agent state:

- idle
- thinking
- running
- waiting for approval
- succeeded
- failed
- offline

Companions are not separate feature mascots. Do not create one companion for
approval, one for diff, one for host, and one for voice. Features remain UI
cards and controls.

## Principle 3: Information Clarity Comes First

When the user opens AgentPal, the first screen should answer:

- Which host is online?
- Which agent sessions are active?
- Does anything need my approval?
- What changed?
- What is risky?
- What can I do next?

## Principle 4: Command Experience Is Semantic, Not Pixel-Perfect

Codex and Claude Code terminal affordances such as `/` slash commands and `$`
skill/plugin selection should exist on mobile, but as a native command panel or
bottom sheet. The phone should not attempt to mirror the terminal TUI.

## Principle 5: Prototype Assets Are Local Working Material

The `ui/` folder is ignored by Git. It is reserved for local prototype images,
Image2 outputs, visual references, and cutting experiments. Production assets
must be separately generated, licensed, named, and committed under the eventual
app asset tree.

## Principle 6: Live Surface Uses Red / Yellow Only

For iOS Dynamic Island / Live Activities and Android Live Updates, AgentPal uses
a traffic-light mental model with a strict publishing boundary:

- Red means the user must confirm something: approval, permission, dangerous
  command, or agent question.
- Yellow means the agent is actively working: editing, testing, running a
  command, generating a diff, or thinking.
- Green means idle / available and must not publish to the system live surface.

This rule applies to system-level realtime surfaces only. It should not force
the whole app UI into traffic-light colors.

## Recommended Screen Set

The initial prototype set should cover:

1. Home / pocket workbench.
2. Session list and workspace grouping.
3. Session detail event feed.
4. Approval card detail.
5. Diff summary and file diff expansion.
6. Host pairing and host status.
7. Slash command picker.
8. Skill/plugin picker.

## Image2 Prompt Workflow

Image2 prompts should generate visual direction, not production code. Each
prompt should specify:

- Screen target.
- Platform frame if needed.
- AgentPal developer-tool purpose.
- Companion state.
- Card hierarchy.
- Exact on-screen data examples.
- What to avoid, especially game UI, terminal screens, and generic chat app
  layouts.
