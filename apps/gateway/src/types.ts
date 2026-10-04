/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export interface GatewayConfig {
  port: number;
  orchestratorUrl: string;
  nodeEnv: string;
}
