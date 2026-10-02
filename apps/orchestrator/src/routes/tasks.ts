import { Router, Request, Response } from 'express';
import { agentRegistry } from '../services/agentRegistry';
import { taskStore, TaskEvent } from '../services/taskStore';
import { redisTaskQueue } from '../queue/redisTaskQueue';
import { queueProcessor } from '../queue/queueProcessor';

const router: Router = Router();

// Start queue consumer loop
queueProcessor.start();

// POST /a2a/tasks — Create/delegate a task via Redis task queue
router.post('/a2a/tasks', async (req: Request, res: Response) => {
  const { skill, input, streaming } = req.body || {};

  if (!skill || typeof skill !== 'string' || !input || typeof input !== 'object') {
    res.status(400).json({
      error: 'malformed_request',
      message: 'Malformed request: skill (string) and input (object) are required',
    });
    return;
  }

  // Route task to matching active worker agent based on skill
  const matchingAgents = await agentRegistry.findAgentsBySkill(skill);
  const matchingAgent = matchingAgents[0] || agentRegistry.findAgentBySkillSync(skill);

  if (!matchingAgent) {
    res.status(404).json({
      error: 'agent_not_found',
      message: `No active registered worker agent found for skill '${skill}'`,
    });
    return;
  }

  // Step 1: Create task record with status 'queued' per API_SPEC.md
  const task = taskStore.createTask(skill, input, matchingAgent.name, Boolean(streaming));

  // Step 2: Enqueue job in Redis Task Queue for async delegation
  await redisTaskQueue.enqueueTask({
    taskId: task.taskId,
    skill,
    input,
    assignedAgent: matchingAgent.name,
    attempts: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  });

  res.status(202).json({
    taskId: task.taskId,
    status: task.status,
    assignedAgent: task.assignedAgent,
  });
});

// GET /a2a/tasks/:taskId — Poll task status
router.get('/a2a/tasks/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = taskStore.getTask(taskId);

  if (!task) {
    res.status(404).json({
      error: 'task_not_found',
      message: `Task with id '${taskId}' not found`,
    });
    return;
  }

  res.status(200).json({
    taskId: task.taskId,
    status: task.status,
    assignedAgent: task.assignedAgent,
    progress: task.progress,
    result: task.result,
    error: task.error,
  });
});

// POST /a2a/tasks/:taskId/cancel — Cancel a queued or in_progress task (per API_SPEC.md)
router.post('/a2a/tasks/:taskId/cancel', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const existingTask = taskStore.getTask(taskId);

  if (!existingTask) {
    res.status(404).json({
      error: 'task_not_found',
      message: `Task with id '${taskId}' not found`,
    });
    return;
  }

  try {
    const cancelledTask = taskStore.cancelTask(taskId);
    res.status(200).json({
      taskId: cancelledTask?.taskId,
      status: cancelledTask?.status,
      message: 'Task cancelled successfully',
    });
  } catch (err) {
    // Return 409 Task already completed/cancelled per API_SPEC.md
    res.status(409).json({
      error: 'task_conflict',
      message: (err as Error).message,
    });
  }
});

// GET /a2a/tasks/:taskId/stream — SSE stream
router.get('/a2a/tasks/:taskId/stream', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = taskStore.getTask(taskId);

  if (!task) {
    res.status(404).json({
      error: 'task_not_found',
      message: `Task with id '${taskId}' not found`,
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(
    `data: ${JSON.stringify({
      type: 'status',
      taskId: task.taskId,
      status: task.status,
      assignedAgent: task.assignedAgent,
      progress: task.progress,
    })}\n\n`
  );

  const unsubscribe = taskStore.subscribe(taskId, (event: TaskEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);

    if (event.type === 'completed' || event.type === 'failed' || event.type === 'cancelled') {
      unsubscribe();
      res.end();
    }
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// GET /a2a/queue/metrics — Queue & DLQ status
router.get('/a2a/queue/metrics', async (req: Request, res: Response) => {
  const metrics = await redisTaskQueue.getMetrics();
  res.status(200).json(metrics);
});

// GET /a2a/queue/dead-letter — Dead-letter queue inspection
router.get('/a2a/queue/dead-letter', async (req: Request, res: Response) => {
  const dlq = await redisTaskQueue.getDeadLetterJobs();
  res.status(200).json({
    count: dlq.length,
    jobs: dlq,
  });
});

export default router;
