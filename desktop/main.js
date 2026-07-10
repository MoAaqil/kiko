const { app, BrowserWindow, Menu, Tray, nativeImage, shell, ipcMain, Notification, desktopCapturer, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Always use localhost in dev mode, production URL otherwise
const isDev = process.argv.includes('--dev');

// Allowed app origins — anything NOT in this list gets opened in browser
const LOCALHOST_URL  = 'http://localhost:3000';
const PRODUCTION_URL = 'https://kikochat.vercel.app';

// Always prefer localhost if the server is running
let KIKO_URL = isDev ? LOCALHOST_URL : PRODUCTION_URL;

let mainWindow = null;
let tray = null;

// ─── Localhost readiness check ────────────────────────────────────────────────
function isLocalhostReady() {
  return new Promise((resolve) => {
    const req = http.get(LOCALHOST_URL, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

async function waitForLocalhost(maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await isLocalhostReady()) return true;
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

// Load the logo for the loading screen
let logoBase64 = '';
try {
  const logoPath = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(logoPath)) {
    logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  }
} catch (err) {
  console.error('[Kiko] Failed to load logo for loading screen:', err);
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function getLoadingHTML() {
  const logoContent = logoBase64
    ? `<img src="${logoBase64}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 22px;" />`
    : '🐱';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0d0f14;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #fff; -webkit-app-region: drag; user-select: none;
    }
    .logo {
      width: 80px; height: 80px; border-radius: 22px;
      ${logoBase64 ? '' : 'background: linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef);'}
      display: flex; align-items: center; justify-content: center;
      font-size: 2.5rem; margin-bottom: 20px;
      box-shadow: 0 0 40px rgba(139,92,246,0.5);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 40px rgba(139,92,246,0.4); transform: scale(1); }
      50% { box-shadow: 0 0 60px rgba(139,92,246,0.7); transform: scale(1.04); }
    }
    h1 { font-size: 2rem; font-weight: 700; background: linear-gradient(135deg,#a78bfa,#67e8f9); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    p { margin-top: 10px; color: rgba(255,255,255,0.4); font-size: 0.9rem; }
    .dots { display: inline-flex; gap: 6px; margin-top: 24px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #6366f1; animation: bounce 1.4s ease-in-out infinite; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,80%,100%{transform:scale(0);opacity:.3} 40%{transform:scale(1);opacity:1} }
  </style>
</head>
<body>
  <div class="logo">${logoContent}</div>
  <h1>Kiko</h1>
  <p>Starting up...</p>
  <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
</body>
</html>`;
}

// ─── Main window ──────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    frame: true,
    backgroundColor: '#0d0f14',
    show: false,
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      spellcheck: true,
    },
  });

  // Automatically approve media (microphone/camera), notification, and geolocation permission requests
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'notifications', 'geolocation', 'audio', 'video'];
    callback(allowedPermissions.includes(permission));
  });

  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, origin) => {
    const allowedPermissions = ['media', 'notifications', 'geolocation', 'audio', 'video'];
    return allowedPermissions.includes(permission);
  });

  // Show loading screen immediately
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getLoadingHTML())}`);
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Intercept any navigation to vercel.com itself (not the app)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Block vercel.com dashboard / login pages — those aren't Kiko
    if (url.includes('vercel.com/login') || url.includes('vercel.com/signup') || url.includes('vercel.com/dashboard')) {
      event.preventDefault();
      console.log('[Kiko] Blocked redirect to Vercel dashboard:', url);
      // Load Kiko instead
      loadKiko();
      return;
    }
    // Block any other external navigation
    const isKikoApp = url.startsWith(LOCALHOST_URL) || url.startsWith(PRODUCTION_URL);
    if (!isKikoApp) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Handle new window requests
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isKikoApp = url.startsWith(LOCALHOST_URL) || url.startsWith(PRODUCTION_URL);
    if (!isKikoApp) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Hide to tray on close (Windows / Linux)
  mainWindow.on('close', (event) => {
    if (process.platform !== 'darwin' && tray && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

async function loadKiko() {
  if (!mainWindow) return;

  try {
    // Always try localhost first — if it's up, use it regardless of mode
    const localReady = await isLocalhostReady();
    if (localReady) {
      console.log('[Kiko] Loading from localhost:3000');
      KIKO_URL = LOCALHOST_URL;
      mainWindow.loadURL(LOCALHOST_URL);
    } else if (isDev) {
      // Dev mode: wait for localhost
      console.log('[Kiko] Waiting for localhost:3000...');
      const ready = await waitForLocalhost(30000);
      if (ready) {
        KIKO_URL = LOCALHOST_URL;
        mainWindow.loadURL(LOCALHOST_URL);
      } else {
        // Fallback to production
        console.log('[Kiko] Localhost not available, using production URL');
        KIKO_URL = PRODUCTION_URL;
        mainWindow.loadURL(PRODUCTION_URL);
      }
    } else {
      // Production mode
      console.log('[Kiko] Loading production app');
      KIKO_URL = PRODUCTION_URL;
      mainWindow.loadURL(PRODUCTION_URL);
    }
  } catch (err) {
    console.error('[Kiko] Failed to load:', err);
  }
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) return; // Skip tray if icon not found

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Kiko', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Open in Browser', click: () => shell.openExternal(KIKO_URL) },
    { type: 'separator' },
    { label: 'Quit Kiko', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setToolTip('Kiko — Private Communication');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ─── App menu ─────────────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'Kiko',
      submenu: [
        { label: 'About Kiko', role: 'about' },
        { type: 'separator' },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { type: 'separator' },
        { label: 'Hide Kiko', accelerator: 'CmdOrCtrl+H', role: 'hide' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => { app.isQuitting = true; app.quit(); } },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { label: 'Force Reload', accelerator: 'Shift+CmdOrCtrl+R', click: () => mainWindow?.webContents.reloadIgnoringCache() },
        { label: 'Developer Tools', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);
ipcMain.on('show-notification', (_, { title, body }) => {
  if (Notification.isSupported()) new Notification({ title, body }).show();
});
ipcMain.on('open-external', (_, url) => shell.openExternal(url));
ipcMain.on('force-reload', () => {
  mainWindow?.webContents.reloadIgnoringCache();
});

// Screen/Window capture IPC and custom picker window
let screenPickerWindow = null;

ipcMain.handle('get-screen-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 220, height: 140 }
    });
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (err) {
    console.error('[Kiko] Failed to get screen sources:', err);
    return [];
  }
});

function createScreenPickerWindow(callback) {
  if (screenPickerWindow) {
    screenPickerWindow.focus();
    return;
  }

  screenPickerWindow = new BrowserWindow({
    width: 650,
    height: 520,
    title: 'Share your screen',
    parent: mainWindow || undefined,
    modal: true,
    frame: true,
    resizable: false,
    backgroundColor: '#0d0f14',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Hide the menu bar on the picker window
  screenPickerWindow.setMenuBarVisibility(false);

  const pickerHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Share your screen</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0d0f14;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 24px;
      user-select: none;
      overflow: hidden;
    }
    h2 {
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: 20px;
      background: linear-gradient(135deg, #a78bfa, #67e8f9);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .sources-container {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      height: 380px;
      overflow-y: auto;
      padding-right: 8px;
    }
    .sources-container::-webkit-scrollbar {
      width: 6px;
    }
    .sources-container::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 3px;
    }
    .sources-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }
    .sources-container::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    .source-card {
      background: #151922;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .source-card:hover {
      background: #1e2433;
      border-color: #6366f1;
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25);
    }
    .thumbnail {
      width: 100%;
      height: 125px;
      object-fit: contain;
      border-radius: 8px;
      background: #08090c;
      border: 1px solid rgba(255, 255, 255, 0.02);
    }
    .source-name {
      font-size: 0.85rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      text-align: center;
    }
  </style>
</head>
<body>
  <h2>Share your screen</h2>
  <div class="sources-container" id="container">
    <div style="grid-column: span 2; text-align: center; padding-top: 100px; color: rgba(255, 255, 255, 0.4);">
      Loading screens and windows...
    </div>
  </div>

  <script>
    if (window.kikoElectron) {
      window.kikoElectron.getScreenSources().then(sources => {
        const container = document.getElementById('container');
        container.innerHTML = '';
        
        if (sources.length === 0) {
          container.innerHTML = '<div style="grid-column: span 2; text-align: center; padding-top: 100px; color: rgba(255,255,255,0.4);">No screens or windows found</div>';
          return;
        }
        
        sources.forEach(src => {
          const card = document.createElement('div');
          card.className = 'source-card';
          card.onclick = () => {
            window.kikoElectron.selectScreenSource(src.id);
          };
          
          const img = document.createElement('img');
          img.className = 'thumbnail';
          img.src = src.thumbnail;
          
          const name = document.createElement('div');
          name.className = 'source-name';
          name.innerText = src.name;
          name.title = src.name;
          
          card.appendChild(img);
          card.appendChild(name);
          container.appendChild(card);
        });
      }).catch(err => {
        console.error('Failed to load screen sources:', err);
      });
    } else {
      document.getElementById('container').innerText = 'Electron API not available.';
    }
  </script>
</body>
</html>`;

  screenPickerWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pickerHTML)}`);

  let resolved = false;

  const selectHandler = (event, sourceId) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      const selected = sources.find(s => s.id === sourceId);
      if (selected) {
        callback({ video: selected, audio: 'loopback' });
      } else {
        callback({ video: null, audio: null });
      }
    }).catch(() => {
      callback({ video: null, audio: null });
    }).finally(() => {
      resolved = true;
      if (screenPickerWindow) {
        screenPickerWindow.close();
      }
    });
  };

  ipcMain.once('screen-source-selected', selectHandler);

  screenPickerWindow.on('closed', () => {
    screenPickerWindow = null;
    ipcMain.removeListener('screen-source-selected', selectHandler);
    if (!resolved) {
      callback({ video: null, audio: null });
    }
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  buildMenu();
  createWindow();
  try { createTray(); } catch (_) {}

  // Handle screen sharing media requests via custom window picker
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    createScreenPickerWindow(callback);
  });

  // Load the app after window is ready
  await loadKiko();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else { mainWindow?.show(); mainWindow?.focus(); }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !tray) app.quit();
});

app.on('before-quit', () => { app.isQuitting = true; });
