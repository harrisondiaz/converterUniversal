const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { YtDlpService } = require('./services/ytdlp');
const { detectPlatform } = require('./services/platform');

let mainWindow;
const ytdlp = new YtDlpService();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#080c14',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(async () => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('check-ytdlp', () => ytdlp.checkInstalled());

ipcMain.handle('detect-platform', (_, url) => detectPlatform(url));

ipcMain.handle('get-formats', async (_, url) => {
  return ytdlp.getFormats(url);
});

ipcMain.handle('get-info', async (_, url) => {
  return ytdlp.getInfo(url);
});

ipcMain.handle('download', async (event, options) => {
  return ytdlp.download(options, (progress) => {
    event.sender.send('download-progress', progress);
  });
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select download folder',
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('open-folder', async (_, folderPath) => {
  if (folderPath) await shell.openPath(folderPath);
});

ipcMain.handle('get-default-folder', () => {
  return path.join(app.getPath('downloads'), 'ConverterUniversal');
});
