import dotenv from 'dotenv';

dotenv.config();

export interface OrchestratorConfig {
  port: number;
  host: string;
  agentCardSigningKey: string;
  redisUrl: string;
  databaseUrl: string;
  nodeEnv: string;
}

export const config: OrchestratorConfig = {
  port: parseInt(process.env.ORCHESTRATOR_PORT || '4100', 10),
  host: process.env.ORCHESTRATOR_HOST || '127.0.0.1',
  agentCardSigningKey: process.env.AGENT_CARD_SIGNING_KEY || 'orchestrator-signing-key-secret',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  databaseUrl:
    process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/a2a_db',
  nodeEnv: process.env.NODE_ENV || 'development',
};
