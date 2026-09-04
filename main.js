const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverInstance = null;
const SERVER_PORT = 3000;

function startLocalServer() {
  try {
    const { server } = require('./server');
    serverInstance = server;
  } catch (err) {
    console.error('Error starting server in Electron:', err);
  }
}

function waitForServer(callback, maxAttempts = 30) {
  let attempts = 0;
  const check = () => {
    http.get(`http://localhost:${SERVER_PORT}/api/status`, (res) => {
      if (res.statusCode === 200) {
        callback();
      } else {
        retry();
      }
    }).on('error', () => {
      retry();
    });
  };

  const retry = () => {
    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(check, 300);
    } else {
      console.warn('Server wait timeout, opening anyway...');
      callback();
    }
  };

  check();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1040,
    minHeight: 720,
    backgroundColor: '#09090b',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    frame: true,
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  mainWindow.setTitle('App MyQ - Media Studio & Adobe Downgrader');

  // Load the web app URL
  mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  startLocalServer();
  waitForServer(() => {
    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverInstance && serverInstance.close) {
      serverInstance.close();
    }
    app.quit();
  }
});
