import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

export interface TaskArtifact {
  id: string;
  taskId: string;
  agentName: string;
  artifactType: string;
  content: unknown;
  createdAt: string;
}

export class ArtifactsStore {
  private pool: Pool;
  private isPostgresAvailable = false;
  private inMemoryArtifacts: Map<string, TaskArtifact[]> = new Map();

  constructor() {
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 3000,
    });
  }

  public async initDb(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS task_artifacts (
            id VARCHAR(255) PRIMARY KEY,
            task_id VARCHAR(255) NOT NULL,
            agent_name VARCHAR(255) NOT NULL,
            artifact_type VARCHAR(100) NOT NULL,
            content JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_task_artifacts_task ON task_artifacts(task_id);
        `);
        this.isPostgresAvailable = true;
        console.log('[Worker DB] Postgres task_artifacts table initialized.');
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn(
        '[Worker DB] Postgres connection failed, using in-memory artifacts store:',
        (err as Error).message
      );
      this.isPostgresAvailable = false;
      return false;
    }
  }

  public async saveArtifact(
    taskId: string,
    agentName: string,
    artifactType: string,
    content: unknown
  ): Promise<TaskArtifact> {
    const id = `art_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    const now = new Date().toISOString();

    const artifact: TaskArtifact = {
      id,
      taskId,
      agentName,
      artifactType,
      content,
      createdAt: now,
    };

    if (this.isPostgresAvailable) {
      try {
        await this.pool.query(
          `
          INSERT INTO task_artifacts (id, task_id, agent_name, artifact_type, content, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `,
          [id, taskId, agentName, artifactType, JSON.stringify(content)]
        );
      } catch (err) {
        console.warn('[Worker DB] Insert failed, falling back to memory:', (err as Error).message);
        this.saveToMemory(taskId, artifact);
      }
    } else {
      this.saveToMemory(taskId, artifact);
    }

    return artifact;
  }

  private saveToMemory(taskId: string, artifact: TaskArtifact): void {
    const existing = this.inMemoryArtifacts.get(taskId) || [];
    existing.push(artifact);
    this.inMemoryArtifacts.set(taskId, existing);
  }

  public async getArtifactsByTask(taskId: string): Promise<TaskArtifact[]> {
    if (this.isPostgresAvailable) {
      try {
        const res = await this.pool.query(
          `SELECT id, task_id, agent_name, artifact_type, content, created_at FROM task_artifacts WHERE task_id = $1 ORDER BY created_at ASC`,
          [taskId]
        );
        if (res.rows.length > 0) {
          return res.rows.map((row) => ({
            id: row.id,
            taskId: row.task_id,
            agentName: row.agent_name,
            artifactType: row.artifact_type,
            content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
            createdAt: row.created_at,
          }));
        }
      } catch (_err) {
        // Fallthrough
      }
    }

    return this.inMemoryArtifacts.get(taskId) || [];
  }
}

export const artifactsStore = new ArtifactsStore();
