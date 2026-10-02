import dotenv from 'dotenv';
import { GatewayConfig } from './types';

dotenv.config();

export const config: GatewayConfig = {
  port: parseInt(process.env.GATEWAY_PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-prod',
  oauthClientId: process.env.OAUTH_CLIENT_ID || 'a2a-client-id',
  oauthClientSecret: process.env.OAUTH_CLIENT_SECRET || 'a2a-client-secret',
  rateLimitPerMin: parseInt(process.env.RATE_LIMIT_PER_MIN || '100', 10),
  orchestratorUrl: process.env.ORCHESTRATOR_URL || 'http://localhost:4100',
  nodeEnv: process.env.NODE_ENV || 'development',
};
