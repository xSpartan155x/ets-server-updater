// ETS2 Package Sync - Electron main process: tray icon, dashboard window, client/server engine.
const os = require('os');
const path = require('path');
const { app, BrowserWindow, Menu, Notification, Tray, dialog, ipcMain, nativeImage, nativeTheme, shell } = require('electron');
const log = require('./logger');
const { DEFAULTS, loadSettings, saveSettings, validateSettings } = require('./settings');
const { ClientEngine } = require('./client-engine');
const { ServerEngine } = require('./server-engine');

const APP_NAME = 'ETS2 Package Sync';
const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const ICON_DIR = app.isPackaged ? path.join(process.resourcesPath, 'icons') : path.join(__dirname, '..', 'resources');

let tray = null;
let win = null;
let engine = null;
let settings = null;
let quitting = false;

// ------------------------------------------------------------------ engine

function snapshot() {
  if (engine) return engine.snapshot();
  return { mode: '', status: 'Not configured', state: 'idle', busy: false, details: {} };
}

function broadcastState() {
  updateTray();
  if (win && !win.isDestroyed()) win.webContents.send('state', snapshot());
}

async function startEngine() {
  if (!['client', 'server'].includes(settings.mode)) {
    engine = null;
    broadcastState();
    return;
  }
  engine = settings.mode === 'client'
    ? new ClientEngine(settings)
    : new ServerEngine(settings, path.join(app.getPath('userData'), 'server_state.json'));
  engine.on('change', broadcastState);
  engine.on('notify', notify);
  engine.on('console', (update) => {
    if (win && !win.isDestroyed()) win.webContents.send('console', update);
  });
  try {
    await engine.start();
  } catch (err) {
    log.error(`Cannot start ${settings.mode} mode`, err);
    engine.stop();
    engine.setStatus(`Error: ${err.message}`, 'error');
    notify(`Cannot start: ${err.message}`);
  }
  broadcastState();
}

function stopEngine() {
  if (engine) {
    engine.removeAllListeners();
    engine.stop();
    engine = null;
  }
}

function runAction(id) {
  if (!engine) return;
  if (id === 'open-repo') {
    if (/^https:\/\//i.test(settings.repository)) shell.openExternal(settings.repository);
    return;
  }
  engine.runAction(id);
}

// ------------------------------------------------------------------ tray + notifications

function trayImage(state) {
  return nativeImage.createFromPath(path.join(ICON_DIR, `tray-${state}.png`));
}

function updateTray() {
  if (!tray) return;
  const snap = snapshot();
  tray.setImage(trayImage(snap.state));
  tray.setToolTip(`${APP_NAME}${snap.mode ? ` (${snap.mode})` : ''}\n${snap.status}`.slice(0, 127));

  const info = engine ? engine.infoLines() : ['Status: not configured'];
  const template = [
    { label: snap.mode ? `${APP_NAME} - ${snap.mode[0].toUpperCase()}${snap.mode.slice(1)}` : APP_NAME, enabled: false },
    ...info.map((line) => ({ label: line, enabled: false })),
    { type: 'separator' },
    ...(engine ? engine.actions().map((a) => ({ label: a.label, click: () => runAction(a.id) })) : []),
    ...(engine ? [{ type: 'separator' }] : []),
    { label: 'Open Dashboard', click: () => showWindow('dashboard') },
    { label: 'Settings', click: () => showWindow('settings') },
    { label: 'Logs', click: () => showWindow('logs') },
    { type: 'separator' },
    { label: 'Exit', click: () => app.quit() },
  ];
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function notify(body) {
  if (Notification.isSupported()) {
    new Notification({ title: APP_NAME, body: String(body).slice(0, 250), icon: path.join(ICON_DIR, 'icon.png') }).show();
  }
}

// ------------------------------------------------------------------ theme

const windowBackground = () => (nativeTheme.shouldUseDarkColors ? '#020617' : '#f8fafc');

/** 'system' | 'light' | 'dark': also drives prefers-color-scheme in the UI and the native dialogs. */
function applyTheme(theme) {
  nativeTheme.themeSource = ['light', 'dark'].includes(theme) ? theme : 'system';
}

// ------------------------------------------------------------------ window

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    show: false,
    title: APP_NAME,
    icon: path.join(ICON_DIR, 'icon.ico'), // multi-size: sharp in title bar, taskbar and Alt+Tab
    autoHideMenuBar: true,
    backgroundColor: windowBackground(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenu(null);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.on('close', (event) => {
    if (!quitting) {
      event.preventDefault(); // keep running in the tray
      win.hide();
    }
  });
  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, '..', 'out', 'renderer', 'index.html'));
}

function showWindow(page) {
  if (!win || win.isDestroyed()) createWindow();
  const reveal = () => {
    if (page) win.webContents.send('navigate', page);
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  };
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', reveal);
  else reveal();
}

// ------------------------------------------------------------------ IPC

function localIps() {
  return Object.values(os.networkInterfaces()).flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => net.address);
}

/** Public IP, looked up only when the user asks for it. */
async function publicIp() {
  try {
    const response = await fetch('https://api.ipify.org', { signal: AbortSignal.timeout(8000) });
    const ip = (await response.text()).trim();
    return /^[0-9a-f.:]+$/i.test(ip) ? ip : null;
  } catch {
    return null;
  }
}

function registerIpc() {
  ipcMain.handle('get-state', () => ({
    settings,
    configured: Boolean(settings.mode),
    autostart: app.getLoginItemSettings().openAtLogin,
    snapshot: snapshot(),
    version: app.getVersion(),
    localIps: localIps(),
    logs: log.lines,
    console: engine && engine.console ? engine.console.lines : [],
  }));

  ipcMain.handle('set-theme', (_event, theme) => {
    settings.theme = ['light', 'dark'].includes(theme) ? theme : 'system';
    applyTheme(settings.theme);
    saveSettings(settings);
    return settings.theme;
  });

  ipcMain.handle('save-settings', async (_event, values, autostart) => {
    // the theme is saved on its own (sidebar switch): never overwrite it with a stale form value
    const next = { ...DEFAULTS, ...settings, ...values, theme: settings.theme };
    const errors = validateSettings(next);
    if (errors.length) return { ok: false, errors };
    if (engine && engine.busy) return { ok: false, errors: ['An operation is in progress. Try again in a moment.'] };

    settings = next;
    saveSettings(settings);
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: Boolean(autostart), args: ['--hidden'] });
    stopEngine();
    await startEngine();
    return { ok: true, snapshot: snapshot() };
  });

  ipcMain.handle('run-action', (_event, id) => runAction(id));
  ipcMain.handle('public-ip', () => publicIp());
  ipcMain.handle('open-log-file', () => log.file && shell.openPath(log.file));
  ipcMain.handle('open-console-file', () => engine && engine.consoleFile && shell.openPath(engine.consoleFile));

  ipcMain.handle('browse', async (_event, kind, current) => {
    const filters = kind === 'exe'
      ? [{ name: 'Executable', extensions: ['exe'] }]
      : [{ name: 'All files', extensions: ['*'] }];
    const result = await dialog.showOpenDialog(win, {
      defaultPath: current || undefined,
      properties: [kind === 'dir' ? 'openDirectory' : 'openFile'],
      ...(kind === 'dir' ? {} : { filters }),
    });
    return result.canceled ? null : result.filePaths[0];
  });

  log.on('line', (entry) => {
    if (win && !win.isDestroyed()) win.webContents.send('log', entry);
  });
}

// ------------------------------------------------------------------ lifecycle

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
  // Only in the installed app: the installer's shortcuts carry this ID. Without a matching shortcut
  // (npm run dev / start) Windows would show the icon of electron.exe in the taskbar.
  if (app.isPackaged) app.setAppUserModelId('com.ets2.packagesync');

  app.on('before-quit', (event) => {
    if (engine && engine.busy && !quitting) {
      event.preventDefault();
      notify('An operation is in progress, try again when it has finished');
      return;
    }
    quitting = true;
    stopEngine();
  });
  app.on('window-all-closed', () => {}); // stay in the tray

  app.whenReady().then(async () => {
    log.init(app.getPath('userData'));
    log.console = !app.isPackaged;
    log.info(`${APP_NAME} ${app.getVersion()} starting`);

    settings = loadSettings() || { ...DEFAULTS };
    if (!settings.ets2_documents_path) {
      settings.ets2_documents_path = path.join(app.getPath('documents'), 'Euro Truck Simulator 2');
    }
    applyTheme(settings.theme);
    nativeTheme.on('updated', () => win && !win.isDestroyed() && win.setBackgroundColor(windowBackground()));
    registerIpc();

    tray = new Tray(trayImage('idle'));
    tray.on('click', () => showWindow());
    updateTray();

    createWindow();
    await startEngine();
    if (!settings.mode) showWindow('settings');
    else if (!process.argv.includes('--hidden')) showWindow();
  });
}
