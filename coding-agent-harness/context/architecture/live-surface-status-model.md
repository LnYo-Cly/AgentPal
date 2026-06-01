# AgentPal Live Surface Status Model

Context Doc Type: architecture-decision
Owner: project coordinator
Last Verified: 2026-06-01
Confidence: medium

## Purpose

Live Surface is AgentPal's abstraction for system-level realtime surfaces:
iOS Live Activities / Dynamic Island and Android Live Updates / promoted
ongoing notifications. It is not an in-app decorative component.

The mobile app may show ordinary status inside screens, but it must not draw a
fake Dynamic Island in the page. If a device or OS cannot display a system live
surface, AgentPal falls back to ordinary notifications or in-app state.

## Status Priority

Live Surface only publishes states that deserve out-of-app attention.

| Priority | Color | Meaning | Publish to Live Surface | Examples |
| --- | --- | --- | --- | --- |
| 1 | red | Needs user confirmation | yes | approval request, permission prompt, dangerous command confirmation, agent question waiting for answer |
| 2 | yellow | Agent is working | yes | editing files, running tests, executing command, generating diff, thinking |
| 3 | green | Session is idle / available | no | host online, session waiting for new user input, agent ready |
| 4 | gray | Ended / offline / historical | no | completed session, disconnected host, archived session |

When multiple states apply, the highest priority wins:

```text
red confirmation required > yellow working > no live surface
```

If a session is running and then requests approval, the live surface switches
from yellow to red immediately. Green idle must not keep a Dynamic Island,
Live Activity, Live Update, or ongoing notification alive.

## Platform Mapping

| Platform | Primary implementation | Fallback | Notes |
| --- | --- | --- | --- |
| iOS | Live Activities and Dynamic Island through ActivityKit-compatible Expo widget support | lock screen Live Activity or normal notification | Dynamic Island appears only on supported iPhone hardware. The same activity must degrade to lock screen presentation on unsupported devices. |
| Android | Android Live Updates / progress-centric promoted ongoing notification where supported | ordinary ongoing or high-priority notification | Android has no single universal "Dynamic Island" API. Manufacturer surfaces should be reached through official notification/live-update behavior, not private floating-window hacks. |

## Event Contract Shape

The app-facing state should be normalized before it reaches platform code:

```ts
type LiveSurfaceState =
  | {
      kind: "confirmation_required";
      color: "red";
      sessionId: string;
      agentKind: "codex" | "claude" | "opencode" | "openclaw" | "custom";
      title: string;
      subtitle: string;
      pendingCount: number;
      deepLink: string;
    }
  | {
      kind: "working";
      color: "yellow";
      sessionId: string;
      agentKind: "codex" | "claude" | "opencode" | "openclaw" | "custom";
      title: string;
      subtitle: string;
      progressLabel?: string;
      deepLink: string;
    }
  | {
      kind: "clear";
      reason: "idle" | "completed" | "offline" | "user_stopped" | "expired";
      sessionId: string;
    };
```

Green idle is represented as `clear`, not as a green live-surface payload.

## API Boundary

Application code talks to one facade:

```ts
LiveSurface.start(sessionId, state)
LiveSurface.update(sessionId, state)
LiveSurface.end(sessionId, reason)
```

Platform implementation details stay behind that facade:

- iOS: Expo widget / ActivityKit bridge and Live Activity layout.
- Android: native Expo module for Live Updates / progress notifications.
- Fallback: normal push/local notification plus in-app state.

## UX Constraints

- Live Surface is scoped to the currently tracked active session, not every
  historical session on the host.
- Red may interrupt yellow. Yellow must not interrupt red.
- Idle, host-online, and completed states should not remain visible outside
  the app.
- A completed task may send a one-shot notification, then end the live surface.
- A disconnected host should normally send a notification or in-app banner, not
  occupy the live surface.
- Text must be short enough for compact surfaces; expanded surfaces may show
  agent type, workspace, current step, and pending approval count.
- Color must be paired with icon and text because the user may not perceive the
  color alone.

## Source Evidence

| Source | What it establishes | Last Verified | Confidence |
| --- | --- | --- | --- |
| Apple HIG Live Activities: https://developer.apple.com/design/human-interface-guidelines/live-activities | Live Activities are glanceable system surfaces for tracking activity progress. | 2026-06-01 | medium |
| Apple ActivityKit: https://developer.apple.com/documentation/ActivityKit/displaying-live-data-with-live-activities | iOS Live Activities are implemented through ActivityKit. | 2026-06-01 | medium |
| Expo Widgets: https://docs.expo.dev/versions/latest/sdk/widgets/ | Expo provides iOS widgets and Live Activities support for Expo apps. | 2026-06-01 | medium |
| Android Live Updates: https://developer.android.com/develop/ui/views/notifications/live-update | Android Live Updates are notification-based realtime surfaces with usage criteria. | 2026-06-01 | medium |

