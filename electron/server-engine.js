// Server mode: receive GitHub push webhooks and install the new packages on the ETS2 server
// (download -> verify -> stop -> backup -> replace -> start, with rollback).
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { Engine, run, parseRepository, sleep } = require('./engine');
const log = require('./logger');

const GITHUB_API = 'https://api.github.com';
const WEBHOOK_PATH = '/github-webhook';
const MAX_PAYLOAD = 25 * 1024 * 1024;
const ZERO_SHA = '0'.repeat(40);

class UpdateError extends Error {
  get name() { return 'UpdateError'; }
}

/** SHA-1 exactly as git computes it for a blob (matches the GitHub contents API "sha"). */
const gitBlobSha = (data) =>
  crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

const fileSha256 = (file) => (fs.existsSync(file) ? sha256(fs.readFileSync(file)) : null);

/** Split a Windows-style command line into arguments ("quoted parts" allowed). */
const splitArgs = (text) => [...String(text || '').matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2]);

/** Retry a file operation that may fail while Windows still holds a lock on the file. */
async function retry(action, attempts = 10) {
  for (let i = 0; ; i++) {
    try {
      return action();
    } catch (err) {
      if (i >= attempts - 1 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) throw err;
      await sleep(1000);
    }
  }
}

class ServerEngine extends Engine {
  constructor(settings, stateFile) {
    super(settings);
    this.mode = 'server';
    this.stateFile = stateFile;
    this.branch = settings.branch;
    this.targets = new Map([
      [settings.repo_sii_file, settings.sii_path],
      [settings.repo_dat_file, settings.dat_path],
    ]);
    this.exe = settings.ets2_executable ? path.resolve(settings.ets2_executable) : '';
    this.workdir = settings.ets2_working_directory || (this.exe && path.dirname(this.exe));
    this.backupRoot = settings.backup_dir || path.join(path.dirname(settings.sii_path || '.'), 'backups');
    this.secret = settings.webhook_secret || '';
    this.history = this.loadHistory();
    this.jobs = [];
    this.pending = new Set();
    this.running = false;
    this.stopped = false;
    this.ets2Running = false;
    this.server = null;
    this.monitorTimer = null;
  }

  // ------------------------------------------------------------------ lifecycle

  async start() {
    ({ owner: this.owner, repo: this.repo } = parseRepository(this.s.repository));
    if (!this.secret) throw new Error('Webhook secret not set');
    for (const [key, name] of [['sii_path', 'SII file'], ['dat_path', 'DAT file'], ['ets2_executable', 'ETS2 executable']]) {
      if (!this.s[key]) throw new Error(`${name} path not set`);
    }
    await this.startWebhook();
    this.setStatus('Idle', 'ok');
    this.refreshEts2State(true);
    this.monitorTimer = setInterval(() => this.refreshEts2State(), 15_000);
  }

  stop() {
    this.stopped = true;
    this.jobs = [];
    clearInterval(this.monitorTimer);
    if (this.server) {
      this.server.close();
      this.server.closeAllConnections?.();
      this.server = null;
    }
  }

  infoLines() {
    return [
      `Status: ${this.status}`,
      `ETS2: ${this.ets2Running ? 'running' : 'stopped'}`,
      `Last update: ${this.lastUpdateText()}`,
      `Webhook: port ${this.s.webhook_port} ${WEBHOOK_PATH}`,
    ];
  }

  actions() {
    return [{ id: 'update', label: 'Update Now' }, { id: 'restart', label: 'Restart ETS2' }];
  }

  snapshot() {
    return {
      ...super.snapshot(),
      details: {
        ets2Running: this.ets2Running,
        lastCommit: this.history.last_commit || '',
        lastUpdate: this.history.last_update || '',
        port: this.s.webhook_port,
        webhookPath: WEBHOOK_PATH,
        queued: this.jobs.length,
      },
    };
  }

  runAction(id) {
    if (id === 'update') this.enqueue({ kind: 'manual' });
    if (id === 'restart') this.enqueue({ kind: 'restart' });
  }

  lastUpdateText() {
    if (!this.history.last_commit) return 'never';
    return `${this.history.last_update} (${this.history.last_commit.slice(0, 7)})`;
  }

  // ------------------------------------------------------------------ history

  loadHistory() {
    try {
      return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
    } catch {
      return { processed: [], last_commit: '', last_update: '' };
    }
  }

  markProcessed(sha, installed) {
    const processed = (this.history.processed || []).filter((s) => s !== sha);
    processed.push(sha);
    this.history.processed = processed.slice(-100);
    if (installed) {
      this.history.last_commit = sha;
      this.history.last_update = new Date().toLocaleString();
    }
    fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
    fs.writeFileSync(this.stateFile, JSON.stringify(this.history, null, 2));
  }

  // ------------------------------------------------------------------ webhook

  verifySignature(body, header) {
    if (!header || !header.startsWith('sha256=')) return false;
    const expected = Buffer.from(crypto.createHmac('sha256', this.secret).update(body).digest('hex'));
    const received = Buffer.from(header.slice('sha256='.length));
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }

  handleEvent(event, body) {
    if (event === 'ping') return [200, 'pong'];
    if (event !== 'push') return [202, `ignored event '${event}'`];
    let payload;
    try {
      payload = JSON.parse(body.toString('utf8'));
    } catch {
      return [400, 'payload must be application/json'];
    }
    if (payload.ref !== `refs/heads/${this.branch}`) return [202, `ignored ref ${payload.ref}`];
    const sha = payload.after || '';
    if (payload.deleted || sha.length !== 40 || sha === ZERO_SHA) return [202, 'ignored: no new commit'];
    return this.enqueueCommit(sha) ? [202, `queued ${sha.slice(0, 7)}`] : [202, `duplicate ${sha.slice(0, 7)}`];
  }

  enqueueCommit(sha) {
    if (this.pending.has(sha) || (this.history.processed || []).includes(sha)) {
      log.info(`Commit ${sha.slice(0, 7)} already processed or queued, skipping`);
      return false;
    }
    this.pending.add(sha);
    log.info(`Queued commit ${sha.slice(0, 7)}`);
    this.enqueue({ kind: 'webhook', sha });
    return true;
  }

  startWebhook() {
    this.server = http.createServer((req, res) => {
      const reply = (code, text) => {
        res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(text);
      };
      const url = (req.url || '').split('?')[0];
      if (req.method === 'GET' && url === '/health') return reply(200, 'OK');
      if (req.method !== 'POST' || url !== WEBHOOK_PATH) return reply(404, 'not found');

      const chunks = [];
      let size = 0;
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_PAYLOAD) {
          reply(413, 'payload too large');
          req.destroy();
        } else {
          chunks.push(chunk);
        }
      });
      req.on('end', () => {
        if (size > MAX_PAYLOAD) return;
        const body = Buffer.concat(chunks);
        const ip = req.socket.remoteAddress;
        if (!this.verifySignature(body, req.headers['x-hub-signature-256'])) {
          log.warn(`Rejected webhook from ${ip}: invalid signature`);
          return reply(401, 'invalid signature');
        }
        const event = req.headers['x-github-event'] || '';
        const [code, message] = this.handleEvent(event, body);
        log.info(`Webhook ${event} from ${ip} -> ${code} ${message}`);
        reply(code, message);
      });
    });

    return new Promise((resolve, reject) => {
      this.server.once('error', (err) => reject(new Error(
        err.code === 'EADDRINUSE' ? `port ${this.s.webhook_port} is already in use` : err.message)));
      this.server.listen(Number(this.s.webhook_port), this.s.webhook_host, () => {
        log.info(`Server mode, webhook listening on ${this.s.webhook_host}:${this.s.webhook_port}${WEBHOOK_PATH}`);
        resolve();
      });
    });
  }

  // ------------------------------------------------------------------ GitHub

  async apiGet(apiPath, accept = 'application/vnd.github+json', params = {}) {
    const url = new URL(`${GITHUB_API}/repos/${this.owner}/${this.repo}/${apiPath}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const headers = { Accept: accept, 'User-Agent': 'ETS2PackageSync', 'X-GitHub-Api-Version': '2022-11-28' };
    if (this.s.github_token) headers.Authorization = `Bearer ${this.s.github_token}`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) });
    if (response.status !== 200) {
      let detail = (await response.text()).slice(0, 200);
      try {
        detail = JSON.parse(detail).message || detail;
      } catch {
        // not JSON: keep the text
      }
      const hint = response.status === 404 ? ' (check repository URL, branch, file names and the token for private repositories)' : '';
      throw new UpdateError(`GitHub API ${response.status} on ${apiPath}: ${detail}${hint}`);
    }
    return response;
  }

  async latestCommit() {
    const r = await this.apiGet(`commits/${encodeURIComponent(this.branch)}`, 'application/vnd.github.sha');
    return (await r.text()).trim();
  }

  /** Download both package files at a commit and verify them against git's blob hash. */
  async download(sha) {
    const files = new Map();
    for (const repoFile of this.targets.keys()) {
      const apiPath = `contents/${repoFile.split('/').map(encodeURIComponent).join('/')}`;
      const meta = await (await this.apiGet(apiPath, undefined, { ref: sha })).json();
      if (meta.type !== 'file') throw new UpdateError(`${repoFile} is not a file in commit ${sha.slice(0, 7)}`);
      const data = Buffer.from(await (await this.apiGet(apiPath, 'application/vnd.github.raw', { ref: sha })).arrayBuffer());
      if (!data.length) throw new UpdateError(`${repoFile} is empty in commit ${sha.slice(0, 7)}`);
      if (data.length !== meta.size || gitBlobSha(data) !== meta.sha) {
        throw new UpdateError(`${repoFile}: downloaded content does not match the repository (size/hash)`);
      }
      files.set(repoFile, data);
      log.info(`Downloaded ${repoFile} (${data.length} bytes, blob ${meta.sha.slice(0, 7)})`);
    }
    return files;
  }

  // ------------------------------------------------------------------ ETS2 process

  /** PIDs of running processes whose executable is the configured ETS2 server. */
  async findEts2() {
    if (!this.exe) return [];
    const name = path.basename(this.exe).replace(/'/g, "''");
    const script = `Get-CimInstance Win32_Process -Filter 'Name = "${name}"' | ` +
      'Select-Object ProcessId,ExecutablePath | ConvertTo-Json -Compress';
    const r = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 30_000 });
    if (r.code !== 0 || !r.stdout.trim()) return [];
    const list = [].concat(JSON.parse(r.stdout));
    const target = this.exe.toLowerCase();
    // ExecutablePath is null for processes of other users: match them by name only
    return list.filter((p) => !p.ExecutablePath || path.resolve(p.ExecutablePath).toLowerCase() === target)
      .map((p) => p.ProcessId);
  }

  async stopEts2() {
    const pids = await this.findEts2();
    if (!pids.length) {
      log.info('ETS2 is not running');
      return false;
    }
    log.info(`Stopping ETS2 (pid ${pids.join(', ')})`);
    for (const pid of pids) {
      try {
        process.kill(pid);
      } catch (err) {
        if (err.code !== 'ESRCH') log.warn(`Cannot stop pid ${pid}: ${err.message}`);
      }
    }
    const deadline = Date.now() + Number(this.s.stop_timeout_seconds) * 1000;
    while ((await this.findEts2()).length) {
      if (Date.now() > deadline) throw new UpdateError('unable to stop ETS2');
      await sleep(1000);
    }
    await sleep(2000); // give Windows time to release file handles
    return true;
  }

  /** Start ETS2 and check that it stays up. Returns false if it exits during the check. */
  async startEts2() {
    if ((await this.findEts2()).length) {
      log.info('ETS2 already running');
      return true;
    }
    if (!fs.existsSync(this.exe)) throw new UpdateError(`ETS2 executable not found: ${this.exe}`);
    const child = spawn(this.exe, splitArgs(this.s.ets2_arguments), {
      cwd: this.workdir,
      detached: true, // own console window, keeps running if this app exits
      stdio: 'ignore',
    });
    let exitCode = null;
    let spawnError = null;
    child.on('exit', (code) => { exitCode = code ?? -1; });
    child.on('error', (err) => { spawnError = err; });
    child.unref();
    await sleep(500);
    if (spawnError) throw new UpdateError(`cannot start ETS2: ${spawnError.message}`);
    log.info(`Started ETS2 (pid ${child.pid})`);

    const deadline = Date.now() + Number(this.s.startup_check_seconds) * 1000;
    while (Date.now() < deadline) {
      if (exitCode !== null) {
        log.error(`ETS2 exited during startup with code ${exitCode}`);
        return false;
      }
      await sleep(500);
    }
    return true;
  }

  /** Best effort start used on error paths: never leave the server down. */
  async ensureEts2Running() {
    try {
      if (!(await this.startEts2())) log.error('ETS2 failed to start');
    } catch (err) {
      log.error('Unable to start ETS2', err);
    }
  }

  async restartEts2() {
    await this.stopEts2();
    if (!(await this.startEts2())) throw new UpdateError('ETS2 exited right after start');
  }

  async refreshEts2State(force = false) {
    try {
      const running = (await this.findEts2()).length > 0;
      if (force || running !== this.ets2Running) {
        this.ets2Running = running;
        this.emit('change');
      }
    } catch (err) {
      log.error('Cannot check the ETS2 process', err);
    }
  }

  // ------------------------------------------------------------------ files

  backupCurrent(tag) {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    const folder = path.join(this.backupRoot, `${stamp}_${tag}`);
    fs.mkdirSync(folder, { recursive: true });
    for (const dest of this.targets.values()) {
      if (fs.existsSync(dest)) fs.copyFileSync(dest, path.join(folder, path.basename(dest)));
    }
    log.info(`Backup created: ${folder}`);

    const backups = fs.readdirSync(this.backupRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name).sort();
    for (const old of backups.slice(0, Math.max(0, backups.length - Number(this.s.backup_keep)))) {
      fs.rmSync(path.join(this.backupRoot, old), { recursive: true, force: true });
    }
    return folder;
  }

  async restore(folder) {
    for (const dest of this.targets.values()) {
      const src = path.join(folder, path.basename(dest));
      if (fs.existsSync(src)) await retry(() => fs.copyFileSync(src, dest));
    }
    log.warn(`Previous files restored from ${folder}`);
  }

  /** Write the new files next to the destination (same volume -> atomic rename). */
  stage(files) {
    const staged = new Map();
    for (const [repoFile, data] of files) {
      const dest = this.targets.get(repoFile);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const tmp = `${dest}.new`;
      fs.writeFileSync(tmp, data);
      if (!fs.readFileSync(tmp).equals(data)) throw new UpdateError(`verification of staged file ${tmp} failed`);
      staged.set(dest, tmp);
    }
    return staged;
  }

  // ------------------------------------------------------------------ update

  async applyUpdate(sha) {
    const short = sha.slice(0, 7);
    this.setStatus(`Downloading ${short}...`, 'busy');
    const files = await this.download(sha); // any failure here leaves ETS2 untouched

    if ([...files].every(([repoFile, data]) => fileSha256(this.targets.get(repoFile)) === sha256(data))) {
      log.info(`Commit ${short}: packages already up to date, no restart needed`);
      this.markProcessed(sha, true);
      return;
    }

    const staged = this.stage(files);
    let backup = null;
    try {
      this.setStatus(`Installing ${short}...`, 'busy');
      await this.stopEts2();
      backup = this.backupCurrent(short);
      for (const [dest, tmp] of staged) {
        await retry(() => fs.renameSync(tmp, dest));
        log.info(`Installed ${dest}`);
      }
    } catch (err) {
      log.error(`Install of ${short} failed`, err);
      if (backup) await this.restore(backup);
      await this.ensureEts2Running();
      throw err;
    } finally {
      for (const tmp of staged.values()) fs.rmSync(tmp, { force: true });
    }

    this.setStatus('Starting ETS2...', 'busy');
    if (!(await this.startEts2())) {
      await this.restore(backup);
      this.markProcessed(sha, false); // don't retry a broken commit automatically
      await this.ensureEts2Running();
      throw new UpdateError(`ETS2 did not start with commit ${short}: previous files restored`);
    }

    this.markProcessed(sha, true);
    log.info(`Update to ${short} completed`);
    this.notify(`ETS2 updated to commit ${short}`);
  }

  enqueue(job) {
    this.jobs.push(job);
    this.processJobs();
  }

  async processJobs() {
    if (this.running) return;
    this.running = true;
    while (this.jobs.length && !this.stopped) {
      const job = this.jobs.shift();
      this.busy = true;
      try {
        if (job.kind === 'restart') {
          this.setStatus('Restarting ETS2...', 'busy');
          await this.restartEts2();
          this.notify('ETS2 restarted');
        } else {
          let sha = job.sha;
          if (job.kind === 'manual') {
            this.setStatus('Checking GitHub...', 'busy');
            sha = await this.latestCommit();
            log.info(`Manual update: latest commit on ${this.branch} is ${sha.slice(0, 7)}`);
          }
          await this.applyUpdate(sha);
        }
        this.setStatus('Idle', 'ok');
      } catch (err) {
        log.error(`${job.kind} job failed`, err);
        this.setStatus(`Error: ${err.message}`, 'error');
        this.notify(`Update failed: ${err.message}`);
      } finally {
        this.busy = false;
        if (job.kind === 'webhook') this.pending.delete(job.sha);
        await this.refreshEts2State(true);
      }
    }
    this.running = false;
  }
}

module.exports = { ServerEngine, gitBlobSha, splitArgs };
