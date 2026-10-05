# A2A Desktop Coding Agent

A native desktop application and local multi-agent platform for coding tasks (code generation, refactoring, sandboxed test running, local git status/diffs, file tree inspection, and code review) built using Tauri / Electron, React, TailwindCSS, embedded SQLite, and Google's A2A (Agent2Agent) protocol.

## Features

- **Desktop-First Experience**: Native Windows executable wrapper around the desktop shell UI.
- **Single-User Local Microservices**: Orchestrator, Worker Agent, and API Gateway bound strictly to `127.0.0.1` locally.
- **Embedded SQLite Database**: Data persistence (`tasks`, `task_events`, `agents`, `file_changes`) powered by local SQLite (`data/a2a.sqlite`).
- **Coding-Only Agent Delegation**:
  - `codegen-agent` (`code-generation` skill): Automated code refactoring emitting proposed diffs.
  - `debug-test-agent` (`code-runner` skill): Short-lived Docker container execution per task with CPU/RAM/timeout limits and network isolation.
  - `git-ops-agent` (`git-operations` skill): Local git status, branch checking, and diff analysis.
  - `review-agent` (`code-review` skill): AI code review and suggestions.
- **Local Workspace Selector**: Select any project folder using native OS file dialogs.
- **Zero Silent Disk Writes**: All proposed code changes are stored as diffs in SQLite. Code writes happen exclusively after explicit per-file user approval in the desktop diff viewer.
- **Unified LLM Gateway**: Configurable completion runner with adapters for Anthropic (Claude 3.5 Sonnet), OpenAI (GPT-4o), local Ollama (Llama 3), and Mock.
- **Secure OS Credential Vault**: API keys stored in OS-bound encrypted credential storage (`credentials.vault`), preventing plaintext key exposure.

## Reference Documentation

- `doc/ARCHITECTURE.md` — system architecture, embedded SQLite schema, desktop shell integration
- `doc/AGENT_CARD_SPEC.md` — Agent Card spec for coding agents
- `doc/API_SPEC.md` — orchestrator & gateway endpoints
- `doc/SANDBOX.md` — short-lived Docker sandbox reference & resource limits
- `doc/UI_GUIDELINES.md` — desktop layout, color tokens, diff viewer rules
- `doc/SECURITY.md` — authentication, mTLS, input sanitization
- `doc/ENV_SETUP.md` — environment configuration
- `doc/TESTING.md` — unit & integration testing
- `doc/CHANGELOG.md` — version history

## Project Structure

```
apps/
  gateway/          # API gateway: correlation ID tracing, local HTTP proxy
  orchestrator/     # A2A orchestrator: task queue & SQLite database store
  agent-worker/     # Coding worker agent: LLM gateway, sandbox runner, diff engine
  desktop-shell/    # Native Desktop UI shell (React, Tailwind, Tauri / Electron wrapper)
packages/
  shared-types/     # Shared TypeScript interfaces
```

## Running & Building the Desktop App

### Prerequisites
- Node.js LTS (v20+) & `pnpm`
- Docker Desktop (for sandboxed test running via Debug/Test agent)

### Launch Desktop Platform
```bash
# Install dependencies
pnpm install

# Start background microservices + desktop app
pnpm run start:all
```

### Build Windows Binary / Installer
```bash
# Build desktop executable binary
pnpm --filter desktop-shell desktop:build
```

The compiled binaries output to:
- `apps/desktop-shell/release/win-unpacked/A2A Desktop Coding Agent.exe`

## Status & Completed Phases

- [x] **Phase 1** — Monorepo setup
- [x] **Phase 2** — API gateway with correlation ID tracing
- [x] **Phase 3** — A2A orchestrator core
- [x] **Phase 4** — Agent registry & signed Agent Cards
- [x] **Phase 5** — Coding worker agents (CodeGen, Debug/Test, Git-ops, Review)
- [x] **Phase 6** — In-process async task queue
- [x] **Phase 7** — Native Desktop Shell UI (file tree, chat panel, diff viewer)
- [x] **Phase 8** — Embedded SQLite data layer (`file_changes` table & explicit per-file approval)
- [x] **Phase 9** — Execution sandbox per `SANDBOX.md` (Docker container per task, resource limits, network isolation)
- [x] **Phase 10** — Unified LLM Gateway (Anthropic, OpenAI, Ollama adapters & secure OS credential vault)
