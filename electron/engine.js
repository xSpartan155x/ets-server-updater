// Shared base for the client/server engines (no Electron dependency, so they can be tested with plain Node).
const { execFile } = require('child_process');
const { EventEmitter } = require('events');
const log = require('./logger');
const { t, LocalizedError, errorText } = require('./i18n');

/** Logger that marks every line with the game, e.g. "[ATS] Pushed abc1234". */
function gameLog(game) {
  const tag = (message) => `[${game.name}] ${message}`;
  return {
    info: (message) => log.info(tag(message)),
    warn: (message) => log.warn(tag(message)),
    error: (message, err) => log.error(tag(message), err),
  };
}

class Engine extends EventEmitter {
  /** settings: the block of one game; game: its entry in games.js. */
  constructor(settings, game) {
    super();
    this.s = settings;
    this.game = game;
    this.log = gameLog(game);
    this.statusText = () => t('status.starting'); // translated when read: follows language changes
    this.state = 'busy'; // ok | busy | error | idle  (drives the tray icon colour)
    this.busy = false;
  }

  get status() {
    const text = this.statusText();
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }

  /** key: an i18n key such as 'status.idle' ({game} is filled in). */
  setStatus(key, state, params) {
    this.statusText = () => t(key, { game: this.game.name, ...params });
    this.state = state;
    this.emit('change');
  }

  setError(err) {
    this.statusText = () => t('status.error', { message: errorText(err) });
    this.state = 'error';
    this.emit('change');
  }

  notify(text) {
    this.emit('notify', text);
  }

  /** Lines shown in the tray menu. */
  infoLines() {
    return [t('tray.status', { status: this.status })];
  }

  /** [{ id, label }] actions shown in the tray and in the dashboard. */
  actions() {
    return [];
  }

  snapshot() {
    return { game: this.game.id, mode: this.mode, status: this.status, state: this.state, busy: this.busy, details: {} };
  }
}

/** execFile as a promise that never rejects on a non-zero exit code. */
function run(file, args, options = {}) {
  return new Promise((resolve) => {
    execFile(file, args, { windowsHide: true, maxBuffer: 20 * 1024 * 1024, ...options }, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === 'number' ? error.code : -1) : 0;
      resolve({ code, stdout: String(stdout || ''), stderr: String(stderr || (error && code === -1 ? error.message : '')) });
    });
  });
}

function parseRepository(url) {
  let parsed = null;
  try {
    parsed = new URL(String(url).trim());
  } catch {
    // handled below
  }
  const parts = parsed ? parsed.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '').split('/') : [];
  if (!parsed || !['github.com', 'www.github.com'].includes(parsed.hostname.toLowerCase()) ||
      parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new LocalizedError('err.repoUrl', { url });
  }
  return { owner: parts[0], repo: parts[1] };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { Engine, run, parseRepository, sleep };
