'use client';

import React, { useState } from 'react';
import { Check, X, FileCode, ArrowRight, ShieldCheck } from 'lucide-react';
import { DiffProposalData } from '../types/desktop';

interface DiffViewerProps {
  proposal: DiffProposalData | null;
  onApply: (proposal: DiffProposalData) => void;
  onReject: () => void;
}

export function DiffViewer({ proposal, onApply, onReject }: DiffViewerProps) {
  const [isApplied, setIsApplied] = useState(false);

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 border border-dashed border-slate-800 rounded-lg bg-slate-900/40">
        <FileCode className="w-12 h-12 mb-3 text-slate-700" />
        <p className="text-sm font-medium">No pending code diff proposals</p>
        <p className="text-xs text-slate-600 mt-1 text-center">
          When the AI agent generates or refactors code, proposed changes will appear here for your review before writing to disk.
        </p>
      </div>
    );
  }

  const handleApply = () => {
    setIsApplied(true);
    onApply(proposal);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* Diff Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-slate-200">{proposal.filePath}</span>
          <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
            Diff Proposal
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5 text-rose-400" />
            Reject
          </button>
          <button
            onClick={handleApply}
            disabled={isApplied}
            className={`flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded shadow transition-all ${
              isApplied
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40'
            }`}
          >
            {isApplied ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Applied to Disk
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Apply Changes to Disk
              </>
            )}
          </button>
        </div>
      </div>

      {/* Diff Summary Bar */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/60 text-xs font-mono text-cyan-300">
        {proposal.diffSummary}
      </div>

      {/* Side-by-Side Content Comparison */}
      <div className="grid grid-cols-2 flex-1 overflow-hidden divide-x divide-slate-800 bg-slate-950 font-mono text-xs">
        {/* Original Content */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="px-3 py-1.5 bg-rose-950/30 border-b border-rose-900/30 text-rose-400 text-[11px] font-semibold">
            Original (Local Disk)
          </div>
          <pre className="p-4 overflow-auto flex-1 text-slate-400 leading-relaxed">
            {proposal.originalContent || '// (Empty or new file)'}
          </pre>
        </div>

        {/* Proposed Content */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="px-3 py-1.5 bg-emerald-950/30 border-b border-emerald-900/30 text-emerald-400 text-[11px] font-semibold flex items-center justify-between">
            <span>Proposed AI Code</span>
            <ArrowRight className="w-3 h-3 text-emerald-400" />
          </div>
          <pre className="p-4 overflow-auto flex-1 text-emerald-200/90 leading-relaxed bg-emerald-950/10">
            {proposal.proposedContent}
          </pre>
        </div>
      </div>
    </div>
  );
}
