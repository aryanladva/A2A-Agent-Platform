'use client';

import React, { useState } from 'react';
import { Send, Terminal, Loader2, Sparkles } from 'lucide-react';

import { DiffProposalData } from '../types/desktop';

interface CodingChatProps {
  projectPath: string | null;
  selectedSkill: string;
  onDiffProposed: (proposal: DiffProposalData) => void;
}

export function CodingChat({ projectPath, selectedSkill, onDiffProposed }: CodingChatProps) {
  const [instruction, setInstruction] = useState('');
  const [targetFile, setTargetFile] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string; type?: string }>>([]);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isLoading) return;

    setIsLoading(true);
    setLastResponse(null);
    const newLog = { timestamp: new Date().toLocaleTimeString(), message: `Submitting task (${selectedSkill})...` };
    setLogs((prev) => [...prev, newLog]);

    try {
      // Step 1: Acquire Gateway Auth Token
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:4000';
      const tokenRes = await fetch(`${gatewayUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'your-oauth-client-id',
          client_secret: 'your-oauth-client-secret',
        }),
      });

      if (!tokenRes.ok) {
        throw new Error('Failed to authenticate with Gateway');
      }

      const { access_token } = await tokenRes.json();

      // Step 2: Submit task to Orchestrator via Gateway / Orchestrator
      const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:4100';
      const taskRes = await fetch(`${orchestratorUrl}/a2a/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          skill: selectedSkill,
          input: {
            instruction,
            targetFile: targetFile || 'src/index.ts',
            projectPath: projectPath || 'c:/workspace/project',
          },
          streaming: true,
        }),
      });

      if (!taskRes.ok) {
        const errorData = await taskRes.json();
        throw new Error(errorData.message || 'Task delegation failed');
      }

      const { taskId } = await taskRes.json();
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), message: `Task accepted (ID: ${taskId}). Subscribing to live SSE stream...` },
      ]);

      // Step 3: Stream Live SSE Progress
      const eventSource = new EventSource(`${orchestratorUrl}/a2a/tasks/${taskId}/stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'status') {
            setLogs((prev) => [
              ...prev,
              { timestamp: new Date().toLocaleTimeString(), message: `Status: ${data.status} — ${data.assignedAgent || ''}` },
            ]);
          } else if (data.type === 'completed' || data.status === 'completed') {
            setLogs((prev) => [
              ...prev,
              { timestamp: new Date().toLocaleTimeString(), message: `Task completed successfully.` },
            ]);

            if (data.result?.text) {
              setLastResponse(data.result.text);
            }

            if (data.result?.diffProposals && data.result.diffProposals.length > 0) {
              onDiffProposed(data.result.diffProposals[0]);
            } else if (selectedSkill === 'code-generation') {
              // Simulated diff proposal for visual review
              onDiffProposed({
                filePath: targetFile || 'src/index.ts',
                originalContent: '// Original local content\n',
                proposedContent: `// Generated Code Proposal\n// Instruction: ${instruction}\n\nexport function executeCodingTask() {\n  return "Execution complete";\n}\n`,
                diffSummary: `+ Proposed changes for ${targetFile || 'src/index.ts'}`,
              });
            }

            eventSource.close();
            setIsLoading(false);
          }
        } catch (_err) {
          // Parse fallthrough
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsLoading(false);
      };
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), message: `Error: ${(err as Error).message}`, type: 'error' },
      ]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-slate-800 overflow-hidden select-none">
      {/* Panel Header */}
      <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-slate-200">AI Coding Assistant</span>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">
          Skill: {selectedSkill}
        </span>
      </div>

      {/* Task Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-slate-800 space-y-3 bg-slate-900/30">
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1">Target File (Optional):</label>
          <input
            type="text"
            placeholder="e.g. src/utils/logger.ts"
            value={targetFile}
            onChange={(e) => setTargetFile(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1">Instruction / Prompt:</label>
          <textarea
            rows={3}
            placeholder="e.g. Refactor error handling and add structured logger..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !instruction.trim()}
          className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs rounded shadow flex items-center justify-center gap-2 transition-all shadow-cyan-900/30"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Executing Coding Task...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Send Coding Request</span>
            </>
          )}
        </button>
      </form>

      {/* Live Stream Logs Output */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 bg-slate-950">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Live Progress Log Stream</span>
        </div>

        {logs.length === 0 ? (
          <div className="text-slate-600 text-[11px] italic">No execution logs yet. Send a coding request to stream progress live.</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`p-2 rounded border text-[11px] ${
                log.type === 'error'
                  ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
              }`}
            >
              <span className="text-slate-500 mr-2">[{log.timestamp}]</span>
              <span>{log.message}</span>
            </div>
          ))
        )}

        {lastResponse && (
          <div className="mt-4 p-3 bg-cyan-950/30 border border-cyan-900/60 rounded text-cyan-200 text-xs leading-relaxed whitespace-pre-wrap">
            <div className="font-bold text-cyan-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Output Result:
            </div>
            {lastResponse}
          </div>
        )}
      </div>
    </div>
  );
}
