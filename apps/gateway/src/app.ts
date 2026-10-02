import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { correlationIdMiddleware } from './middleware/correlationId';
import { loggerMiddleware } from './middleware/logger';
import { authMiddleware } from './middleware/auth';
import { rateLimiterMiddleware } from './middleware/rateLimiter';
import healthRouter from './routes/health';
import authRouter from './routes/auth';

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Correlation ID & Logging middlewares
app.use(correlationIdMiddleware);
app.use(loggerMiddleware);

// Public Endpoints
app.use(healthRouter);
app.use(authRouter);

// Protected Gateway Routes
app.use('/api', authMiddleware, rateLimiterMiddleware);
app.use('/a2a', authMiddleware, rateLimiterMiddleware);

// Sample Protected Route
app.get('/api/v1/protected', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Access granted to protected resource',
    client: req.user,
    correlationId: req.correlationId,
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'not_found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[ERROR] [CID:${req.correlationId}] ${err.stack || err.message}`);
  res.status(500).json({
    error: 'internal_server_error',
    message: 'An unexpected error occurred',
    correlationId: req.correlationId,
  });
});

export default app;
