import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import wellKnownRouter from './routes/wellKnown';
import tasksRouter from './routes/tasks';
import registryRouter from './routes/registry';
import { authMiddleware } from './middleware/auth';
import { initDb } from './db/connection';
import { agentRegistry } from './services/agentRegistry';

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Postgres DB on startup asynchronously
initDb().then((isAvailable) => {
  agentRegistry.setPostgresAvailable(isAvailable);
});

// Public & Agent Registry Endpoints
app.use(wellKnownRouter);
app.use(registryRouter);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'orchestrator',
  });
});

// Protected A2A Task Endpoints
app.use(authMiddleware);
app.use(tasksRouter);


// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'not_found',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[ERROR] ${err.stack || err.message}`);
  res.status(500).json({
    error: 'internal_server_error',
    message: 'An unexpected error occurred',
  });
});

export default app;
