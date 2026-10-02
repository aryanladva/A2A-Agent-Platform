'use client';

import React, { useState } from 'react';
import { Folder, FileText, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import { FileTreeNode } from '../types/desktop';

interface FileTreeProps {
  nodes: FileTreeNode[];
  onSelectFile: (filePath: string) => void;
  selectedFile?: string;
}

function TreeNode({ node, onSelectFile, selectedFile }: { node: FileTreeNode; onSelectFile: (filePath: string) => void; selectedFile?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (node.type === 'directory') {
    return (
      <div className="select-none">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 py-1 px-2 hover:bg-slate-800/60 rounded cursor-pointer text-slate-300 hover:text-white text-xs font-mono transition-colors"
        >
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          {isOpen ? <FolderOpen className="w-4 h-4 text-cyan-400" /> : <Folder className="w-4 h-4 text-cyan-400" />}
          <span className="truncate">{node.name}</span>
        </div>
        {isOpen && node.children && (
          <div className="pl-3.5 border-l border-slate-800/80 ml-2 mt-0.5">
            {node.children.map((childNode, idx) => (
              <TreeNode key={`${childNode.path}-${idx}`} node={childNode} onSelectFile={onSelectFile} selectedFile={selectedFile} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedFile === node.path;

  return (
    <div
      onClick={() => onSelectFile(node.path)}
      className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer text-xs font-mono transition-colors ${
        isSelected ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
      <span className="truncate">{node.name}</span>
    </div>
  );
}

export function FileTree({ nodes, onSelectFile, selectedFile }: FileTreeProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 text-xs font-mono">
        No project directory loaded.<br />Click "Select Project Folder" to browse.
      </div>
    );
  }

  return (
    <div className="space-y-0.5 p-2 overflow-y-auto max-h-full">
      {nodes.map((node, idx) => (
        <TreeNode key={`${node.path}-${idx}`} node={node} onSelectFile={onSelectFile} selectedFile={selectedFile} />
      ))}
    </div>
  );
}
