import dotenv from 'dotenv';

dotenv.config();

export interface WorkerConfig {
  port: number;
  llmProvider: string;
  llmApiKey: string;
  orchestratorUrl: string;
  jwtSecret: string;
  agentCardSigningKey: string;
  databaseUrl: string;
  isMock: boolean;
  nodeEnv: string;
}

const isMockFlag =
  process.argv.includes('--mock') ||
  process.env.MOCK_MODE === 'true' ||
  (process.env.LLM_PROVIDER || 'mock') === 'mock';

export const config: WorkerConfig = {
  port: parseInt(process.env.WORKER_PORT || '4200', 10),
  llmProvider: process.env.LLM_PROVIDER || 'mock',
  llmApiKey: process.env.LLM_API_KEY || 'mock-api-key',
  orchestratorUrl: process.env.ORCHESTRATOR_URL || 'http://localhost:4100',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-prod',
  agentCardSigningKey: process.env.AGENT_CARD_SIGNING_KEY || 'orchestrator-signing-key-secret',
  databaseUrl:
    process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/a2a_db',
  isMock: isMockFlag,
  nodeEnv: process.env.NODE_ENV || 'development',
};
