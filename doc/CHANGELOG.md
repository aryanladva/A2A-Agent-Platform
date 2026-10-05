# Changelog

All notable changes to this project are recorded here as each phase is completed.

## [1.0.0] - 2026-10-05

### Added
- **Phase 1: Monorepo Setup**: Configured pnpm workspace monorepo structure for desktop application.
- **Phase 2: API Gateway**: Integrated correlation ID middleware and OpenTelemetry trace propagation.
- **Phase 3: A2A Orchestrator Core**: Single-user local task routing server listening on `127.0.0.1:4100`.
- **Phase 4: Agent Registry & Signed Cards**: Implemented cryptographic HMAC-SHA256 signature verification for worker agents.
- **Phase 5: Four Coding Agents**: Implemented `CodeGen`, `Debug/Test`, `Git-ops`, and `Review` worker agents.
- **Phase 6: In-Process Task Queue**: Replaced distributed queue with single-user async queue with retry logic and Dead-Letter Queue (DLQ).
- **Phase 7: Native Desktop Shell UI**: Developed React + Tailwind desktop UI with file-tree sidebar, chat panel, and diff viewer.
- **Phase 8: Embedded SQLite Storage Layer**: Replaced external databases with embedded SQLite (`data/a2a.sqlite`) managing `tasks`, `task_events`, `agents`, and `file_changes`. Enforced explicit per-file user approval before writing changes to disk.
- **Phase 9: Execution Sandbox**: Implemented short-lived Docker container execution per task with 2 CPU/2GB/60s resource limits, volume isolation, network restrictions (`--network=none`), and selective Debug/Test agent blocking when Docker is inactive.
- **Phase 10: Unified LLM Gateway & OS Credential Manager**: Added adapters for Anthropic, OpenAI, local Ollama, and Mock providers, driven by configuration. Built OS-bound encrypted credential vault (`credentials.vault`) for key storage.
- **Desktop Executable Packaging**: Packaged double-clickable Windows `.exe` binary distribution.
