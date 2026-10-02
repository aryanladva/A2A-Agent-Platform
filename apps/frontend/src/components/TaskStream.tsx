'use client';

import React, { useEffect, useState } from 'react';
import { TaskStatusResponse, ProgressItem } from '@a2a/shared-types';
import { Clock, CheckCircle2, AlertTriangle, Loader2, XCircle, FileCode } from 'lucide-react';

interface TaskStreamProps {
  taskId: string;
  authToken: string;
  orchestratorUrl: string;
  onClose?: () => void;
}

export const TaskStreamComponent: React.FC<TaskStreamProps> = ({
  taskId,
  authToken,
  orchestratorUrl,
  onClose,
}) => {
  const [taskData, setTaskData] = useState<TaskStatusResponse | null>(null);
  const [progressEvents, setProgressEvents] = useState<ProgressItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;

    // Fetch initial status
    fetch(`${orchestratorUrl}/a2a/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.taskId) {
          setTaskData(data);
          if (data.progress) setProgressEvents(data.progress);
        }
      })
      .catch((err) => setError(err.message));

    // Connect to SSE Stream endpoint
    const sseUrl = `${orchestratorUrl}/a2a/tasks/${taskId}/stream`;
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);

          if (parsed.task) {
            setTaskData(parsed.task);
            if (parsed.task.progress) setProgressEvents(parsed.task.progress);
          } else if (parsed.type === 'status' || parsed.type === 'in_progress') {
            if (parsed.progress) setProgressEvents(parsed.progress);
          } else if (parsed.type === 'completed' || parsed.type === 'failed') {
            if (parsed.task) setTaskData(parsed.task);
            if (eventSource) eventSource.close();
          }
        } catch (_e) {
          // Fallback parsing
        }
      };

      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
      };
    } catch (_err) {
      // Fallthrough
    }

    // Polling fallback interval every 2 seconds until task finishes
    const interval = setInterval(() => {
      fetch(`${orchestratorUrl}/a2a/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.taskId) {
            setTaskData(data);
            if (data.progress) setProgressEvents(data.progress);
          }
        })
        .catch(() => {});
    }, 2000);

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [taskId, authToken, orchestratorUrl]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60">
            <Clock className="h-3.5 w-3.5 animate-spin" /> Queued
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-950/80 text-brand-300 border border-brand-700/60">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/60">
            <AlertTriangle className="h-3.5 w-3.5" /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="h-3.5 w-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const resultFormatted = taskData?.result ? JSON.stringify(taskData.result, null, 2) : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-200">Live Task Stream</h3>
            <span className="text-xs font-mono bg-slate-950 text-brand-400 px-2 py-0.5 rounded border border-slate-800">
              {taskId}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Assigned Worker Agent:{' '}
            <span className="text-slate-200 font-medium">
              {taskData?.assignedAgent || 'Assigning...'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge(taskData?.status)}
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-lg text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Progress Timeline */}
      <div>
        <h4 className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-brand-400" /> Progress Events Timeline
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {progressEvents.length === 0 ? (
            <div className="text-xs text-slate-400 italic">Waiting for progress events...</div>
          ) : (
            progressEvents.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
              >
                <span className="h-2 w-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-slate-200">{item.message}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Result Artifact Display */}
      {resultFormatted && (
        <div className="border-t border-slate-800 pt-4">
          <h4 className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1.5">
            <FileCode className="h-3.5 w-3.5 text-emerald-400" /> Output Result Artifact
          </h4>
          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto max-h-60">
            {resultFormatted}
          </pre>
        </div>
      )}
    </div>
  );
};
