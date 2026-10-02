'use client';

import React, { useEffect, useState } from 'react';
import { AgentCard } from '@a2a/shared-types';
import { Navbar } from '../components/Navbar';
import { AgentCardComponent } from '../components/AgentCard';
import { ChatInterface } from '../components/ChatInterface';
import { Users, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const orchestratorUrl = 'http://localhost:4100';

  // Client-side dev JWT token matching dev JWT secret payload
  const devToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmcm9udGVuZC1kYXNoYm9hcmQiLCJjbGllbnRJZCI6ImZyb250ZW5kLWRhc2hib2FyZCJ9.signature';

  const [agents, setAgents] = useState<AgentCard[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>('parse-invoice');
  const [loading, setLoading] = useState<boolean>(true);
  const [authToken] = useState<string>(devToken);

  useEffect(() => {
    fetchAgents(devToken);
  }, []);

  const fetchAgents = (token: string) => {
    setLoading(true);
    fetch(`${orchestratorUrl}/a2a/agents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.agents && Array.isArray(data.agents)) {
          setAgents(data.agents);
        }
      })
      .catch((err) => console.error('Failed to fetch agents:', err))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Active Registered Agents Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-400" />
              <h2 className="text-lg font-semibold text-slate-100">Active Registered Agents</h2>
              <span className="text-xs bg-slate-900 border border-slate-800 text-brand-300 px-2.5 py-0.5 rounded-full font-medium">
                {agents.length} Registered
              </span>
            </div>

            <button
              onClick={() => fetchAgents(authToken)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              Registry
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 h-44 animate-pulse"
                />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400 text-xs">
              No active registered agents found. Ensure worker agents are running and registered.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {agents.map((agent) => (
                <AgentCardComponent
                  key={agent.name}
                  agent={agent}
                  onSelectSkill={(skillId) => setSelectedSkill(skillId)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Task Delegation & Live Chat Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12">
            <ChatInterface
              selectedSkill={selectedSkill}
              onSkillChange={(skill) => setSelectedSkill(skill)}
              authToken={authToken}
              orchestratorUrl={orchestratorUrl}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-400">
        Google A2A (Agent2Agent) Protocol Platform Monorepo
      </footer>
    </div>
  );
}
