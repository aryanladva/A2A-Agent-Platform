import { Router, Request, Response } from 'express';
import { agentRegistry } from '../services/agentRegistry';

const router: Router = Router();

// POST /a2a/registry/register — Register an Agent Card
router.post(
  ['/a2a/registry/register', '/a2a/agents/register'],
  async (req: Request, res: Response) => {
    const agentCard = req.body;

    if (!agentCard || typeof agentCard !== 'object' || !agentCard.name) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Missing or malformed Agent Card in request body',
      });
      return;
    }

    try {
      // Register agent (verifies cryptographic signature per SECURITY.md)
      await agentRegistry.registerAgent(agentCard, true);

      res.status(201).json({
        message: 'Agent registered successfully',
        name: agentCard.name,
        status: 'active',
      });
    } catch (err) {
      res.status(400).json({
        error: 'invalid_signature',
        message: (err as Error).message,
      });
    }
  }
);

// POST /a2a/agents/:name/heartbeat — Send agent heartbeat
router.post('/a2a/agents/:name/heartbeat', async (req: Request, res: Response) => {
  const { name } = req.params;
  const success = await agentRegistry.recordHeartbeat(name);

  if (!success) {
    res.status(404).json({
      error: 'agent_not_found',
      message: `Agent with name '${name}' not found in registry`,
    });
    return;
  }

  res.status(200).json({
    status: 'ok',
    name,
    lastHeartbeat: new Date().toISOString(),
  });
});

// GET /a2a/agents — List active registered agents per API_SPEC.md
router.get('/a2a/agents', async (req: Request, res: Response) => {
  const agents = await agentRegistry.getAllActiveAgents();
  res.status(200).json({
    agents,
  });
});

// GET /a2a/agents/skill/:skillId — Query agents by skill ID
router.get('/a2a/agents/skill/:skillId', async (req: Request, res: Response) => {
  const { skillId } = req.params;
  const agents = await agentRegistry.findAgentsBySkill(skillId);
  res.status(200).json({
    skillId,
    agents,
  });
});

export default router;
