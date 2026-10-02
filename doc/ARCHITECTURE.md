# A2A Desktop Coding Agent — Architecture Reference

## Overview

This project implements a native desktop application where independent AI agents discover and delegate local coding tasks to each other using Google's **A2A (Agent2Agent) protocol**. 

The scope is strictly tailored for **local coding tasks** (code generation, refactoring, code review, sandboxed test running, local file inspection, and git status reporting).

## System Architecture

```
+-------------------------------------------------------------------------+
|                  Electron Desktop Application (Frontend)                |
|  +---------------------+  +---------------------+  +-----------------+  |
|  | Local Project Picker|  | File Tree & Diffs   |  | SSE Task Stream |  |
|  +---------------------+  +---------------------+  +-----------------+  |
|                                    |                                    |
|                       Electron IPC Bridge (Preload)                     |
|                                    |                                    |
+------------------------------------|------------------------------------+
                                     | (Local FS / Git Diffs / HTTP API)
                                     v
+-------------------------------------------------------------------------+
|                              Backend Stack                              |
|  +--------------------+    +-------------------+    +----------------+  |
|  |     API Gateway    |--->|  A2A Orchestrator |--->| Coding Worker  |  |
|  |  (Auth/Rate Limit) |    |  (Task Routing)   |    |    Agent       |  |
|  +--------------------+    +-------------------+    +----------------+  |
|                                      |                      |           |
|                                      v                      v           |
|                                 +----------+           +----------+     |
|                                 | Postgres |           |  Redis   |     |
|                                 +----------+           +----------+     |
+-------------------------------------------------------------------------+
```

## Layers

| Layer                    | Responsibility                               | Tech                                         |
| ------------------------ | -------------------------------------------- | -------------------------------------------- |
| Desktop Client UI        | Folder picker, file tree, diff viewer, chat  | Electron, Next.js (Static Export), Tailwind  |
| API gateway + auth       | AuthN/Z, rate limiting, TLS termination      | Express, OAuth2/JWT                          |
| A2A orchestrator         | Task routing, coding agent registry client   | Node.js/TypeScript, official A2A SDK         |
| Agent registry           | Stores signed coding Agent Cards             | Postgres                                     |
| Coding worker agent      | Code generation, diff engine, sandboxed run  | TypeScript, LLM integration, git/fs helpers  |
| Task queue + state store | Async task handoff, persistence              | Redis (queue), Postgres (state/artifacts)    |

## Coding Skills Supported

Worker agents register Agent Cards specifically advertising:
- `code-generation`: Generating code snippets, refactoring existing files, emitting `diffProposals`.
- `code-runner`: Running tests or code in a local sandboxed context.
- `git-operations`: Querying git status, branches, and diffs.
- `file-operations`: Directory listing and file tree construction.
- `code-review`: AI code review and suggestions.

## Request & Diff Flow

1. User opens the Electron desktop app and selects a local project folder via `dialog:open-directory`.
2. The user inputs a coding prompt (e.g. "Add a helper function for validating email").
3. Desktop client sends the task payload to the API Gateway / Orchestrator.
4. Orchestrator routes the task to the registered `coding-worker-agent`.
5. Worker agent analyzes project context, generates code proposals, and streams `diffProposals` back to the desktop UI via SSE.
6. User inspects the side-by-side proposed changes in `DiffViewer`.
7. Clicking **Apply Changes to Disk** invokes native Electron IPC (`fs:apply-diff`) to apply the diffs to the local file system.

## Security Principles

- Cryptographically signed Agent Cards verify worker agent identities.
- Native Electron IPC bridge exposes scoped filesystem methods (`dialog:open-directory`, `fs:read-tree`, `fs:apply-diff`) with strict context isolation (`contextIsolation: true`).
- Secrets loaded exclusively from environment/vault files (`.env`), never hardcoded.
- OpenTelemetry tracing across request paths for auditability.
