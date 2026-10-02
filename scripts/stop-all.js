const { execSync } = require('child_process');
const path = require('path');

function stopPort(port) {
  const isWindows = process.platform === 'win32';
  try {
    if (isWindows) {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch (_e) {}
      }
    } else {
      execSync(`lsof -t -i:${port} | xargs kill -9`, { stdio: 'ignore' });
    }
  } catch (_e) {
    // Port not in use
  }
}

function stopAll() {
  console.log('🛑 Stopping all A2A platform services and containers...\n');

  const ports = [3000, 4000, 4100, 4200];
  for (const port of ports) {
    console.log(`- Terminating services on port ${port}...`);
    stopPort(port);
  }

  console.log('- Stopping Docker Compose containers...');
  try {
    execSync('docker compose down', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  } catch (_e) {
    // Docker compose down ignored if not running
  }

  console.log('\n✅ All A2A services and Docker containers stopped cleanly.');
}

stopAll();
