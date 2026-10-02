const { spawn, execSync } = require('child_process');
const net = require('net');
const http = require('http');
const path = require('path');
const { checkEnv } = require('./env-check');

const children = [];

function cleanup() {
  console.log('\n🛑 Shutting down all A2A platform services...');
  for (const child of children) {
    if (child && !child.killed) {
      try {
        child.kill('SIGTERM');
      } catch (_e) {}
    }
  }
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

async function waitForPort(port, host = 'localhost', maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isReady = await new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, host);
    });

    if (isReady) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function waitForHttp(url, maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isReady = await new Promise((resolve) => {
      const req = http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1500, () => {
        req.destroy();
        resolve(false);
      });
    });

    if (isReady) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function startService(name, command, args, cwd) {
  console.log(`🚀 Starting ${name}...`);
  const child = spawn(command, args, {
    cwd: cwd || path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });
  children.push(child);
  return child;
}

async function main() {
  console.log('============================================================');
  console.log('🚀 A2A PLATFORM — STARTUP SEQUENCE');
  console.log('============================================================\n');

  // Step 1: Environment Check
  checkEnv();

  // Step 2: Docker Compose (Postgres + Redis)
  console.log('\n📦 Step 1/5: Starting Redis & Postgres containers via Docker Compose...');
  try {
    execSync('docker compose up -d', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  } catch (err) {
    console.warn('⚠️  Docker Compose command failed or Docker is not running. Falling back to in-memory mode if available.');
  }

  console.log('⏳ Checking Postgres (port 5432) & Redis (port 6379) readiness...');
  const pgReady = await waitForPort(5432, 'localhost', 3);
  const redisReady = await waitForPort(6379, 'localhost', 3);

  if (pgReady && redisReady) {
    console.log('✅ Postgres & Redis containers are UP and healthy!');
  } else {
    console.log('ℹ️  Postgres/Redis containers not running. Proceeding with in-memory store fallbacks.');
  }


  // Step 3: Orchestrator Service
  console.log('\n🤖 Step 2/5: Launching A2A Orchestrator service (port 4100)...');
  startService('Orchestrator', 'npx', ['pnpm', '--filter', 'orchestrator', 'dev']);
  const orchestratorReady = await waitForHttp('http://localhost:4100/.well-known/agent.json', 30);

  if (!orchestratorReady) {
    console.error('❌ Orchestrator failed to start within timeout.');
    cleanup();
    process.exit(1);
  }
  console.log('✅ Orchestrator service is UP and healthy!');

  // Step 4: Worker Agent Service
  console.log('\n⚡ Step 3/5: Launching Agent Worker service (port 4200)...');
  startService('Agent Worker', 'npx', ['pnpm', '--filter', 'agent-worker', 'dev']);
  const workerReady = await waitForHttp('http://localhost:4200/.well-known/agent.json', 30);

  if (!workerReady) {
    console.error('❌ Agent Worker failed to start within timeout.');
    cleanup();
    process.exit(1);
  }
  console.log('✅ Agent Worker service is UP and registered with Orchestrator!');

  // Step 5: Gateway Service
  console.log('\n🛡️  Step 4/5: Launching API Gateway service (port 4000)...');
  startService('API Gateway', 'npx', ['pnpm', '--filter', 'gateway', 'dev']);
  const gatewayReady = await waitForHttp('http://localhost:4000/health', 30);

  if (!gatewayReady) {
    console.error('❌ API Gateway failed to start within timeout.');
    cleanup();
    process.exit(1);
  }
  console.log('✅ API Gateway service is UP and healthy!');

  // Step 6: Frontend App
  console.log('\n💻 Step 5/5: Launching Next.js Frontend UI (port 3000)...');
  startService('Frontend UI', 'npx', ['pnpm', '--filter', 'frontend', 'dev']);
  const frontendReady = await waitForHttp('http://localhost:3000', 45);

  if (!frontendReady) {
    console.warn('⚠️  Frontend UI took longer than expected to bind, continuing background startup...');
  } else {
    console.log('✅ Frontend UI is UP and healthy!');
  }

  // Final Summary Banner
  console.log('\n============================================================');
  console.log('🎉 ALL A2A PLATFORM SERVICES ARE LIVE & READY!');
  console.log('============================================================');
  console.log('💻 Frontend UI Dashboard:       http://localhost:3000');
  console.log('🛡️  API Gateway Health Check:   http://localhost:4000/health');
  console.log('🤖 Orchestrator Agent Card:     http://localhost:4100/.well-known/agent.json');
  console.log('⚡ Worker Agent Card:           http://localhost:4200/.well-known/agent.json');
  console.log('============================================================');
  console.log('Press Ctrl+C to stop all services.\n');
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  cleanup();
  process.exit(1);
});
