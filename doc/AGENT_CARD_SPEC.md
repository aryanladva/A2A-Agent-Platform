# Agent Card — Reference Spec

An **Agent Card** is a JSON document any A2A-compliant agent publishes at
`/.well-known/agent.json`. It lets other agents/orchestrators discover
what the agent can do, how to reach it, and how to authenticate with it.

## Coding Agent Example

```json
{
  "name": "coding-worker-agent",
  "description": "Desktop AI coding agent executing code generation, refactoring, sandboxed execution, git operations, and local file diffs",
  "version": "1.0.0",
  "url": "http://localhost:4200",
  "authentication": {
    "schemes": ["oauth2"]
  },
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "skills": [
    {
      "id": "code-generation",
      "name": "Code Generation & Refactoring",
      "description": "Generates, refactors, and updates code based on instructions and project context",
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    },
    {
      "id": "code-runner",
      "name": "Sandboxed Execution & Debugging",
      "description": "Runs code snippets and tests in a sandboxed environment to inspect output and debug errors",
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    },
    {
      "id": "git-operations",
      "name": "Git Operations",
      "description": "Performs local git commands (status, diff, commit, branch management)",
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    },
    {
      "id": "file-operations",
      "name": "Local Workspace File Operations",
      "description": "Reads and writes files in a selected local project folder",
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    },
    {
      "id": "code-review",
      "name": "Code Review & Explanation",
      "description": "Reviews pull requests, code diffs, and provides explanations/suggestions",
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    }
  ],
  "signature": {
    "alg": "HS256",
    "value": "<base64-signature>"
  }
}
```

## Fields to always fill in for this project

- `name`, `description`, `version`, `url` — required
- `authentication.schemes` — match whatever the gateway issues (OAuth2/JWT)
- `capabilities.streaming` — true if the agent supports SSE progress updates
- `skills[]` — restricted to coding tasks only: `code-generation`, `code-runner`, `git-operations`, `file-operations`, `code-review`
- `signature` — added at registration time by the agent registry service, so the orchestrator can verify authenticity before delegating

## Registry usage

- On startup, each worker agent POSTs its Agent Card to the registry.
- The registry validates the schema, signs it, and stores it in Postgres.
- The orchestrator queries the registry by `skills[].id` when routing.
- A background heartbeat job marks an agent `inactive` if it misses health checks.
