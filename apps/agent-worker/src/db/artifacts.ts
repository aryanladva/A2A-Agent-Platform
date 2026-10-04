import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface TaskArtifact {
  id: string;
  taskId: string;
  agentName: string;
  artifactType: string;
  content: unknown;
  createdAt: string;
}

export class ArtifactsStore {
  private db: Database.Database | null = null;

  public async initDb(): Promise<boolean> {
    try {
      const dbPath = process.env.SQLITE_PATH || './data/a2a.sqlite';
      if (dbPath !== ':memory:') {
        const dir = path.dirname(path.resolve(dbPath));
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS task_artifacts (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          agent_name TEXT NOT NULL,
          artifact_type TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_task_artifacts_task ON task_artifacts(task_id);
      `);
      console.log('[Worker DB] SQLite task_artifacts table initialized.');
      return true;
    } catch (err) {
      console.warn('[Worker DB] SQLite initialization failed:', (err as Error).message);
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

    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT INTO task_artifacts (id, task_id, agent_name, artifact_type, content, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, taskId, agentName, artifactType, JSON.stringify(content), now);
    }

    return artifact;
  }

  public async getArtifactsByTask(taskId: string): Promise<TaskArtifact[]> {
    if (this.db) {
      const rows = this.db.prepare('SELECT * FROM task_artifacts WHERE task_id = ? ORDER BY created_at ASC').all(taskId) as any[];
      return rows.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        agentName: row.agent_name,
        artifactType: row.artifact_type,
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
        createdAt: row.created_at,
      }));
    }
    return [];
  }
}

export const artifactsStore = new ArtifactsStore();
