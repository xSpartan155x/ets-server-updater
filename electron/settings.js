// Settings persisted in %APPDATA%\ETS2 Package Sync\settings.json: personal preferences (theme, language)
// plus one block per game in `games` (see games.js). Files of older versions (one flat ETS2 block) are
// migrated to games.ets2 when loaded.
// Secrets are encrypted with Electron safeStorage (DPAPI on Windows: only this Windows user can read them).
const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');
const log = require('./logger');
const { parseRepository } = require('./engine');
const { GAMES, GAME_IDS } = require('./games');
const { t, LocalizedError, errorText } = require('./i18n');

const SECRET_KEYS = ['webhook_secret', 'github_token'];
const MODES = ['client', 'server'];

const GAME_DEFAULTS = {
  mode: '', // '' (not used) | 'client' | 'server'
  // shared
  repository: '',
  branch: 'master',
  repo_sii_file: 'server_packages.sii',
  repo_dat_file: 'server_packages.dat',
  // client
  documents_path: '', // where the game writes the files (export_server_packages); empty = Documents\<game folder>
  commit_message: '',
  debounce_seconds: 5,
  // server
  webhook_host: '0.0.0.0',
  webhook_port: 0,
  webhook_secret: '',
  github_token: '',
  sii_path: '',
  dat_path: '',
  executable: '',
  working_directory: '',
  arguments: '',
  backup_dir: '',
  backup_keep: 10,
  stop_timeout_seconds: 30,
  startup_check_seconds: 15,
  server_log_path: '', // shown in the Console page; empty = server.log.txt next to the .sii file
};

const NUMBER_KEYS = Object.keys(GAME_DEFAULTS).filter((k) => typeof GAME_DEFAULTS[k] === 'number');

// keys of the single-game settings of version 2.1 and older
const LEGACY_KEYS = {
  ets2_documents_path: 'documents_path',
  ets2_executable: 'executable',
  ets2_working_directory: 'working_directory',
  ets2_arguments: 'arguments',
};

function gameDefaults(id) {
  const game = GAMES[id];
  return { ...GAME_DEFAULTS, webhook_port: game.defaultPort, commit_message: `Update ${game.name} server packages` };
}

const DEFAULTS = {
  theme: 'system', // 'system' | 'light' | 'dark'
  language: 'system', // 'system' | 'en' | 'it'
  games: Object.fromEntries(GAME_IDS.map((id) => [id, gameDefaults(id)])),
};

const isLegacy = (data) => data && typeof data === 'object' && !data.games &&
  ['mode', 'repository', ...Object.keys(LEGACY_KEYS)].some((key) => key in data);

/** Settings of one game from an old flat file (same keys, with the ets2_ prefix on some). */
function fromLegacy(data) {
  const game = {};
  for (const [key, value] of Object.entries(data)) game[LEGACY_KEYS[key] || key] = value;
  return game;
}

/** Complete settings from stored or imported data: unknown keys dropped, missing ones defaulted. */
function normalize(stored = {}) {
  const games = {};
  for (const id of GAME_IDS) {
    const source = isLegacy(stored) ? (id === 'ets2' ? fromLegacy(stored) : {}) : (stored.games?.[id] || {});
    games[id] = gameDefaults(id);
    for (const key of Object.keys(GAME_DEFAULTS)) if (key in source) games[id][key] = source[key];
  }
  return { theme: stored.theme || DEFAULTS.theme, language: stored.language || DEFAULTS.language, games };
}

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

/** Returns the saved settings, or null on first run. */
function loadSettings() {
  let stored;
  try {
    stored = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') log.error('Unreadable settings file, using defaults', err);
    return null;
  }
  if (isLegacy(stored)) log.info('Settings of a previous version: moved to the ETS2 game');
  const settings = normalize(stored);
  for (const id of GAME_IDS) {
    for (const key of SECRET_KEYS) {
      const value = settings.games[id][key] || '';
      if (!value.startsWith('enc:')) continue;
      try {
        settings.games[id][key] = safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'));
      } catch {
        log.error(`Cannot decrypt '${key}' of ${GAMES[id].name} (different Windows user?): set it again in Settings`);
        settings.games[id][key] = '';
      }
    }
  }
  return settings;
}

function saveSettings(settings) {
  const stored = normalize(settings);
  for (const id of GAME_IDS) {
    for (const key of SECRET_KEYS) {
      const value = stored.games[id][key];
      if (value) stored.games[id][key] = 'enc:' + safeStorage.encryptString(value).toString('base64');
    }
  }
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(stored, null, 2));
  log.info('Settings saved');
}

const activeGames = (settings) => GAME_IDS.filter((id) => MODES.includes(settings.games[id].mode));

/** Errors of one game, without the game name. */
function validateGame(s) {
  const errors = [];
  try {
    parseRepository(s.repository);
  } catch (err) {
    errors.push(errorText(err));
  }
  const required = {
    client: { documents_path: 'field.documents' },
    server: {
      webhook_secret: 'field.webhookSecret',
      sii_path: 'field.siiPath',
      dat_path: 'field.datPath',
      executable: 'field.serverExe',
    },
  }[s.mode] || {};
  for (const [key, label] of Object.entries(required)) {
    if (!String(s[key] || '').trim()) errors.push(t('err.required', { label: t(label) }));
  }
  return errors;
}

/** Returns a list of error messages (empty when valid). */
function validateSettings(settings) {
  const errors = [];
  const active = activeGames(settings);
  if (!active.length) errors.push(t('err.chooseMode'));
  for (const id of GAME_IDS) {
    const s = settings.games[id];
    const own = active.includes(id) ? validateGame(s) : [];
    for (const key of NUMBER_KEYS) {
      if (!Number.isInteger(s[key]) || s[key] < 0) own.push(t('err.number', { key }));
    }
    errors.push(...own.map((e) => `${GAMES[id].name}: ${e}`));
  }
  const ports = active.filter((id) => settings.games[id].mode === 'server').map((id) => settings.games[id].webhook_port);
  if (new Set(ports).size < ports.length) errors.push(t('err.samePort', { port: ports[0] }));
  // two games writing the same files of the same branch would overwrite each other
  const targets = active.map((id) => {
    const s = settings.games[id];
    return [s.repository.trim().replace(/(\.git)?\/*$/, '').toLowerCase(), s.branch, s.repo_sii_file, s.repo_dat_file].join('|');
  });
  if (new Set(targets).size < targets.length) errors.push(t('err.sameRepo'));
  return errors;
}

// ------------------------------------------------------------------ export / import (file shared between PCs)

const EXPORT_APP = 'ets2-package-sync';
const EXPORT_FORMAT = 2; // 1: one flat ETS2 block (version 2.1 and older)

/** Settings file content: the games only (theme and language are personal). Secrets only when asked. */
function buildExport(values, includeSecrets, version) {
  const { games } = normalize(values);
  if (!includeSecrets) {
    for (const id of GAME_IDS) for (const key of SECRET_KEYS) delete games[id][key];
  }
  return JSON.stringify({
    app: EXPORT_APP,
    format: EXPORT_FORMAT,
    version,
    exportedAt: new Date().toISOString(),
    includesSecrets: Boolean(includeSecrets),
    settings: { games },
  }, null, 2);
}

/**
 * Parse an exported file: only known keys with a valid type are kept, as { games: { id: {...} } } with only
 * the games in the file. Throws on a foreign file.
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
  const sources = isLegacy(data.settings) ? { ets2: fromLegacy(data.settings) } : (data.settings.games || {});
  const games = {};
  const skipped = [];
  for (const id of GAME_IDS) {
    const source = sources[id];
    if (!source || typeof source !== 'object') continue;
    games[id] = {};
    for (const [key, value] of Object.entries(source)) {
      if (!(key in GAME_DEFAULTS)) continue;
      const valid = typeof GAME_DEFAULTS[key] === 'number'
        ? Number.isInteger(value) && value >= 0
        : typeof value === 'string' && value.length <= 4096 && (key !== 'mode' || ['', ...MODES].includes(value));
      if (valid) games[id][key] = value;
      else skipped.push(`${GAMES[id].name} ${key}`);
    }
  }
  const includesSecrets = Object.values(games).some((game) => SECRET_KEYS.some((k) => k in game));
  return { settings: { games }, skipped, version: String(data.version || ''), includesSecrets };
}

module.exports = { DEFAULTS, normalize, activeGames, loadSettings, saveSettings, validateSettings, buildExport, parseImport };
