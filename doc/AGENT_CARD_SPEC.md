# Agent Card — Reference Spec

An **Agent Card** is a JSON document any A2A-compliant agent publishes at
`/.well-known/agent.json`. It lets other agents/orchestrators discover
what the agent can do, how to reach it, and how to authenticate with it.

## Minimal example

```json
{
  "name": "invoice-parser-agent",
  "description": "Extracts structured data from invoice documents",
  "version": "1.0.0",
  "url": "https://agents.example.com/invoice-parser",
  "authentication": {
    "schemes": ["oauth2"]
  },
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "skills": [
    {
      "id": "parse-invoice",
      "name": "Parse invoice",
      "description": "Extracts vendor, line items, totals from a PDF/image invoice",
      "inputModes": ["application/pdf", "image/png"],
      "outputModes": ["application/json"]
    }
  ],
  "signature": {
    "alg": "ES256",
    "value": "<base64-signature>"
  }
}
```

## Fields to always fill in for this project

- `name`, `description`, `version`, `url` — required
- `authentication.schemes` — match whatever the gateway issues (OAuth2/JWT)
- `capabilities.streaming` — true if the agent supports SSE progress updates
- `skills[]` — one entry per distinct task type the agent can handle;
  this is what the orchestrator matches against when routing tasks
- `signature` — added at registration time by the agent registry service,
  so the orchestrator can verify authenticity before delegating

## Registry usage

- On startup, each worker agent POSTs its Agent Card to the registry.
- The registry validates the schema, signs it, and stores it in Postgres.
- The orchestrator queries the registry by `skills[].id` when routing.
- A background heartbeat job marks an agent `inactive` if it misses
  health checks, so the orchestrator stops routing to it.
