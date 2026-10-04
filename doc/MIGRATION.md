# Migration — Web Build → Coding-only Desktop App

This repo's Phases 1–9 (see CHANGELOG.md) built a general-purpose
web platform. This migration narrows scope to a **coding-only desktop
app**. Read this alongside the updated `ARCHITECTURE.md`.

## What's reused as-is
- Orchestrator core logic (task routing by skill) — just rebind from
  `0.0.0.0` to `127.0.0.1`, no public network exposure
- Agent Card schema and signing logic (`AGENT_CARD_SPEC.md`)
- Redis/Postgres → **replaced** by embedded SQLite for a zero-install
  local experience (see below)

## What's removed
- Next.js web frontend (`apps/frontend`) — replaced by the Tauri
  desktop shell
- OAuth2/JWT client-facing auth — not needed for a single-user local
  app; the app itself is the only "client"
- Any non-coding skill/agent scaffolding from the original general
  platform

## What's new
- `apps/desktop-shell` — Tauri app (UI per `UI_GUIDELINES.md`)
- `apps/local-core` — process supervisor that spawns/monitors
  orchestrator + agents + sandbox on app launch
- Execution sandbox (`SANDBOX.md`)
- Diff-gated file write layer (no agent writes directly to disk)
- SQLite replacing Postgres+Redis for task/agent state — simpler
  local-only persistence, no Docker dependency for the core app
  (Docker is now **only** used for the execution sandbox, optional
  until a Debug/Test task actually runs)

## Database migration
Old: Postgres (`tasks`, `agents` tables) + Redis (queue)
New: SQLite, same logical tables (see `ARCHITECTURE.md` → Data model),
queue becomes an in-process async queue since everything is local and
single-user — no need for a distributed broker.

## Config/env changes
- Remove: `JWT_SECRET`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`,
  `RATE_LIMIT_PER_MIN`, `REDIS_URL`, `DATABASE_URL`
- Add: `SQLITE_PATH` (local file path), `SANDBOX_ENABLED` (bool),
  `LLM_PROVIDER`, `LLM_API_KEY` stay as-is but move to OS credential
  manager instead of `.env` where possible
- Update `ENV_SETUP.md` once the new env list is finalized in code

## Rollout order
Follow `PROMPTS.md` (desktop phases) in order — it assumes this
migration plan and builds the new pieces on top of the reused
orchestrator/agent logic rather than starting from zero.
