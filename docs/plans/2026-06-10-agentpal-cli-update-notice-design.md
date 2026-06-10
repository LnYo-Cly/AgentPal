# AgentPal CLI Update Notice Design

Task: `2026-06-10-agentpal-cli-update-notice-403bf715`

## Decision

Add a lightweight update notice to the `agentpal` CLI for real commands only.
The update check must never block pairing, must not alter `--help`, and must
fail silently when npm is unreachable or the package has not been published.

## Behavior

- Skip the check for `help`, `--help`, and `-h`.
- Skip when `AGENTPAL_NO_UPDATE_CHECK=1`.
- Query npm latest with a short timeout.
- If latest is greater than the local package version, print one stderr notice:
  `AgentPal <latest> is available. Update with: npm install -g agentpal@latest`
- If latest is equal, lower, unavailable, malformed, timed out, or returns 404,
  continue silently.

## Testability

The CLI supports a hidden `AGENTPAL_UPDATE_CHECK_URL` override so tests can point
to a local mock registry without publishing to npm. This is not part of the
public user-facing setup.

## Non-Goals

- No automatic update.
- No background process.
- No local config writes.
- No npm publish.
- No changes to Host, Relay, or mobile protocol.
