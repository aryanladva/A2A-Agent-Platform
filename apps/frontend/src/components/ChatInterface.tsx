'use client';

import React, { useState } from 'react';
import { Send, Sparkles, AlertCircle } from 'lucide-react';
import { TaskStreamComponent } from './TaskStream';

interface ChatInterfaceProps {
  selectedSkill: string;
  onSkillChange: (skill: string) => void;
  authToken: string;
  orchestratorUrl: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedSkill,
  onSkillChange,
  authToken,
  orchestratorUrl,
}) => {
  const [fileUrl, setFileUrl] = useState<string>('https://example.com/sample-invoice.pdf');
  const [customInputJson, setCustomInputJson] = useState<string>(
    '{\n  "message": "Hello A2A Agent"\n}'
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    let parsedInput: Record<string, unknown> = {};

    if (selectedSkill === 'parse-invoice') {
      parsedInput = {
        fileUrl,
        mimeType: 'application/pdf',
      };
    } else {
      try {
        parsedInput = JSON.parse(customInputJson);
      } catch (_err) {
        setError('Invalid JSON input format');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const response = await fetch(`${orchestratorUrl}/a2a/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          skill: selectedSkill,
          input: parsedInput,
          streaming: true,
        }),
      });

      const data = await response.json();

      if (response.status === 202 && data.taskId) {
        setActiveTaskId(data.taskId);
      } else {
        setError(data.message || data.error || 'Task submission failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Submission Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-brand-400" />
          <h2 className="text-base font-semibold text-slate-100">Submit New Agent Task</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Skill Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Select Agent Skill
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onSkillChange('parse-invoice')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedSkill === 'parse-invoice'
                    ? 'bg-brand-950/80 border-brand-500 text-brand-200 shadow-md shadow-brand-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-xs text-slate-100">parse-invoice</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Invoice extraction & structured parsing
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSkillChange('echo')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedSkill === 'echo'
                    ? 'bg-brand-950/80 border-brand-500 text-brand-200 shadow-md shadow-brand-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-xs text-slate-100">echo</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Debugging & echo task response
                </div>
              </button>
            </div>
          </div>

          {/* Input Fields */}
          {selectedSkill === 'parse-invoice' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Invoice File URL
              </label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://example.com/invoice.pdf"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors font-mono"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Task Input JSON
              </label>
              <textarea
                value={customInputJson}
                onChange={(e) => setCustomInputJson(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-brand-300 font-mono focus:outline-none focus:border-brand-500 transition-colors"
                required
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-800/60 rounded-lg text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Submitting Task...</span>
            ) : (
              <>
                <Send className="h-4 w-4" /> Delegate Task via A2A Orchestrator
              </>
            )}
          </button>
        </form>
      </div>

      {/* Live Stream Component */}
      {activeTaskId && (
        <TaskStreamComponent
          taskId={activeTaskId}
          authToken={authToken}
          orchestratorUrl={orchestratorUrl}
          onClose={() => setActiveTaskId(null)}
        />
      )}
    </div>
  );
};
