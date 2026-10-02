# A2A Platform — Architecture Reference

## Overview

This project implements a platform where independent AI agents discover
and delegate tasks to each other using Google's **A2A (Agent2Agent)
protocol**, while each agent may separately use **MCP** to connect to its
own tools/data. A2A = agent-to-agent (horizontal). MCP = agent-to-tool
(vertical). They are complementary, not competing.

## Layers

| Layer                    | Responsibility                               | Tech                                         |
| ------------------------ | -------------------------------------------- | -------------------------------------------- |
| Client / UI              | Submit tasks, view live status               | Next.js, TypeScript, Tailwind, WebSocket/SSE |
| API gateway + auth       | AuthN/Z, rate limiting, TLS termination      | Express or FastAPI, OAuth2/JWT               |
| A2A orchestrator         | Task routing, agent discovery, session state | Node.js/Python, official A2A SDK             |
| Agent registry           | Stores signed Agent Cards, health checks     | Postgres                                     |
| Worker agents            | Execute tasks, call LLMs and tools           | LangGraph/CrewAI, sandboxed containers       |
| Task queue + state store | Async task handoff, persistence              | Redis (queue), Postgres (state/artifacts)    |

## Request flow

1. Client sends a task via the gateway (authenticated).
2. Gateway forwards to the orchestrator.
3. Orchestrator queries the agent registry to find a worker agent
   whose Agent Card advertises the needed skill.
4. Orchestrator delegates the task (JSON-RPC/gRPC per A2A spec),
   pushes it onto the Redis task queue.
5. Worker agent picks up the task, executes (calling its own tools/LLM
   via MCP if needed), streams status updates back.
6. Results/artifacts are stored in Postgres and streamed to the client.

## Security principles

- Every agent runs in an isolated container — one compromised agent
  should not affect others.
- Agent Cards are cryptographically signed; orchestrator verifies
  signatures before trusting a card (prevents agent spoofing).
- mTLS between orchestrator and worker agents.
- Rate limiting and input validation at the gateway; sanitize any
  LLM-generated text before it triggers a tool call.
- Secrets are never hardcoded — loaded from environment or a vault.
- OpenTelemetry tracing across every agent hop for auditability.

## Open decisions (fill in as the project progresses)

- [ ] LLM provider(s) per agent
- [ ] Agent framework (LangGraph vs CrewAI vs custom)
- [ ] Deployment target (Kubernetes vs single VM for MVP)
- [ ] Multi-tenant vs single-tenant orchestrator
