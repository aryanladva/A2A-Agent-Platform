# Testing

## Running tests

```bash
pnpm test              # run all unit tests across the monorepo
pnpm test --filter gateway
pnpm test --filter orchestrator
pnpm test --filter agent-worker
```

## Integration tests

Integration tests spin up Redis + Postgres via Docker Compose and a
mock worker agent that implements a minimal Agent Card + one skill,
so the orchestrator's routing logic can be tested end-to-end without
calling a real LLM.

```bash
docker compose -f docker-compose.test.yml up -d
pnpm test:integration
```

## Mock agent

`apps/agent-worker` should expose a `--mock` flag that:

- Serves a static Agent Card with one fake skill (`echo`)
- Returns a canned response instead of calling an LLM
- Used by integration tests and local frontend development without
  burning API credits

## What to cover

- Gateway: auth rejection on bad/missing JWT, rate limit enforcement
- Orchestrator: task routing to the correct agent by skill, handling
  of an unreachable/timed-out agent, Agent Card signature verification
- Worker: task execution success/failure paths, artifact storage
- End-to-end: submit a task via gateway → confirm it completes and the
  client receives the expected streamed events

## CI

Tests run automatically on every PR via GitHub Actions (see
`ARCHITECTURE.md` Phase 9 / `PROMPTS.md`). A PR cannot merge if tests
fail.
