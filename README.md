# AgentPal

AgentPal connects a local coding-agent host to the AgentPal mobile app through a Cloud Relay pairing flow.

This first npm release is a source-based CLI package: it runs the packaged Rust host and relay through `cargo run`.

## Install

Run without installing:

```bash
npx agentpal@latest pair
```

Or install globally:

```bash
npm install -g agentpal
agentpal pair
```

## Commands

```bash
agentpal pair
agentpal pair --workspace .
agentpal relay --host 0.0.0.0 --port 8790
agentpal host codex connect --workspace .
```

`agentpal pair` uses the current directory as the default workspace and the public Cloud Relay by default. For local development, pass a local Relay URL:

```bash
agentpal pair --workspace . --relay-url ws://127.0.0.1:8790/ws
```

## Requirements

- Node.js
- Rust toolchain with `cargo`
- Codex CLI available as `codex` for live host sessions

The npm package currently builds and runs the Rust host/relay from source through `cargo run`.
