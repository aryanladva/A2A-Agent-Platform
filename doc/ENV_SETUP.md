# Environment Setup — Desktop Coding Agent

Copy `.env.example` to `.env` and fill in real values before running any service locally.

## Required variables

### Gateway
| Variable | Description |
|---|---|
| `GATEWAY_PORT` | Port the gateway listens on (default 4000) |

### Orchestrator
| Variable | Description |
|---|---|
| `ORCHESTRATOR_PORT` | Port the orchestrator listens on (default 4100) |
| `ORCHESTRATOR_HOST` | Host address orchestrator binds to (default `127.0.0.1` for local security) |
| `AGENT_CARD_SIGNING_KEY` | Private key used to sign this service's own Agent Card |
| `SQLITE_PATH` | Local SQLite database file path for task/agent persistence |

### Agent worker
| Variable | Description |
|---|---|
| `WORKER_PORT` | Port this worker listens on (default 4200) |
| `LLM_PROVIDER` | Default: `ollama` (local, free, offline) |
| `LLM_MODEL` | Default: `qwen2.5-coder` (coding-specific model) |
| `OLLAMA_BASE_URL` | Default: `http://localhost:11434` |
| `LLM_API_KEY` | Only needed if switching to `anthropic`/`openai` |
| `ORCHESTRATOR_URL` | URL of the orchestrator to register with (default `http://127.0.0.1:4100`) |
| `SANDBOX_ENABLED` | Enable sandboxed execution container (`true` \| `false`) |

**Default provider: Ollama.** No API key or internet needed — just have Ollama installed and the model pulled locally:
```bash
ollama pull qwen2.5-coder
```
To switch to Anthropic/OpenAI later, change `LLM_PROVIDER` and add `LLM_API_KEY` — no code changes needed.

### Shared
| Variable | Description |
|---|---|
| `NODE_ENV` | `development` \| `production` |
| `OTEL_EXPORTER_ENDPOINT` | OpenTelemetry collector endpoint |

## Notes
- Never commit `.env` — only `.env.example` with placeholder values.
- `JWT_SECRET`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `RATE_LIMIT_PER_MIN`, `REDIS_URL`, and `DATABASE_URL` have been removed in favor of single-user local architecture with embedded SQLite.
