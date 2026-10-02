import crypto from 'crypto';
import { AgentCard } from '@a2a/shared-types';
import { config } from '../config';

export function signWorkerAgentCard(
  card: Omit<AgentCard, 'signature'>,
  signingKey: string
): AgentCard {
  const contentToSign = JSON.stringify({
    name: card.name,
    version: card.version,
    url: card.url,
    skills: card.skills,
  });

  const signatureValue = crypto
    .createHmac('sha256', signingKey)
    .update(contentToSign)
    .digest('base64');

  return {
    ...card,
    signature: {
      alg: 'HS256',
      value: signatureValue,
    },
  };
}

export function getWorkerAgentCard(): AgentCard {
  const agentName = config.isMock ? 'coding-worker-agent-mock' : 'coding-worker-agent';
  const url = `http://localhost:${config.port}`;

  const codingSkills = [
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
      name: 'Echo Skill',
      description: 'Returns input parameters for testing',
      inputModes: ['application/json'],
      outputModes: ['application/json'],
    },
  ];

  const rawCard: Omit<AgentCard, 'signature'> = {
    name: agentName,
    description: 'Desktop AI coding agent executing code generation, refactoring, sandboxed execution, git operations, and local file diffs',
    version: '1.0.0',
    url,
    authentication: {
      schemes: ['oauth2'],
    },
    capabilities: {
      streaming: true,
      pushNotifications: false,
    },
    skills: codingSkills,
  };

  return signWorkerAgentCard(rawCard, config.agentCardSigningKey);
}


export async function registerWithOrchestrator(maxRetries = 15): Promise<boolean> {
  const card = getWorkerAgentCard();
  const registerUrl = `${config.orchestratorUrl}/a2a/agents/register`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(card),
      });

      if (response.ok) {
        console.log(
          `[Worker] Successfully registered agent '${card.name}' with Orchestrator at ${config.orchestratorUrl}`
        );
        startHeartbeatLoop(card.name);
        return true;
      }
    } catch (_err) {
      // Orchestrator might be initializing
    }

    if (attempt < maxRetries) {
      console.log(
        `[Worker] Waiting for Orchestrator at ${config.orchestratorUrl} (Attempt ${attempt}/${maxRetries})...`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.warn(`[Worker] Could not register with Orchestrator after ${maxRetries} attempts.`);
  return false;
}

function startHeartbeatLoop(agentName: string): void {
  setInterval(async () => {
    try {
      await fetch(`${config.orchestratorUrl}/a2a/agents/${agentName}/heartbeat`, {
        method: 'POST',
      });
    } catch (_err) {
      // Silent catch for heartbeat background retry
    }
  }, 30000);
}
