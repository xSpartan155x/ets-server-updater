// Server mode: receive GitHub push webhooks and install the new packages on the dedicated server of the game
// (download -> verify -> stop -> backup -> replace -> start, with rollback).
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { Engine, run, parseRepository, sleep } = require('./engine');
const { LogTail } = require('./log-tail');
const log = require('./logger');
const { t, LocalizedError, errorText } = require('./i18n');

const GITHUB_API = 'https://api.github.com';
const WEBHOOK_PATH = '/github-webhook';
const MAX_PAYLOAD = 25 * 1024 * 1024;
const ZERO_SHA = '0'.repeat(40);

class UpdateError extends LocalizedError {
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
  constructor(settings, game, stateFile) {
    super(settings, game);
    this.mode = 'server';
    this.stateFile = stateFile;
    this.branch = settings.branch;
    this.targets = new Map([
      [settings.repo_sii_file, settings.sii_path],
      [settings.repo_dat_file, settings.dat_path],
    ]);
    this.exe = settings.executable ? path.resolve(settings.executable) : '';
    this.workdir = settings.working_directory || (this.exe && path.dirname(this.exe));
    this.backupRoot = settings.backup_dir || path.join(path.dirname(settings.sii_path || '.'), 'backups');
    this.secret = settings.webhook_secret || '';
    this.consoleFile = settings.server_log_path || path.join(path.dirname(settings.sii_path || '.'), 'server.log.txt');
    this.console = new LogTail(this.consoleFile);
    this.console.on('lines', (update) => this.emit('console', update));
    this.history = this.loadHistory();
    this.jobs = [];
    this.pending = new Set();
    this.running = false;
    this.stopped = false;
    this.serverRunning = false;
    this.server = null;
    this.monitorTimer = null;
  }

  // ------------------------------------------------------------------ lifecycle

  async start() {
    ({ owner: this.owner, repo: this.repo } = parseRepository(this.s.repository));
    if (!this.secret) throw new LocalizedError('err.secretNotSet');
    for (const [key, message] of [['sii_path', 'err.siiNotSet'], ['dat_path', 'err.datNotSet'], ['executable', 'err.exeNotSet']]) {
      if (!this.s[key]) throw new LocalizedError(message);
    }
    await this.startWebhook();
    this.console.start();
    this.setStatus('status.idle', 'ok');
    this.refreshServerState(true);
    this.monitorTimer = setInterval(() => this.refreshServerState(), 15_000);
  }

  stop() {
    this.stopped = true;
    this.jobs = [];
    clearInterval(this.monitorTimer);
    this.console.stop();
    if (this.server) {
      this.server.close();
      this.server.closeAllConnections?.();
      this.server = null;
    }
  }

  infoLines() {
    return [
      t('tray.status', { status: this.status }),
      t(this.serverRunning ? 'tray.gameRunning' : 'tray.gameStopped', { game: this.game.name }),
      t('tray.lastUpdate', { value: this.lastUpdateText() }),
      t('tray.webhook', { port: this.s.webhook_port, path: WEBHOOK_PATH }),
    ];
  }

  actions() {
    return [
      { id: 'update', label: t('action.update') },
      { id: 'start', label: t('action.start', { game: this.game.name }) },
      { id: 'stop', label: t('action.stop', { game: this.game.name }) },
      { id: 'restart', label: t('action.restart', { game: this.game.name }) },
    ];
  }

  snapshot() {
    return {
      ...super.snapshot(),
      details: {
        serverRunning: this.serverRunning,
        lastCommit: this.history.last_commit || '',
        lastUpdate: this.history.last_update || '',
        port: this.s.webhook_port,
        webhookPath: WEBHOOK_PATH,
        queued: this.jobs.length,
        consoleFile: this.consoleFile,
      },
    };
  }

  runAction(id) {
    if (id === 'update') this.enqueue({ kind: 'manual' });
    if (['start', 'stop', 'restart'].includes(id)) this.enqueue({ kind: id });
  }

  lastUpdateText() {
    if (!this.history.last_commit) return t('tray.never');
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
      this.log.info(`Commit ${sha.slice(0, 7)} already processed or queued, skipping`);
      return false;
    }
    this.pending.add(sha);
    this.log.info(`Queued commit ${sha.slice(0, 7)}`);
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
          this.log.warn(`Rejected webhook from ${ip}: invalid signature`);
          return reply(401, 'invalid signature');
        }
        const event = req.headers['x-github-event'] || '';
        const [code, message] = this.handleEvent(event, body);
        this.log.info(`Webhook ${event} from ${ip} -> ${code} ${message}`);
        reply(code, message);
      });
    });

    return new Promise((resolve, reject) => {
      this.server.once('error', (err) => reject(
        err.code === 'EADDRINUSE' ? new LocalizedError('err.portInUse', { port: this.s.webhook_port }) : err));
      this.server.listen(Number(this.s.webhook_port), this.s.webhook_host, () => {
        this.log.info(`Server mode, webhook listening on ${this.s.webhook_host}:${this.s.webhook_port}${WEBHOOK_PATH}`);
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
      throw new UpdateError(response.status === 404 ? 'err.githubApi404' : 'err.githubApi',
        { status: response.status, path: apiPath, detail });
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
      if (meta.type !== 'file') throw new UpdateError('err.notAFile', { file: repoFile, sha: sha.slice(0, 7) });
      const data = Buffer.from(await (await this.apiGet(apiPath, 'application/vnd.github.raw', { ref: sha })).arrayBuffer());
      if (!data.length) throw new UpdateError('err.emptyFile', { file: repoFile, sha: sha.slice(0, 7) });
      if (data.length !== meta.size || gitBlobSha(data) !== meta.sha) {
        throw new UpdateError('err.mismatch', { file: repoFile });
      }
      files.set(repoFile, data);
      this.log.info(`Downloaded ${repoFile} (${data.length} bytes, blob ${meta.sha.slice(0, 7)})`);
    }
    return files;
  }

  // ------------------------------------------------------------------ dedicated server process

  /** PIDs of running processes whose executable is the configured dedicated server. */
  async findServer() {
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

  async stopServer() {
    const pids = await this.findServer();
    if (!pids.length) {
      this.log.info(`${this.game.name} is not running`);
      return false;
    }
    this.log.info(`Stopping ${this.game.name} (pid ${pids.join(', ')})`);
    for (const pid of pids) {
      try {
        process.kill(pid);
      } catch (err) {
        if (err.code !== 'ESRCH') this.log.warn(`Cannot stop pid ${pid}: ${err.message}`);
      }
    }
    const deadline = Date.now() + Number(this.s.stop_timeout_seconds) * 1000;
    while ((await this.findServer()).length) {
      if (Date.now() > deadline) throw new UpdateError('err.cannotStopGame', { game: this.game.name });
      await sleep(1000);
    }
    await sleep(2000); // give Windows time to release file handles
    return true;
  }

  /** Start the server and check that it stays up. Returns false if it exits during the check. */
  async startServer() {
    if ((await this.findServer()).length) {
      this.log.info(`${this.game.name} already running`);
      return true;
    }
    if (!fs.existsSync(this.exe)) throw new UpdateError('err.exeNotFound', { game: this.game.name, path: this.exe });
    const child = spawn(this.exe, splitArgs(this.s.arguments), {
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
    if (spawnError) throw new UpdateError('err.cannotStartGame', { game: this.game.name, message: spawnError.message });
    this.log.info(`Started ${this.game.name} (pid ${child.pid})`);
    this.console.rewind();

    const deadline = Date.now() + Number(this.s.startup_check_seconds) * 1000;
    while (Date.now() < deadline) {
      if (exitCode !== null) {
        this.log.error(`${this.game.name} exited during startup with code ${exitCode}`);
        return false;
      }
      await sleep(500);
    }
    return true;
  }

  /** Best effort start used on error paths: never leave the server down. */
  async ensureServerRunning() {
    try {
      if (!(await this.startServer())) this.log.error(`${this.game.name} failed to start`);
    } catch (err) {
      this.log.error(`Unable to start ${this.game.name}`, err);
    }
  }

  async restartServer() {
    await this.stopServer();
    if (!(await this.startServer())) throw new UpdateError('err.exitedAfterStart', { game: this.game.name });
  }

  async refreshServerState(force = false) {
    try {
      const running = (await this.findServer()).length > 0;
      if (force || running !== this.serverRunning) {
        if (running && !this.serverRunning) this.console.rewind(); // started outside this app
        this.serverRunning = running;
        this.emit('change');
      }
    } catch (err) {
      this.log.error(`Cannot check the ${this.game.name} process`, err);
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
    this.log.info(`Backup created: ${folder}`);

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
    this.log.warn(`Previous files restored from ${folder}`);
  }

  /** Write the new files next to the destination (same volume -> atomic rename). */
  stage(files) {
    const staged = new Map();
    for (const [repoFile, data] of files) {
      const dest = this.targets.get(repoFile);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const tmp = `${dest}.new`;
      fs.writeFileSync(tmp, data);
      if (!fs.readFileSync(tmp).equals(data)) throw new UpdateError('err.stagedCheck', { file: tmp });
      staged.set(dest, tmp);
    }
    return staged;
  }

  // ------------------------------------------------------------------ update

  async applyUpdate(sha) {
    const short = sha.slice(0, 7);
    this.setStatus('status.downloading', 'busy', { sha: short });
    const files = await this.download(sha); // any failure here leaves the server untouched

    if ([...files].every(([repoFile, data]) => fileSha256(this.targets.get(repoFile)) === sha256(data))) {
      this.log.info(`Commit ${short}: packages already up to date, no restart needed`);
      this.markProcessed(sha, true);
      return;
    }

    const staged = this.stage(files);
    let backup = null;
    try {
      this.setStatus('status.installing', 'busy', { sha: short });
      await this.stopServer();
      backup = this.backupCurrent(short);
      for (const [dest, tmp] of staged) {
        await retry(() => fs.renameSync(tmp, dest));
        this.log.info(`Installed ${dest}`);
      }
    } catch (err) {
      this.log.error(`Install of ${short} failed`, err);
      if (backup) await this.restore(backup);
      await this.ensureServerRunning();
      throw err;
    } finally {
      for (const tmp of staged.values()) fs.rmSync(tmp, { force: true });
    }

    this.setStatus('status.startingGame', 'busy');
    if (!(await this.startServer())) {
      await this.restore(backup);
      this.markProcessed(sha, false); // don't retry a broken commit automatically
      await this.ensureServerRunning();
      throw new UpdateError('err.rolledBack', { game: this.game.name, sha: short });
    }

    this.markProcessed(sha, true);
    this.log.info(`Update to ${short} completed`);
    this.notify(t('notify.gameUpdated', { game: this.game.name, sha: short }));
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
          this.setStatus('status.restartingGame', 'busy');
          await this.restartServer();
          this.notify(t('notify.gameRestarted', { game: this.game.name }));
        } else if (job.kind === 'start') {
          this.setStatus('status.startingGame', 'busy');
          if (!(await this.startServer())) throw new UpdateError('err.exitedAfterStart', { game: this.game.name });
        } else if (job.kind === 'stop') {
          this.setStatus('status.stoppingGame', 'busy');
          await this.stopServer();
        } else {
          let sha = job.sha;
          if (job.kind === 'manual') {
            this.setStatus('status.checkingGithub', 'busy');
            sha = await this.latestCommit();
            this.log.info(`Manual update: latest commit on ${this.branch} is ${sha.slice(0, 7)}`);
          }
          await this.applyUpdate(sha);
        }
        this.setStatus('status.idle', 'ok');
      } catch (err) {
        this.log.error(`${job.kind} job failed`, err);
        this.setError(err);
        this.notify(t('notify.updateFailed', { message: errorText(err) }));
      } finally {
        this.busy = false;
        if (job.kind === 'webhook') this.pending.delete(job.sha);
        await this.refreshServerState(true);
      }
    }
    this.running = false;
  }
}

module.exports = { ServerEngine, gitBlobSha, splitArgs };
