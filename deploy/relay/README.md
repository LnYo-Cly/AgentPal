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

## Railway

The repository root includes `railway.toml` so Railway uses the Relay
Dockerfile instead of auto-detecting the repo as a generic Rust/Railpack
service. This fixes the "No start command detected" failure mode.

Create one Railway service from the GitHub repository and one Railway Redis
database in the same project. Configure the Relay service variables:

| Variable | Value |
| --- | --- |
| `OAP_REDIS_URL` | Reference the Redis service `REDIS_URL`, for example `${{Redis.REDIS_URL}}` if the database service is named `Redis`. |
| `OAP_REDIS_KEY_PREFIX` | `agentpal:relay:prod` |
| `OAP_RELAY_REQUIRE_PAIRING` | `true` |
| `RUST_LOG` | `agentpal_relay=info` |

The Docker entrypoint reads Railway's `PORT` variable and starts Relay on
`0.0.0.0:${PORT}`. The healthcheck path is `/healthz`. Do not set a custom
Railway start command for this service unless you intentionally want to
override the Dockerfile entrypoint.

If Railway still shows Railpack in the build log, set this Relay service
variable manually and redeploy:

```text
RAILWAY_DOCKERFILE_PATH=deploy/relay/relay.Dockerfile
```

After deployment succeeds, generate a Railway domain first and verify:

```bash
curl https://<railway-domain>/healthz
```

Then use the WebSocket endpoint:

```text
wss://<railway-domain>/ws
```

## Environment

| Variable | Purpose |
| --- | --- |
| `OAP_REDIS_URL` | Redis URL used by the Relay store. |
| `OAP_REDIS_KEY_PREFIX` | Prefix for Relay keys; defaults to `agentpal:relay`. |
| `OAP_RELAY_REQUIRE_PAIRING` | When true, mobile commands require verified device pairing. |
| `OAP_RELAY_HOST` | Optional bind host used by the Docker entrypoint; defaults to `0.0.0.0`. |
| `PORT` | Runtime port used by Railway; local fallback is `8790`. |

## Beta Limits

- Run one Relay process or use sticky routing. Cross-node WebSocket routing is
  not implemented in this slice.
- Device bindings are persisted, but account-level device revocation is not
  implemented yet.
- TLS, DNS, monitoring, abuse controls, backups, and secrets management remain
  deployment-owner responsibilities.
