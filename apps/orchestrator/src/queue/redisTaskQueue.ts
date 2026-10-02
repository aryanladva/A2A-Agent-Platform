import Redis from 'ioredis';
import { config } from '../config';

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

export class RedisTaskQueueService {
  private redisClient: Redis | null = null;
  private isRedisAvailable = false;
  private inMemoryQueue: QueueJob[] = [];
  private inMemoryDlq: DeadLetterJob[] = [];

  private queueKey = 'a2a:task_queue';
  private dlqKey = 'a2a:dead_letter_queue';

  constructor() {
    this.initRedis();
  }

  private initRedis(): void {
    try {
      this.redisClient = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't hang on connection retry if offline
        lazyConnect: true,
      });

      this.redisClient
        .connect()
        .then(() => {
          this.isRedisAvailable = true;
          console.log(`[Queue] Connected to Redis at ${config.redisUrl}`);
        })
        .catch((err) => {
          console.warn(
            '[Queue] Redis connection failed, using in-memory queue fallback:',
            (err as Error).message
          );
          this.isRedisAvailable = false;
        });
    } catch (err) {
      console.warn(
        '[Queue] Unable to initialize Redis client, using in-memory fallback:',
        (err as Error).message
      );
      this.isRedisAvailable = false;
    }
  }

  public async enqueueTask(job: QueueJob): Promise<void> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.rpush(this.queueKey, JSON.stringify(job));
        return;
      } catch (err) {
        console.warn(
          '[Queue] Redis rpush failed, placing in in-memory fallback:',
          (err as Error).message
        );
      }
    }
    this.inMemoryQueue.push(job);
  }

  public async popJob(): Promise<QueueJob | null> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const item = await this.redisClient.lpop(this.queueKey);
        if (item) {
          return JSON.parse(item) as QueueJob;
        }
      } catch (_err) {
        // Fallthrough to memory
      }
    }

    return this.inMemoryQueue.shift() || null;
  }

  public async handleJobFailure(
    job: QueueJob,
    error: Error
  ): Promise<{ status: 'retrying' | 'dead_letter'; attempt: number }> {
    job.attempts += 1;

    if (job.attempts < job.maxRetries) {
      // Re-enqueue for retry with exponential backoff delay simulation
      console.log(
        `[Queue Retry] Task ${job.taskId} failed (Attempt ${job.attempts}/${job.maxRetries}). Retrying...`
      );
      await this.enqueueTask(job);
      return { status: 'retrying', attempt: job.attempts };
    }

    // Max retries exceeded -> move to Dead-Letter Queue (DLQ)
    const dlqJob: DeadLetterJob = {
      ...job,
      failedAt: new Date().toISOString(),
      finalError: error.message || 'Max retries exceeded',
    };

    console.error(
      `[Queue DLQ] Task ${job.taskId} failed after ${job.attempts} attempts. Moved to Dead-Letter Queue.`
    );

    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.rpush(this.dlqKey, JSON.stringify(dlqJob));
      } catch (_err) {
        this.inMemoryDlq.push(dlqJob);
      }
    } else {
      this.inMemoryDlq.push(dlqJob);
    }

    return { status: 'dead_letter', attempt: job.attempts };
  }

  public async getMetrics(): Promise<{
    queued: number;
    deadLetter: number;
    isRedisAvailable: boolean;
  }> {
    let queued = this.inMemoryQueue.length;
    let deadLetter = this.inMemoryDlq.length;

    if (this.isRedisAvailable && this.redisClient) {
      try {
        const qLen = await this.redisClient.llen(this.queueKey);
        const dlqLen = await this.redisClient.llen(this.dlqKey);
        queued = qLen;
        deadLetter = dlqLen;
      } catch (_err) {
        // Fallback to memory count
      }
    }

    return {
      queued,
      deadLetter,
      isRedisAvailable: this.isRedisAvailable,
    };
  }

  public async getDeadLetterJobs(): Promise<DeadLetterJob[]> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const items = await this.redisClient.lrange(this.dlqKey, 0, -1);
        return items.map((item) => JSON.parse(item) as DeadLetterJob);
      } catch (_err) {
        // Fallthrough
      }
    }
    return this.inMemoryDlq;
  }
}

export const redisTaskQueue = new RedisTaskQueueService();
