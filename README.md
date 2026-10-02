# A2A Platform

A platform where independent AI agents discover and delegate tasks to
each other using Google's A2A (Agent2Agent) protocol.

## Reference docs

- `doc/ARCHITECTURE.md` — layer breakdown, request flow, security principles
- `doc/AGENT_CARD_SPEC.md` — Agent Card JSON schema used across the project
- `doc/API_SPEC.md` — orchestrator endpoints, request/response schemas
- `doc/SECURITY.md` — auth flow, secrets handling, mTLS setup
- `doc/ENV_SETUP.md` — required environment variables
- `doc/TESTING.md` — how to run tests locally
- `doc/CHANGELOG.md` — version history

## Project structure

```
apps/
  gateway/         # API gateway: auth, rate limiting
  orchestrator/     # A2A orchestrator: routing, agent registry client
  agent-worker/      # Worker agent: executes tasks, calls LLM/tools
  frontend/         # Next.js + TailwindCSS dashboard
packages/
  shared-types/     # Shared TypeScript types across apps
```

## Local setup

```bash
pnpm install
cp .env.example .env      # fill in secrets, see ENV_SETUP.md
docker compose up -d      # starts Redis + Postgres
pnpm dev                  # starts gateway, orchestrator, agent-worker
```

## Status

- [x] Phase 1 — Monorepo setup
- [x] Phase 2 — API gateway
- [x] Phase 3 — A2A orchestrator core
- [x] Phase 4 — Agent registry
- [x] Phase 5 — Worker agent
- [x] Phase 6 — Task queue
- [x] Phase 7 — Frontend
- [x] Phase 8 — Security hardening
- [x] Phase 9 — Deployment
