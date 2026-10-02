'use client';

import React from 'react';
import { FolderOpen, Code2, GitBranch, Cpu } from 'lucide-react';


interface ProjectHeaderProps {
  projectPath: string | null;
  onSelectProject: () => void;
  selectedSkill: string;
  onSelectSkill: (skill: string) => void;
  gitStatus?: string;
}

export function ProjectHeader({
  projectPath,
  onSelectProject,
  selectedSkill,
  onSelectSkill,
  gitStatus,
}: ProjectHeaderProps) {
  const skills = [
    { id: 'code-generation', label: 'Code Gen & Refactor' },
    { id: 'code-runner', label: 'Sandboxed Runner' },
    { id: 'git-operations', label: 'Git Ops' },
    { id: 'file-operations', label: 'File Ops' },
    { id: 'code-review', label: 'Code Review' },
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4 select-none">
      {/* App Brand & Project Folder Picker */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-bold text-cyan-400 text-sm tracking-wide">
          <Code2 className="w-5 h-5 text-cyan-400" />
          <span>A2A Coding Agent</span>
          <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded font-mono font-normal">
            DESKTOP
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

        <button
          onClick={onSelectProject}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono rounded shadow transition-all hover:border-cyan-500/50"
        >
          <FolderOpen className="w-4 h-4 text-cyan-400" />
          <span>{projectPath ? projectPath : 'Select Local Project Folder...'}</span>
        </button>

        {gitStatus && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-400 text-[11px] font-mono">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            <span>{gitStatus}</span>
          </div>
        )}
      </div>

      {/* Skill Capabilities Selector */}
      <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded border border-slate-800">
        <span className="text-[10px] font-mono text-slate-500 uppercase px-2 flex items-center gap-1">
          <Cpu className="w-3 h-3 text-cyan-400" /> Skill:
        </span>
        {skills.map((skill) => (
          <button
            key={skill.id}
            onClick={() => onSelectSkill(skill.id)}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              selectedSkill === skill.id
                ? 'bg-cyan-600 text-white font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {skill.label}
          </button>
        ))}
      </div>
    </header>
  );
}
