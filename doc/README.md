# A2A Desktop Coding Agent Documentation

A native desktop application and multi-agent system designed exclusively for coding tasks, using Google's A2A (Agent2Agent) protocol.

## Reference Documentation

- `ARCHITECTURE.md` — layer breakdown, request flow, desktop app architecture, security principles
- `AGENT_CARD_SPEC.md` — Agent Card JSON schema used for coding worker agents
- `API_SPEC.md` — orchestrator endpoints, request/response schemas
- `SECURITY.md` — auth flow, secrets handling, mTLS setup
- `ENV_SETUP.md` — required environment variables
- `TESTING.md` — how to run tests locally
- `PROMPTS.md` — phase-wise build prompts
- `CHANGELOG.md` — version history

## Project Structure

```
apps/
  gateway/         # API gateway: auth, rate limiting
  orchestrator/     # A2A orchestrator: task routing, coding agent registry
  agent-worker/      # Coding worker agent: task execution, diff proposals, sandboxed code runner
  frontend/         # Desktop application (Electron shell + Next.js React UI)
packages/
  shared-types/     # Shared TypeScript types across apps
```

## Running the Desktop Application

```bash
pnpm install
cp .env.example .env      # fill in secrets, see ENV_SETUP.md
docker compose up -d      # starts Redis + Postgres
pnpm run start:all        # starts gateway, orchestrator, agent-worker, and Electron desktop app
```

### Packaging Windows `.exe`

To package the standalone native desktop application executable for Windows:

```bash
pnpm --filter frontend run desktop:pack
```

Packaged binaries are output to `apps/frontend/dist-desktop/`.

## Status

- [x] Phase 1 — Monorepo setup
- [x] Phase 2 — API gateway
- [x] Phase 3 — A2A orchestrator core
- [x] Phase 4 — Agent registry & coding agent cards
- [x] Phase 5 — Coding worker agent
- [x] Phase 6 — Task queue
- [x] Phase 7 — Desktop Frontend (Electron + Next.js file tree, diff viewer, workspace selector)
- [x] Phase 8 — Security hardening
- [x] Phase 9 — Windows `.exe` Desktop packaging & distribution
