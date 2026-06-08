# OpenAgentPal Relay Beta Deployment

This directory contains a single-node beta deployment profile for AgentPal
Relay plus Redis. It is meant for a VPS or container host behind TLS.

## Requirements

- A server or container platform account.
- A DNS name such as `relay.openagentpal.com`.
- TLS termination in front of the Relay service.
- Redis reachable only from the Relay service.

## Run Locally

```bash
docker compose -f deploy/relay/docker-compose.yml up --build
```

The compose file exposes Relay on `http://127.0.0.1:8790`. In a real deployment,
put a TLS proxy in front of it and expose `wss://<domain>/ws`.

## Environment

| Variable | Purpose |
| --- | --- |
| `OAP_REDIS_URL` | Redis URL used by the Relay store. |
| `OAP_REDIS_KEY_PREFIX` | Prefix for Relay keys; defaults to `agentpal:relay`. |
| `OAP_RELAY_REQUIRE_PAIRING` | When true, mobile commands require verified device pairing. |

## Beta Limits

- Run one Relay process or use sticky routing. Cross-node WebSocket routing is
  not implemented in this slice.
- Device bindings are persisted, but account-level device revocation is not
  implemented yet.
- TLS, DNS, monitoring, abuse controls, backups, and secrets management remain
  deployment-owner responsibilities.
