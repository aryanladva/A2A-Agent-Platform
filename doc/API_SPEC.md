# API Spec — Orchestrator

## Auth

All endpoints require `Authorization: Bearer <JWT>` issued by the
gateway (OAuth2). Missing/invalid token → `401`.

## Endpoints

### `GET /.well-known/agent.json`

Returns this orchestrator's own signed Agent Card (see `AGENT_CARD_SPEC.md`).

### `POST /a2a/tasks` — create/delegate a task

**Request**

```json
{
  "skill": "parse-invoice",
  "input": { "fileUrl": "https://...", "mimeType": "application/pdf" },
  "streaming": true
}
```

**Response** `202 Accepted`

```json
{
  "taskId": "task_8f3a...",
  "status": "queued",
  "assignedAgent": "invoice-parser-agent"
}
```

### `GET /a2a/tasks/{taskId}` — poll task status

**Response**

```json
{
  "taskId": "task_8f3a...",
  "status": "in_progress",
  "progress": [{ "timestamp": "...", "message": "Extracting line items" }]
}
```

### `GET /a2a/tasks/{taskId}/stream` (SSE)

Streams `status`/`progress`/`artifact`/`completed`/`failed` events as
they happen, instead of polling.

### `GET /a2a/agents` — list registered agents

Returns active agents from the registry with their skills, used by the
frontend dashboard.

## Error codes

| Code | Meaning                           |
| ---- | --------------------------------- |
| 400  | Malformed request / unknown skill |
| 401  | Missing or invalid auth token     |
| 404  | Task or agent not found           |
| 409  | Task already completed/cancelled  |
| 429  | Rate limit exceeded               |
| 502  | Worker agent unreachable          |
| 504  | Worker agent timed out            |

## Task status values

`queued` → `in_progress` → `completed` | `failed` | `cancelled`
