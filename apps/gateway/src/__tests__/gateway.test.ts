import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Gateway API', () => {
  describe('Health Check Endpoint', () => {
    it('GET /health should return 200 OK with service details', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('gateway');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('Correlation ID Middleware', () => {
    it('should attach a correlation ID to the response headers', async () => {
      const res = await request(app).get('/health');
      expect(res.headers).toHaveProperty('x-correlation-id');
      expect(typeof res.headers['x-correlation-id']).toBe('string');
    });

    it('should preserve incoming x-correlation-id header', async () => {
      const customCid = 'test-correlation-id-12345';
      const res = await request(app).get('/health').set('x-correlation-id', customCid);
      expect(res.headers['x-correlation-id']).toBe(customCid);
    });
  });
});
