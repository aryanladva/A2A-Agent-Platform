# Environment Setup

Copy `.env.example` to `.env` and fill in real values before running
any service locally.

## Required variables

### Gateway

| Variable              | Description                                         |
| --------------------- | --------------------------------------------------- |
| `GATEWAY_PORT`        | Port the gateway listens on (default 4000)          |
| `JWT_SECRET`          | Signing secret for JWTs (use a vault in production) |
| `OAUTH_CLIENT_ID`     | OAuth2 client ID                                    |
| `OAUTH_CLIENT_SECRET` | OAuth2 client secret                                |
| `RATE_LIMIT_PER_MIN`  | Requests allowed per client per minute              |

### Orchestrator

| Variable                 | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| `ORCHESTRATOR_PORT`      | Port the orchestrator listens on (default 4100)        |
| `REDIS_URL`              | e.g. `redis://localhost:6379`                          |
| `DATABASE_URL`           | Postgres connection string                             |
| `AGENT_CARD_SIGNING_KEY` | Private key used to sign this service's own Agent Card |

### Agent worker

| Variable           | Description                              |
| ------------------ | ---------------------------------------- |
| `WORKER_PORT`      | Port this worker listens on              |
| `LLM_PROVIDER`     | e.g. `anthropic`, `openai`               |
| `LLM_API_KEY`      | API key for the chosen LLM provider      |
| `ORCHESTRATOR_URL` | URL of the orchestrator to register with |

### Shared

| Variable                 | Description                      |
| ------------------------ | -------------------------------- |
| `NODE_ENV`               | `development` \| `production`    |
| `OTEL_EXPORTER_ENDPOINT` | OpenTelemetry collector endpoint |

## Notes

- Never commit `.env` — only `.env.example` with placeholder values.
- In production, prefer a vault/secrets manager over plain env vars
  where possible (see `SECURITY.md`).
