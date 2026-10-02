export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: string[];
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
//# sourceMappingURL=index.d.ts.map
