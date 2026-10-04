export interface QueueJob {
  taskId: string;
  skill: string;
  input: Record<string, unknown>;
  assignedAgent: string;
  attempts: number;
  maxRetries: number;
  createdAt: string;
}

export interface DeadLetterJob extends QueueJob {
  failedAt: string;
  finalError: string;
}

export class LocalTaskQueueService {
  private queue: QueueJob[] = [];
  private dlq: DeadLetterJob[] = [];

  public async enqueueTask(job: QueueJob): Promise<void> {
    this.queue.push(job);
  }

  public async popJob(): Promise<QueueJob | null> {
    return this.queue.shift() || null;
  }

  public async handleJobFailure(
    job: QueueJob,
    error: Error
  ): Promise<{ status: 'retrying' | 'dead_letter'; attempt: number }> {
    job.attempts += 1;

    if (job.attempts < job.maxRetries) {
      console.log(
        `[Queue Retry] Task ${job.taskId} failed (Attempt ${job.attempts}/${job.maxRetries}). Retrying...`
      );
      await this.enqueueTask(job);
      return { status: 'retrying', attempt: job.attempts };
    }

    const dlqJob: DeadLetterJob = {
      ...job,
      failedAt: new Date().toISOString(),
      finalError: error.message || 'Max retries exceeded',
    };

    console.error(
      `[Queue DLQ] Task ${job.taskId} failed after ${job.attempts} attempts. Moved to Dead-Letter Queue.`
    );

    this.dlq.push(dlqJob);
    return { status: 'dead_letter', attempt: job.attempts };
  }

  public async getMetrics(): Promise<{
    queued: number;
    deadLetter: number;
    isRedisAvailable: boolean;
  }> {
    return {
      queued: this.queue.length,
      deadLetter: this.dlq.length,
      isRedisAvailable: false,
    };
  }

  public async getDeadLetterJobs(): Promise<DeadLetterJob[]> {
    return this.dlq;
  }
}

export const localTaskQueue = new LocalTaskQueueService();
export const redisTaskQueue = localTaskQueue;
