import React from 'react';
import { FolderOpen, Code2, Terminal, GitBranch, FileCode, CheckCircle2 } from 'lucide-react';
import { CodingSkillId } from '../types';

interface HeaderProps {
  projectPath: string | null;
  onSelectProject: () => void;
  selectedSkill: CodingSkillId;
  onSkillChange: (skill: CodingSkillId) => void;
}

export const Header: React.FC<HeaderProps> = ({
  projectPath,
  onSelectProject,
  selectedSkill,
  onSkillChange,
}) => {
  const skills: { id: CodingSkillId; label: string; icon: React.ReactNode }[] = [
    { id: 'code-generation', label: 'Code Generation', icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: 'code-runner', label: 'Code Runner', icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: 'git-operations', label: 'Git Operations', icon: <GitBranch className="w-3.5 h-3.5" /> },
    { id: 'file-operations', label: 'File Operations', icon: <FileCode className="w-3.5 h-3.5" /> },
    { id: 'code-review', label: 'Code Review', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="h-12 bg-surface border-b border-border px-4 flex items-center justify-between text-xs">
      <div className="flex items-center gap-3">
        <span className="font-mono text-accent font-semibold tracking-wide">A2A CODING AGENT</span>
        
        <button
          onClick={onSelectProject}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-bg border border-border hover:border-accent text-text rounded transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5 text-accent" />
          <span>{projectPath ? 'Change Folder' : 'Select Project Folder'}</span>
        </button>

        {projectPath && (
          <span className="font-mono text-text-dim truncate max-w-md bg-bg px-2 py-0.5 rounded border border-border">
            {projectPath}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 bg-bg p-1 rounded border border-border">
        {skills.map((s) => (
          <button
            key={s.id}
            onClick={() => onSkillChange(s.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              selectedSkill === s.id
                ? 'bg-accent text-bg font-medium'
                : 'text-text-dim hover:text-text hover:bg-surface'
            }`}
          >
            {s.icon}
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};
