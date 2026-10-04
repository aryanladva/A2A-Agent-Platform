const { spawn } = require('child_process');
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
  console.log('🚀 A2A DESKTOP PLATFORM — STARTUP SEQUENCE');
  console.log('============================================================\n');

  // Step 1: Environment Check
  checkEnv();

  // Step 2: Orchestrator Service (SQLite + In-Process Async Queue)
  console.log('\n🤖 Step 1/3: Launching A2A Orchestrator service (port 4100, SQLite)...');
  startService('Orchestrator', 'npx', ['pnpm', '--filter', 'orchestrator', 'dev']);
  const orchestratorReady = await waitForHttp('http://127.0.0.1:4100/.well-known/agent.json', 30);

  if (!orchestratorReady) {
    console.error('❌ Orchestrator failed to start within timeout.');
    cleanup();
    process.exit(1);
  }
  console.log('✅ Orchestrator service is UP and healthy!');

  // Step 3: Worker Agent Service
  console.log('\n⚡ Step 2/3: Launching Agent Worker service (port 4200)...');
  startService('Agent Worker', 'npx', ['pnpm', '--filter', 'agent-worker', 'dev']);
  const workerReady = await waitForHttp('http://127.0.0.1:4200/.well-known/agent.json', 30);

  if (!workerReady) {
    console.error('❌ Agent Worker failed to start within timeout.');
    cleanup();
    process.exit(1);
  }
  console.log('✅ Agent Worker service is UP and registered with Orchestrator!');

  // Step 4: Gateway Service
  console.log('\n🛡️  Step 3/3: Launching API Gateway service (port 4000)...');
  startService('API Gateway', 'npx', ['pnpm', '--filter', 'gateway', 'dev']);
  const gatewayReady = await waitForHttp('http://127.0.0.1:4000/health', 30);

  if (!gatewayReady) {
    console.error('❌ API Gateway failed to start within timeout.');
    cleanup();
    process.exit(1);
  }
  console.log('✅ API Gateway service is UP and healthy!');

  // Final Summary Banner
  console.log('\n============================================================');
  console.log('🎉 ALL A2A DESKTOP PLATFORM SERVICES ARE LIVE & READY!');
  console.log('============================================================');
  console.log('🛡️  API Gateway Health Check:   http://127.0.0.1:4000/health');
  console.log('🤖 Orchestrator Agent Card:     http://127.0.0.1:4100/.well-known/agent.json');
  console.log('⚡ Worker Agent Card:           http://127.0.0.1:4200/.well-known/agent.json');
  console.log('============================================================');
  console.log('Press Ctrl+C to stop all services.\n');
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  cleanup();
  process.exit(1);
});
