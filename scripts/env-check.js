const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

function checkEnv() {
  const rootDir = path.resolve(__dirname, '..');
  const envPath = path.join(rootDir, '.env');
  const envExamplePath = path.join(rootDir, '.env.example');

  // Auto-copy .env.example to .env if .env does not exist
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('ℹ️  .env file not found. Copying .env.example -> .env...');
    fs.copyFileSync(envExamplePath, envPath);
  }

  const parsedEnv = parseEnvFile(envPath);
  // Merge process.env with parsedEnv
  const combinedEnv = { ...parsedEnv, ...process.env };

  const requiredVars = [
    { name: 'GATEWAY_PORT', desc: 'Port the gateway listens on (default 4000)' },
    { name: 'JWT_SECRET', desc: 'Signing secret for JWTs' },
    { name: 'OAUTH_CLIENT_ID', desc: 'OAuth2 client ID' },
    { name: 'OAUTH_CLIENT_SECRET', desc: 'OAuth2 client secret' },
    { name: 'RATE_LIMIT_PER_MIN', desc: 'Requests allowed per client per minute' },
    { name: 'ORCHESTRATOR_PORT', desc: 'Port the orchestrator listens on (default 4100)' },
    { name: 'REDIS_URL', desc: 'Redis connection string (e.g. redis://localhost:6379)' },
    { name: 'DATABASE_URL', desc: 'Postgres connection string' },
    { name: 'AGENT_CARD_SIGNING_KEY', desc: 'Private key used to sign Agent Cards' },
    { name: 'WORKER_PORT', desc: 'Port worker listens on (default 4200)' },
    { name: 'LLM_PROVIDER', desc: 'LLM provider name (e.g. anthropic, openai, mock)' },
    { name: 'LLM_API_KEY', desc: 'API key for chosen LLM provider' },
    { name: 'ORCHESTRATOR_URL', desc: 'URL of orchestrator service to register with' },
    { name: 'NODE_ENV', desc: 'Node environment (development | production)' },
    { name: 'OTEL_EXPORTER_ENDPOINT', desc: 'OpenTelemetry collector endpoint' },
  ];

  const missing = requiredVars.filter(
    (v) => !combinedEnv[v.name] || combinedEnv[v.name].trim() === ''
  );

  if (missing.length > 0) {
    console.error('\n❌ Environment Validation Failed (ENV_SETUP.md check):');
    console.error('The following required environment variable(s) are missing in .env:\n');
    missing.forEach((v) => {
      console.error(`   - ${v.name}: ${v.desc}`);
    });
    console.error('\nPlease update your .env file with valid configuration before running start:all.\n');
    process.exit(1);
  }

  console.log('✅ Environment configuration check passed (all ENV_SETUP.md variables present).');
}

if (require.main === module) {
  checkEnv();
}

module.exports = { checkEnv };
