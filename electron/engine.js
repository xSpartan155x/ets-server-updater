// Shared base for the client/server engines (no Electron dependency, so they can be tested with plain Node).
const { execFile } = require('child_process');
const { EventEmitter } = require('events');

class Engine extends EventEmitter {
  constructor(settings) {
    super();
    this.s = settings;
    this.status = 'Starting';
    this.state = 'busy'; // ok | busy | error | idle  (drives the tray icon colour)
    this.busy = false;
  }

  setStatus(text, state) {
    this.status = text.length > 120 ? `${text.slice(0, 117)}...` : text;
    this.state = state;
    this.emit('change');
  }

  notify(text) {
    this.emit('notify', text);
  }

  /** Lines shown in the tray menu. */
  infoLines() {
    return [`Status: ${this.status}`];
  }

  /** [{ id, label }] actions shown in the tray and in the dashboard. */
  actions() {
    return [];
  }

  snapshot() {
    return { mode: this.mode, status: this.status, state: this.state, busy: this.busy, details: {} };
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
    throw new Error(`Invalid GitHub repository URL "${url}" (expected https://github.com/USER/REPOSITORY)`);
  }
  return { owner: parts[0], repo: parts[1] };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { Engine, run, parseRepository, sleep };
