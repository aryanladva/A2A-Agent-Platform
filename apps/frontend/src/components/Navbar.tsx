'use client';

import React, { useEffect, useState } from 'react';
import { Bot, Cpu, ShieldCheck, Activity } from 'lucide-react';

export const Navbar = () => {
  const [orchestratorHealthy, setOrchestratorHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('http://localhost:4100/health')
      .then((res) => setOrchestratorHealthy(res.ok))
      .catch(() => setOrchestratorHealthy(false));
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand-600 rounded-lg text-white shadow-lg shadow-brand-500/20">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-100 flex items-center gap-2">
              A2A Platform
              <span className="text-xs px-2 py-0.5 rounded bg-brand-900/50 text-brand-300 border border-brand-700/50">
                v1.0.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">Agent2Agent Protocol Task Orchestration</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <Cpu className="h-4 w-4 text-brand-500" />
            <span className="text-slate-300 text-xs font-medium">Orchestrator</span>
            <span
              className={`h-2 w-2 rounded-full ${
                orchestratorHealthy === true
                  ? 'bg-emerald-500 animate-pulse'
                  : orchestratorHealthy === false
                    ? 'bg-rose-500'
                    : 'bg-amber-500 animate-pulse'
              }`}
            />
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-300 text-xs font-medium">OAuth2/JWT Auth</span>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <Activity className="h-4 w-4 text-brand-400" />
            <span className="text-slate-300 text-xs font-medium">Redis Queue</span>
          </div>
        </div>
      </div>
    </header>
  );
};
