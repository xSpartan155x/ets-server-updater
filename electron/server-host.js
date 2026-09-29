// Server role of a game: one installation of the dedicated server (kept up to date with SteamCMD) shared by any
// number of servers (ServerInstance), each started with its own -homedir. The host finds the new commits of the
// repositories of the servers (polling of each repository, or one GitHub webhook for all of them), tells each
// server which processes are its own, and runs every job (installs, start/stop, SteamCMD) one at a time.
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { Engine, run } = require('./engine');
const { GitHubRepo, repoKey } = require('./github');
const { ServerInstance } = require('./server-instance');
const { installedBuild } = require('./steamcmd');
const { t, LocalizedError, errorText } = require('./i18n');

const WEBHOOK_PATH = '/github-webhook';
const MAX_PAYLOAD = 25 * 1024 * 1024;
const ZERO_SHA = '0'.repeat(40);
const FIRST_STEAM_CHECK_MS = 60_000; // first check for a new server build, after the start of the app
const FIRST_POLL_MS = 10_000; // first check of the repositories (polling), after the start of the app
const SCAN_MS = 15_000; // how often the processes of the servers are looked for

/** -homedir of a command line ("..." or a single word), null when missing. */
function homedirOf(commandLine) {
  const match = /(?:^|\s)-homedir\s+(?:"([^"]*)"|(\S+))/i.exec(String(commandLine || ''));
  return match ? (match[1] ?? match[2]) : null;
}

const samePath = (a, b) => Boolean(a && b) && path.resolve(a).replace(/[\\/]+$/, '').toLowerCase() === path.resolve(b).replace(/[\\/]+$/, '').toLowerCase();

class ServerHost extends Engine {
  /**
   * settings: the server block of the game; stateDir: folder of the histories of its servers and of steam.json;
   * documentsHome: the default home of the server (Documents\<game>), for processes started without -homedir.
   */
  constructor(settings, game, { stateDir, steamcmd, documentsHome }) {
    super(settings, game);
    this.mode = 'server';
    this.steamcmd = steamcmd;
    this.stateDir = stateDir;
    this.documentsHome = documentsHome;
    this.installDir = settings.install_dir ? path.resolve(settings.install_dir) : '';
    this.exe = this.installDir ? path.join(this.installDir, 'bin', 'win_x64', game.serverExe) : '';
    this.steamFile = path.join(stateDir, 'steam.json');
    this.steamState = this.loadSteamState();
    this.steam = { phase: null };
    this.instances = new Map();
    for (const s of settings.servers) {
      const instance = new ServerInstance(s, this, path.join(stateDir, `${s.id}.json`));
      instance.on('console', (update) => this.emit('console', { server: s.id, ...update }));
      this.instances.set(s.id, instance);
    }
    this.jobs = [];
    this.running = false;
    this.stopped = false;
    this.server = null;
    this.timers = [];
    this.pollFailed = new Map(); // repository key -> true while its check fails
  }

  get list() {
    return [...this.instances.values()];
  }

  // ------------------------------------------------------------------ lifecycle

  async start() {
    if (!this.installDir) throw new LocalizedError('err.installDirNotSet');
    const polling = this.s.sync_method !== 'webhook';
    if (!polling && !this.s.webhook_secret) throw new LocalizedError('err.secretNotSet');
    if (polling) this.schedulePolling();
    else await this.startWebhook();
    for (const instance of this.list) instance.console.start();
    this.idle();
    await this.scan();
    this.timers.push(setInterval(() => this.scan(), SCAN_MS));
    this.scheduleSteamChecks();
  }

  stop() {
    this.stopped = true;
    this.jobs = [];
    for (const timer of [...this.timers, ...(this.steamTimers || [])]) clearTimeout(timer); // clearTimeout also clears intervals
    this.timers = [];
    this.steamTimers = [];
    for (const instance of this.list) instance.console.stop();
    if (this.server) {
      this.server.close();
      this.server.closeAllConnections?.();
      this.server = null;
    }
  }

  /** Status when no job runs: how many servers are running. */
  idle() {
    const total = this.instances.size;
    this.statusText = () => (total
      ? t('status.serversSummary', { running: this.list.filter((i) => i.running).length, total })
      : t('status.noServers'));
    this.state = 'ok';
    this.emit('change');
  }

  /** Worst state of the host and of its servers (tray icon, sidebar). */
  overallState() {
    if (this.state === 'error' || this.state === 'busy') return this.state;
    const states = this.list.map((i) => i.state());
    return ['error', 'busy'].find((s) => states.includes(s)) || 'ok';
  }

  /** New options of the updates of the installation, applied without restarting (the servers keep running). */
  updateOptions(settings) {
    this.s = { ...this.s, auto_update: settings.auto_update, update_hours: settings.update_hours };
    for (const timer of this.steamTimers || []) clearTimeout(timer);
    this.steamTimers = [];
    if (!this.stopped) this.scheduleSteamChecks();
    this.emit('change');
  }

  // ------------------------------------------------------------------ processes

  /** Processes of the dedicated server of this game: [{ pid, exe, homedir }]. */
  async queryProcesses() {
    if (!this.exe) return [];
    const name = path.basename(this.exe).replace(/'/g, "''");
    const script = `Get-CimInstance Win32_Process -Filter 'Name = "${name}"' | ` +
      'Select-Object ProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress';
    const r = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 30_000 });
    if (r.code !== 0 || !r.stdout.trim()) return [];
    return [].concat(JSON.parse(r.stdout))
      // ExecutablePath is null for processes of other users: they are matched by name and home folder only
      .filter((p) => !p.ExecutablePath || samePath(p.ExecutablePath, this.exe))
      .map((p) => ({ pid: p.ProcessId, exe: p.ExecutablePath, homedir: homedirOf(p.CommandLine) || this.documentsHome }));
  }

  /** Look for the processes and give each server its own (matched by -homedir). */
  async scan() {
    let processes;
    try {
      processes = await this.queryProcesses();
    } catch (err) {
      this.log.error('Cannot look for the server processes', err);
      return;
    }
    let changed = false;
    for (const instance of this.list) {
      const pids = processes.filter((p) => samePath(p.homedir, instance.homedir)).map((p) => p.pid).sort();
      if (pids.join() !== instance.pids.join()) {
        if (pids.length && !instance.pids.length) instance.console.rewind(); // started outside this app
        instance.pids = pids;
        changed = true;
      }
    }
    if (changed) this.emit('change'); // the idle status counts the running servers when it is read
  }

  async pidsOf(instance) {
    await this.scan();
    return instance.pids;
  }

  // ------------------------------------------------------------------ tray / UI

  infoLines() {
    return [
      t('tray.status', { status: this.status }),
      ...this.list.map((i) => `${i.name}: ${i.statusText()}`),
      this.s.sync_method === 'webhook'
        ? t('tray.webhook', { port: this.s.webhook_port, path: WEBHOOK_PATH })
        : t('tray.pollingEvery', { minutes: Number(this.s.poll_minutes) }),
      this.steamLine(),
    ];
  }

  steamLine() {
    const installed = this.installedBuild();
    if (installed && this.steamState.latest && installed !== this.steamState.latest) {
      return t('tray.serverBuildNew', { build: installed, latest: this.steamState.latest });
    }
    return t('tray.serverBuild', { build: installed || '?' });
  }

  /** Actions of the tray: the installation, then a submenu per server (see main.js). */
  actions() {
    return [
      { id: 'steam-check', label: t('action.steamCheck') },
      { id: 'steam-update', label: t('action.steamUpdate', { game: this.game.name }) },
    ];
  }

  serverActions() {
    return [
      { id: 'update', label: t('action.update') },
      { id: 'start', label: t('action.startServer') },
      { id: 'stop', label: t('action.stopServer') },
      { id: 'restart', label: t('action.restartServer') },
    ];
  }

  snapshot() {
    return {
      ...super.snapshot(),
      state: this.overallState(),
      details: {
        installDir: this.installDir,
        exe: this.exe,
        exeExists: Boolean(this.exe) && fs.existsSync(this.exe),
        queued: this.jobs.length,
        sync: {
          method: this.s.sync_method,
          pollMinutes: Number(this.s.poll_minutes),
          port: this.s.webhook_port,
          path: WEBHOOK_PATH,
        },
        steam: {
          appId: this.game.serverAppId,
          installDir: this.installDir,
          installed: this.installedBuild(),
          latest: this.steamState.latest || '',
          checkedAt: this.steamState.checked || '',
          phase: this.steam.phase,
          auto: Boolean(this.s.auto_update),
          hours: Number(this.s.update_hours),
        },
        servers: this.list.map((i) => i.snapshot()),
      },
    };
  }

  /** id: an action; server: the id of the server for the actions of one server. */
  runAction(id, server) {
    if (id === 'poll') this.queuePoll();
    else if (id === 'steam-check') this.queueSteamCheck(true);
    else if (id === 'steam-update') this.enqueue({ kind: 'steam-update' });
    else if (['update', 'start', 'stop', 'restart'].includes(id) && this.instances.has(server)) this.enqueue({ kind: id, server });
    else if (id === 'start-all' || id === 'stop-all') {
      for (const instance of this.list) this.enqueue({ kind: id === 'start-all' ? 'start' : 'stop', server: instance.id });
    }
  }

  // ------------------------------------------------------------------ Steam build of the installation

  loadSteamState() {
    try {
      return JSON.parse(fs.readFileSync(this.steamFile, 'utf8'));
    } catch {
      return {};
    }
  }

  saveSteamState() {
    fs.mkdirSync(path.dirname(this.steamFile), { recursive: true });
    fs.writeFileSync(this.steamFile, JSON.stringify(this.steamState, null, 2));
  }

  /**
   * Build of the installation. The Steam manifest is the source; when SteamCMD confirmed a build but the manifest
   * says otherwise (e.g. a manifest of the Steam client), the confirmed build wins until the manifest changes.
   */
  installedBuild() {
    const manifest = installedBuild(this.installDir, this.game.serverAppId);
    const confirmed = this.steamState.confirmed;
    return confirmed && manifest && confirmed.manifest === manifest ? confirmed.build : manifest;
  }

  /** Periodic check of Steam for a new build of the dedicated server (update_hours, 0 = off). */
  scheduleSteamChecks() {
    const hours = Number(this.s.update_hours);
    if (!this.steamcmd || !hours) return;
    this.steamTimers = [
      setTimeout(() => this.queueSteamCheck(false), FIRST_STEAM_CHECK_MS),
      setInterval(() => this.queueSteamCheck(false), hours * 60 * 60_000),
    ];
  }

  queueSteamCheck(manual) {
    if (this.jobs.some((job) => job.kind === 'steam-check')) return;
    this.enqueue({ kind: 'steam-check', manual });
  }

  /** Status while SteamCMD is downloaded or set up (first use only). */
  steamPhase(phase) {
    this.setStatus(phase === 'download' ? 'status.steamcmdDownload' : 'status.steamcmdSetup', 'busy');
  }

  async checkServerBuild(manual) {
    if (!this.steamcmd) return;
    this.setStatus('status.steamChecking', 'busy');
    const latest = await this.steamcmd.latestBuild(this.game.serverAppId, (phase) => this.steamPhase(phase));
    this.steamState.latest = latest;
    this.steamState.checked = new Date().toLocaleString();
    this.saveSteamState();

    const installed = this.installedBuild();
    if (!installed) {
      this.log.info(`Latest server build on Steam: ${latest}; installed build unknown (use "Update server" once)`);
      return;
    }
    if (installed === latest) {
      if (manual) this.log.info(`Server build ${installed} is the latest`);
      return;
    }
    this.log.info(`New server build on Steam: ${latest} (installed ${installed})`);
    if (manual || !this.s.auto_update) {
      if (this.steamState.notified !== latest) { // once per build, not at every periodic check
        this.steamState.notified = latest;
        this.saveSteamState();
        this.notify(t('notify.serverUpdateAvailable', { game: this.game.name, build: latest }));
      }
      return;
    }
    await this.updateServerFiles();
  }

  /** Install the latest build with SteamCMD: the running servers are stopped first and started again after. */
  async updateServerFiles() {
    if (!this.steamcmd) return;
    if (!this.installDir) throw new LocalizedError('err.installDirNotSet');
    await this.scan();
    const wasRunning = this.list.filter((i) => i.running);
    if (wasRunning.length) {
      this.setStatus('status.stoppingServers', 'busy', { count: wasRunning.length });
      for (const instance of wasRunning) await instance.stopServer();
    }
    const before = this.installedBuild();
    this.log.info(`Updating the server files with SteamCMD in ${this.installDir}`);
    let result = null;
    let error = null;
    try {
      result = await this.steamcmd.update(this.game.serverAppId, this.installDir, ({ phase, bytes }) => {
        this.steam.phase = phase;
        const size = bytes ? `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB` : '';
        this.setStatus(phase === 'downloading' && size ? 'status.steamDownloadingSize' : `status.steam.${phase}`, 'busy', { size });
      }, (phase) => this.steamPhase(phase));
    } catch (err) {
      error = err;
    }
    this.steam.phase = null;
    for (const instance of wasRunning) {
      this.setStatus('status.startingServer', 'busy', { name: instance.name });
      if (error) await instance.ensureServerRunning(); // never leave the servers down
      else if (!(await instance.startServer())) instance.error = new LocalizedError('err.exitedAfterStart', { game: instance.name });
    }
    if (error) throw error;

    // SteamCMD installed the latest build: remember it if the manifest shows another number
    const manifest = installedBuild(this.installDir, this.game.serverAppId);
    if (this.steamState.latest && manifest && manifest !== this.steamState.latest) {
      this.steamState.confirmed = { manifest, build: this.steamState.latest };
    } else {
      delete this.steamState.confirmed;
    }
    this.saveSteamState();
    const build = this.installedBuild();
    if (result === 'up-to-date' && build === before) {
      this.log.info(`Server files already up to date (build ${build || '?'})`);
    } else {
      this.log.info(`Server files updated to build ${build || '?'}`);
      this.notify(t('notify.serverUpdated', { game: this.game.name, build: build || '?' }));
    }
  }

  // ------------------------------------------------------------------ new commits: polling

  /** The servers grouped by repository and branch: one check of GitHub per group. */
  groups() {
    const groups = new Map();
    for (const instance of this.list) {
      let key;
      try {
        key = `${repoKey(instance.s.repository)}#${instance.s.branch}`;
      } catch {
        continue; // invalid repository: reported by the validation of the settings
      }
      if (!groups.has(key)) groups.set(key, { key, url: instance.s.repository, branch: instance.s.branch, instances: [] });
      groups.get(key).instances.push(instance);
    }
    return [...groups.values()];
  }

  repo(url) {
    return new GitHubRepo(url, this.s.github_token);
  }

  schedulePolling() {
    const minutes = Math.max(1, Number(this.s.poll_minutes) || 1);
    this.timers.push(setTimeout(() => this.queuePoll(), FIRST_POLL_MS), setInterval(() => this.queuePoll(), minutes * 60_000));
    this.log.info(`Server role, checking ${this.groups().length} repositories on GitHub every ${minutes} min`);
  }

  queuePoll() {
    if (this.jobs.some((job) => job.kind === 'poll')) return;
    this.enqueue({ kind: 'poll' });
  }

  /**
   * Check every repository and install the new commits. Quiet: a server changes status only when there is
   * something new, or when its repository cannot be reached (retried at the next check, no notification).
   */
  async poll() {
    for (const group of this.groups()) {
      let sha;
      try {
        sha = await this.repo(group.url).latestCommit(group.branch);
      } catch (err) {
        this.log.warn(`Check of ${group.key} on GitHub failed: ${errorText(err)}`);
        this.pollFailed.set(group.key, true);
        for (const instance of group.instances) instance.error = err;
        this.emit('change');
        continue;
      }
      const recovered = this.pollFailed.delete(group.key);
      const now = new Date().toLocaleString();
      for (const instance of group.instances) {
        instance.lastPoll = now;
        if (recovered) instance.error = null;
        if (instance.isProcessed(sha)) continue;
        this.log.info(`${instance.name}: new commit ${sha.slice(0, 7)} on ${group.key}`);
        try {
          await instance.applyUpdate(sha, this.repo(group.url));
          instance.failedPollSha = null;
          instance.error = null;
        } catch (err) {
          instance.error = err;
          // a commit that keeps failing is tried again at every check: notify it once, not every few minutes
          if (instance.failedPollSha === sha) {
            instance.log.warn(`Commit ${sha.slice(0, 7)} still not installed: ${errorText(err)}`);
          } else {
            instance.failedPollSha = sha;
            instance.log.error(`Update to ${sha.slice(0, 7)} failed`, err);
            this.notify(t('notify.updateFailed', { game: instance.name, message: errorText(err) }));
          }
        } finally {
          instance.setActivity(null);
        }
      }
      this.emit('change');
    }
  }

  // ------------------------------------------------------------------ new commits: webhook

  verifySignature(body, header) {
    if (!header || !header.startsWith('sha256=')) return false;
    const expected = Buffer.from(crypto.createHmac('sha256', this.s.webhook_secret).update(body).digest('hex'));
    const received = Buffer.from(header.slice('sha256='.length));
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }

  /** Servers of the repository and branch of a push (a repository may feed more than one server). */
  handleEvent(event, body) {
    if (event === 'ping') return [200, 'pong'];
    if (event !== 'push') return [202, `ignored event '${event}'`];
    let payload;
    try {
      payload = JSON.parse(body.toString('utf8'));
    } catch {
      return [400, 'payload must be application/json'];
    }
    const repository = String(payload.repository?.full_name || '').toLowerCase();
    const sha = payload.after || '';
    if (payload.deleted || sha.length !== 40 || sha === ZERO_SHA) return [202, 'ignored: no new commit'];
    const targets = this.list.filter((instance) => {
      try {
        return repoKey(instance.s.repository) === repository && payload.ref === `refs/heads/${instance.s.branch}`;
      } catch {
        return false;
      }
    });
    if (!targets.length) return [202, `ignored: no server uses ${repository} ${payload.ref}`];
    const queued = targets.filter((instance) => this.enqueueCommit(instance, sha));
    return [202, queued.length ? `queued ${sha.slice(0, 7)} for ${queued.map((i) => i.name).join(', ')}` : `duplicate ${sha.slice(0, 7)}`];
  }

  enqueueCommit(instance, sha) {
    if (instance.isProcessed(sha) || this.jobs.some((job) => job.kind === 'install' && job.server === instance.id && job.sha === sha)) {
      instance.log.info(`Commit ${sha.slice(0, 7)} already processed or queued, skipping`);
      return false;
    }
    instance.log.info(`Queued commit ${sha.slice(0, 7)}`);
    this.enqueue({ kind: 'install', server: instance.id, sha });
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
        this.log.info(`Server role, webhook listening on ${this.s.webhook_host}:${this.s.webhook_port}${WEBHOOK_PATH}`);
        resolve();
      });
    });
  }

  // ------------------------------------------------------------------ jobs

  enqueue(job) {
    this.jobs.push(job);
    this.emit('change');
    this.processJobs();
  }

  /** One job of one server: its activity shows what it is doing, its error what went wrong. */
  async runServerJob(job, instance) {
    const repo = () => this.repo(instance.s.repository);
    if (job.kind === 'install') {
      await instance.applyUpdate(job.sha, repo());
    } else if (job.kind === 'update') {
      instance.setActivity('status.checkingGithub');
      const sha = await repo().latestCommit(instance.s.branch);
      instance.log.info(`Manual update: latest commit on ${instance.s.branch} is ${sha.slice(0, 7)}`);
      await instance.applyUpdate(sha, repo());
    } else if (job.kind === 'start') {
      instance.setActivity('status.startingGame');
      if (!(await instance.startServer())) throw new LocalizedError('err.exitedAfterStart', { game: instance.name });
    } else if (job.kind === 'stop') {
      instance.setActivity('status.stoppingGame');
      await instance.stopServer();
    } else if (job.kind === 'restart') {
      instance.setActivity('status.restartingGame');
      await instance.restartServer();
      this.notify(t('notify.gameRestarted', { game: instance.name }));
    }
  }

  async processJobs() {
    if (this.running) return;
    this.running = true;
    while (this.jobs.length && !this.stopped) {
      const job = this.jobs.shift();
      const instance = job.server ? this.instances.get(job.server) : null;
      if (job.server && !instance) continue; // removed meanwhile
      this.busy = true;
      try {
        if (instance) {
          await this.runServerJob(job, instance);
          instance.error = null;
        } else if (job.kind === 'poll') {
          await this.poll();
        } else if (job.kind === 'steam-check') {
          await this.checkServerBuild(job.manual);
        } else if (job.kind === 'steam-update') {
          await this.updateServerFiles();
        }
        this.idle();
      } catch (err) {
        if (job.kind === 'steam-check' && !job.manual) {
          // a failed background check (e.g. no internet) must not bother the user: retried at the next check
          this.log.warn(`Check of the server build failed: ${err.message}`);
          this.idle();
        } else if (instance) {
          instance.log.error(`${job.kind} failed`, err);
          instance.error = err;
          this.idle();
          this.notify(t('notify.updateFailed', { game: instance.name, message: errorText(err) }));
        } else {
          this.log.error(`${job.kind} job failed`, err);
          this.setError(err);
          this.notify(t(job.kind.startsWith('steam') ? 'notify.serverUpdateFailed' : 'notify.updateFailed', { game: this.game.name, message: errorText(err) }));
        }
      } finally {
        if (instance) instance.setActivity(null);
        this.busy = false;
        await this.scan();
        this.emit('change');
      }
    }
    this.running = false;
  }
}

module.exports = { ServerHost, homedirOf, WEBHOOK_PATH };
