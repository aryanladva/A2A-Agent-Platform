import { Router, Request, Response } from 'express';
import { getWorkerAgentCard } from '../services/workerAgent';
import { sanitizeLlmInput } from '../security/sanitizer';
import { executeLlmTask } from '../llm/provider';
import { artifactsStore } from '../db/artifacts';
import { config } from '../config';
import { tracer } from '../telemetry/tracer';

const router: Router = Router();

// GET /.well-known/agent.json — Return worker's signed Agent Card
router.get('/.well-known/agent.json', (req: Request, res: Response) => {
  const card = getWorkerAgentCard();
  res.status(200).json(card);
});

// POST /a2a/worker/execute — Execute worker task with OTEL tracing & Input Sanitization
router.post('/a2a/worker/execute', async (req: Request, res: Response) => {
  const { taskId, skill, input, streaming } = req.body || {};

  if (!skill || !input) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'skill and input parameters are required',
    });
    return;
  }

  const incomingTraceparent = (req.headers['traceparent'] as string) || null;
  const span = tracer.startSpan(`Worker Execute ${skill}`, incomingTraceparent, {
    'task.id': taskId || 'unknown',
    'worker.provider': config.llmProvider,
    'worker.is_mock': config.isMock,
  });

  const effectiveTaskId = taskId || `task_worker_${Date.now()}`;

  // Step 1: Sanitize all LLM-facing input before any tool call (SECURITY.md Input handling)
  const sanitization = sanitizeLlmInput(input);

  if (!sanitization.isSafe) {
    console.warn(`[Worker Security Warning] Input sanitization flags:`, sanitization.warnings);
  }

  // Handle SSE streaming execution if requested
  if (streaming) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('traceparent', tracer.formatTraceParent(span));
    res.flushHeaders();

    res.write(
      `data: ${JSON.stringify({
        type: 'status',
        taskId: effectiveTaskId,
        status: 'in_progress',
        message: 'Worker received and sanitized task input',
        traceId: span.traceId,
      })}\n\n`
    );

    const executionResult = await executeLlmTask(
      skill,
      sanitization.sanitized,
      config.isMock,
      config.llmProvider,
      config.llmApiKey
    );

    const card = getWorkerAgentCard();
    const artifact = await artifactsStore.saveArtifact(
      effectiveTaskId,
      card.name,
      'execution_result',
      executionResult.structuredData
    );

    res.write(
      `data: ${JSON.stringify({
        type: 'artifact',
        taskId: effectiveTaskId,
        artifact,
      })}\n\n`
    );

    res.write(
      `data: ${JSON.stringify({
        type: 'completed',
        taskId: effectiveTaskId,
        status: 'completed',
        result: executionResult,
        traceId: span.traceId,
      })}\n\n`
    );

    tracer.endSpan(span, { 'worker.status': 'completed' });
    res.end();
    return;
  }

  // Non-streaming execution
  const executionResult = await executeLlmTask(
    skill,
    sanitization.sanitized,
    config.isMock,
    config.llmProvider,
    config.llmApiKey
  );

  const card = getWorkerAgentCard();
  const artifact = await artifactsStore.saveArtifact(
    effectiveTaskId,
    card.name,
    'execution_result',
    executionResult.structuredData
  );

  tracer.endSpan(span, { 'worker.status': 'completed' });
  res.setHeader('traceparent', tracer.formatTraceParent(span));

  res.status(200).json({
    taskId: effectiveTaskId,
    status: 'completed',
    result: executionResult,
    artifact,
    traceId: span.traceId,
    sanitizationWarnings: sanitization.warnings,
  });
});

// GET /a2a/worker/artifacts/:taskId — Retrieve stored task artifacts
router.get('/a2a/worker/artifacts/:taskId', async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const artifacts = await artifactsStore.getArtifactsByTask(taskId);
  res.status(200).json({
    taskId,
    artifacts,
  });
});

export default router;
