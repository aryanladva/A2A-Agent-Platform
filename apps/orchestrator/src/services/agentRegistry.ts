import { AgentCard } from '@a2a/shared-types';
import { config } from '../config';
import { signAgentCard, verifyAgentCardSignature } from '../utils/crypto';
import { getSqliteDb } from '../db/sqlite';

export interface AgentRegistryRecord {
  card: AgentCard;
  status: 'active' | 'inactive';
  lastHeartbeat: Date;
  activeConcurrency: number;
}

export class SqliteAgentRegistryService {
  private inMemoryConcurrency: Map<string, number> = new Map();
  private heartbeatTimeoutMs = 90000; // 90s stale threshold
  private defaultMaxConcurrency = 5;

  constructor() {
    this.initDefaultAgents();
  }

  public setPostgresAvailable(_available: boolean): void {
    // No-op for SQLite compatibility
  }

  private initDefaultAgents(): void {
    const baseUrl = 'http://127.0.0.1:4200';
    const defaultAgents: Array<Omit<AgentCard, 'signature'>> = [
      {
        name: 'codegen-agent',
        description: 'CodeGen Agent — generate and refactor code in the selected project',
        version: '1.0.0',
        url: baseUrl,
        authentication: { schemes: [] },
        capabilities: { streaming: true, pushNotifications: false },
        maxConcurrency: 5,
        skills: [
          {
            id: 'code-generation',
            name: 'Code Generation & Refactoring',
            description: 'Generates and refactors code in the selected project folder',
            inputModes: ['application/json'],
            outputModes: ['application/json'],
          },
        ],
      },
      {
        name: 'debug-test-agent',
        description: 'Debug/Test Agent — run tests, analyze failures, suggest fixes',
        version: '1.0.0',
        url: baseUrl,
        authentication: { schemes: [] },
        capabilities: { streaming: true, pushNotifications: false },
        maxConcurrency: 5,
        skills: [
          {
            id: 'code-runner',
            name: 'Sandboxed Test Runner & Debugger',
            description: 'Runs tests, analyzes failures, and suggests fixes in sandboxed context',
            inputModes: ['application/json'],
            outputModes: ['application/json'],
          },
        ],
      },
      {
        name: 'git-ops-agent',
        description: 'Git-ops Agent — status, diff, commit, branch, stage changes',
        version: '1.0.0',
        url: baseUrl,
        authentication: { schemes: [] },
        capabilities: { streaming: true, pushNotifications: false },
        maxConcurrency: 5,
        skills: [
          {
            id: 'git-operations',
            name: 'Git Operations',
            description: 'Performs git status, diff, commit, branch management, and stage changes',
            inputModes: ['application/json'],
            outputModes: ['application/json'],
          },
        ],
      },
      {
        name: 'review-agent',
        description: 'Review Agent — explain code, flag issues, suggest improvements',
        version: '1.0.0',
        url: baseUrl,
        authentication: { schemes: [] },
        capabilities: { streaming: true, pushNotifications: false },
        maxConcurrency: 5,
        skills: [
          {
            id: 'code-review',
            name: 'Code Review & Explanation',
            description: 'Explains code, flags issues, and suggests architectural and security improvements',
            inputModes: ['application/json'],
            outputModes: ['application/json'],
          },
        ],
      },
    ];

    for (const rawCard of defaultAgents) {
      const signedCard = signAgentCard(rawCard, config.agentCardSigningKey);
      this.registerAgent(signedCard, false).catch(() => {});
    }
  }

  public async registerAgent(card: AgentCard, verifySignature = true): Promise<void> {
    if (!card.name || !card.skills || !Array.isArray(card.skills)) {
      throw new Error('Invalid Agent Card schema: name and skills array are required');
    }

    if (verifySignature) {
      const isValid = verifyAgentCardSignature(card, config.agentCardSigningKey);
      if (!isValid) {
        throw new Error(
          'Agent Card signature verification failed: signature is invalid or missing'
        );
      }
    }

    const maxConcurrency = card.maxConcurrency || this.defaultMaxConcurrency;
    const cardWithConcurrency: AgentCard = { ...card, maxConcurrency };
    const now = new Date().toISOString();

    const db = getSqliteDb();
    const stmt = db.prepare(`
      INSERT INTO agents (name, description, version, url, authentication, capabilities, skills, signature, status, last_heartbeat, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        description = excluded.description,
        version = excluded.version,
        url = excluded.url,
        authentication = excluded.authentication,
        capabilities = excluded.capabilities,
        skills = excluded.skills,
        signature = excluded.signature,
        status = 'active',
        last_heartbeat = excluded.last_heartbeat,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      cardWithConcurrency.name,
      cardWithConcurrency.description || '',
      cardWithConcurrency.version || '1.0.0',
      cardWithConcurrency.url || '',
      JSON.stringify(cardWithConcurrency.authentication || { schemes: [] }),
      JSON.stringify(cardWithConcurrency.capabilities || { streaming: false, pushNotifications: false }),
      JSON.stringify(cardWithConcurrency.skills),
      JSON.stringify(cardWithConcurrency.signature || {}),
      now,
      now,
      now
    );
  }

  public canAgentAcceptTask(agentName: string): boolean {
    const active = this.inMemoryConcurrency.get(agentName) || 0;
    const limit = this.defaultMaxConcurrency;
    return active < limit;
  }

  public incrementAgentConcurrency(agentName: string): void {
    const current = this.inMemoryConcurrency.get(agentName) || 0;
    this.inMemoryConcurrency.set(agentName, current + 1);
  }

  public decrementAgentConcurrency(agentName: string): void {
    const current = this.inMemoryConcurrency.get(agentName) || 0;
    if (current > 0) {
      this.inMemoryConcurrency.set(agentName, current - 1);
    }
  }

  public getAgentConcurrencyStats(agentName: string): { active: number; limit: number } {
    const active = this.inMemoryConcurrency.get(agentName) || 0;
    return { active, limit: this.defaultMaxConcurrency };
  }

  public async recordHeartbeat(agentName: string): Promise<boolean> {
    const now = new Date().toISOString();
    const db = getSqliteDb();
    const res = db.prepare("UPDATE agents SET last_heartbeat = ?, status = 'active', updated_at = ? WHERE name = ?").run(now, now, agentName);
    return res.changes > 0;
  }

  public async sweepStaleAgents(): Promise<number> {
    const cutoffTime = new Date(Date.now() - this.heartbeatTimeoutMs).toISOString();
    const now = new Date().toISOString();
    const db = getSqliteDb();
    const res = db.prepare("UPDATE agents SET status = 'inactive', updated_at = ? WHERE status = 'active' AND last_heartbeat < ?").run(now, cutoffTime);
    return res.changes;
  }

  public async getAllActiveAgents(): Promise<AgentCard[]> {
    await this.sweepStaleAgents();
    const db = getSqliteDb();
    const rows = db.prepare("SELECT name, description, version, url, authentication, capabilities, skills, signature FROM agents WHERE status = 'active'").all() as any[];

    return rows.map((row) => ({
      name: row.name,
      description: row.description,
      version: row.version,
      url: row.url,
      authentication: typeof row.authentication === 'string' ? JSON.parse(row.authentication) : row.authentication,
      capabilities: typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities,
      skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills,
      signature: typeof row.signature === 'string' ? JSON.parse(row.signature) : row.signature,
    }));
  }

  public async findAgentsBySkill(skillId: string): Promise<AgentCard[]> {
    const agents = await this.getAllActiveAgents();
    return agents.filter((agent) => agent.skills.some((s) => s.id === skillId));
  }

  public findAgentBySkillSync(skillId: string): AgentCard | undefined {
    const db = getSqliteDb();
    const rows = db.prepare("SELECT name, description, version, url, authentication, capabilities, skills, signature FROM agents WHERE status = 'active'").all() as any[];
    for (const row of rows) {
      const skills = typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills;
      if (Array.isArray(skills) && skills.some((s: any) => s.id === skillId)) {
        return {
          name: row.name,
          description: row.description,
          version: row.version,
          url: row.url,
          authentication: typeof row.authentication === 'string' ? JSON.parse(row.authentication) : row.authentication,
          capabilities: typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities,
          skills,
          signature: typeof row.signature === 'string' ? JSON.parse(row.signature) : row.signature,
        };
      }
    }
    return undefined;
  }
}

export const agentRegistry = new SqliteAgentRegistryService();
