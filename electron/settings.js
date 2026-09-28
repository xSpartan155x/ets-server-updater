// Settings persisted in %APPDATA%\ETS2 Package Sync\settings.json.
// Secrets are encrypted with Electron safeStorage (DPAPI on Windows: only this Windows user can read them).
const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');
const log = require('./logger');
const { parseRepository } = require('./engine');

const SECRET_KEYS = ['webhook_secret', 'github_token'];

const DEFAULTS = {
  mode: '', // 'client' | 'server'
  theme: 'system', // 'system' | 'light' | 'dark'
  // shared
  repository: '',
  branch: 'master',
  repo_sii_file: 'server_packages.sii',
  repo_dat_file: 'server_packages.dat',
  // client
  ets2_documents_path: '', // where ETS2 writes the files (export_server_packages); empty = Documents\Euro Truck Simulator 2
  commit_message: 'Update ETS2 server packages',
  debounce_seconds: 5,
  // server
  webhook_host: '0.0.0.0',
  webhook_port: 8787,
  webhook_secret: '',
  github_token: '',
  sii_path: '',
  dat_path: '',
  ets2_executable: '',
  ets2_working_directory: '',
  ets2_arguments: '',
  backup_dir: '',
  backup_keep: 10,
  stop_timeout_seconds: 30,
  startup_check_seconds: 15,
  server_log_path: '', // shown in the Console page; empty = server.log.txt next to the .sii file
};

const NUMBER_KEYS = Object.keys(DEFAULTS).filter((k) => typeof DEFAULTS[k] === 'number');

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
  const settings = { ...DEFAULTS, ...stored };
  for (const key of SECRET_KEYS) {
    const value = settings[key] || '';
    if (value.startsWith('enc:')) {
      try {
        settings[key] = safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'));
      } catch {
        log.error(`Cannot decrypt '${key}' (different Windows user?): set it again in Settings`);
        settings[key] = '';
      }
    }
  }
  return settings;
}

function saveSettings(settings) {
  const stored = {};
  for (const key of Object.keys(DEFAULTS)) stored[key] = settings[key] ?? DEFAULTS[key];
  for (const key of SECRET_KEYS) {
    if (stored[key]) stored[key] = 'enc:' + safeStorage.encryptString(stored[key]).toString('base64');
  }
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(stored, null, 2));
  log.info('Settings saved');
}

/** Returns a list of error messages (empty when valid). */
function validateSettings(s) {
  const errors = [];
  if (!['client', 'server'].includes(s.mode)) errors.push('Choose the mode of this PC (Client or Server).');
  try {
    parseRepository(s.repository);
  } catch (err) {
    errors.push(err.message);
  }
  for (const key of NUMBER_KEYS) {
    if (!Number.isInteger(s[key]) || s[key] < 0) errors.push(`${key} must be a positive whole number.`);
  }
  const required = {
    client: { ets2_documents_path: 'ETS2 documents folder' },
    server: {
      webhook_secret: 'Webhook secret',
      sii_path: 'SII file path',
      dat_path: 'DAT file path',
      ets2_executable: 'ETS2 server executable',
    },
  }[s.mode] || {};
  for (const [key, label] of Object.entries(required)) {
    if (!String(s[key] || '').trim()) errors.push(`${label} is required.`);
  }
  return errors;
}

module.exports = { DEFAULTS, loadSettings, saveSettings, validateSettings };
