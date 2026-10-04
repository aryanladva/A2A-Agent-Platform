import dotenv from 'dotenv';
import { GatewayConfig } from './types';

dotenv.config();

export const config: GatewayConfig = {
  port: parseInt(process.env.GATEWAY_PORT || '4000', 10),
  orchestratorUrl: process.env.ORCHESTRATOR_URL || 'http://127.0.0.1:4100',
  nodeEnv: process.env.NODE_ENV || 'development',
};
