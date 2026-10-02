import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';

export const rateLimiterMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimitPerMin,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.user?.clientId || req.ip || 'anonymous';
  },
  handler: (req: Request, res: Response): void => {
    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: `Rate limit exceeded. Maximum ${config.rateLimitPerMin} requests per minute allowed.`,
    });
  },
});
