# A2A Desktop Coding Agent

A desktop application and multi-agent platform for local coding tasks (code generation, refactoring, sandboxed execution, git status/diffs, file tree inspection, and code review) built using Electron, Next.js/React, TailwindCSS, and Google's A2A (Agent2Agent) protocol.

## Features

- **Desktop-First Experience**: Native Windows executable shell wrapping the React UI via Electron.
- **Coding Task Focus**: Restricted worker agent skills:
  - `code-generation`: Automated code generation and refactoring with diff proposals.
  - `code-runner`: Sandboxed execution of tests and scripts.
  - `git-operations`: Local git repository status inspection and branch management.
  - `file-operations`: Directory hierarchy tree scanning and disk file mutations.
  - `code-review`: AI code review and diagnostic analysis.
- **Local Workspace Selector**: Select any local project folder using native OS dialogs.
- **Interactive File Tree & Diff Viewer**: Inspect proposed code modifications in a side-by-side diff viewer before applying them to disk.
- **Real-Time Streaming**: Live task status and code proposals streamed directly into the desktop window.

## Reference Documentation

- `doc/ARCHITECTURE.md` — layer breakdown, desktop app integration, request flow, security principles
- `doc/AGENT_CARD_SPEC.md` — Agent Card JSON schema for coding worker agents
- `doc/API_SPEC.md` — orchestrator endpoints, request/response schemas
- `doc/SECURITY.md` — auth flow, secrets handling, mTLS setup
- `doc/ENV_SETUP.md` — required environment variables
- `doc/TESTING.md` — how to run unit and integration tests locally
- `doc/CHANGELOG.md` — version history

## Project Structure

```
apps/
  gateway/         # API gateway: auth, rate limiting
  orchestrator/     # A2A orchestrator: task routing, coding agent registry
  agent-worker/      # Coding worker agent: executes code tasks, generates diffs
  frontend/         # Electron desktop app (Next.js static bundle + main process IPC)
packages/
  shared-types/     # Shared TypeScript interfaces across desktop app and services
```

## Running the Desktop Application

### Prerequisites
- Node.js LTS (v20+) & `pnpm`
- Docker Desktop (for Redis & Postgres dependencies)

### Quick Start
```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Start database services & launch all background services + Electron desktop app
pnpm run start:all
```

### Desktop Specific Commands
```bash
# Launch Electron Desktop app in development mode
pnpm --filter frontend run desktop:dev

# Package double-clickable Windows installer and unpacked .exe binary
pnpm --filter frontend run desktop:pack
```

The compiled binaries will be output to:
- `apps/frontend/dist-desktop/win-unpacked/A2A Coding Agent Desktop.exe`
- `apps/frontend/dist-desktop/A2A Coding Agent Desktop Setup 0.1.0.exe`

## Status

- [x] Phase 1 — Monorepo setup
- [x] Phase 2 — API gateway
- [x] Phase 3 — A2A orchestrator core
- [x] Phase 4 — Agent registry & coding skills
- [x] Phase 5 — Coding worker agent & diff engine
- [x] Phase 6 — Task queue
- [x] Phase 7 — Desktop UI (Electron + React file tree, diff viewer, chat stream)
- [x] Phase 8 — Security hardening
- [x] Phase 9 — Windows `.exe` desktop installer build & deployment
