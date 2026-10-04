import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Check, X, FileDiff } from 'lucide-react';
import { DiffProposal } from '../types';

interface DiffViewerProps {
  diffs: DiffProposal[];
  onApprove: (diff: DiffProposal) => void;
  onReject: (diff: DiffProposal) => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffs, onApprove, onReject }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeDiffIndex, setActiveDiffIndex] = useState(0);

  if (diffs.length === 0) return null;

  const currentDiff = diffs[activeDiffIndex] || diffs[0];

  const renderLineDiff = (original: string, proposed: string) => {
    const origLines = original ? original.split('\n') : [];
    const propLines = proposed ? proposed.split('\n') : [];

    return (
      <div className="font-mono text-[13px] leading-5 overflow-x-auto bg-bg p-3 border border-border rounded">
        {/* Removed lines */}
        {origLines.map((line, idx) => (
          <div key={`del-${idx}`} className="flex items-center text-diff-del bg-diff-del/10 px-2 rounded-sm mb-0.5">
            <span className="w-8 select-none text-text-dim text-[11px] font-mono">{idx + 1}</span>
            <span className="w-4 select-none font-bold mr-1">-</span>
            <span>{line}</span>
          </div>
        ))}

        {/* Added lines */}
        {propLines.map((line, idx) => (
          <div key={`add-${idx}`} className="flex items-center text-diff-add bg-diff-add/10 px-2 rounded-sm mb-0.5">
            <span className="w-8 select-none text-text-dim text-[11px] font-mono">{idx + 1}</span>
            <span className="w-4 select-none font-bold mr-1">+</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="border-t border-border bg-surface flex flex-col transition-all duration-200">
      {/* Header bar */}
      <div className="h-9 px-4 flex items-center justify-between border-b border-border bg-bg/60">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-mono text-text hover:text-accent font-medium"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4 text-text-dim" /> : <ChevronUp className="w-4 h-4 text-text-dim" />}
          <FileDiff className="w-3.5 h-3.5 text-accent" />
          <span>Proposed Code Modifications ({diffs.length} file{diffs.length > 1 ? 's' : ''})</span>
        </button>

        {currentDiff && currentDiff.status === 'proposed' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReject(currentDiff)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-diff-del/10 text-diff-del hover:bg-diff-del/20 border border-diff-del/30 text-xs transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
            <button
              onClick={() => onApprove(currentDiff)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-diff-add text-bg font-medium hover:opacity-90 text-xs transition-opacity"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve Changes</span>
            </button>
          </div>
        )}

        {currentDiff && currentDiff.status !== 'proposed' && (
          <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
            currentDiff.status === 'applied' ? 'bg-diff-add/20 text-diff-add' : 'bg-diff-del/20 text-diff-del'
          }`}>
            {currentDiff.status}
          </span>
        )}
      </div>

      {/* Expanded Diff Body */}
      {isExpanded && (
        <div className="p-3 max-h-72 overflow-y-auto flex flex-col gap-3">
          {/* File selector tabs */}
          {diffs.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-border">
              {diffs.map((diff, idx) => (
                <button
                  key={diff.filePath}
                  onClick={() => setActiveDiffIndex(idx)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    activeDiffIndex === idx
                      ? 'bg-accent text-bg font-semibold'
                      : 'text-text-dim hover:text-text bg-bg'
                  }`}
                >
                  {diff.filePath}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs font-mono text-text-dim">
            <span>File: <strong className="text-text">{currentDiff.filePath}</strong></span>
            <span>{currentDiff.diffSummary}</span>
          </div>

          {renderLineDiff(currentDiff.originalContent, currentDiff.proposedContent)}
        </div>
      )}
    </div>
  );
};
