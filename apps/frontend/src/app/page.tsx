'use client';

import React, { useState } from 'react';


import { ProjectHeader } from '../components/ProjectHeader';
import { FileTree } from '../components/FileTree';
import { DiffViewer } from '../components/DiffViewer';
import { CodingChat } from '../components/CodingChat';
import { FileTreeNode, DiffProposalData } from '../types/desktop';

export default function DesktopCodingPage() {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | undefined>(undefined);
  const [selectedSkill, setSelectedSkill] = useState<string>('code-generation');
  const [pendingProposal, setPendingProposal] = useState<DiffProposalData | null>(null);
  const [gitStatus, setGitStatus] = useState<string>('main');

  const handleSelectProjectFolder = async () => {
    if (window.electronAPI) {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        setProjectPath(selected);
        loadProjectTree(selected);
        loadGitStatus(selected);
      }
    } else {
      // Browser fallback demo folder
      const demoPath = 'C:/Users/Developer/Projects/A2A-Coding-App';
      setProjectPath(demoPath);
      setFileTree([
        {
          name: 'src',
          path: `${demoPath}/src`,
          type: 'directory',
          children: [
            { name: 'index.ts', path: `${demoPath}/src/index.ts`, type: 'file' },
            { name: 'app.ts', path: `${demoPath}/src/app.ts`, type: 'file' },
          ],
        },
        { name: 'package.json', path: `${demoPath}/package.json`, type: 'file' },
        { name: 'README.md', path: `${demoPath}/README.md`, type: 'file' },
      ]);
    }
  };

  const loadProjectTree = async (dirPath: string) => {
    if (window.electronAPI) {
      const nodes = await window.electronAPI.readDirTree(dirPath);
      setFileTree(nodes);
    }
  };

  const loadGitStatus = async (dirPath: string) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.getGitStatus(dirPath);
      setGitStatus(res.isGit ? 'main (clean)' : 'Not a git repo');
    }
  };

  const handleApplyDiffToDisk = async (proposal: DiffProposalData) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.applyDiff(proposal.filePath, proposal.proposedContent);
      if (res.success) {
        alert(`Successfully applied code changes to ${proposal.filePath}!`);
        if (projectPath) loadProjectTree(projectPath);
        setPendingProposal(null);
      } else {
        alert(`Error applying code changes: ${res.error}`);
      }
    } else {
      alert(`Applied proposed changes to ${proposal.filePath} (Simulated in web preview)`);
      setPendingProposal(null);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Project Bar */}
      <ProjectHeader
        projectPath={projectPath}
        onSelectProject={handleSelectProjectFolder}
        selectedSkill={selectedSkill}
        onSelectSkill={(skill) => setSelectedSkill(skill)}
        gitStatus={gitStatus}
      />

      {/* Main Desktop 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: File Tree Workspace (280px) */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col overflow-hidden">
          <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            Workspace Files
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileTree
              nodes={fileTree}
              onSelectFile={(filePath) => setSelectedFile(filePath)}
              selectedFile={selectedFile}
            />
          </div>
        </aside>

        {/* Center Column: Diff & Code Review Workspace */}
        <main className="flex-1 p-4 bg-slate-950 overflow-hidden flex flex-col">
          <DiffViewer
            proposal={pendingProposal}
            onApply={handleApplyDiffToDisk}
            onReject={() => setPendingProposal(null)}
          />
        </main>

        {/* Right Column: Coding Assistant Panel (380px) */}
        <aside className="w-96 bg-slate-950 border-l border-slate-800 flex flex-col overflow-hidden">
          <CodingChat
            projectPath={projectPath}
            selectedSkill={selectedSkill}
            onDiffProposed={(proposal) => setPendingProposal(proposal)}
          />
        </aside>
      </div>

      {/* Footer Status Bar */}
      <footer className="bg-slate-950 border-t border-slate-800 px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <span>Engine: Desktop App (Electron)</span>
          <span>Orchestrator: http://localhost:4100</span>
          <span>Worker: http://localhost:4200</span>
        </div>
        <div>Scope: AI Coding Agent (Sandboxed Execution & Diff Review)</div>
      </footer>
    </div>
  );
}
