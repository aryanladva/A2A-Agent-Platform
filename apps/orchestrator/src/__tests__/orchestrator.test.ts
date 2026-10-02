import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { config } from '../config';
import { verifyAgentCardSignature } from '../utils/crypto';
import { QueueJob } from '../queue/redisTaskQueue';
import { queueProcessor } from '../queue/queueProcessor';
import { taskStore } from '../services/taskStore';

describe('Orchestrator A2A Protocol Server & Redis Task Queue', () => {
  const validToken = jwt.sign({ sub: 'test-client', clientId: 'test-client' }, config.jwtSecret);

  describe('Discovery Endpoint', () => {
    it('GET /.well-known/agent.json should return orchestrator signed Agent Card', async () => {
      const res = await request(app).get('/.well-known/agent.json');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('a2a-orchestrator');
      expect(res.body).toHaveProperty('skills');
      expect(res.body).toHaveProperty('signature');
      expect(res.body.signature.alg).toBe('HS256');

      const isValidSignature = verifyAgentCardSignature(res.body, config.agentCardSigningKey);
      expect(isValidSignature).toBe(true);
    });
  });

  describe('Authentication Middleware', () => {
    it('should return 401 Unauthorized for /a2a/tasks without Bearer token', async () => {
      const res = await request(app)
        .post('/a2a/tasks')
        .send({
          skill: 'parse-invoice',
          input: { fileUrl: 'https://example.com/inv.pdf' },
        });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });
  });

  describe('Redis Task Queue & Async Task Delegation', () => {
    it('POST /a2a/tasks should enqueue job and return status queued (202 Accepted)', async () => {
      const res = await request(app)
        .post('/a2a/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          skill: 'parse-invoice',
          input: { fileUrl: 'https://example.com/invoice.pdf' },
          streaming: true,
        });

      expect(res.status).toBe(202);
      expect(res.body).toHaveProperty('taskId');
      expect(res.body.status).toBe('queued');
      expect(res.body.assignedAgent).toBe('invoice-parser-agent');
    });

    it('GET /a2a/queue/metrics should return queue status and metrics', async () => {
      const res = await request(app)
        .get('/a2a/queue/metrics')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('queued');
      expect(res.body).toHaveProperty('deadLetter');
    });

    it('should return 404 agent_not_found when no registered agent matches the skill', async () => {
      const res = await request(app)
        .post('/a2a/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          skill: 'unknown-nonexistent-skill',
          input: { query: 'test' },
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('agent_not_found');
    });
  });

  describe('Agent Registry & Signature Verification (SECURITY.md)', () => {
    it('should reject agent registration if signature is invalid or tampered', async () => {
      const tamperedCard = {
        name: 'malicious-agent',
        description: 'Malicious agent attempting fake registration',
        version: '1.0.0',
        url: 'http://localhost:9999',
        skills: [
          {
            id: 'fake-skill',
            name: 'Fake Skill',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
          },
        ],
        signature: {
          alg: 'HS256',
          value: 'invalid-signature-hash-value',
        },
      };

      const res = await request(app)
        .post('/a2a/registry/register')
        .set('Authorization', `Bearer ${validToken}`)
        .send(tamperedCard);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_signature');
    });
  });

  describe('Task Cancellation — POST /a2a/tasks/{taskId}/cancel', () => {
    it('should cancel a queued/in_progress task and update status to cancelled', async () => {
      const createRes = await request(app)
        .post('/a2a/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          skill: 'echo',
          input: { message: 'cancel me' },
        });

      const taskId = createRes.body.taskId;

      const cancelRes = await request(app)
        .post(`/a2a/tasks/${taskId}/cancel`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('cancelled');

      // Poll task status to confirm status is cancelled
      const getRes = await request(app)
        .get(`/a2a/tasks/${taskId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(getRes.body.status).toBe('cancelled');
    });

    it('should return 409 Conflict when attempting to cancel an already cancelled task', async () => {
      const createRes = await request(app)
        .post('/a2a/tasks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          skill: 'echo',
          input: { message: 'double cancel' },
        });

      const taskId = createRes.body.taskId;

      await request(app)
        .post(`/a2a/tasks/${taskId}/cancel`)
        .set('Authorization', `Bearer ${validToken}`);

      const secondCancelRes = await request(app)
        .post(`/a2a/tasks/${taskId}/cancel`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(secondCancelRes.status).toBe(409);
      expect(secondCancelRes.body.error).toBe('task_conflict');
    });
  });

  describe('Queue Processor — Retry Logic & Dead-Letter Queue (DLQ)', () => {
    it('should retry failed job up to maxRetries before sending to Dead-Letter Queue', async () => {
      const failingTask = taskStore.createTask('failing-skill', {}, 'failing-agent');
      const failingJob: QueueJob = {
        taskId: failingTask.taskId,
        skill: 'unregistered-failing-skill',
        input: {},
        assignedAgent: 'non-existent-agent',
        attempts: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString(),
      };

      // Process failing job attempt 1
      await queueProcessor.processJob(failingJob);
      let updatedTask = taskStore.getTask(failingTask.taskId);
      expect(updatedTask?.status).toBe('in_progress');

      // Process failing job attempt 2 (max retries reached -> moves to DLQ & status failed)
      await queueProcessor.processJob(failingJob);
      updatedTask = taskStore.getTask(failingTask.taskId);
      expect(updatedTask?.status).toBe('failed');

      // Inspect DLQ endpoint
      const dlqRes = await request(app)
        .get('/a2a/queue/dead-letter')
        .set('Authorization', `Bearer ${validToken}`);

      expect(dlqRes.status).toBe(200);
      expect(dlqRes.body.jobs.length).toBeGreaterThan(0);
    });
  });
});
