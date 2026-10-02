# Security — Reference

## Auth flow

1. Client logs in via the gateway's OAuth2 flow, receives a JWT.
2. Every request to the gateway carries `Authorization: Bearer <JWT>`.
3. Gateway validates the JWT signature + expiry before forwarding to
   the orchestrator.
4. Orchestrator ↔ worker-agent traffic uses **mTLS** (separate from
   the client-facing JWT) — each service has its own certificate.

## Agent authenticity

- Every Agent Card is signed (see `AGENT_CARD_SPEC.md`) when a worker
  registers with the registry.
- Orchestrator verifies the signature before routing any task to that
  agent — prevents a malicious/spoofed agent from registering and
  intercepting tasks.

## Secrets

- Never hardcode API keys, DB credentials, or signing keys in code or
  in Agent Cards.
- Load secrets from environment variables (see `ENV_SETUP.md`) or a
  vault (e.g. HashiCorp Vault, AWS Secrets Manager) in production.
- `.env` is git-ignored; only `.env.example` (no real values) is
  committed.

## Input handling

- Sanitize all LLM-facing text before it's allowed to trigger a tool
  call (prompt-injection defense) — never let raw external content
  directly drive a tool invocation without a validation step.
- Validate file uploads (type, size) at the gateway before they reach
  a worker agent.

## Isolation

- Each worker agent runs in its own container. A compromised agent
  should not have network access to other agents' internals or to the
  Postgres/Redis instances directly — only through the orchestrator.

## Rate limiting

- Gateway: 100 req/min per authenticated client (tune per environment).
- Per-agent concurrency caps set in the orchestrator to avoid one
  task type starving others.

## Audit trail

- OpenTelemetry traces every hop (client → gateway → orchestrator →
  worker) with a correlation ID, so any task can be reconstructed for
  a security review.
