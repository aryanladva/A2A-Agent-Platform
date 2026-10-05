const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let localBackendProcess = null;

function checkServiceHealthy(url, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureLocalBackendServices() {
  const orchestratorUp = await checkServiceHealthy('http://127.0.0.1:4100/.well-known/agent.json');
  if (!orchestratorUp) {
    const scriptPath = path.join(__dirname, '../../../scripts/start-all.js');
    if (require('fs').existsSync(scriptPath)) {
      console.log('[Electron Launcher] Starting local background services...');
      localBackendProcess = spawn('node', [scriptPath], {
        cwd: path.join(__dirname, '../../..'),
        stdio: 'inherit',
      });
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'A2A Desktop Coding Agent',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  const distIndex = path.join(__dirname, '../dist/index.html');
  if (require('fs').existsSync(distIndex)) {
    mainWindow.loadFile(distIndex);
  } else {
    mainWindow.loadURL('http://localhost:1420');
  }
}

app.whenReady().then(async () => {
  await ensureLocalBackendServices();
  createWindow();
});

app.on('window-all-closed', () => {
  if (localBackendProcess) {
    try {
      localBackendProcess.kill();
    } catch (_e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
