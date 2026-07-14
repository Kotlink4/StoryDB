const { app, BrowserWindow, Menu, shell, session, desktopCapturer, dialog } = require('electron');
const { truecordUrl, trustedHosts } = require('./config');

let mainWindow;
const MAX_DISPLAY_SOURCES = 12;

function isTrustedTruecordUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && trustedHosts.has(parsed.hostname);
  } catch {
    return false;
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#0b1220',
    title: 'trueCORD Desktop',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.loadURL(truecordUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedTruecordUrl(url)) {
      return { action: 'allow' };
    }

    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sourceLabel(source) {
  const prefix = source.id.startsWith('screen:') ? 'Screen' : 'Window';
  const name = source.name || source.id;
  return `${prefix}: ${name}`.slice(0, 80);
}

async function chooseDisplaySource() {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    fetchWindowIcons: true,
    thumbnailSize: { width: 320, height: 180 }
  });

  if (!sources.length) {
    return null;
  }

  const orderedSources = [
    ...sources.filter((source) => source.id.startsWith('screen:')),
    ...sources.filter((source) => !source.id.startsWith('screen:'))
  ].slice(0, MAX_DISPLAY_SOURCES);

  const buttons = [...orderedSources.map(sourceLabel), 'Cancel'];
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Share screen',
    message: 'Choose what to stream',
    detail: 'For app/game sound, keep audio enabled in trueCORD. On Windows the app uses system loopback audio.',
    buttons,
    cancelId: buttons.length - 1,
    defaultId: 0,
    noLink: true
  });

  return orderedSources[result.response] || null;
}

function installMenu() {
  const template = [
    {
      label: 'trueCORD',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.reload()
        },
        {
          label: 'Hard Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow?.webContents.reloadIgnoringCache()
        },
        { type: 'separator' },
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools()
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function configureSecurity() {
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (isTrustedTruecordUrl(url)) {
      event.preventDefault();
      callback(true);
      return;
    }

    callback(false);
  });

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const url = webContents.getURL();
      const allowedPermissions = new Set(['media', 'display-capture']);
      callback(allowedPermissions.has(permission) && isTrustedTruecordUrl(url));
    });

    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      if (!isTrustedTruecordUrl(request.securityOrigin)) {
        callback({});
        return;
      }

      chooseDisplaySource()
        .then((source) => {
          if (!source) {
            callback({});
            return;
          }

          const streams = { video: source };
          if (request.audioRequested && process.platform === 'win32') {
            streams.audio = 'loopback';
          }
          callback(streams);
        })
        .catch(() => callback({}));
    });

  });
}

configureSecurity();

app.whenReady().then(() => {
  installMenu();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
