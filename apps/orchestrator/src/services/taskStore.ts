import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TaskStatus, TaskStatusResponse } from '@a2a/shared-types';
import { getSqliteDb } from '../db/sqlite';

export interface TaskRecord extends TaskStatusResponse {
  skill: string;
  input: Record<string, unknown>;
  streaming: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskEvent {
  type: string;
  task: TaskRecord;
  message?: string;
}

export interface FileChangeRecord {
  id: string;
  taskId: string;
  filePath: string;
  originalContent: string;
  proposedContent: string;
  diffSummary: string;
  status: 'proposed' | 'applied' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export class SqliteTaskStoreService extends EventEmitter {
  public createTask(
    skill: string,
    input: Record<string, unknown>,
    assignedAgent: string,
    streaming = false
  ): TaskRecord {
    const rawId = uuidv4().replace(/-/g, '').substring(0, 12);
    const taskId = `task_${rawId}`;
    const now = new Date().toISOString();

    const initialProgress = [
      {
        timestamp: now,
        message: `Task created and queued for agent ${assignedAgent}`,
      },
    ];

    const db = getSqliteDb();
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, skill, input, assigned_agent, status, progress, result, error, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTask.run(
      taskId,
      skill,
      JSON.stringify(input),
      assignedAgent,
      'queued',
      JSON.stringify(initialProgress),
      null,
      null,
      now,
      now
    );

    const insertEvent = db.prepare(`
      INSERT INTO task_events (id, task_id, timestamp, message, type, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertEvent.run(
      `evt_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
      taskId,
      now,
      `Task created and queued for agent ${assignedAgent}`,
      'created',
      JSON.stringify({ skill, assignedAgent })
    );

    const task: TaskRecord = {
      taskId,
      status: 'queued',
      assignedAgent,
      skill,
      input,
      streaming,
      createdAt: now,
      updatedAt: now,
      progress: initialProgress,
    };

    this.emit(`task:${taskId}`, { type: 'status', task });
    return task;
  }

  public getTask(taskId: string): TaskRecord | undefined {
    const db = getSqliteDb();
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
    if (!row) return undefined;

    return {
      taskId: row.id,
      skill: row.skill,
      input: typeof row.input === 'string' ? JSON.parse(row.input) : row.input,
      assignedAgent: row.assigned_agent,
      status: row.status as TaskStatus,
      progress: row.progress ? JSON.parse(row.progress) : [],
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error || undefined,
      streaming: false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    progressMessage?: string,
    result?: unknown,
    error?: string
  ): TaskRecord | undefined {
    const task = this.getTask(taskId);
    if (!task) return undefined;

    const now = new Date().toISOString();
    task.status = status;
    task.updatedAt = now;

    if (progressMessage) {
      task.progress.push({
        timestamp: now,
        message: progressMessage,
      });
    }

    if (result !== undefined) {
      task.result = result;
    }

    if (error !== undefined) {
      task.error = error;
    }

    const db = getSqliteDb();
    const stmt = db.prepare(`
      UPDATE tasks
      SET status = ?, progress = ?, result = ?, error = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      status,
      JSON.stringify(task.progress),
      task.result !== undefined ? JSON.stringify(task.result) : null,
      task.error || null,
      now,
      taskId
    );

    if (progressMessage) {
      const insertEvent = db.prepare(`
        INSERT INTO task_events (id, task_id, timestamp, message, type, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertEvent.run(
        `evt_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
        taskId,
        now,
        progressMessage,
        status,
        JSON.stringify({ status })
      );
    }

    this.emit(`task:${taskId}`, { type: status, task, message: progressMessage });
    return task;
  }

  public cancelTask(taskId: string): TaskRecord | undefined {
    const task = this.getTask(taskId);
    if (!task) return undefined;

    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      throw new Error(`Task '${taskId}' is already ${task.status} and cannot be cancelled`);
    }

    return this.updateTaskStatus(taskId, 'cancelled', 'Task was cancelled by user');
  }

  public addFileChange(
    taskId: string,
    filePath: string,
    originalContent: string,
    proposedContent: string,
    diffSummary: string
  ): FileChangeRecord {
    const id = `diff_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    const now = new Date().toISOString();
    const db = getSqliteDb();

    const stmt = db.prepare(`
      INSERT INTO file_changes (id, task_id, file_path, original_content, proposed_content, diff_summary, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'proposed', ?, ?)
    `);

    stmt.run(id, taskId, filePath, originalContent, proposedContent, diffSummary, now, now);

    return {
      id,
      taskId,
      filePath,
      originalContent,
      proposedContent,
      diffSummary,
      status: 'proposed',
      createdAt: now,
      updatedAt: now,
    };
  }

  public getFileChange(diffId: string): FileChangeRecord | undefined {
    const db = getSqliteDb();
    const row = db.prepare('SELECT * FROM file_changes WHERE id = ?').get(diffId) as any;
    if (!row) return undefined;

    return {
      id: row.id,
      taskId: row.task_id,
      filePath: row.file_path,
      originalContent: row.original_content,
      proposedContent: row.proposed_content,
      diffSummary: row.diff_summary,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public getFileChangesByTask(taskId: string): FileChangeRecord[] {
    const db = getSqliteDb();
    const rows = db.prepare('SELECT * FROM file_changes WHERE task_id = ?').all(taskId) as any[];

    return rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      filePath: row.file_path,
      originalContent: row.original_content,
      proposedContent: row.proposed_content,
      diffSummary: row.diff_summary,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public updateFileChangeStatus(
    diffId: string,
    status: 'applied' | 'rejected',
    projectPath?: string
  ): FileChangeRecord {
    const db = getSqliteDb();
    const record = this.getFileChange(diffId);
    if (!record) {
      throw new Error(`File change with id '${diffId}' not found`);
    }

    if (record.status !== 'proposed') {
      throw new Error(`File change '${diffId}' has already been ${record.status}`);
    }

    // Disk write happens ONLY after explicit per-file user approval
    if (status === 'applied') {
      const baseDir = projectPath || process.cwd();
      const targetPath = path.resolve(baseDir, record.filePath);
      const parentDir = path.dirname(targetPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(targetPath, record.proposedContent || '', 'utf8');
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE file_changes
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(status, now, diffId);

    record.status = status;
    record.updatedAt = now;
    return record;
  }

  public subscribe(taskId: string, listener: (event: TaskEvent) => void): () => void {
    const eventName = `task:${taskId}`;
    this.on(eventName, listener);
    return () => {
      this.removeListener(eventName, listener);
    };
  }
}

export const taskStore = new SqliteTaskStoreService();
