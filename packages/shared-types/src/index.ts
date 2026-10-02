export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  inputModes?: string[];
  outputModes?: string[];
}

export interface AgentCard {
  name: string;
  description: string;
  version: string;
  url: string;
  authentication: {
    schemes: string[];
  };
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
  };
  skills: AgentSkill[];
  signature?: {
    alg: string;
    value: string;
  };
  maxConcurrency?: number;
}

export interface TaskCreateRequest {
  skill: string;
  input: Record<string, unknown>;
  streaming?: boolean;
}

export type TaskStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface ProgressItem {
  timestamp: string;
  message: string;
}

export interface TaskCreateResponse {
  taskId: string;
  status: TaskStatus;
  assignedAgent: string;
  traceId?: string;
}

export interface TaskStatusResponse {
  taskId: string;
  status: TaskStatus;
  assignedAgent: string;
  progress: ProgressItem[];
  result?: unknown;
  error?: string;
  traceId?: string;
}

export interface OtelSpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  serviceName: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, string | number | boolean>;
}

export interface TaskRequest {
  id: string;
  task: string;
  metadata?: Record<string, unknown>;
}

export interface TaskResponse {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}
