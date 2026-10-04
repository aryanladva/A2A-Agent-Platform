import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { correlationIdMiddleware } from './middleware/correlationId';
import { loggerMiddleware } from './middleware/logger';
import healthRouter from './routes/health';

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Correlation ID & Logging middlewares
app.use(correlationIdMiddleware);
app.use(loggerMiddleware);

// Health Check Endpoint
app.use(healthRouter);

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
