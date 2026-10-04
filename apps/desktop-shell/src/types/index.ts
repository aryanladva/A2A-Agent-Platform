export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
}

export type CodingSkillId =
  | 'code-generation'
  | 'code-runner'
  | 'git-operations'
  | 'file-operations'
  | 'code-review';

export interface DiffProposal {
  filePath: string;
  originalContent: string;
  proposedContent: string;
  diffSummary: string;
  status: 'proposed' | 'applied' | 'rejected';
}

export type TaskStatusType = 'queued' | 'running' | 'done' | 'failed';

export interface TaskMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  status?: TaskStatusType;
  diffs?: DiffProposal[];
}
