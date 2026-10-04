import React, { useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import { FileTreeNode } from '../types';

interface FileTreeProps {
  nodes: FileTreeNode[];
  onSelectFile?: (filePath: string) => void;
}

const FileTreeNodeItem: React.FC<{ node: FileTreeNode; onSelectFile?: (path: string) => void }> = ({
  node,
  onSelectFile,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (node.isDirectory) {
    return (
      <div className="select-none">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 hover:bg-surface rounded cursor-pointer text-text-dim hover:text-text font-mono text-xs"
        >
          {isOpen ? <ChevronDown className="w-3 h-3 text-text-dim" /> : <ChevronRight className="w-3 h-3 text-text-dim" />}
          <Folder className="w-3.5 h-3.5 text-accent" />
          <span>{node.name}</span>
        </div>
        {isOpen && node.children && (
          <div className="pl-3 border-l border-border/50 ml-2">
            {node.children.map((child) => (
              <FileTreeNodeItem key={child.path} node={child} onSelectFile={onSelectFile} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelectFile && onSelectFile(node.path)}
      className="flex items-center gap-1.5 px-2 py-1 hover:bg-surface rounded cursor-pointer text-text-dim hover:text-text font-mono text-xs ml-4"
    >
      <File className="w-3.5 h-3.5 text-text-dim" />
      <span>{node.name}</span>
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ nodes, onSelectFile }) => {
  return (
    <aside className="w-64 bg-bg border-r border-border flex flex-col h-full">
      <div className="p-3 border-b border-border text-xs font-semibold uppercase tracking-wider text-text-dim flex justify-between items-center">
        <span>Project Files</span>
      </div>
      <div className="p-2 overflow-y-auto flex-1">
        {nodes.length === 0 ? (
          <p className="text-text-dim text-xs italic px-2 py-4">No project folder selected.</p>
        ) : (
          nodes.map((node) => (
            <FileTreeNodeItem key={node.path} node={node} onSelectFile={onSelectFile} />
          ))
        )}
      </div>
    </aside>
  );
};
