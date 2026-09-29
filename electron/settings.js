// Settings persisted in %APPDATA%\ETS2 Package Sync\settings.json: personal preferences (theme, language) plus one
// block per game in `games` (see games.js). A game has two roles, each one on or off:
//   client: watches the documents folder of the game and pushes the exported packages to one of its destinations
//           (one GitHub repository per server);
//   server: one installation of the dedicated server (kept up to date with SteamCMD) shared by any number of
//           servers, each with its own home folder (server_config.sii, packages, log) and its own repository.
// Files of older versions are migrated when loaded: 4.x (one mode per game), 2.x (one flat ETS2 block).
// Secrets are encrypted with Electron safeStorage (DPAPI on Windows: only this Windows user can read them).
const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');
const log = require('./logger');
const { parseRepository } = require('./engine');
const { GAMES, GAME_IDS } = require('./games');
const { t, LocalizedError, errorText } = require('./i18n');

const VERSION = 5;
const SYNC_METHODS = ['polling', 'webhook'];
const SECRET_KEYS = ['webhook_secret', 'github_token']; // in the server block of each game

const DESTINATION_DEFAULTS = {
  id: '',
  name: '',
  repository: '',
  branch: 'master',
  repo_sii_file: 'server_packages.sii',
  repo_dat_file: 'server_packages.dat',
};

const CLIENT_DEFAULTS = {
  enabled: false,
  documents_path: '', // where the game writes the files (export_server_packages); empty = Documents\<game folder>
  commit_message: '',
  debounce_seconds: 5,
  destinations: [],
  last_destination: '', // id of the destination chosen at the last export (preselected in the chooser)
};

const INSTANCE_DEFAULTS = {
  id: '',
  name: '',
  homedir: '', // -homedir of the server: server_config.sii, server_packages.sii/.dat, server.log.txt
  repository: '',
  branch: 'master',
  repo_sii_file: 'server_packages.sii',
  repo_dat_file: 'server_packages.dat',
  arguments: '', // added after -nosingle -homedir "..."
  // optional paths, empty = the usual file in the home folder (set by the migration of a 4.x server)
  sii_path: '',
  dat_path: '',
  config_path: '',
  log_path: '',
  backup_dir: '', // empty = 'backups' in the home folder
};

const SERVER_DEFAULTS = {
  enabled: false,
  install_dir: '', // installation of the dedicated server shared by the servers (bin\win_x64\<server>.exe inside)
  auto_update: true, // install new builds by themselves (stop the servers, update, start them again)
  update_hours: 2, // how often Steam is checked for a new build; 0 = only with the buttons
  sync_method: 'polling', // how new commits are found: 'polling' (asks GitHub every poll_minutes) | 'webhook'
  poll_minutes: 5,
  webhook_host: '0.0.0.0',
  webhook_port: 0,
  webhook_secret: '',
  github_token: '',
  backup_keep: 10,
  stop_timeout_seconds: 30,
  startup_check_seconds: 15,
  servers: [],
};

const clone = (value) => JSON.parse(JSON.stringify(value));

function gameDefaults(id) {
  const game = GAMES[id];
  return {
    client: { ...clone(CLIENT_DEFAULTS), commit_message: `Update ${game.name} server packages` },
    server: { ...clone(SERVER_DEFAULTS), webhook_port: game.defaultPort },
  };
}

const DEFAULTS = {
  version: VERSION,
  theme: 'system', // 'system' | 'light' | 'dark'
  language: 'system', // 'system' | 'en' | 'it'
  games: Object.fromEntries(GAME_IDS.map((id) => [id, gameDefaults(id)])),
};

// ------------------------------------------------------------------ ids

/** Id of a destination or server made from its name: lowercase letters, digits and dashes. */
function slug(text) {
  const base = String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  return base || 'server';
}

const VALID_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** A free id for `name` among `taken` (a Set): "eu", "eu-2", "eu-3"... */
function uniqueId(name, taken) {
  const base = slug(name);
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

// ------------------------------------------------------------------ cleaning

/**
 * Copy of `source` with the keys of `defaults` only, each one of the same type (numbers: whole and >= 0,
 * strings: at most 4096 characters). Wrong values keep the default and are listed in `skipped`.
 */
function pick(defaults, source, skipped = [], where = '') {
  const out = clone(defaults);
  if (!source || typeof source !== 'object') return out;
  for (const [key, def] of Object.entries(defaults)) {
    if (!(key in source) || Array.isArray(def)) continue;
    const value = source[key];
    const valid = typeof def === 'number' ? Number.isInteger(value) && value >= 0
      : typeof def === 'boolean' ? typeof value === 'boolean'
        : typeof value === 'string' && value.length <= 4096;
    if (valid) out[key] = value;
    else skipped.push(`${where}${key}`);
  }
  return out;
}

/** Items of a list (destinations or servers) with valid, unique ids. */
function pickList(defaults, list, skipped, where) {
  const taken = new Set();
  return (Array.isArray(list) ? list : []).slice(0, 50).map((item, i) => {
    const out = pick(defaults, item, skipped, `${where}[${i}].`);
    if (!VALID_ID.test(out.id) || taken.has(out.id)) out.id = uniqueId(out.name, taken);
    taken.add(out.id);
    return out;
  });
}

function pickGame(id, source, skipped = []) {
  const defaults = gameDefaults(id);
  const name = GAMES[id].name;
  const client = pick(defaults.client, source?.client, skipped, `${name} client.`);
  client.destinations = pickList(DESTINATION_DEFAULTS, source?.client?.destinations, skipped, `${name} client.destinations`);
  const server = pick(defaults.server, source?.server, skipped, `${name} server.`);
  if (!SYNC_METHODS.includes(server.sync_method)) server.sync_method = SERVER_DEFAULTS.sync_method;
  server.servers = pickList(INSTANCE_DEFAULTS, source?.server?.servers, skipped, `${name} server.servers`);
  return { client, server };
}

// ------------------------------------------------------------------ migration of older versions

// keys of the single-game settings of version 2.1 and older
const LEGACY_KEYS = {
  ets2_documents_path: 'documents_path',
  ets2_executable: 'executable',
  ets2_working_directory: 'working_directory',
  ets2_arguments: 'arguments',
};

const isLegacy = (data) => data && typeof data === 'object' && !data.games &&
  ['mode', 'repository', ...Object.keys(LEGACY_KEYS)].some((key) => key in data);

/** Settings of one game from an old flat file (same keys, with the ets2_ prefix on some). */
function fromLegacy(data) {
  const game = {};
  for (const [key, value] of Object.entries(data)) game[LEGACY_KEYS[key] || key] = value;
  return game;
}

/** Name of a repository for a destination or a server, e.g. "ets2-server-packages". */
function repoName(url) {
  try {
    return parseRepository(url).repo;
  } catch {
    return '';
  }
}

/**
 * A game of 4.x (one mode, one repository): its client becomes the first destination, its server the first
 * server, with the files where 4.x had them. Versions before 4.1 had the webhook only.
 */
function fromV4(id, g) {
  const game = GAMES[id];
  const text = (value) => (typeof value === 'string' ? value : '');
  const repository = text(g.repository);
  const files = {
    repository,
    branch: text(g.branch) || 'master',
    repo_sii_file: text(g.repo_sii_file) || 'server_packages.sii',
    repo_dat_file: text(g.repo_dat_file) || 'server_packages.dat',
  };
  const exe = text(g.executable);
  const sii = text(g.sii_path);
  const out = {
    client: {
      enabled: g.mode === 'client',
      documents_path: g.documents_path,
      commit_message: g.commit_message,
      debounce_seconds: g.debounce_seconds,
      destinations: repository && g.mode === 'client'
        ? [{ id: slug(repoName(repository) || game.name), name: repoName(repository) || game.name, ...files }] : [],
    },
    server: {
      enabled: g.mode === 'server',
      // the folder of the server: the setting of 4.x, or three levels above <folder>\bin\win_x64\<server>.exe
      install_dir: text(g.server_install_dir) || (exe ? path.resolve(path.dirname(exe), '..', '..') : ''),
      auto_update: g.server_auto_update,
      update_hours: g.server_update_hours,
      sync_method: g.sync_method || (g.mode === 'server' || g.webhook_secret ? 'webhook' : 'polling'),
      poll_minutes: g.poll_minutes,
      webhook_host: g.webhook_host,
      webhook_port: g.webhook_port,
      webhook_secret: g.webhook_secret,
      github_token: g.github_token,
      backup_keep: g.backup_keep,
      stop_timeout_seconds: g.stop_timeout_seconds,
      startup_check_seconds: g.startup_check_seconds,
      servers: g.mode === 'server' || sii ? [{
        id: 'main',
        name: `${game.name} server`,
        homedir: sii ? path.dirname(sii) : '',
        ...files,
        arguments: g.arguments,
        sii_path: sii,
        dat_path: g.dat_path,
        config_path: g.server_config_path,
        log_path: g.server_log_path,
        backup_dir: g.backup_dir,
      }] : [],
    },
  };
  // undefined values are dropped by pick(): the defaults are used
  return JSON.parse(JSON.stringify(out));
}

const versionOf = (data) => (Number.isInteger(data?.version) ? data.version : isLegacy(data) ? 2 : 4);

/** Game blocks in the v5 shape from stored or imported data of any version. */
function gamesOf(data) {
  const version = versionOf(data);
  if (version >= VERSION) return data.games || {};
  const sources = isLegacy(data) ? { ets2: fromLegacy(data) } : (data.games || {});
  return Object.fromEntries(Object.entries(sources)
    .filter(([id, g]) => GAMES[id] && g && typeof g === 'object')
    .map(([id, g]) => [id, fromV4(id, g)]));
}

/** Complete settings from stored or imported data: unknown keys dropped, missing ones defaulted. */
function normalize(stored = {}) {
  const games = gamesOf(stored || {});
  return {
    version: VERSION,
    theme: stored?.theme || DEFAULTS.theme,
    language: stored?.language || DEFAULTS.language,
    games: Object.fromEntries(GAME_IDS.map((id) => [id, pickGame(id, games[id])])),
  };
}

// ------------------------------------------------------------------ file

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

/** Returns { settings, migratedFrom } (version of the file when older), or null on first run. */
function loadSettings() {
  let stored;
  try {
    stored = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') log.error('Unreadable settings file, using defaults', err);
    return null;
  }
  const version = versionOf(stored);
  if (version < VERSION) {
    log.info(`Settings of version ${version === 2 ? '2.x' : '4.x'}: converted to the servers and destinations of 5.0`);
    // the file of the old version stays next to the new one, in case of a way back
    const backup = path.join(path.dirname(settingsFile()), `settings.v${version === 2 ? 2 : 4}.json`);
    if (!fs.existsSync(backup)) fs.copyFileSync(settingsFile(), backup);
  }
  const settings = normalize(stored);
  for (const id of GAME_IDS) {
    const server = settings.games[id].server;
    for (const key of SECRET_KEYS) {
      const value = server[key] || '';
      if (!value.startsWith('enc:')) continue;
      try {
        server[key] = safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'));
      } catch {
        log.error(`Cannot decrypt '${key}' of ${GAMES[id].name} (different Windows user?): set it again in Settings`);
        server[key] = '';
      }
    }
  }
  return { settings, migratedFrom: version < VERSION ? version : null };
}

function saveSettings(settings) {
  const stored = normalize(settings);
  for (const id of GAME_IDS) {
    const server = stored.games[id].server;
    for (const key of SECRET_KEYS) {
      if (server[key]) server[key] = 'enc:' + safeStorage.encryptString(server[key]).toString('base64');
    }
  }
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(stored, null, 2));
  log.info('Settings saved');
}

// ------------------------------------------------------------------ roles and validation

const clientOn = (settings, id) => settings.games[id].client.enabled;
const serverOn = (settings, id) => settings.games[id].server.enabled;

/** Games with at least one role on. */
const activeGames = (settings) => GAME_IDS.filter((id) => clientOn(settings, id) || serverOn(settings, id));

const repoKey = (item) => [
  item.repository.trim().replace(/(\.git)?\/*$/, '').toLowerCase(), item.branch, item.repo_sii_file, item.repo_dat_file,
].join('|');

const samePath = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

function repositoryErrors(item, label) {
  const errors = [];
  try {
    parseRepository(item.repository);
  } catch (err) {
    errors.push(`${label}: ${errorText(err)}`);
  }
  if (!item.branch.trim()) errors.push(t('err.required', { label: `${label} - ${t('field.branch')}` }));
  return errors;
}

/** Errors of the client block of a game, without the game name. */
function clientErrors(c) {
  const errors = [];
  if (!c.documents_path.trim()) errors.push(t('err.required', { label: t('field.documents') }));
  const names = new Set();
  for (const d of c.destinations) {
    const label = d.name.trim() || t('field.destination');
    if (!d.name.trim()) errors.push(t('err.required', { label: t('field.destinationName') }));
    else if (names.has(d.name.trim().toLowerCase())) errors.push(t('err.sameName', { name: d.name.trim() }));
    names.add(d.name.trim().toLowerCase());
    errors.push(...repositoryErrors(d, label));
  }
  const keys = c.destinations.map(repoKey);
  if (new Set(keys).size < keys.length) errors.push(t('err.sameDestination'));
  return errors;
}

/** Errors of the server block of a game, without the game name. */
function serverErrors(s) {
  const errors = [];
  if (!s.install_dir.trim()) errors.push(t('err.required', { label: t('field.installDir') }));
  if (s.sync_method === 'webhook' && !s.webhook_secret.trim()) errors.push(t('err.required', { label: t('field.webhookSecret') }));
  if (s.sync_method === 'polling' && s.poll_minutes < 1) errors.push(t('err.pollMinutes'));
  const names = new Set();
  for (const server of s.servers) {
    const label = server.name.trim() || t('field.server');
    if (!server.name.trim()) errors.push(t('err.required', { label: t('field.serverName') }));
    else if (names.has(server.name.trim().toLowerCase())) errors.push(t('err.sameName', { name: server.name.trim() }));
    names.add(server.name.trim().toLowerCase());
    if (!server.homedir.trim()) errors.push(t('err.required', { label: `${label} - ${t('field.homedir')}` }));
    errors.push(...repositoryErrors(server, label));
  }
  return errors;
}

/** Returns a list of error messages (empty when valid). */
function validateSettings(settings) {
  const errors = [];
  const active = activeGames(settings);
  if (!active.length) errors.push(t('err.chooseRole'));
  for (const id of GAME_IDS) {
    const { client, server } = settings.games[id];
    const own = [
      ...(client.enabled ? clientErrors(client) : []),
      ...(server.enabled ? serverErrors(server) : []),
    ];
    for (const [block, values] of [['client', client], ['server', server]]) {
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === 'number' && (!Number.isInteger(value) || value < 0)) own.push(t('err.number', { key: `${block}.${key}` }));
      }
    }
    errors.push(...own.map((e) => `${GAMES[id].name}: ${e}`));
  }

  // the webhook of each game needs its own port
  const ports = active.filter((id) => serverOn(settings, id) && settings.games[id].server.sync_method === 'webhook')
    .map((id) => settings.games[id].server.webhook_port);
  if (new Set(ports).size < ports.length) errors.push(t('err.samePort', { port: ports[0] }));

  // two servers in the same home folder would overwrite each other's files (also between ETS2 and ATS)
  const homes = active.filter((id) => serverOn(settings, id))
    .flatMap((id) => settings.games[id].server.servers.map((server) => ({ id, server })))
    .filter(({ server }) => server.homedir.trim());
  homes.forEach(({ id, server }, i) => {
    const other = homes.slice(i + 1).find((h) => samePath(h.server.homedir, server.homedir));
    if (other) {
      errors.push(t('err.sameHomedir', {
        a: `${GAMES[id].name} ${server.name}`, b: `${GAMES[other.id].name} ${other.server.name}`, path: server.homedir,
      }));
    }
  });

  // the clients of ETS2 and ATS writing the same files of the same branch would overwrite each other
  const targets = active.filter((id) => clientOn(settings, id)).flatMap((id) => settings.games[id].client.destinations.map(repoKey));
  const games = active.filter((id) => clientOn(settings, id));
  if (games.length > 1 && new Set(targets).size < targets.length) {
    const [a, b] = games.map((id) => new Set(settings.games[id].client.destinations.map(repoKey)));
    if ([...a].some((key) => b.has(key))) errors.push(t('err.sameRepo'));
  }
  return errors;
}

// ------------------------------------------------------------------ export / import (file shared between PCs)

const EXPORT_APP = 'ets2-package-sync';
const EXPORT_FORMAT = 3; // 1: one flat ETS2 block (2.1 and older), 2: one mode per game (4.x)

/** Settings file content: the games only (theme and language are personal). Secrets only when asked. */
function buildExport(values, includeSecrets, version) {
  const { games } = normalize({ ...values, version: VERSION });
  if (!includeSecrets) {
    for (const id of GAME_IDS) for (const key of SECRET_KEYS) delete games[id].server[key];
  }
  return JSON.stringify({
    app: EXPORT_APP,
    format: EXPORT_FORMAT,
    version,
    exportedAt: new Date().toISOString(),
    includesSecrets: Boolean(includeSecrets),
    settings: { version: VERSION, games },
  }, null, 2);
}

/**
 * Parse an exported file of any version: { settings: { games: { id: { client, server } } } } with only the games
 * in the file, each one complete (cleaned like the stored settings). Throws on a foreign file.
 */
function parseImport(text) {
  let data;
  try {
    data = JSON.parse(String(text).replace(/^﻿/, ''));
  } catch {
    throw new LocalizedError('err.notJson');
  }
  if (!data || data.app !== EXPORT_APP || typeof data.settings !== 'object' || !data.settings) {
    throw new LocalizedError('err.notSettings');
  }
  if (Number(data.format) > EXPORT_FORMAT) {
    throw new LocalizedError('err.newerFormat', { version: data.version || '?' });
  }
  const settings = Number(data.format) >= 3 ? { ...data.settings, version: VERSION } : { ...data.settings, version: data.format === 1 ? 2 : 4 };
  const sources = gamesOf(settings);
  const skipped = [];
  const games = {};
  const includesSecrets = GAME_IDS.some((id) => SECRET_KEYS.some((key) => key in (sources[id]?.server || {})));
  for (const id of GAME_IDS) {
    if (!sources[id] || typeof sources[id] !== 'object') continue;
    games[id] = pickGame(id, sources[id], skipped);
    // a file without secrets must not blank the ones of this PC: the renderer keeps them when missing
    for (const key of SECRET_KEYS) if (!(key in (sources[id].server || {}))) delete games[id].server[key];
  }
  return { settings: { games }, skipped, version: String(data.version || ''), includesSecrets };
}

module.exports = {
  VERSION, DEFAULTS, SECRET_KEYS, INSTANCE_DEFAULTS, DESTINATION_DEFAULTS, normalize, activeGames, clientOn, serverOn,
  loadSettings, saveSettings, validateSettings, buildExport, parseImport, slug, uniqueId, samePath,
};
