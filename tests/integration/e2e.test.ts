import { describe, it, expect } from 'vitest';
import request from 'supertest';
import gatewayApp from '../../apps/gateway/src/app';
import orchestratorApp from '../../apps/orchestrator/src/app';
import workerApp from '../../apps/agent-worker/src/app';
import { config as orchestratorConfig } from '../../apps/orchestrator/src/config';
import { signAgentCard } from '../../apps/orchestrator/src/utils/crypto';
import { executeLlmTask } from '../../apps/agent-worker/src/llm/provider';

describe('A2A System Integration & End-to-End Test Suite', () => {
  describe('1. Gateway Health & Correlation ID Enforcement', () => {
    it('should return 200 OK on gateway health endpoint', async () => {
      const res = await request(gatewayApp).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('should attach and preserve correlation IDs across Gateway requests', async () => {
      const cid = 'e2e-correlation-id-999';
      const res = await request(gatewayApp).get('/health').set('x-correlation-id', cid);
      expect(res.headers['x-correlation-id']).toBe(cid);
    });
  });

  describe('2. Agent Registry & Signature Verification', () => {
    it('should reject agent registration with an invalid cryptographic signature', async () => {
      const fakeCard = {
        name: 'untrusted-agent',
        description: 'Agent with forged signature',
        version: '1.0.0',
        url: 'http://localhost:4999',
        skills: [
          {
            id: 'untrusted-skill',
            name: 'Untrusted',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
          },
        ],
        signature: { alg: 'HS256', value: 'forged-hash-value' },
      };

      const res = await request(orchestratorApp)
        .post('/a2a/registry/register')
        .send(fakeCard);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_signature');
    });

    it('should successfully register an agent with a valid cryptographic signature', async () => {
      const rawCard = {
        name: 'e2e-mock-worker',
        description: 'E2E Test Mock Worker Agent',
        version: '1.0.0',
        url: 'http://localhost:4200',
        authentication: { schemes: ['oauth2'] },
        capabilities: { streaming: true, pushNotifications: false },
        skills: [
          {
            id: 'e2e-mock-skill',
            name: 'E2E Mock Skill',
            description: 'Mock skill for integration tests',
            inputModes: ['application/json'],
            outputModes: ['application/json'],
          },
        ],
      };

      const signedCard = signAgentCard(rawCard, orchestratorConfig.agentCardSigningKey);

      const res = await request(orchestratorApp)
        .post('/a2a/registry/register')
        .send(signedCard);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('active');
    });
  });

  describe('3. Task Routing by Skill & Unreachable Agent Handling', () => {
    it('should route task to correct worker agent matching the requested skill', async () => {
      const res = await request(orchestratorApp)
        .post('/a2a/tasks')
        .send({
          skill: 'e2e-mock-skill',
          input: { testKey: 'testValue' },
        });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe('queued');
      expect(res.body.assignedAgent).toBe('e2e-mock-worker');
    });

    it('should return 404 agent_not_found for unregistered or unreachable skills', async () => {
      const res = await request(orchestratorApp)
        .post('/a2a/tasks')
        .send({
          skill: 'non-existent-skill-999',
          input: {},
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('agent_not_found');
    });
  });

  describe('4. Mock Worker Agent Execution (Coding Skills)', () => {
    it('should execute code-generation tasks and return diff proposals', async () => {
      const mockResult = await executeLlmTask(
        'code-generation',
        { targetFile: 'src/index.ts', instruction: 'Refactor code' },
        true,
        'mock',
        'mock-api-key'
      );

      expect(mockResult.text).toContain('Generated code refactoring');
      expect(mockResult.diffProposals).toBeDefined();
    });

    it('should execute task via Worker HTTP endpoint and persist artifact', async () => {
      const res = await request(workerApp)
        .post('/a2a/worker/execute')
        .send({
          taskId: 'e2e_task_001',
          skill: 'code-generation',
          input: { targetFile: 'src/index.ts', instruction: 'Add feature' },
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.artifact.taskId).toBe('e2e_task_001');

      // Verify artifact storage retrieval
      const artifactRes = await request(workerApp).get('/a2a/worker/artifacts/e2e_task_001');
      expect(artifactRes.status).toBe(200);
      expect(artifactRes.body.artifacts.length).toBeGreaterThan(0);
    });
  });

  describe('5. End-to-End Task Submission & SSE Streaming', () => {
    it('should delegate task through Orchestrator and allow polling status until completed', async () => {
      const createRes = await request(orchestratorApp)
        .post('/a2a/tasks')
        .send({
          skill: 'code-generation',
          input: { query: 'E2E full flow message' },
        });

      expect(createRes.status).toBe(202);
      const taskId = createRes.body.taskId;

      // Poll task status
      const pollRes = await request(orchestratorApp)
        .get(`/a2a/tasks/${taskId}`);

      expect(pollRes.status).toBe(200);
      expect(pollRes.body).toHaveProperty('status');
      expect(pollRes.body.taskId).toBe(taskId);
    });

    it('should stream task progress via SSE endpoint', async () => {
      const createRes = await request(orchestratorApp)
        .post('/a2a/tasks')
        .send({
          skill: 'code-generation',
          input: { text: 'SSE test' },
          streaming: true,
        });

      const taskId = createRes.body.taskId;

      const sseRes = await request(orchestratorApp)
        .get(`/a2a/tasks/${taskId}/stream`);

      expect(sseRes.status).toBe(200);
      expect(sseRes.headers['content-type']).toContain('text/event-stream');
    });
  });
});
