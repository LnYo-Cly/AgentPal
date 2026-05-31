# AgentPal Technical Stack Decision

Context Doc Type: technical-stack-decision
Owner: project coordinator
Last Verified: 2026-05-31
Confidence: medium

## Fixed Stack

| Layer | Decision |
| --- | --- |
| Mobile app | Expo React Native + TypeScript + Development Build |
| Navigation | Expo Router |
| Design system base | Shopify Restyle + AgentPal-owned UI Kit |
| Lists | FlashList |
| Animation / gestures | Reanimated + Gesture Handler |
| Bottom sheets | `@gorhom/bottom-sheet` |
| Icons | `lucide-react-native` |
| Local cache | `expo-sqlite` |
| Secure storage | `expo-secure-store` |
| QR scanning | `expo-camera` |
| Push token collection | `expo-notifications` |
| Host | Rust + Tokio |
| Host CLI | `clap` |
| Host local DB | SQLite + sqlx |
| Host PTY fallback | `portable-pty` |
| Relay | Rust + Axum WebSocket |
| Relay DB | PostgreSQL + sqlx |
| Presence / transient fanout | Redis |
| Artifact storage | S3/R2-compatible object storage for encrypted blobs |
| Auth | Supabase Auth; Relay verifies JWT |
| Protocol SSoT | Rust `agentpal-protocol` crate generating TypeScript types |
| Encryption | Standard X25519 / Ed25519 / XChaCha20-Poly1305 primitives; no custom crypto |

## Rationale

Expo React Native is the fixed mobile choice because AgentPal needs one iOS and
Android app with strong UI velocity, native notifications, scanning, secure
storage, local cache, and future native extensions. The product is a structured
workbench, not a high-performance game or graphics engine.

Rust is the fixed Host and Relay choice because the long-lived desktop Host and
protocol Relay need stable process control, predictable resource usage,
single-binary distribution, and strict protocol handling. AI-assisted
implementation reduces language productivity concerns, so the long-term
operational shape is more important than fastest initial scaffolding.

Standard WebSocket is the fixed realtime transport. AgentPal reliability is
provided by event logs, `seq`, `ack`, replay, idempotent commands, and push
wake-up, not by assuming any socket stays connected forever.

## UI Component Strategy

AgentPal should not use a large generic UI kit as the primary visual layer.
Generic libraries can inspire simple controls, but product-critical components
must be owned by AgentPal:

- `AgentAvatar`
- `SessionCard`
- `HostStatusCard`
- `EventFeed`
- `MessageBubble`
- `ToolCallCard`
- `CommandCard`
- `DiffSummaryCard`
- `DiffFileCard`
- `ApprovalCard`
- `VoiceInputBar`
- `ConnectionSheet`
- `CommandPicker`
- `SkillPicker`

This is not unnecessary wheel-building. These components encode AgentPal's
domain model and mobile review experience. Basic primitives, layout tokens,
lists, gestures, storage, notifications, and crypto primitives must use mature
libraries.

## Explicit Non-Selections

| Not selected | Reason |
| --- | --- |
| Flutter | Strong UI runtime, but less useful for sharing protocol types with Host/Relay and not necessary for this workbench UI. |
| Swift/Kotlin native apps | Best platform depth, but duplicates app implementation and slows MVP without changing the core agent-control risk. |
| Node Host | Fast to build but weaker long-term fit for single-binary distribution and long-lived process control. |
| Socket.IO as core protocol | Helpful for demos, but AgentPal needs its own reliable encrypted event protocol anyway. |
| WebView primary UI | Conflicts with native mobile interaction and performance goals. |
| React Native Paper / gluestack / Tamagui as primary UI | Risk of generic template feel and poor fit for domain cards. |
| Rive as MVP core dependency | Companion state can start with static WebP/PNG plus lightweight animation; rich runtime animation can remain optional later. |

## Wheel-Building Boundary

Do build:

- AgentPal event protocol.
- Host adapter boundaries.
- Agent session state machine.
- Approval and diff models.
- Product-specific UI cards.
- Command and skill registry.

Do not build:

- Account provider.
- Database engine.
- Push provider.
- QR scanning.
- Secure keychain.
- PTY implementation.
- Git diff algorithm.
- Cryptographic primitives.

## Source Evidence

| Evidence | Notes | Last Verified | Confidence |
| --- | --- | --- | --- |
| User requirements and architecture discussion in conversation | Captures the fixed stack decision after comparing React Native, Flutter, native mobile, Rust, Node, WebSocket, Socket.IO, UI libraries, and owned domain UI components. | 2026-05-31 | medium |
| `coding-agent-harness/context/product/product-brief.md` | Product boundary requires mobile-native iOS/Android workbench backed by desktop Host execution. | 2026-05-31 | medium |
