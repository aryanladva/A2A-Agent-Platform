import { CodingSkillId, DiffProposal, TaskStatusType } from '../types';

const GATEWAY_URL = 'http://127.0.0.1:4000';
const ORCHESTRATOR_URL = 'http://127.0.0.1:4100';

export interface SubmitTaskRequest {
  skill: CodingSkillId;
  projectPath: string;
  instruction: string;
  targetFile?: string;
}

export interface TaskStreamUpdate {
  status: TaskStatusType;
  message?: string;
  result?: {
    text?: string;
    diffProposals?: DiffProposal[];
    structuredData?: Record<string, unknown>;
  };
  error?: string;
}

export interface ServiceStatusInfo {
  name: string;
  port: number;
  pid?: number;
  status: string;
  healthy: boolean;
  restarts: number;
}

export async function fetchSupervisorStatus(): Promise<ServiceStatusInfo[]> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const statuses = await invoke<ServiceStatusInfo[]>('get_services_status');
    return statuses;
  } catch (_err) {
    // Web fallback for browser development environment
    return [
      { name: 'orchestrator', port: 4100, status: 'running', healthy: true, restarts: 0 },
      { name: 'agent-worker', port: 4200, status: 'running', healthy: true, restarts: 0 },
      { name: 'gateway', port: 4000, status: 'running', healthy: true, restarts: 0 },
    ];
  }
}

export async function submitCodingTask(
  req: SubmitTaskRequest,
  onUpdate: (update: TaskStreamUpdate) => void
): Promise<void> {
  try {
    // 1. POST task to Orchestrator
    const response = await fetch(`${ORCHESTRATOR_URL}/a2a/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill: req.skill,
        input: {
          projectPath: req.projectPath,
          instruction: req.instruction,
          targetFile: req.targetFile,
        },
        streaming: true,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Server returned status ${response.status}`);
    }

    const { taskId } = await response.json();
    onUpdate({ status: 'queued', message: `Task ${taskId} enqueued...` });

    // 2. Poll / Stream status
    let completed = false;
    let attempts = 0;

    while (!completed && attempts < 30) {
      attempts++;
      await new Promise((r) => setTimeout(r, 1000));

      const pollRes = await fetch(`${ORCHESTRATOR_URL}/a2a/tasks/${taskId}`);
      if (pollRes.ok) {
        const data = await pollRes.json();

        if (data.status === 'in_progress') {
          onUpdate({ status: 'running', message: 'Task is executing...' });
        } else if (data.status === 'completed') {
          completed = true;
          onUpdate({
            status: 'done',
            message: 'Task completed successfully',
            result: data.result,
          });
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          completed = true;
          onUpdate({
            status: 'failed',
            error: data.error || 'Task failed to complete',
          });
        }
      }
    }
  } catch (err) {
    onUpdate({
      status: 'failed',
      error: (err as Error).message || 'Failed to submit task',
    });
  }
}
