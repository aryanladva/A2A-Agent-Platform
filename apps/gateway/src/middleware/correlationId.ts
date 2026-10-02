import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const headerCorrelationId = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  const correlationId = Array.isArray(headerCorrelationId)
    ? headerCorrelationId[0]
    : headerCorrelationId || uuidv4();

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  next();
};
