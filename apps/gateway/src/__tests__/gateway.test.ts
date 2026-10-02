import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { config } from '../config';

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

  describe('OAuth2 Token Endpoint', () => {
    it('POST /oauth/token should return access token for valid client credentials', async () => {
      const res = await request(app).post('/oauth/token').send({
        client_id: config.oauthClientId,
        client_secret: config.oauthClientSecret,
      });

      expect(res.status).toBe(200);
      expect(res.body.token_type).toBe('Bearer');
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('expires_in');
    });

    it('POST /oauth/token should return 401 for invalid credentials', async () => {
      const res = await request(app).post('/oauth/token').send({
        client_id: 'invalid-id',
        client_secret: 'invalid-secret',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid_client');
    });

    it('POST /oauth/token should return 400 when missing credentials', async () => {
      const res = await request(app).post('/oauth/token').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_request');
    });
  });

  describe('JWT Authentication Middleware', () => {
    it('should reject protected routes with 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/protected');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    it('should reject protected routes with 401 for invalid token signature', async () => {
      const invalidToken = jwt.sign({ sub: 'user' }, 'wrong-secret');
      const res = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    it('should allow access to protected route with valid token', async () => {
      const validToken = jwt.sign(
        { sub: config.oauthClientId, clientId: config.oauthClientId },
        config.jwtSecret
      );

      const res = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted to protected resource');
      expect(res.body.client.clientId).toBe(config.oauthClientId);
    });
  });

  describe('Rate Limiter Middleware Enforcement', () => {
    it('should apply rate limiting middleware to protected routes', async () => {
      const validToken = jwt.sign(
        { sub: config.oauthClientId, clientId: config.oauthClientId },
        config.jwtSecret
      );
      const res = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.headers).toHaveProperty('ratelimit-limit');
    });
  });
});
