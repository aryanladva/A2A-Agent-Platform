import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../types';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
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
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      error: 'unauthorized',
      message: err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token signature',
    });
    return;
  }
};
