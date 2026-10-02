import { Router, Request, Response } from 'express';

const router: Router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'gateway',
  });
});

export default router;
