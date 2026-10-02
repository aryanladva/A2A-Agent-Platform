import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { TaskStatus, TaskStatusResponse } from '@a2a/shared-types';

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

export class TaskStoreService extends EventEmitter {
  private tasks: Map<string, TaskRecord> = new Map();

  public createTask(
    skill: string,
    input: Record<string, unknown>,
    assignedAgent: string,
    streaming = false
  ): TaskRecord {
    const rawId = uuidv4().replace(/-/g, '').substring(0, 12);
    const taskId = `task_${rawId}`;
    const now = new Date().toISOString();

    const task: TaskRecord = {
      taskId,
      status: 'queued',
      assignedAgent,
      skill,
      input,
      streaming,
      createdAt: now,
      updatedAt: now,
      progress: [
        {
          timestamp: now,
          message: `Task created and queued for agent ${assignedAgent}`,
        },
      ],
    };

    this.tasks.set(taskId, task);
    this.emit(`task:${taskId}`, { type: 'status', task });

    return task;
  }

  public getTask(taskId: string): TaskRecord | undefined {
    return this.tasks.get(taskId);
  }

  public updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    progressMessage?: string,
    result?: unknown,
    error?: string
  ): TaskRecord | undefined {
    const task = this.tasks.get(taskId);
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

    this.tasks.set(taskId, task);
    this.emit(`task:${taskId}`, { type: status, task, message: progressMessage });

    return task;
  }

  public cancelTask(taskId: string): TaskRecord | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      throw new Error(`Task '${taskId}' is already ${task.status} and cannot be cancelled`);
    }

    return this.updateTaskStatus(taskId, 'cancelled', 'Task was cancelled by user');
  }

  public subscribe(taskId: string, listener: (event: TaskEvent) => void): () => void {
    const eventName = `task:${taskId}`;
    this.on(eventName, listener);
    return () => {
      this.removeListener(eventName, listener);
    };
  }
}

export const taskStore = new TaskStoreService();
