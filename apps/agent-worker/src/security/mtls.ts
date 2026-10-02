import https from 'https';
import fs from 'fs';

export interface MtlsOptions {
  enabled: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
  rejectUnauthorized?: boolean;
}

export class MtlsSecurityService {
  private options: MtlsOptions;

  constructor() {
    const isMtlsConfigured = Boolean(process.env.TLS_CERT_PATH && process.env.TLS_KEY_PATH);
    this.options = {
      enabled: process.env.MTLS_ENABLED === 'true' || isMtlsConfigured,
      certPath: process.env.TLS_CERT_PATH,
      keyPath: process.env.TLS_KEY_PATH,
      caPath: process.env.TLS_CA_PATH,
      rejectUnauthorized: process.env.TLS_REJECT_UNAUTHORIZED !== 'false',
    };
  }

  public getHttpsAgent(): https.Agent | undefined {
    if (!this.options.enabled) {
      return undefined;
    }

    try {
      const cert = this.options.certPath ? fs.readFileSync(this.options.certPath) : undefined;
      const key = this.options.keyPath ? fs.readFileSync(this.options.keyPath) : undefined;
      const ca = this.options.caPath ? fs.readFileSync(this.options.caPath) : undefined;

      return new https.Agent({
        cert,
        key,
        ca,
        rejectUnauthorized: this.options.rejectUnauthorized,
      });
    } catch (err) {
      console.warn('[Worker mTLS] Failed to load certificates:', (err as Error).message);
      return undefined;
    }
  }

  public isMtlsEnabled(): boolean {
    return this.options.enabled;
  }
}

export const workerMtlsSecurity = new MtlsSecurityService();
