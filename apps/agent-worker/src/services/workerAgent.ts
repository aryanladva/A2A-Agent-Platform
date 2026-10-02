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
  const agentName = config.isMock ? 'mock-worker-agent' : 'invoice-parser-worker-agent';
  const url = `http://localhost:${config.port}`;

  const rawCard: Omit<AgentCard, 'signature'> = {
    name: agentName,
    description: config.isMock
      ? 'Mock worker agent for testing per TESTING.md'
      : 'Production AI worker agent executing tasks and tools',
    version: '1.0.0',
    url,
    authentication: {
      schemes: ['oauth2'],
    },
    capabilities: {
      streaming: true,
      pushNotifications: false,
    },
    skills: config.isMock
      ? [
          {
            id: 'echo',
            name: 'Echo Skill',
            description: 'Returns a canned echo response without calling LLMs',
            inputModes: ['application/json'],
            outputModes: ['application/json'],
          },
          {
            id: 'parse-invoice',
            name: 'Parse Invoice Skill',
            description: 'Extracts line items and totals from invoices',
            inputModes: ['application/pdf'],
            outputModes: ['application/json'],
          },
        ]
      : [
          {
            id: 'parse-invoice',
            name: 'Parse Invoice Skill',
            description: 'Extracts line items and totals from invoices',
            inputModes: ['application/pdf', 'image/png'],
            outputModes: ['application/json'],
          },
        ],
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
