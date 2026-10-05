import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const SERVICE_PREFIX = 'a2a_agent_platform_';

function getVaultFilePath(): string {
  const homeDir = os.homedir();
  const configDir = process.platform === 'win32'
    ? process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming')
    : path.join(homeDir, '.config');
  
  const a2aDir = path.join(configDir, 'a2a-agent-platform');
  if (!fs.existsSync(a2aDir)) {
    fs.mkdirSync(a2aDir, { recursive: true });
  }
  return path.join(a2aDir, 'credentials.vault');
}

function getMasterKey(): Buffer {
  // Derive key bound to current OS user and platform environment
  const userSeed = `${os.hostname()}_${os.userInfo().username}_${process.platform}`;
  return crypto.scryptSync(userSeed, 'a2a_os_credential_salt', 32);
}

/**
 * Retrieve secure API key for a given provider (Anthropic, OpenAI, etc.).
 * Checks OS Vault store first, then falls back to environment variables.
 */
export async function getSecureApiKey(provider: string): Promise<string | null> {
  const serviceKey = `${SERVICE_PREFIX}${provider.toLowerCase()}`;
  
  // 1. Try reading from OS-bound secure vault
  try {
    const vaultPath = getVaultFilePath();
    if (fs.existsSync(vaultPath)) {
      const rawData = fs.readFileSync(vaultPath, 'utf8');
      const vaultObj = JSON.parse(rawData);
      
      if (vaultObj[serviceKey]) {
        const { iv, data, tag } = vaultObj[serviceKey];
        const masterKey = getMasterKey();
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          masterKey,
          Buffer.from(iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(tag, 'hex'));
        
        let decrypted = decipher.update(data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
    }
  } catch (_err) {
    // Fallthrough to environment variable fallback
  }

  // 2. Dev/Fallback: environment variables
  if (provider === 'anthropic') {
    return process.env.ANTHROPIC_API_KEY || process.env.LLM_API_KEY || null;
  }
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || null;
  }
  return process.env.LLM_API_KEY || null;
}

/**
 * Store API key into OS-bound secure credential vault.
 */
export async function setSecureApiKey(provider: string, apiKey: string): Promise<boolean> {
  try {
    const serviceKey = `${SERVICE_PREFIX}${provider.toLowerCase()}`;
    const vaultPath = getVaultFilePath();
    let vaultObj: Record<string, { iv: string; data: string; tag: string }> = {};

    if (fs.existsSync(vaultPath)) {
      try {
        vaultObj = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
      } catch (_e) {
        vaultObj = {};
      }
    }

    const masterKey = getMasterKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    vaultObj[serviceKey] = {
      iv: iv.toString('hex'),
      data: encrypted,
      tag,
    };

    fs.writeFileSync(vaultPath, JSON.stringify(vaultObj, null, 2), { mode: 0o600 });
    return true;
  } catch (_err) {
    return false;
  }
}

/**
 * Delete stored API key from OS credential vault.
 */
export async function deleteSecureApiKey(provider: string): Promise<boolean> {
  try {
    const serviceKey = `${SERVICE_PREFIX}${provider.toLowerCase()}`;
    const vaultPath = getVaultFilePath();

    if (fs.existsSync(vaultPath)) {
      const vaultObj = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
      delete vaultObj[serviceKey];
      fs.writeFileSync(vaultPath, JSON.stringify(vaultObj, null, 2), { mode: 0o600 });
    }
    return true;
  } catch (_err) {
    return false;
  }
}
