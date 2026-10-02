import { Router, Request, Response } from 'express';
import { agentRegistry } from '../services/agentRegistry';

const router: Router = Router();

// GET /a2a/agents — List registered agents per API_SPEC.md
router.get('/a2a/agents', async (req: Request, res: Response) => {
  const agents = await agentRegistry.getAllActiveAgents();
  res.status(200).json({
    agents,
  });
});

export default router;
