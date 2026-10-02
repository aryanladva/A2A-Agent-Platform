import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import workerRouter from './routes/worker';
import { artifactsStore } from './db/artifacts';

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize DB schema asynchronously
artifactsStore.initDb();

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'agent-worker',
  });
});

app.use(workerRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'not_found',
    message: `Worker route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[Worker Error] ${err.stack || err.message}`);
  res.status(500).json({
    error: 'internal_server_error',
    message: 'An unexpected error occurred in worker agent',
  });
});

export default app;
