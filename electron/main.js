// ETS2 Package Sync - Electron main process: tray icon, dashboard window and, for each game, the engines of its
// roles: the client (pushes the exported packages to one of its destinations) and the server host (one shared
// installation of the dedicated server running any number of servers, each with its own home folder).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { app, BrowserWindow, Menu, Notification, Tray, dialog, ipcMain, nativeImage, nativeTheme, shell } = require('electron');
const log = require('./logger');
const {
  normalize, activeGames, clientOn, serverOn, loadSettings, saveSettings, validateSettings, buildExport, parseImport,
  uniqueId, samePath, SECRET_KEYS, INSTANCE_DEFAULTS,
} = require('./settings');
const { ClientEngine } = require('./client-engine');
const { ServerHost } = require('./server-host');
const { GAMES, GAME_IDS } = require('./games');
const { SteamCmd } = require('./steamcmd');
const {
  parseServerConfig, updateServerConfig, checkConfig, portsOf, freePorts, newServerConfig,
} = require('./server-config');
const { SteamProfiles } = require('./steam-profiles');
const { findGit, DOWNLOAD_URL: GIT_DOWNLOAD_URL } = require('./git');
const { Updater } = require('./updater');
const i18n = require('./i18n');

const { t } = i18n;

const APP_NAME = 'ETS2 Package Sync';
const DEV_URL = process.env.VITE_DEV_SERVER_URL;
// On Windows the login item is matched by path AND arguments: always read and write it with the same args
const LOGIN_ITEM = { args: ['--hidden'] };
const ICON_DIR = app.isPackaged ? path.join(process.resourcesPath, 'icons') : path.join(__dirname, '..', 'resources');
const ROLES = ['client', 'server'];
// options of the client saved by Settings; its destinations are saved by the Server pages
const CLIENT_OWN = ['enabled', 'documents_path', 'debounce_seconds', 'commit_message'];

let tray = null;
let win = null;
const engines = {}; // game id -> { client?: ClientEngine, server?: ServerHost } (only the roles in use)
let settings = null;
let quitting = false;
let updater = null;
let steamcmd = null; // shared by the server hosts: installs and updates the dedicated servers
let git = null; // { path, version } of Git for Windows (client role), null when not found
let steamProfiles = null; // names and avatars of the moderators of server_config.sii
const choices = {}; // game id -> { destinations, last } of an export waiting for the choice of the server

// ------------------------------------------------------------------ paths

/** Folder of the histories of the servers of a game and of the Steam state of its installation. */
const stateDir = (game) => path.join(app.getPath('userData'), 'servers', game);

/** Default home of the dedicated server (Documents\<game>): the one of the servers started without -homedir. */
const documentsHome = (game) => path.join(app.getPath('documents'), GAMES[game].documentsFolder);

/** Suggested folders for a new installation and new servers (outside Documents, often synced to OneDrive). */
const baseDir = (game) => path.join(os.homedir(), 'ETS2 Package Sync', GAMES[game].name);
const suggestedInstallDir = (game) => path.join(baseDir(game), 'installation');
const suggestedHomedir = (game, id) => path.join(baseDir(game), 'servers', id);

/**
 * 4.x kept the history of the server in server_state.json (ETS2) or server_state_ats.json: it becomes the
 * history of the server "main" and the Steam state of the installation. The old file is left in place.
 */
function migrateState() {
  for (const id of GAME_IDS) {
    const legacy = path.join(app.getPath('userData'), id === 'ets2' ? 'server_state.json' : `server_state_${id}.json`);
    const target = path.join(stateDir(id), 'main.json');
    if (!fs.existsSync(legacy) || fs.existsSync(target) || !settings.games[id].server.servers.some((s) => s.id === 'main')) continue;
    try {
      const old = JSON.parse(fs.readFileSync(legacy, 'utf8'));
      fs.mkdirSync(stateDir(id), { recursive: true });
      fs.writeFileSync(target, JSON.stringify({ processed: old.processed || [], last_commit: old.last_commit || '', last_update: old.last_update || '' }, null, 2));
      const steamFile = path.join(stateDir(id), 'steam.json');
      if (!fs.existsSync(steamFile)) {
        fs.writeFileSync(steamFile, JSON.stringify({ latest: old.steam_latest, checked: old.steam_checked, confirmed: old.steam_confirmed }, null, 2));
      }
      log.info(`${GAMES[id].name}: history of 4.x moved to the server "main"`);
    } catch (err) {
      log.error(`${GAMES[id].name}: cannot move the history of 4.x`, err);
    }
  }
}

// ------------------------------------------------------------------ engines

const send = (channel, value) => win && !win.isDestroyed() && win.webContents.send(channel, value);

/** [{ game, role, engine }] of the engines running. */
const running = () => GAME_IDS.flatMap((game) => ROLES.filter((role) => engines[game]?.[role]).map((role) => ({ game, role, engine: engines[game][role] })));

const anyBusy = () => running().some(({ engine }) => engine.busy);

const worst = (states) => ['error', 'busy', 'ok'].find((s) => states.includes(s)) || 'idle';

/** { state, busy, games: { ets2: { client, server, state } | null, ... } }: state is the worst of all (tray icon). */
function snapshot() {
  const games = Object.fromEntries(GAME_IDS.map((game) => {
    const roles = engines[game];
    if (!roles || (!roles.client && !roles.server)) return [game, null];
    const client = roles.client ? roles.client.snapshot() : null;
    const server = roles.server ? roles.server.snapshot() : null;
    return [game, { client, server, state: worst([client?.state, server?.state].filter(Boolean)) }];
  }));
  const active = Object.values(games).filter(Boolean);
  return { state: worst(active.map((g) => g.state)), busy: running().some(({ engine }) => engine.busy), games };
}

function broadcastState() {
  updateTray();
  send('state', snapshot());
}

function createEngine(game, role) {
  const g = settings.games[game];
  if (role === 'client') {
    const client = { ...g.client };
    if (!client.documents_path) client.documents_path = documentsHome(game);
    return new ClientEngine(client, GAMES[game]);
  }
  return new ServerHost(g.server, GAMES[game], { stateDir: stateDir(game), steamcmd, documentsHome: documentsHome(game) });
}

async function startEngine(game, role) {
  const engine = createEngine(game, role);
  engines[game] = { ...engines[game], [role]: engine };
  engine.on('change', broadcastState);
  engine.on('notify', (body) => notify(body, undefined, GAMES[game]));
  engine.on('console', (update) => send('console', { game, ...update }));
  engine.on('choose', (request) => askDestination(game, request));
  engine.on('destination', (id) => rememberDestination(game, id));
  try {
    await engine.start();
  } catch (err) {
    engine.log.error(`Cannot start the ${role} role`, err);
    engine.stop();
    engine.setError(err);
    notify(t('notify.cannotStart', { message: i18n.errorText(err) }), undefined, GAMES[game]);
  }
}

function stopEngine(game, role) {
  const engine = engines[game]?.[role];
  if (!engine) return;
  engine.removeAllListeners();
  engine.stop();
  delete engines[game][role];
}

async function startEngines() {
  const jobs = [];
  for (const game of activeGames(settings)) {
    if (clientOn(settings, game)) jobs.push(startEngine(game, 'client'));
    if (serverOn(settings, game)) jobs.push(startEngine(game, 'server'));
  }
  await Promise.all(jobs);
  broadcastState();
}

function stopEngines() {
  for (const { game, role } of running()) stopEngine(game, role);
}

/** Start the server host of a game again with the saved settings (the dedicated servers keep running). */
async function restartServerHost(game) {
  stopEngine(game, 'server');
  if (serverOn(settings, game)) await startEngine(game, 'server');
  broadcastState();
}

/** role: 'client' | 'server'; server: id of a server for its own actions. */
function runAction(game, role, id, server) {
  const engine = engines[game]?.[role];
  if (!engine) return;
  if (role === 'client' && id.startsWith('open-repo:')) {
    const dest = engine.destination(id.slice('open-repo:'.length));
    if (dest && /^https:\/\//i.test(dest.repository)) shell.openExternal(dest.repository);
    return;
  }
  engine.runAction(id, server);
}

// ------------------------------------------------------------------ choice of the server of an export

/** An export and more than one server: show the chooser (the window comes up, a notification if it is hidden). */
function askDestination(game, request) {
  choices[game] = request;
  const visible = win && !win.isDestroyed() && win.isVisible() && !win.isMinimized();
  showWindow();
  send('choose-destination', { game, ...request });
  if (!visible) {
    win.flashFrame(true); // Windows may keep a fullscreen game in front: the taskbar button flashes
    notify(t('notify.chooseServer', { game: GAMES[game].name }), () => showWindow(), GAMES[game]);
  }
}

function rememberDestination(game, id) {
  if (settings.games[game].client.last_destination === id) return;
  settings.games[game].client.last_destination = id;
  saveSettings(settings);
}

// ------------------------------------------------------------------ tray + notifications

function trayImage(state) {
  return nativeImage.createFromPath(path.join(ICON_DIR, `tray-${state}.png`));
}

const gameIcon = (id) => nativeImage.createFromPath(path.join(ICON_DIR, GAMES[id].icon)).resize({ width: 16, height: 16 });

const info = (lines) => lines.map((line) => ({ label: line, enabled: false }));

/** Menu items of a game: the client lines and actions, the installation and a submenu per server. */
function gameItems(game) {
  const { client, server } = engines[game];
  const items = [];
  if (client) {
    items.push({ label: t('tray.client'), enabled: false }, ...info(client.infoLines()));
    items.push(...client.actions().map((a) => ({ label: a.label, click: () => runAction(game, 'client', a.id) })));
  }
  if (client && server) items.push({ type: 'separator' });
  if (server) {
    items.push({ label: t('tray.server'), enabled: false }, ...info(server.infoLines()));
    for (const instance of server.list) {
      items.push({
        label: `${instance.name} - ${instance.statusText()}`,
        submenu: server.serverActions().map((a) => ({ label: a.label, click: () => runAction(game, 'server', a.id, instance.id) })),
      });
    }
    items.push(...server.actions().map((a) => ({ label: a.label, click: () => runAction(game, 'server', a.id) })));
  }
  return items;
}

/** Tray menu of the games: flat with one game, one submenu per game with two. */
function gamesMenu() {
  const games = GAME_IDS.filter((id) => engines[id]?.client || engines[id]?.server);
  if (!games.length) return [{ label: t('tray.status', { status: t('status.notConfigured') }), enabled: false }, { type: 'separator' }];
  const title = (id) => ({ label: GAMES[id].fullName, icon: gameIcon(id) });
  if (games.length === 1) return [{ ...title(games[0]), enabled: false }, ...gameItems(games[0]), { type: 'separator' }];
  return [...games.map((id) => ({ ...title(id), submenu: gameItems(id) })), { type: 'separator' }];
}

function updateTray() {
  if (!tray) return;
  tray.setImage(trayImage(snapshot().state));
  const lines = running().map(({ game, role, engine }) => `${GAMES[game].name} ${t(`role.${role}`)}: ${engine.status}`);
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
    // Sizes of the page, not of the frame. The minimum fits the sidebar in Server mode and the widest
    // Guide table without scrollbars.
    useContentSize: true,
    width: 1000,
    height: 700,
    minWidth: 820,
    minHeight: 660,
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
  win.on('focus', () => win.flashFrame(false));
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

// ------------------------------------------------------------------ servers: create, edit, delete

const hostOf = (game) => engines[game]?.server || null;
const instanceOf = (game, id) => hostOf(game)?.instances.get(id) || null;

/** Ports used by the servers of both games on this PC (from their server_config.sii). */
function usedPorts() {
  const files = GAME_IDS.flatMap((game) => settings.games[game].server.servers.map((s) => {
    const instance = instanceOf(game, s.id);
    return instance ? instance.configFile : path.join(path.resolve(s.homedir || '.'), 'server_config.sii');
  }));
  return files.filter((file) => fs.existsSync(file)).map((file) => {
    try {
      return portsOf(fs.readFileSync(file, 'utf8'));
    } catch {
      return {};
    }
  });
}

/** Proposal for a new server of a game: id, home folder, free ports, where its first packages can come from. */
function serverPlan(game, name) {
  const s = settings.games[game].server;
  const taken = new Set(s.servers.map((server) => server.id));
  const id = uniqueId(name || `${GAMES[game].name} server`, taken);
  const exportHere = documentsHome(game);
  return {
    id,
    homedir: suggestedHomedir(game, id),
    installDir: s.install_dir || suggestedInstallDir(game),
    installed: Boolean(s.install_dir) && fs.existsSync(path.join(s.install_dir, 'bin', 'win_x64', GAMES[game].serverExe)),
    ports: freePorts(usedPorts()),
    // the first packages: from another server of this game, or from the last export of the game on this PC
    sources: [
      ...s.servers.map((server) => {
        const instance = instanceOf(game, server.id);
        return instance && fs.existsSync(instance.siiPath) && fs.existsSync(instance.datPath)
          ? { id: `server:${server.id}`, label: server.name, sii: instance.siiPath, dat: instance.datPath } : null;
      }).filter(Boolean),
      ...(fs.existsSync(path.join(exportHere, 'server_packages.sii')) && fs.existsSync(path.join(exportHere, 'server_packages.dat'))
        ? [{ id: 'documents', label: exportHere, sii: path.join(exportHere, 'server_packages.sii'), dat: path.join(exportHere, 'server_packages.dat') }] : []),
    ],
  };
}

/**
 * Create a server: its home folder with a server_config.sii (ports free on this PC, the name and the token
 * given), the first packages if a source is chosen, and its entry in the settings. The installation of the
 * dedicated server is started when it is missing and `install` is true.
 */
async function createServer(game, form) {
  const s = settings.games[game].server;
  const name = String(form.name || '').trim();
  const homedir = path.resolve(String(form.homedir || '').trim() || '.');
  const errors = [];
  if (!name) errors.push(t('err.required', { label: t('field.serverName') }));
  if (s.servers.some((server) => server.name.trim().toLowerCase() === name.toLowerCase())) errors.push(t('err.sameName', { name }));
  if (!String(form.homedir || '').trim()) errors.push(t('err.required', { label: t('field.homedir') }));
  if (GAME_IDS.some((id) => settings.games[id].server.servers.some((server) => server.homedir && samePath(server.homedir, homedir)))) {
    errors.push(t('err.homedirUsed', { path: homedir }));
  }
  const config = { ...(form.config || {}), lobby_name: String(form.config?.lobby_name || name) };
  const configErrors = checkConfig(config, []); // translated by the UI, next to their fields
  if (!String(form.installDir || s.install_dir || '').trim()) errors.push(t('err.required', { label: t('field.installDir') }));
  const instance = { ...INSTANCE_DEFAULTS, ...form.instance, name, homedir };
  const test = normalize({ ...settings, games: { ...settings.games, [game]: { ...settings.games[game], server: { ...s, enabled: true, install_dir: s.install_dir || form.installDir, servers: [...s.servers, instance] } } } });
  errors.push(...validateSettings(test).filter((e) => !validateSettings(settings).includes(e)));
  if (errors.length || configErrors.length) return { ok: false, errors, configErrors };
  if (anyBusy()) return { ok: false, errors: [t('err.busySave')] };

  const plan = serverPlan(game, name);
  try {
    fs.mkdirSync(homedir, { recursive: true });
    const configFile = path.join(homedir, 'server_config.sii');
    if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, newServerConfig(config, form.moderators || []));
    const source = plan.sources.find((src) => src.id === form.packagesFrom);
    if (source) {
      fs.copyFileSync(source.sii, path.join(homedir, 'server_packages.sii'));
      fs.copyFileSync(source.dat, path.join(homedir, 'server_packages.dat'));
    }
  } catch (err) {
    return { ok: false, errors: [t('err.createServer', { message: err.message })] };
  }

  const saved = normalize(test);
  const created = saved.games[game].server.servers[saved.games[game].server.servers.length - 1];
  settings = { ...saved, theme: settings.theme, language: settings.language };
  saveSettings(settings);
  log.info(`${GAMES[game].name}: server "${name}" created in ${homedir}`);
  await restartServerHost(game);
  if (form.install && !plan.installed) runAction(game, 'server', 'steam-update');
  return { ok: true, id: created.id };
}

/** Change the settings of one server (name, repository, arguments...). The home folder changes only when it is stopped. */
async function saveServer(game, id, values) {
  const s = settings.games[game].server;
  const index = s.servers.findIndex((server) => server.id === id);
  if (index < 0) return { ok: false, errors: [] };
  const current = s.servers[index];
  const next = { ...current, ...values, id };
  const instance = instanceOf(game, id);
  if (!samePath(next.homedir, current.homedir) && instance?.running) return { ok: false, errors: [t('err.stopFirst', { name: current.name })] };
  const servers = s.servers.map((server, i) => (i === index ? next : server));
  const test = normalize({ ...settings, games: { ...settings.games, [game]: { ...settings.games[game], server: { ...s, servers } } } });
  const errors = validateSettings(test);
  if (errors.length) return { ok: false, errors };
  if (anyBusy()) return { ok: false, errors: [t('err.busySave')] };
  settings = { ...test, theme: settings.theme, language: settings.language };
  saveSettings(settings);
  await restartServerHost(game);
  return { ok: true };
}

/** Remove a server from the app (stopped first); its home folder goes to the Recycle Bin when asked. */
async function deleteServer(game, id, removeFiles) {
  const s = settings.games[game].server;
  const server = s.servers.find((item) => item.id === id);
  if (!server) return { ok: false, error: '' };
  if (instanceOf(game, id)?.running) return { ok: false, error: t('err.stopFirst', { name: server.name }) };
  if (anyBusy()) return { ok: false, error: t('err.busySave') };
  settings.games[game].server.servers = s.servers.filter((item) => item.id !== id);
  saveSettings(settings);
  log.info(`${GAMES[game].name}: server "${server.name}" removed`);
  if (removeFiles && server.homedir && fs.existsSync(server.homedir)) {
    try {
      await shell.trashItem(path.resolve(server.homedir));
      log.info(`${server.homedir} moved to the Recycle Bin`);
    } catch (err) {
      log.error(`Cannot move ${server.homedir} to the Recycle Bin`, err);
    }
  }
  fs.rmSync(path.join(stateDir(game), `${id}.json`), { force: true });
  await restartServerHost(game);
  return { ok: true };
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

function consoleLines() {
  const lines = {};
  for (const game of GAME_IDS) {
    for (const instance of hostOf(game)?.list || []) lines[`${game}/${instance.id}`] = instance.console.lines;
  }
  return lines;
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
    git: { found: Boolean(git), version: git ? git.version : '', downloadUrl: GIT_DOWNLOAD_URL },
    locale: i18n.getLanguage(),
    localIps: localIps(),
    logs: log.lines,
    console: consoleLines(),
    choices,
    suggested: Object.fromEntries(GAME_IDS.map((game) => [game, { installDir: suggestedInstallDir(game), documents: documentsHome(game) }])),
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

  ipcMain.handle('save-settings', async (_event, values, autostart, imported = []) => {
    // Settings owns the roles and the options of the client that are not about servers: everything about servers
    // (destinations of the client; installation, sync and servers of the server role) is saved by the Server pages
    // and kept as it is, unless the game comes from an imported settings file (e.g. moving to a new PC)
    const games = {};
    for (const game of GAME_IDS) {
      const form = values.games[game];
      const saved = settings.games[game];
      games[game] = imported.includes(game) ? form : {
        client: { ...saved.client, ...Object.fromEntries(CLIENT_OWN.map((key) => [key, form.client[key]])) },
        server: { ...saved.server, enabled: form.server.enabled },
      };
      if (games[game].server.enabled && !String(games[game].server.install_dir || '').trim()) {
        games[game].server.install_dir = suggestedInstallDir(game);
      }
    }
    // theme and language are saved on their own (instant switches): never overwrite them with stale form values
    const next = normalize({ version: settings.version, games, theme: settings.theme, language: settings.language });
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

  // options of one role of a game, from the Server pages: the servers the client sends to, or the installation,
  // updates, sync and shared rules of the server role (its servers are created, changed and removed on their own).
  // Only that role is restarted; the dedicated servers keep running.
  ipcMain.handle('save-role', async (_event, game, role, values) => {
    if (!settings.games[game] || !ROLES.includes(role)) return { ok: false, errors: [] };
    const games = JSON.parse(JSON.stringify(settings.games));
    games[game][role] = { ...games[game][role], ...values, enabled: settings.games[game][role].enabled };
    if (role === 'server') games[game].server.servers = settings.games[game].server.servers;
    const next = normalize({ version: settings.version, games, theme: settings.theme, language: settings.language });
    const errors = validateSettings(next);
    if (errors.length) return { ok: false, errors };
    if (engines[game]?.[role]?.busy) return { ok: false, errors: [t('err.busySave')] };

    settings = next;
    saveSettings(settings);
    stopEngine(game, role);
    if (settings.games[game][role].enabled) await startEngine(game, role);
    broadcastState();
    return { ok: true };
  });

  ipcMain.handle('run-action', (_event, game, role, id, server) => runAction(game, role, id, server));

  ipcMain.handle('choose-destination', (_event, game, id) => {
    delete choices[game];
    engines[game]?.client?.choose(id || null);
  });

  ipcMain.handle('server-plan', (_event, game, name) => serverPlan(game, name));
  ipcMain.handle('server-create', (_event, game, form) => createServer(game, form));
  ipcMain.handle('server-save', (_event, game, id, values) => saveServer(game, id, values));
  ipcMain.handle('server-delete', (_event, game, id, removeFiles) => deleteServer(game, id, removeFiles));
  ipcMain.handle('open-path', (_event, game, id, what) => {
    const instance = instanceOf(game, id);
    const target = what === 'install' ? hostOf(game)?.installDir
      : !instance ? null : what === 'home' ? instance.homedir : what === 'config' ? instance.configFile : instance.consoleFile;
    if (target && fs.existsSync(target)) shell.openPath(target);
  });

  ipcMain.handle('public-ip', () => publicIp());

  // popup "Git not found": look again (also in the usual install folders) and restart the clients stopped by it
  ipcMain.handle('check-git', async () => {
    git = await findGit();
    if (git) {
      log.info(`Git found: ${git.version} (${git.path})`);
      const stopped = running().filter(({ role, engine }) => role === 'client' && engine.state === 'error' && !engine.busy);
      for (const { game } of stopped) {
        stopEngine(game, 'client');
        await startEngine(game, 'client');
      }
      broadcastState();
    }
    return { found: Boolean(git), version: git ? git.version : '', downloadUrl: GIT_DOWNLOAD_URL };
  });
  ipcMain.handle('update-state', () => updater.view());
  ipcMain.handle('update-check', () => updater.check(true));
  ipcMain.handle('update-download', () => updater.download());
  ipcMain.handle('update-install', () => installUpdate());
  ipcMain.handle('open-external', (_event, url) => {
    if (/^https:\/\//i.test(String(url))) shell.openExternal(String(url)); // links of the Guide page
  });
  ipcMain.handle('open-log-file', () => log.file && shell.openPath(log.file));

  // server_config.sii of one server (Server -> Configuration)
  ipcMain.handle('server-config-read', (_event, game, id) => {
    const instance = instanceOf(game, id);
    if (!instance) return { ok: false, error: '' };
    const file = instance.configFile;
    if (!fs.existsSync(file)) return { ok: true, file, exists: false };
    try {
      return { ok: true, file, exists: true, ...parseServerConfig(fs.readFileSync(file, 'utf8')) };
    } catch (err) {
      return { ok: false, file, error: t('err.cfgRead', { message: err.message }) };
    }
  });

  ipcMain.handle('server-config-write', (_event, game, id, values, moderators, restart) => {
    const instance = instanceOf(game, id);
    if (!instance) return { ok: false, error: '' };
    const errors = checkConfig(values, moderators);
    if (errors.length) return { ok: false, errors };
    const file = instance.configFile;
    try {
      const text = fs.readFileSync(file, 'utf8');
      const next = updateServerConfig(text, values, moderators);
      if (next !== text) {
        fs.copyFileSync(file, `${file}.bak`); // the previous version, in case of a mistake
        fs.writeFileSync(`${file}.new`, next);
        fs.renameSync(`${file}.new`, file);
        instance.log.info('server_config.sii saved (previous version in server_config.sii.bak)');
      }
    } catch (err) {
      return { ok: false, error: t('err.cfgWrite', { message: err.message }) };
    }
    if (restart) runAction(game, 'server', 'restart', id);
    return { ok: true };
  });

  // a server_config.sii missing (e.g. a server of 4.x never started): a new one with ports free on this PC
  ipcMain.handle('server-config-create', (_event, game, id) => {
    const instance = instanceOf(game, id);
    if (!instance || fs.existsSync(instance.configFile)) return { ok: false };
    try {
      fs.mkdirSync(path.dirname(instance.configFile), { recursive: true });
      fs.writeFileSync(instance.configFile, newServerConfig({ lobby_name: instance.name, ...freePorts(usedPorts()) }));
      instance.log.info(`server_config.sii created in ${path.dirname(instance.configFile)}`);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: t('err.cfgWrite', { message: err.message }) };
    }
  });

  // moderators: the file keeps Steam IDs, the UI shows the Steam names
  ipcMain.handle('steam-profiles', (_event, ids) => steamProfiles.lookup(Array.isArray(ids) ? ids : []));
  ipcMain.handle('steam-resolve', async (_event, input) => {
    try {
      return { ok: true, profile: await steamProfiles.resolve(input) };
    } catch (err) {
      return { ok: false, reason: err.message === 'offline' ? 'offline' : 'not-found' };
    }
  });

  ipcMain.handle('browse', async (_event, kind, current) => {
    const filters = kind === 'exe'
      ? [{ name: t('dialog.filterExe'), extensions: ['exe'] }]
      : [{ name: t('dialog.filterAll'), extensions: ['*'] }];
    const result = await dialog.showOpenDialog(win, {
      defaultPath: current || undefined,
      properties: kind === 'dir' ? ['openDirectory', 'createDirectory', 'promptToCreate'] : ['openFile'],
      ...(kind === 'dir' ? {} : { filters }),
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('export-settings', async (_event, values) => {
    const hasSecrets = GAME_IDS.some((id) => SECRET_KEYS.some((key) => values.games?.[id]?.server?.[key]));
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
    const normalized = normalize({ ...values, version: settings.version });
    const roles = activeGames(normalized).map((id) => [id, ...ROLES.filter((role) => normalized.games[id][role].enabled)].join('-'));
    const result = await dialog.showSaveDialog(win, {
      title: t('dialog.exportTitle'),
      // e.g. ets2-package-sync-ets2-client-server-ats-server.json
      defaultPath: path.join(app.getPath('documents'), `ets2-package-sync-${roles.join('-') || 'settings'}.json`),
      filters: [{ name: t('dialog.filterSettings'), extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    try {
      fs.writeFileSync(result.filePath, buildExport({ ...values, version: settings.version }, includeSecrets, app.getVersion()));
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

    const loaded = loadSettings();
    settings = loaded ? loaded.settings : normalize();
    if (loaded?.migratedFrom) saveSettings(settings); // the file is written in the new shape (the old one is kept aside)
    migrateState();
    applyTheme(settings.theme);
    i18n.setLanguage(i18n.resolveLanguage(settings.language, systemLocales()));
    nativeTheme.on('updated', () => win && !win.isDestroyed() && win.setBackgroundColor(windowBackground()));
    steamcmd = new SteamCmd(path.join(app.getPath('userData'), 'steamcmd'));
    steamProfiles = new SteamProfiles(app.getPath('userData'));
    git = await findGit();
    if (!git) log.warn('Git for Windows not found: needed only by the client role');
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
