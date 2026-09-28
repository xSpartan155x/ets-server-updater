// ETS2 Package Sync - Electron main process: tray icon, dashboard window, one client/server engine per game.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { app, BrowserWindow, Menu, Notification, Tray, dialog, ipcMain, nativeImage, nativeTheme, shell } = require('electron');
const log = require('./logger');
const { normalize, activeGames, loadSettings, saveSettings, validateSettings, buildExport, parseImport } = require('./settings');
const { ClientEngine } = require('./client-engine');
const { ServerEngine } = require('./server-engine');
const { GAMES, GAME_IDS } = require('./games');
const { Updater } = require('./updater');
const i18n = require('./i18n');

const { t } = i18n;

const APP_NAME = 'ETS2 Package Sync';
const DEV_URL = process.env.VITE_DEV_SERVER_URL;
// On Windows the login item is matched by path AND arguments: always read and write it with the same args
const LOGIN_ITEM = { args: ['--hidden'] };
const ICON_DIR = app.isPackaged ? path.join(process.resourcesPath, 'icons') : path.join(__dirname, '..', 'resources');

let tray = null;
let win = null;
const engines = {}; // game id -> running engine (only for the games in use)
let settings = null;
let quitting = false;
let updater = null;

// ------------------------------------------------------------------ engine

const send = (channel, value) => win && !win.isDestroyed() && win.webContents.send(channel, value);

const runningGames = () => GAME_IDS.filter((id) => engines[id]);

const anyBusy = () => runningGames().some((id) => engines[id].busy);

/** { state, busy, games: { ets2: snapshot | null, ats: ... } }: state is the worst of the games (tray icon). */
function snapshot() {
  const games = Object.fromEntries(GAME_IDS.map((id) => [id, engines[id] ? engines[id].snapshot() : null]));
  const active = Object.values(games).filter(Boolean);
  const state = ['error', 'busy', 'ok'].find((s) => active.some((g) => g.state === s)) || 'idle';
  return { state, busy: active.some((g) => g.busy), games };
}

function broadcastState() {
  updateTray();
  send('state', snapshot());
}

async function startEngine(id) {
  const game = GAMES[id];
  const s = settings.games[id];
  // ETS2 keeps the file name of the versions that managed only one game
  const stateFile = path.join(app.getPath('userData'), id === 'ets2' ? 'server_state.json' : `server_state_${id}.json`);
  const engine = s.mode === 'client' ? new ClientEngine(s, game) : new ServerEngine(s, game, stateFile);
  engines[id] = engine;
  engine.on('change', broadcastState);
  engine.on('notify', (body) => notify(body, undefined, game));
  engine.on('console', (update) => send('console', { game: id, ...update }));
  try {
    await engine.start();
  } catch (err) {
    engine.log.error(`Cannot start ${s.mode} mode`, err);
    engine.stop();
    engine.setError(err);
    notify(t('notify.cannotStart', { message: i18n.errorText(err) }), undefined, game);
  }
}

async function startEngines() {
  await Promise.all(activeGames(settings).map(startEngine));
  broadcastState();
}

function stopEngines() {
  for (const id of runningGames()) {
    engines[id].removeAllListeners();
    engines[id].stop();
    delete engines[id];
  }
}

function runAction(game, id) {
  const engine = engines[game];
  if (!engine) return;
  if (id === 'open-repo') {
    const { repository } = settings.games[game];
    if (/^https:\/\//i.test(repository)) shell.openExternal(repository);
    return;
  }
  engine.runAction(id);
}

// ------------------------------------------------------------------ tray + notifications

function trayImage(state) {
  return nativeImage.createFromPath(path.join(ICON_DIR, `tray-${state}.png`));
}

const gameIcon = (id) => nativeImage.createFromPath(path.join(ICON_DIR, GAMES[id].icon)).resize({ width: 16, height: 16 });

/** Tray menu of the games: flat with one game, one submenu per game with two. */
function gamesMenu() {
  const games = runningGames();
  if (!games.length) return [{ label: t('tray.status', { status: t('status.notConfigured') }), enabled: false }, { type: 'separator' }];
  const title = (id) => ({ label: `${GAMES[id].name} - ${t(`mode.${engines[id].mode}`)}`, icon: gameIcon(id) });
  const items = (id) => [
    ...engines[id].infoLines().map((line) => ({ label: line, enabled: false })),
    { type: 'separator' },
    ...engines[id].actions().map((a) => ({ label: a.label, click: () => runAction(id, a.id) })),
  ];
  if (games.length === 1) return [{ ...title(games[0]), enabled: false }, ...items(games[0]), { type: 'separator' }];
  return [...games.map((id) => ({ ...title(id), submenu: items(id) })), { type: 'separator' }];
}

function updateTray() {
  if (!tray) return;
  tray.setImage(trayImage(snapshot().state));
  const lines = runningGames().map((id) => `${GAMES[id].name}: ${engines[id].status}`);
  tray.setToolTip([APP_NAME, ...(lines.length ? lines : [t('status.notConfigured')])].join('\n').slice(0, 127));

  const template = [
    { label: APP_NAME, enabled: false },
    { type: 'separator' },
    ...gamesMenu(),
    { label: t('tray.openDashboard'), click: () => showWindow('dashboard') },
    { label: t('tray.settings'), click: () => showWindow('settings') },
    { label: t('tray.logs'), click: () => showWindow('logs') },
    { type: 'separator' },
    ...updateMenu(),
    { label: t('tray.exit'), click: () => app.quit() },
  ];
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function updateMenu() {
  const u = updater && updater.state;
  if (!u) return [];
  if (u.status === 'downloaded') return [{ label: t('tray.restartToUpdate', { version: u.latest }), click: installUpdate }];
  if (u.status === 'available') return [{ label: t('tray.updateAvailable', { version: u.latest }), click: () => showWindow() }];
  return [{ label: t('tray.checkUpdates'), enabled: u.status !== 'checking', click: () => updater.check(true) }];
}

/** Install a downloaded update, unless an operation of a game (e.g. a server update) is running. */
function installUpdate() {
  if (anyBusy()) {
    notify(t('notify.busyUpdate'));
    return { ok: false, error: t('err.busyInstall') };
  }
  quitting = true; // skip the tray-only close and the busy check of before-quit
  if (!updater.install()) quitting = false;
  return { ok: quitting };
}

/** game: entry of games.js for the notifications of a game (its name in the title, its icon). */
function notify(body, onClick, game) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: game ? `${APP_NAME} - ${game.name}` : APP_NAME,
      body: String(body).slice(0, 250),
      icon: path.join(ICON_DIR, game ? game.icon : 'icon.png'),
    });
    if (onClick) notification.on('click', onClick);
    notification.show();
  }
}

// ------------------------------------------------------------------ theme

const windowBackground = () => (nativeTheme.shouldUseDarkColors ? '#020617' : '#f8fafc');

/** 'system' | 'light' | 'dark': also drives prefers-color-scheme in the UI and the native dialogs. */
function applyTheme(theme) {
  nativeTheme.themeSource = ['light', 'dark'].includes(theme) ? theme : 'system';
}

// ------------------------------------------------------------------ language

const systemLocales = () => [...(app.getPreferredSystemLanguages?.() || []), app.getLocale()];

/** 'system' | 'en' | 'it': sets the language of tray, notifications, dialogs and status, and refreshes them. */
function applyLanguage(preference) {
  i18n.setLanguage(i18n.resolveLanguage(preference, systemLocales()));
  broadcastState();
  if (updater) send('update', updater.view());
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
    configured: activeGames(settings).length > 0,
    autostart: app.getLoginItemSettings(LOGIN_ITEM).openAtLogin,
    autostartBlocked: app.isPackaged && app.getLoginItemSettings(LOGIN_ITEM).openAtLogin &&
      !app.getLoginItemSettings(LOGIN_ITEM).executableWillLaunchAtLogin,
    canAutostart: app.isPackaged,
    snapshot: snapshot(),
    version: app.getVersion(),
    locale: i18n.getLanguage(),
    localIps: localIps(),
    logs: log.lines,
    console: Object.fromEntries(runningGames().filter((id) => engines[id].console).map((id) => [id, engines[id].console.lines])),
  }));

  ipcMain.handle('set-theme', (_event, theme) => {
    settings.theme = ['light', 'dark'].includes(theme) ? theme : 'system';
    applyTheme(settings.theme);
    saveSettings(settings);
    return settings.theme;
  });

  ipcMain.handle('set-language', (_event, language) => {
    settings.language = i18n.LANGUAGES.includes(language) ? language : 'system';
    applyLanguage(settings.language);
    saveSettings(settings);
    return i18n.getLanguage();
  });

  ipcMain.handle('save-settings', async (_event, values, autostart) => {
    // theme and language are saved on their own (instant switches): never overwrite them with stale form values
    const next = normalize({ games: values.games, theme: settings.theme, language: settings.language });
    const errors = validateSettings(next);
    if (errors.length) return { ok: false, errors };
    if (anyBusy()) return { ok: false, errors: [t('err.busySave')] };

    settings = next;
    saveSettings(settings);
    if (app.isPackaged) app.setLoginItemSettings({ ...LOGIN_ITEM, openAtLogin: Boolean(autostart) });
    stopEngines();
    await startEngines();
    return { ok: true, snapshot: snapshot() };
  });

  ipcMain.handle('run-action', (_event, game, id) => runAction(game, id));
  ipcMain.handle('public-ip', () => publicIp());
  ipcMain.handle('update-state', () => updater.view());
  ipcMain.handle('update-check', () => updater.check(true));
  ipcMain.handle('update-download', () => updater.download());
  ipcMain.handle('update-install', () => installUpdate());
  ipcMain.handle('open-external', (_event, url) => {
    if (/^https:\/\//i.test(String(url))) shell.openExternal(String(url)); // links of the Guide page
  });
  ipcMain.handle('open-log-file', () => log.file && shell.openPath(log.file));
  ipcMain.handle('open-console-file', (_event, game) => {
    const engine = engines[game];
    if (engine && engine.consoleFile) shell.openPath(engine.consoleFile);
  });

  ipcMain.handle('browse', async (_event, kind, current) => {
    const filters = kind === 'exe'
      ? [{ name: t('dialog.filterExe'), extensions: ['exe'] }]
      : [{ name: t('dialog.filterAll'), extensions: ['*'] }];
    const result = await dialog.showOpenDialog(win, {
      defaultPath: current || undefined,
      properties: [kind === 'dir' ? 'openDirectory' : 'openFile'],
      ...(kind === 'dir' ? {} : { filters }),
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('export-settings', async (_event, values) => {
    const hasSecrets = GAME_IDS.some((id) => values.games?.[id]?.webhook_secret || values.games?.[id]?.github_token);
    let includeSecrets = false;
    if (hasSecrets) {
      const { response } = await dialog.showMessageBox(win, {
        type: 'question',
        title: t('dialog.exportTitle'),
        message: t('dialog.secretsQuestion'),
        detail: t('dialog.secretsDetail'),
        buttons: [t('dialog.withoutSecrets'), t('dialog.includeSecrets'), t('dialog.cancel')],
        defaultId: 0,
        cancelId: 2,
        noLink: true,
      });
      if (response === 2) return { ok: false, canceled: true };
      includeSecrets = response === 1;
    }
    const result = await dialog.showSaveDialog(win, {
      title: t('dialog.exportTitle'),
      // e.g. ets2-package-sync-ets2-server-ats-server.json
      defaultPath: path.join(app.getPath('documents'), `ets2-package-sync-${
        activeGames(normalize(values)).map((id) => `${id}-${values.games[id].mode}`).join('-') || 'settings'}.json`),
      filters: [{ name: t('dialog.filterSettings'), extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    try {
      fs.writeFileSync(result.filePath, buildExport(values, includeSecrets, app.getVersion()));
    } catch (err) {
      return { ok: false, error: t('err.writeFile', { message: err.message }) };
    }
    log.info(`Settings exported to ${result.filePath}${includeSecrets ? ' (with secrets)' : ''}`);
    return { ok: true, file: result.filePath, includeSecrets };
  });

  ipcMain.handle('import-settings', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: t('dialog.importTitle'),
      defaultPath: app.getPath('documents'),
      properties: ['openFile'],
      filters: [{ name: t('dialog.filterSettings'), extensions: ['json'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
    const file = result.filePaths[0];
    try {
      if (fs.statSync(file).size > 1_000_000) throw new i18n.LocalizedError('err.fileTooBig');
      const parsed = parseImport(fs.readFileSync(file, 'utf8'));
      log.info(`Settings imported from ${file} (not saved yet)`);
      return { ok: true, file, ...parsed };
    } catch (err) {
      return { ok: false, error: i18n.errorText(err) };
    }
  });

  log.on('line', (entry) => {
    if (win && !win.isDestroyed()) win.webContents.send('log', entry);
  });
}

// ------------------------------------------------------------------ lifecycle

// npm run dev / start: own data folder, so it runs next to the installed app instead of
// hitting its single-instance lock (which would just show the installed app's window)
if (!app.isPackaged) app.setPath('userData', `${app.getPath('userData')} (dev)`);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
  // Only in the installed app: the installer's shortcuts carry this ID. Without a matching shortcut
  // (npm run dev / start) Windows would show the icon of electron.exe in the taskbar.
  if (app.isPackaged) app.setAppUserModelId('com.ets2.packagesync');

  app.on('before-quit', (event) => {
    if (anyBusy() && !quitting) {
      event.preventDefault();
      notify(t('notify.busyQuit'));
      return;
    }
    quitting = true;
    stopEngines();
  });
  app.on('window-all-closed', () => {}); // stay in the tray

  app.whenReady().then(async () => {
    log.init(app.getPath('userData'));
    log.console = !app.isPackaged;
    log.info(`${APP_NAME} ${app.getVersion()} starting`);

    settings = loadSettings() || normalize();
    for (const id of GAME_IDS) {
      if (!settings.games[id].documents_path) {
        settings.games[id].documents_path = path.join(app.getPath('documents'), GAMES[id].documentsFolder);
      }
    }
    applyTheme(settings.theme);
    i18n.setLanguage(i18n.resolveLanguage(settings.language, systemLocales()));
    nativeTheme.on('updated', () => win && !win.isDestroyed() && win.setBackgroundColor(windowBackground()));
    updater = new Updater();
    updater.on('change', (state) => {
      updateTray();
      send('update', state);
    });
    updater.on('notify', (body) => notify(body, () => showWindow())); // click: open the app on the update banner
    registerIpc();

    tray = new Tray(trayImage('idle'));
    tray.on('click', () => showWindow());
    updateTray();

    createWindow();
    await startEngines();
    updater.start();
    if (!activeGames(settings).length) showWindow('settings');
    else if (!process.argv.includes('--hidden')) showWindow();
  });
}
