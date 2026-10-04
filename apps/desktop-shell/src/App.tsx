import React, { useState } from 'react';
import { Header } from './components/Header';
import { FileTree } from './components/FileTree';
import { TaskPanel } from './components/TaskPanel';
import { DiffViewer } from './components/DiffViewer';
import { CodingSkillId, DiffProposal, FileTreeNode, TaskMessage, TaskStatusType } from './types';
import { openDirectoryPicker, scanDirectoryTree, applyDiffToDisk } from './services/tauriFs';
import { submitCodingTask } from './services/api';

export const App: React.FC = () => {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [fileNodes, setFileNodes] = useState<FileTreeNode[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<CodingSkillId>('code-generation');

  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [currentStatus, setCurrentStatus] = useState<TaskStatusType | null>(null);
  const [activeDiffs, setActiveDiffs] = useState<DiffProposal[]>([]);

  const handleSelectProject = async () => {
    const selected = await openDirectoryPicker();
    if (selected) {
      setProjectPath(selected);
      const tree = await scanDirectoryTree(selected);
      setFileNodes(tree);
      setMessages([]);
      setActiveDiffs([]);
      setCurrentStatus(null);
    }
  };

  const handleSubmitTask = async (instruction: string) => {
    if (!projectPath) return;

    const userMsg: TaskMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: instruction,
      timestamp: new Date().toLocaleTimeString(),
    };

    const agentMsgId = (Date.now() + 1).toString();
    const initialAgentMsg: TaskMessage = {
      id: agentMsgId,
      role: 'agent',
      content: `Executing ${selectedSkill} task...`,
      timestamp: new Date().toLocaleTimeString(),
      status: 'queued',
    };

    setMessages((prev) => [...prev, userMsg, initialAgentMsg]);
    setCurrentStatus('queued');

    await submitCodingTask(
      {
        skill: selectedSkill,
        projectPath,
        instruction,
      },
      (update) => {
        setCurrentStatus(update.status);

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === agentMsgId) {
              const textContent =
                update.result?.text || update.message || (update.error ? `Error: ${update.error}` : msg.content);
              return {
                ...msg,
                content: textContent,
                status: update.status,
              };
            }
            return msg;
          })
        );

        if (update.result?.diffProposals && update.result.diffProposals.length > 0) {
          setActiveDiffs(update.result.diffProposals);
        }
      }
    );
  };

  const handleApproveDiff = async (diff: DiffProposal) => {
    if (!projectPath) return;
    const success = await applyDiffToDisk(projectPath, diff.filePath, diff.proposedContent);
    if (success) {
      setActiveDiffs((prev) =>
        prev.map((d) => (d.filePath === diff.filePath ? { ...d, status: 'applied' } : d))
      );
      // Refresh directory tree
      const updatedTree = await scanDirectoryTree(projectPath);
      setFileNodes(updatedTree);
    }
  };

  const handleRejectDiff = (diff: DiffProposal) => {
    setActiveDiffs((prev) =>
      prev.map((d) => (d.filePath === diff.filePath ? { ...d, status: 'rejected' } : d))
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-bg text-text overflow-hidden select-none">
      {/* Top Header Bar */}
      <Header
        projectPath={projectPath}
        onSelectProject={handleSelectProject}
        selectedSkill={selectedSkill}
        onSkillChange={setSelectedSkill}
      />

      {/* Main Workspace (Left Sidebar + Center Chat/Task Panel) */}
      <div className="flex-1 flex overflow-hidden">
        <FileTree nodes={fileNodes} />
        
        <TaskPanel
          projectPath={projectPath}
          selectedSkill={selectedSkill}
          messages={messages}
          currentStatus={currentStatus}
          onSubmitTask={handleSubmitTask}
        />
      </div>

      {/* Bottom Diff Viewer (Collapsed by default, expands when pending diffs exist) */}
      <DiffViewer
        diffs={activeDiffs}
        onApprove={handleApproveDiff}
        onReject={handleRejectDiff}
      />
    </div>
  );
};

export default App;
