# AgentPal

**Your coding agents keep working. You keep control.**

AgentPal is a pocket control surface for coding agents running on your own machine. Pair your phone with a local Codex host, step away from the desk, and stay close enough to review progress, catch blockers, and send the next instruction.

```bash
npx agentpal@latest pair
```

AgentPal is not a remote desktop, not a phone terminal, and not another AI chat box. Your computer remains the place where code is read, edited, tested, and committed. Your phone becomes the place where you keep the work visible and steer it when attention is needed.

## Why

Long-running coding agents are useful because they can keep moving while you are not staring at the terminal. They are also useful only if you can stay in the loop:

- a command needs approval;
- a diff needs a quick review;
- a task gets blocked and needs a nudge;
- a session finishes while you are away;
- you want to send one short follow-up without reopening your laptop.

AgentPal is built for that gap between "the agent is running" and "I still need to be responsible for what it does."

## Start Here

Run this from the project directory on the computer where Codex is available:

```bash
npx agentpal@latest pair
```

The command starts the AgentPal host, creates a Cloud Relay pairing, and prints a pairing URL plus QR code for the mobile app.

You can also install the CLI globally:

```bash
npm install -g agentpal
agentpal pair
```

To pair a different workspace:

```bash
agentpal pair --workspace /path/to/project
```

## What Works Today

AgentPal `0.1.x` is the first public release line of the desktop/CLI side:

- public npm package: `agentpal`;
- one-command pairing entry: `npx agentpal@latest pair`;
- Cloud Relay pairing flow;
- local Codex host bridge;
- QR/link pairing payloads;
- workspace-aware host startup;
- local relay command for development and advanced setups.

The mobile app and broader agent adapters are still evolving. This release is intended to make the public pairing path installable and testable.

## How It Works

```text
Phone app  <->  Cloud Relay  <->  AgentPal Host  <->  Codex CLI
                                      |
                                      v
                                your workspace
```

The host runs on your computer and talks to the local coding-agent process. The relay helps your phone and host find each other when they are not on the same network. Your repository stays on your machine; the phone is a control and review surface, not the execution environment.

## Commands

```bash
agentpal pair
agentpal pair --workspace .
agentpal pair --workspace . --relay-url ws://127.0.0.1:8790/ws

agentpal relay --host 0.0.0.0 --port 8790
agentpal host codex connect --workspace .
```

`agentpal pair` uses the current directory as the default workspace and the public Cloud Relay unless you pass `--relay-url` or set `AGENTPAL_RELAY_URL`.

## Requirements

The current npm package is source-based. It installs a Node.js wrapper and runs the packaged Rust host/relay through `cargo run`.

You need:

- Node.js 18 or newer;
- Rust toolchain with `cargo`;
- Codex CLI available as `codex` for live host sessions.

Prebuilt binaries are planned, but they are not part of the `0.1.x` release line.

## Security Model

AgentPal is designed around local execution:

- your code stays in your workspace on your computer;
- the host launches and supervises the local coding agent;
- the relay forwards pairing and realtime messages;
- the phone sends control intent and receives structured session state.

Do not treat the current public relay as a private enterprise deployment boundary. For sensitive work, run your own relay or wait for hardened deployment guidance.

## Development

Run the CLI from source:

```bash
npm run agentpal -- --help
npm run agentpal -- pair --workspace .
```

Run a local relay:

```bash
cargo run -p agentpal-relay -- --host 0.0.0.0 --port 8790
```

Check the Rust workspace:

```bash
cargo fmt --check
cargo check --workspace
cargo test -p agentpal-relay
```

Mobile app code lives under `apps/mobile`. Host, relay, and protocol crates live under `crates/`.

## Roadmap

Near-term work:

- mobile pairing and session UX hardening;
- prebuilt CLI binaries so users do not need Rust;
- more complete Codex session controls;
- Claude Code and other adapter paths;
- self-hosted relay deployment guide;
- stronger auth, device trust, and production relay hardening.

## Status

AgentPal is early. The public npm package is live, but the product surface is still being shaped. Expect sharp edges, fast iteration, and honest limits.
