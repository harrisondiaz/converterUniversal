const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  checkYtdlp: () => ipcRenderer.invoke('check-ytdlp'),
  detectPlatform: (url) => ipcRenderer.invoke('detect-platform', url),
  getFormats: (url) => ipcRenderer.invoke('get-formats', url),
  getInfo: (url) => ipcRenderer.invoke('get-info', url),
  download: (options) => ipcRenderer.invoke('download', options),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  getDefaultFolder: () => ipcRenderer.invoke('get-default-folder'),
  onDownloadProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
});
