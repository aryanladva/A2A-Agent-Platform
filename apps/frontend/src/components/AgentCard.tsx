'use client';

import React from 'react';
import { AgentCard as AgentCardType } from '@a2a/shared-types';
import { ShieldCheck, Zap, Radio, Code } from 'lucide-react';

interface AgentCardProps {
  agent: AgentCardType;
  onSelectSkill?: (skillId: string) => void;
}

export const AgentCardComponent: React.FC<AgentCardProps> = ({ agent, onSelectSkill }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-brand-500/50 transition-all rounded-xl p-5 shadow-lg flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-800 group-hover:bg-brand-900/50 group-hover:text-brand-400 rounded-lg text-slate-300 transition-colors">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base group-hover:text-brand-400 transition-colors">
                {agent.name}
              </h3>
              <span className="text-xs text-slate-400 font-mono">v{agent.version}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </div>
        </div>

        <p className="text-slate-300 text-xs line-clamp-2 mb-4">{agent.description}</p>

        {/* Capabilities Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {agent.capabilities?.streaming && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              <Radio className="h-3 w-3 text-brand-400" /> SSE Streaming
            </span>
          )}
          {agent.signature && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-emerald-800/40">
              <ShieldCheck className="h-3 w-3 text-emerald-400" /> Signed Card
            </span>
          )}
        </div>

        {/* Advertised Skills */}
        <div className="border-t border-slate-800/80 pt-3">
          <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
            <Code className="h-3.5 w-3.5 text-brand-500" /> Registered Skills (
            {agent.skills?.length || 0})
          </h4>
          <div className="space-y-1.5">
            {agent.skills?.map((skill) => (
              <button
                key={skill.id}
                onClick={() => onSelectSkill && onSelectSkill(skill.id)}
                className="w-full text-left p-2 rounded-lg bg-slate-950/60 hover:bg-brand-950/80 border border-slate-800 hover:border-brand-700/50 transition-all flex items-center justify-between group/skill"
              >
                <div>
                  <div className="text-xs font-medium text-slate-200 group-hover/skill:text-brand-300">
                    {skill.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{skill.id}</div>
                </div>
                <span className="text-[10px] text-brand-400 opacity-0 group-hover/skill:opacity-100 transition-opacity font-medium">
                  Use Skill &rarr;
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 truncate font-mono">
        {agent.url}
      </div>
    </div>
  );
};
