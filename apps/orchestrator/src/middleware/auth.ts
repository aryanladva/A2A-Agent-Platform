import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthenticatedRequest extends Request {
  user?: string | jwt.JwtPayload;
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or invalid Authorization header. Expected Bearer token.',
    });
    return;
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (_err) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token',
    });
    return;
  }
};
