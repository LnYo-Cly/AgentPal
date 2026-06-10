# AgentPal Public Command Naming Design

Task: `2026-06-10-agentpal-public-command-naming-41fcec16`

## Decision

Use `AgentPal` as the product name and `agentpal` as the public CLI command.
Do not expose `oap` or `openagentpal` as current user-facing commands because
there are no public users yet and no migration path is needed.

## User Flow

The intended public install/run flow becomes:

```powershell
npx agentpal@latest pair --workspace .
```

After a global install, the command becomes:

```powershell
agentpal pair --workspace .
```

## Scope

This task changes current product surfaces only:

- npm `bin` / source script naming.
- CLI help text and examples.
- Mobile default device name.
- Active local development context.

This task does not change:

- Railway platform domain `openagentpal-production.up.railway.app`.
- Historical Harness task IDs, generated ledger rows, or old evidence text.
- Pairing URL backward parser support, unless it becomes a current user-facing
  entry point.
- Real npm publish or GitHub repository rename.

## Rationale

`agentpal` is clearer than `oap` for first-time users and avoids the `oap` /
`opa` typo risk. Matching product, package, and command names also makes npm
and docs simpler: users see `agentpal` everywhere.
