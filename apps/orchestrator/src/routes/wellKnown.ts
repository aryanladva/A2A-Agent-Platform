import { Router, Request, Response } from 'express';
import { AgentCard } from '@a2a/shared-types';
import { config } from '../config';
import { signAgentCard } from '../utils/crypto';

const router: Router = Router();

router.get('/.well-known/agent.json', (req: Request, res: Response) => {
  const orchestratorCardRaw: Omit<AgentCard, 'signature'> = {
    name: 'a2a-orchestrator',
    description:
      'A2A Orchestrator agent that routes tasks to worker agents based on registered skills',
    version: '1.0.0',
    url: `http://localhost:${config.port}`,
    authentication: {
      schemes: ['oauth2'],
    },
    capabilities: {
      streaming: true,
      pushNotifications: false,
    },
    skills: [
      {
        id: 'orchestration',
        name: 'Orchestration & Task Routing',
        description: 'Routes tasks to registered worker agents based on skill matching',
        inputModes: ['application/json'],
        outputModes: ['application/json'],
      },
    ],
  };

  const signedCard = signAgentCard(orchestratorCardRaw, config.agentCardSigningKey);
  res.status(200).json(signedCard);
});

export default router;
