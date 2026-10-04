# A2A Desktop Coding Agent — Architecture Reference

## Overview

This project implements a native desktop application where independent AI agents discover and delegate local coding tasks to each other using Google's **A2A (Agent2Agent) protocol**. 

The scope is strictly tailored for **local coding tasks** (code generation, refactoring, code review, sandboxed test running, local file inspection, and git status reporting).

## System Architecture

```
+-------------------------------------------------------------------------+
|                  Desktop Application (Desktop Shell UI)                |
|  +---------------------+  +---------------------+  +-----------------+  |
|  | Local Project Picker|  | File Tree & Diffs   |  | SSE Task Stream |  |
|  +---------------------+  +---------------------+  +-----------------+  |
|                                    |                                    |
|                       Desktop IPC / API Bridge                          |
|                                    |                                    |
+------------------------------------|------------------------------------+
                                     | (Local FS / Git Diffs / HTTP API)
                                     v
+-------------------------------------------------------------------------+
|                       Single-User Local Backend Stack                   |
|  +--------------------+    +-------------------+    +----------------+  |
|  |     API Gateway    |--->|  A2A Orchestrator |--->| Coding Worker  |  |
|  | (127.0.0.1:4000)   |    | (127.0.0.1:4100)  |    |    Agent       |  |
|  +--------------------+    +-------------------+    +----------------+  |
|                                      |                      |           |
|                                      v                      v           |
|                            +-------------------+    +----------------+  |
|                            |  Embedded SQLite  |    | In-Process     |  |
|                            |  (data/a2a.sqlite)|    | Async Queue    |  |
|                            +-------------------+    +----------------+  |
+-------------------------------------------------------------------------+
```

## Layers

| Layer                    | Responsibility                               | Tech                                         |
| ------------------------ | -------------------------------------------- | -------------------------------------------- |
| Desktop Client UI        | Folder picker, file tree, diff viewer, chat  | Desktop Shell UI (React + Tailwind)          |
| API gateway              | Correlation ID tracing, local HTTP proxy    | Express                                      |
| A2A orchestrator         | Task routing, coding agent registry client   | Node.js/TypeScript, A2A Protocol             |
| Agent registry & store   | Stores signed coding Agent Cards & tasks     | Embedded SQLite (`data/a2a.sqlite`)          |
| Coding worker agent      | Code generation, diff engine, sandboxed run  | TypeScript, LLM integration, git/fs helpers  |
| Task queue               | Single-user local async task handoff         | In-process async queue                       |

## Data Model (SQLite Schema)

The persistence layer uses embedded SQLite (`SQLITE_PATH`, default `./data/a2a.sqlite`).

### 1. `tasks`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique task identifier (e.g. `task_abc123`) |
| `skill` | TEXT | NOT NULL | Requested skill (e.g. `code-generation`) |
| `input` | TEXT | NOT NULL | JSON stringified task payload |
| `assigned_agent` | TEXT | NOT NULL | Target worker agent name |
| `status` | TEXT | NOT NULL | `queued` \| `in_progress` \| `completed` \| `failed` \| `cancelled` |
| `progress` | TEXT | NULL | JSON stringified progress timeline array |
| `result` | TEXT | NULL | JSON stringified task result |
| `error` | TEXT | NULL | Failure error message |
| `created_at` | TEXT | NOT NULL | ISO 8601 creation timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 update timestamp |

### 2. `task_events`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique event ID |
| `task_id` | TEXT | NOT NULL, FK(`tasks.id`) | Reference to parent task |
| `timestamp` | TEXT | NOT NULL | ISO 8601 event timestamp |
| `message` | TEXT | NOT NULL | Human readable log or progress text |
| `type` | TEXT | NOT NULL | Event type |
| `metadata` | TEXT | NULL | JSON stringified event metadata |

### 3. `agents`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `name` | TEXT | PRIMARY KEY | Agent name (e.g. `coding-worker-agent`) |
| `description` | TEXT | NULL | Agent description |
| `version` | TEXT | NULL | Semantic version string |
| `url` | TEXT | NULL | Agent HTTP endpoint URL |
| `authentication` | TEXT | NULL | JSON stringified auth scheme |
| `capabilities` | TEXT | NULL | JSON stringified capabilities |
| `skills` | TEXT | NOT NULL | JSON stringified AgentSkill array |
| `signature` | TEXT | NULL | JSON stringified cryptographic HMAC signature |
| `status` | TEXT | NOT NULL | `active` \| `inactive` |
| `last_heartbeat` | TEXT | NOT NULL | ISO 8601 heartbeat timestamp |
| `created_at` | TEXT | NOT NULL | ISO 8601 creation timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 update timestamp |

### 4. `file_changes`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique diff ID (e.g. `diff_12345`) |
| `task_id` | TEXT | NOT NULL, FK(`tasks.id`) | Reference to parent task |
| `file_path` | TEXT | NOT NULL | Relative target file path |
| `original_content` | TEXT | NULL | Existing disk content before proposed change |
| `proposed_content` | TEXT | NULL | AI-generated replacement content |
| `diff_summary` | TEXT | NULL | Human readable diff summary (added/removed lines) |
| `status` | TEXT | NOT NULL | `proposed` \| `applied` \| `rejected` |
| `created_at` | TEXT | NOT NULL | ISO 8601 creation timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 update timestamp |

## Coding Skills Supported

Worker agents register Agent Cards specifically advertising:
- `code-generation`: Generating code snippets, refactoring existing files, emitting `diffProposals`.
- `code-runner`: Running tests or code in a local sandboxed context.
- `git-operations`: Querying git status, branches, and diffs.
- `file-operations`: Directory listing and file tree construction.
- `code-review`: AI code review and suggestions.

## Request & Diff Flow

1. User selects a local project folder in the desktop client UI.
2. User submits a coding instruction (e.g. "Add a helper function for validating email").
3. Desktop client sends the task payload to the API Gateway / Orchestrator (`127.0.0.1:4100`).
4. Orchestrator records the task in SQLite (`tasks` & `task_events`), enqueues it in the in-process async queue, and routes it to `coding-worker-agent`.
5. Worker agent executes the task, generates code proposals, records artifacts & file diffs, and streams `diffProposals` back via SSE.
6. User inspects the side-by-side proposed changes in `DiffViewer`.
7. User approves and applies changes to disk.

## Security Principles

- Cryptographically signed Agent Cards verify worker agent identities.
- Secrets loaded exclusively from environment files (`.env`), never hardcoded.
- Bound to `127.0.0.1` locally only — zero external public network listening sockets.
- OpenTelemetry tracing across request paths for auditability.
