export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

export interface DiffProposalData {
  filePath: string;
  originalContent: string;
  proposedContent: string;
  diffSummary: string;
}

export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>;
  readDirTree: (dirPath: string) => Promise<FileTreeNode[]>;
  readFile: (filePath: string) => Promise<string>;
  applyDiff: (filePath: string, content: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  getGitStatus: (dirPath: string) => Promise<{ isGit: boolean; output: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
