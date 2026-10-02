import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 3000,
});

export async function initDb(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS agents (
          name VARCHAR(255) PRIMARY KEY,
          description TEXT NOT NULL,
          version VARCHAR(50) NOT NULL,
          url VARCHAR(500) NOT NULL,
          authentication JSONB NOT NULL,
          capabilities JSONB NOT NULL,
          skills JSONB NOT NULL,
          signature JSONB NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          last_heartbeat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_agents_skills ON agents USING GIN (skills);
        CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
      `);
      console.log('[DB] Postgres agents table initialized successfully.');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn(
      '[DB] Postgres database connection failed, falling back to memory store:',
      (err as Error).message
    );
    return false;
  }
}
