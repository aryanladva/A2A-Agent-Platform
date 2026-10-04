import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getSqliteDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.SQLITE_PATH || './data/a2a.sqlite';

  if (dbPath !== ':memory:') {
    const dir = path.dirname(path.resolve(dbPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  initTables(dbInstance);
  return dbInstance;
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      skill TEXT NOT NULL,
      input TEXT NOT NULL,
      assigned_agent TEXT NOT NULL,
      status TEXT NOT NULL,
      progress TEXT,
      result TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_events (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      metadata TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agents (
      name TEXT PRIMARY KEY,
      description TEXT,
      version TEXT,
      url TEXT,
      authentication TEXT,
      capabilities TEXT,
      skills TEXT NOT NULL,
      signature TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      last_heartbeat TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS file_changes (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      original_content TEXT,
      proposed_content TEXT,
      diff_summary TEXT,
      status TEXT NOT NULL DEFAULT 'proposed',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);
    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
    CREATE INDEX IF NOT EXISTS idx_file_changes_task_id ON file_changes(task_id);
  `);
}

export async function initDb(): Promise<boolean> {
  try {
    getSqliteDb();
    console.log('[DB] Embedded SQLite database initialized successfully.');
    return true;
  } catch (err) {
    console.error('[DB] SQLite initialization failed:', (err as Error).message);
    return false;
  }
}
