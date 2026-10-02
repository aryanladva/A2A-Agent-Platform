const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('dialog:open-directory'),
  readDirTree: (dirPath) => ipcRenderer.invoke('fs:read-tree', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('fs:read-file', filePath),
  applyDiff: (filePath, content) => ipcRenderer.invoke('fs:apply-diff', { filePath, content }),
  getGitStatus: (dirPath) => ipcRenderer.invoke('git:status', dirPath),
});
