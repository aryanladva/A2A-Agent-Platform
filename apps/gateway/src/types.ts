export interface JwtPayload {
  sub: string;
  clientId: string;
  iat?: number;
  exp?: number;
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      user?: JwtPayload;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export interface GatewayConfig {
  port: number;
  jwtSecret: string;
  oauthClientId: string;
  oauthClientSecret: string;
  rateLimitPerMin: number;
  orchestratorUrl: string;
  nodeEnv: string;
}
