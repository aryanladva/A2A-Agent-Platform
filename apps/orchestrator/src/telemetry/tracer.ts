import crypto from 'crypto';
import { OtelSpanContext } from '@a2a/shared-types';

export class OtelTracerService {
  private serviceName: string;
  private exporterEndpoint: string;
  private activeSpans: Map<string, OtelSpanContext> = new Map();

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.exporterEndpoint = process.env.OTEL_EXPORTER_ENDPOINT || 'http://localhost:4318';
  }

  public generateTraceId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public generateSpanId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  public startSpan(
    operationName: string,
    incomingTraceParent?: string | null,
    attributes: Record<string, string | number | boolean> = {}
  ): OtelSpanContext {
    let traceId = this.generateTraceId();
    let parentSpanId: string | undefined = undefined;

    if (incomingTraceParent && incomingTraceParent.startsWith('00-')) {
      const parts = incomingTraceParent.split('-');
      if (parts.length >= 3) {
        traceId = parts[1];
        parentSpanId = parts[2];
      }
    }

    const spanId = this.generateSpanId();
    const span: OtelSpanContext = {
      traceId,
      spanId,
      parentSpanId,
      serviceName: this.serviceName,
      operationName,
      startTime: Date.now(),
      attributes: {
        'service.name': this.serviceName,
        'otel.exporter.endpoint': this.exporterEndpoint,
        ...attributes,
      },
    };

    this.activeSpans.set(spanId, span);
    return span;
  }

  public endSpan(
    span: OtelSpanContext,
    attributes: Record<string, string | number | boolean> = {}
  ): void {
    span.endTime = Date.now();
    span.attributes = { ...span.attributes, ...attributes };
    const duration = span.endTime - span.startTime;

    console.log(
      `[OTEL Trace] Service=${span.serviceName} Op=${span.operationName} TraceID=${span.traceId} SpanID=${span.spanId} Parent=${span.parentSpanId || 'none'} Duration=${duration}ms Exporter=${this.exporterEndpoint}`
    );

    this.exportSpanToOtel(span).catch(() => {});
    this.activeSpans.delete(span.spanId);
  }

  public formatTraceParent(span: OtelSpanContext): string {
    return `00-${span.traceId}-${span.spanId}-01`;
  }

  private async exportSpanToOtel(span: OtelSpanContext): Promise<void> {
    try {
      await fetch(`${this.exporterEndpoint}/v1/traces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceSpans: [
            {
              resource: {
                attributes: [{ key: 'service.name', value: { stringValue: span.serviceName } }],
              },
              scopeSpans: [
                {
                  spans: [
                    {
                      traceId: span.traceId,
                      spanId: span.spanId,
                      parentSpanId: span.parentSpanId,
                      name: span.operationName,
                      startTimeUnixNano: span.startTime * 1000000,
                      endTimeUnixNano: (span.endTime || Date.now()) * 1000000,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      });
    } catch (_err) {
      // Exporter endpoint retry or silent catch
    }
  }
}

export const tracer = new OtelTracerService('orchestrator');
