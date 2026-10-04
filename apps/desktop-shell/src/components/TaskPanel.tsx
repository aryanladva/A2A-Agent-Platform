import React, { useState } from 'react';
import { Send, Terminal, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { CodingSkillId, TaskMessage, TaskStatusType } from '../types';

interface TaskPanelProps {
  projectPath: string | null;
  selectedSkill: CodingSkillId;
  messages: TaskMessage[];
  currentStatus: TaskStatusType | null;
  onSubmitTask: (instruction: string) => void;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({
  projectPath,
  selectedSkill,
  messages,
  currentStatus,
  onSubmitTask,
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !projectPath) return;
    onSubmitTask(input.trim());
    setInput('');
  };

  const renderStatusBadge = (status: TaskStatusType) => {
    switch (status) {
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-surface text-text-dim border border-border">
            <Clock className="w-3 h-3" /> queued
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/30 font-medium">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" /> running
          </span>
        );
      case 'done':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-diff-add/10 text-diff-add border border-diff-add/30 font-medium">
            <CheckCircle className="w-3 h-3" /> done
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-diff-del/10 text-diff-del border border-diff-del/30 font-medium">
            <AlertCircle className="w-3 h-3" /> failed
          </span>
        );
    }
  };

  if (!projectPath) {
    return (
      <div className="flex-1 bg-bg flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <Terminal className="w-10 h-10 text-text-dim mx-auto mb-3 opacity-60" />
          <p className="text-text-dim text-sm">Select a project folder to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-bg flex flex-col h-full overflow-hidden">
      {/* Streamed Progress Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-text-dim text-xs font-mono py-8 text-center border border-dashed border-border rounded">
            Enter a coding task prompt below (Skill: {selectedSkill})
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3.5 rounded border text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-surface border-border ml-12 text-text'
                  : 'bg-surface/60 border-border mr-12 text-text font-mono'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 text-text-dim text-[11px]">
                <span className="font-semibold uppercase tracking-wider">
                  {msg.role === 'user' ? 'User Instruction' : 'Agent Stream'}
                </span>
                <div className="flex items-center gap-2">
                  <span>{msg.timestamp}</span>
                  {msg.status && renderStatusBadge(msg.status)}
                </div>
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))
        )}
      </div>

      {/* Task Prompt Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-surface flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Describe coding task for skill '${selectedSkill}'...`}
          disabled={currentStatus === 'running'}
          className="flex-1 bg-bg text-text text-xs px-3 py-2 rounded border border-border focus:outline-none focus:border-accent font-sans disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || currentStatus === 'running'}
          className="px-4 py-2 bg-accent text-bg font-medium text-xs rounded hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Execute</span>
        </button>
      </form>
    </div>
  );
};
