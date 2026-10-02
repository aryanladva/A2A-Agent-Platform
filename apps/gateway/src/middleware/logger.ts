import { Request, Response, NextFunction } from 'express';
import { tracer } from '../telemetry/tracer';

export interface TracedRequest extends Request {
  traceparent?: string;
  otelSpan?: unknown;
}

export const loggerMiddleware = (req: TracedRequest, res: Response, next: NextFunction): void => {
  const incomingTraceparent = (req.headers['traceparent'] as string) || null;
  const span = tracer.startSpan(`${req.method} ${req.path}`, incomingTraceparent, {
    'http.method': req.method,
    'http.url': req.originalUrl,
  });

  const traceparent = tracer.formatTraceParent(span);
  res.setHeader('traceparent', traceparent);
  req.traceparent = traceparent;
  req.otelSpan = span;

  res.on('finish', () => {
    tracer.endSpan(span, {
      'http.status_code': res.statusCode,
    });
  });

  next();
};
