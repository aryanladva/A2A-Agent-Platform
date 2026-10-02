const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'A2A Coding Agent Desktop',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  const startUrl =
    process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, '../out/index.html')}`;

  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_START_URL;

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html')).catch(() => {
      // Fallback load http://localhost:3000 if static file not generated yet
      mainWindow.loadURL('http://localhost:3000');
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers for Native Desktop Capabilities
ipcMain.handle('dialog:open-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Coding Project Directory',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('fs:read-tree', async (_event, dirPath) => {
  if (!dirPath || !fs.existsSync(dirPath)) return [];
  try {
    function readDirRecursive(currentPath, relativePath = '', depth = 0) {
      if (depth > 4) return []; // Limit depth for UI performance
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      const nodes = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
          continue; // Ignore hidden & build dirs
        }

        const fullPath = path.join(currentPath, entry.name);
        const rel = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          nodes.push({
            name: entry.name,
            path: fullPath,
            type: 'directory',
            children: readDirRecursive(fullPath, rel, depth + 1),
          });
        } else {
          nodes.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
          });
        }
      }
      return nodes;
    }
    return readDirRecursive(dirPath);
  } catch (err) {
    console.error('Error reading dir tree:', err.message);
    return [];
  }
});

ipcMain.handle('fs:read-file', async (_event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return `Error reading file: ${err.message}`;
  }
});

ipcMain.handle('fs:apply-diff', async (_event, { filePath, content }) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, message: `Successfully applied changes to ${filePath}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('git:status', async (_event, dirPath) => {
  return new Promise((resolve) => {
    exec('git status --short', { cwd: dirPath }, (error, stdout) => {
      if (error) {
        resolve({ isGit: false, output: 'Not a git repository' });
      } else {
        resolve({ isGit: true, output: stdout || 'Working tree clean' });
      }
    });
  });
});
