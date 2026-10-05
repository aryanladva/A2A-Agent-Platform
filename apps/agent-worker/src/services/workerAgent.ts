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

export function getFourCodingAgentCards(): AgentCard[] {
  const baseUrl = `http://127.0.0.1:${config.port}`;
  const signingKey = config.agentCardSigningKey;

  const rawCards: Array<Omit<AgentCard, 'signature'>> = [
    {
      name: 'codegen-agent',
      description: 'CodeGen Agent — generate and refactor code in the selected project',
      version: '1.0.0',
      url: baseUrl,
      authentication: { schemes: [] },
      capabilities: { streaming: true, pushNotifications: false },
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

  return rawCards.map((card) => signWorkerAgentCard(card, signingKey));
}

export function getWorkerAgentCard(): AgentCard {
  return getFourCodingAgentCards()[0];
}

export async function registerWithOrchestrator(maxRetries = 15): Promise<boolean> {
  const cards = getFourCodingAgentCards();
  const registerUrl = `${config.orchestratorUrl}/a2a/registry/register`;
  let registeredAll = true;

  for (const card of cards) {
    let success = false;
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
          success = true;
          break;
        }
      } catch (_err) {
        // Orchestrator might still be initializing
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    if (!success) {
      console.warn(`[Worker] Could not register agent '${card.name}' with Orchestrator.`);
      registeredAll = false;
    }
  }

  return registeredAll;
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
