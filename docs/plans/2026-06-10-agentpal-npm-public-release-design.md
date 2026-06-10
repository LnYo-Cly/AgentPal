# AgentPal npm Public Release Design

## Goal

Publish the first public npm package as `agentpal`, exposing the `agentpal`
command for pairing a local coding-agent host with the AgentPal mobile app.

## Chosen Approach

This release uses a source-based CLI package. The npm package installs a small
Node wrapper at `bin/agentpal.mjs`; that wrapper runs the Rust host or relay from
the packaged Cargo workspace with `cargo run`.

This is the smallest publishable path for the current repo because the host and
relay already live in Rust crates and do not yet have a cross-platform binary
release pipeline. The package explicitly requires Node.js, Cargo, and the Codex
CLI for live sessions.

## User Experience

Users can run:

```bash
npx agentpal@latest pair
```

or:

```bash
npm install -g agentpal
agentpal pair
```

`agentpal pair` uses the current directory as the default workspace and the
public Railway Cloud Relay unless `--relay-url` or `AGENTPAL_RELAY_URL` is set.

## Packaging Boundary

The package includes only:

- `bin/`
- `crates/`
- `Cargo.toml`
- `Cargo.lock`
- `README.md`
- `LICENSE`

It must not include the mobile app, Harness task history, Android debug
keystore, local build output, git metadata, or environment files.

## Known Follow-Up

A later release should add prebuilt binaries or platform packages so mainstream
users do not need a Rust toolchain. That should be a separate task because it
requires build matrix, checksum, and install-path design.
