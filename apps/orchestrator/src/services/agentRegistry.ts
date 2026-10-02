import { AgentCard } from '@a2a/shared-types';
import { config } from '../config';
import { signAgentCard, verifyAgentCardSignature } from '../utils/crypto';
import { pool } from '../db/connection';

export interface AgentRegistryRecord {
  card: AgentCard;
  status: 'active' | 'inactive';
  lastHeartbeat: Date;
  activeConcurrency: number;
}

export class PostgresAgentRegistryService {
  private inMemoryAgents: Map<string, AgentRegistryRecord> = new Map();
  private isPostgresAvailable = false;
  private heartbeatTimeoutMs = 90000; // 90 seconds timeout for stale agents
  private defaultMaxConcurrency = 5; // Default per-agent concurrency cap per SECURITY.md

  constructor() {
    this.initDefaultAgents();
  }

  public setPostgresAvailable(available: boolean): void {
    this.isPostgresAvailable = available;
  }

  private initDefaultAgents(): void {
    const defaultAgents: Array<Omit<AgentCard, 'signature'>> = [
      {
        name: 'coding-worker-agent',
        description: 'Desktop AI coding agent executing code generation, refactoring, sandboxed execution, git operations, and local file diffs',
        version: '1.0.0',
        url: 'http://localhost:4200',
        authentication: { schemes: ['oauth2'] },
        capabilities: { streaming: true, pushNotifications: false },
        maxConcurrency: 5,
        skills: [
          {
            id: 'code-generation',
            name: 'Code Generation & Refactoring',
            description: 'Generates, refactors, and updates code based on instructions and project context',
            inputModes: ['application/json'],
            outputModes: ['application/json'],
          },
          {
            id: 'code-runner',
            name: 'Sandboxed Execution & Debugging',
            description: 'Runs code snippets and tests in a sandboxed environment to inspect output and debug errors',
            inputModes: ['application/json'],
            outputModes: ['application/json'],
          },
          {
            id: 'git-operations',
            name: 'Git Operations',
            description: 'Performs local git commands (status, diff, commit, branch management)',
            inputModes: ['application/json'],
            outputModes: ['application/json'],
          },
          {
            id: 'file-operations',
            name: 'Local Workspace File Operations',
            description: 'Reads and writes files in a selected local project folder',
            inputModes: ['application/json'],
            outputModes: ['application/json'],
          },
          {
            id: 'code-review',
            name: 'Code Review & Explanation',
            description: 'Reviews pull requests, code diffs, and provides explanations/suggestions',
            inputModes: ['application/json'],
            outputModes: ['application/json'],
          },
          {
            id: 'echo',
            name: 'Echo input',
            description: 'Echoes input parameters for testing',
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

  /**
   * Registers or updates an Agent Card.
   * Verifies Agent Card signature before storing it per SECURITY.md ("Agent authenticity").
   */
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
    const now = new Date();

    if (this.isPostgresAvailable) {
      try {
        await pool.query(
          `
          INSERT INTO agents (name, description, version, url, authentication, capabilities, skills, signature, status, last_heartbeat, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW(), NOW())
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            version = EXCLUDED.version,
            url = EXCLUDED.url,
            authentication = EXCLUDED.authentication,
            capabilities = EXCLUDED.capabilities,
            skills = EXCLUDED.skills,
            signature = EXCLUDED.signature,
            status = 'active',
            last_heartbeat = NOW(),
            updated_at = NOW()
        `,
          [
            cardWithConcurrency.name,
            cardWithConcurrency.description || '',
            cardWithConcurrency.version || '1.0.0',
            cardWithConcurrency.url || '',
            JSON.stringify(cardWithConcurrency.authentication || { schemes: [] }),
            JSON.stringify(
              cardWithConcurrency.capabilities || { streaming: false, pushNotifications: false }
            ),
            JSON.stringify(cardWithConcurrency.skills),
            JSON.stringify(cardWithConcurrency.signature || {}),
          ]
        );
      } catch (err) {
        console.warn(
          '[Registry] Postgres insert failed, saving to in-memory fallback:',
          (err as Error).message
        );
        this.saveToMemory(cardWithConcurrency, now);
      }
    } else {
      this.saveToMemory(cardWithConcurrency, now);
    }
  }

  private saveToMemory(card: AgentCard, lastHeartbeat: Date): void {
    const existing = this.inMemoryAgents.get(card.name);
    this.inMemoryAgents.set(card.name, {
      card,
      status: 'active',
      lastHeartbeat,
      activeConcurrency: existing ? existing.activeConcurrency : 0,
    });
  }

  /**
   * Check per-agent concurrency limit per SECURITY.md
   */
  public canAgentAcceptTask(agentName: string): boolean {
    const record = this.inMemoryAgents.get(agentName);
    if (!record) return true;
    const limit = record.card.maxConcurrency || this.defaultMaxConcurrency;
    return record.activeConcurrency < limit;
  }

  public incrementAgentConcurrency(agentName: string): void {
    const record = this.inMemoryAgents.get(agentName);
    if (record) {
      record.activeConcurrency += 1;
    }
  }

  public decrementAgentConcurrency(agentName: string): void {
    const record = this.inMemoryAgents.get(agentName);
    if (record && record.activeConcurrency > 0) {
      record.activeConcurrency -= 1;
    }
  }

  public getAgentConcurrencyStats(agentName: string): { active: number; limit: number } {
    const record = this.inMemoryAgents.get(agentName);
    const limit = record?.card.maxConcurrency || this.defaultMaxConcurrency;
    const active = record?.activeConcurrency || 0;
    return { active, limit };
  }

  public async recordHeartbeat(agentName: string): Promise<boolean> {
    const now = new Date();

    if (this.isPostgresAvailable) {
      try {
        const res = await pool.query(
          `UPDATE agents SET last_heartbeat = NOW(), status = 'active', updated_at = NOW() WHERE name = $1`,
          [agentName]
        );
        if (res.rowCount && res.rowCount > 0) return true;
      } catch (_err) {
        // Fallthrough
      }
    }

    const memRecord = this.inMemoryAgents.get(agentName);
    if (memRecord) {
      memRecord.lastHeartbeat = now;
      memRecord.status = 'active';
      return true;
    }

    return false;
  }

  public async sweepStaleAgents(): Promise<number> {
    let sweptCount = 0;
    const cutoffTime = new Date(Date.now() - this.heartbeatTimeoutMs);

    if (this.isPostgresAvailable) {
      try {
        const res = await pool.query(
          `UPDATE agents SET status = 'inactive', updated_at = NOW() WHERE status = 'active' AND last_heartbeat < $1`,
          [cutoffTime]
        );
        sweptCount += res.rowCount || 0;
      } catch (_err) {
        // Fallthrough
      }
    }

    for (const record of this.inMemoryAgents.values()) {
      if (record.status === 'active' && record.lastHeartbeat < cutoffTime) {
        record.status = 'inactive';
        sweptCount++;
      }
    }

    return sweptCount;
  }

  public async getAllActiveAgents(): Promise<AgentCard[]> {
    await this.sweepStaleAgents();

    if (this.isPostgresAvailable) {
      try {
        const res = await pool.query(
          `SELECT name, description, version, url, authentication, capabilities, skills, signature FROM agents WHERE status = 'active'`
        );
        if (res.rows.length > 0) {
          return res.rows.map((row) => ({
            name: row.name,
            description: row.description,
            version: row.version,
            url: row.url,
            authentication:
              typeof row.authentication === 'string'
                ? JSON.parse(row.authentication)
                : row.authentication,
            capabilities:
              typeof row.capabilities === 'string'
                ? JSON.parse(row.capabilities)
                : row.capabilities,
            skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills,
            signature:
              typeof row.signature === 'string' ? JSON.parse(row.signature) : row.signature,
          }));
        }
      } catch (_err) {
        // Fallthrough
      }
    }

    const activeCards: AgentCard[] = [];
    for (const record of this.inMemoryAgents.values()) {
      if (record.status === 'active') {
        activeCards.push(record.card);
      }
    }
    return activeCards;
  }

  public async findAgentsBySkill(skillId: string): Promise<AgentCard[]> {
    await this.sweepStaleAgents();

    if (this.isPostgresAvailable) {
      try {
        const res = await pool.query(
          `
          SELECT name, description, version, url, authentication, capabilities, skills, signature
          FROM agents
          WHERE status = 'active' AND skills @> $1::jsonb
        `,
          [JSON.stringify([{ id: skillId }])]
        );

        if (res.rows.length > 0) {
          return res.rows.map((row) => ({
            name: row.name,
            description: row.description,
            version: row.version,
            url: row.url,
            authentication:
              typeof row.authentication === 'string'
                ? JSON.parse(row.authentication)
                : row.authentication,
            capabilities:
              typeof row.capabilities === 'string'
                ? JSON.parse(row.capabilities)
                : row.capabilities,
            skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills,
            signature:
              typeof row.signature === 'string' ? JSON.parse(row.signature) : row.signature,
          }));
        }
      } catch (_err) {
        // Fallthrough
      }
    }

    const matchingCards: AgentCard[] = [];
    for (const record of this.inMemoryAgents.values()) {
      if (record.status === 'active' && record.card.skills.some((s) => s.id === skillId)) {
        matchingCards.push(record.card);
      }
    }
    return matchingCards;
  }

  public findAgentBySkillSync(skillId: string): AgentCard | undefined {
    for (const record of this.inMemoryAgents.values()) {
      if (record.status === 'active' && record.card.skills.some((s) => s.id === skillId)) {
        return record.card;
      }
    }
    return undefined;
  }
}

export const agentRegistry = new PostgresAgentRegistryService();
