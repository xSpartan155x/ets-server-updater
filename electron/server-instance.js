// One dedicated server of a game: an instance of the shared installation started with -nosingle -homedir "<home>".
// The home folder holds its server_config.sii, server_packages.sii/.dat and server.log.txt; its packages come
// from its own GitHub repository (download -> verify -> stop -> backup -> replace -> start, with rollback).
// The ServerHost of the game runs the jobs one at a time and tells each instance which processes are its own.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const { sleep } = require('./engine');
const { LogTail } = require('./log-tail');
const { UpdateError } = require('./github');
const { t, errorText } = require('./i18n');
const { gameHomeOf, launchHomedirOf } = require('./games');

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

/**
 * The server reads the .dat named in the .sii ("roads_data_file_name: "/home/server_packages.dat"", /home being
 * its home folder). An export made with another name (export_server_packages <name>) points to that name: the
 * reference is set to the .dat of this server. Returns the data unchanged when it is not a text .sii.
 */
function pointToDat(data, datName) {
  const text = data.toString('utf8');
  if (!text.startsWith('SiiNunit') && !text.startsWith('﻿SiiNunit')) return data;
  const next = text.replace(/^(\s*roads_data_file_name\s*:\s*)"[^"]*"/m, `$1"/home/${datName}"`);
  return next === text ? data : Buffer.from(next, 'utf8');
}

class ServerInstance extends EventEmitter {
  /** s: the settings of this server; host: the ServerHost of its game; stateFile: its history (processed commits). */
  constructor(s, host, stateFile) {
    super();
    this.s = s;
    this.host = host;
    this.game = host.game;
    this.id = s.id;
    this.name = s.name;
    this.stateFile = stateFile;
    this.homedir = s.homedir ? path.resolve(s.homedir) : '';
    // the server always keeps its files in a "<documentsFolder>" subfolder of -homedir, never in -homedir itself
    this.gameHome = gameHomeOf(this.game.documentsFolder, this.homedir);
    const inHome = (file, custom) => (custom ? path.resolve(custom) : path.join(this.gameHome, file));
    this.siiPath = inHome('server_packages.sii', s.sii_path);
    this.datPath = inHome('server_packages.dat', s.dat_path);
    this.configFile = inHome('server_config.sii', s.config_path);
    this.consoleFile = inHome('server.log.txt', s.log_path);
    this.backupRoot = s.backup_dir ? path.resolve(s.backup_dir) : path.join(this.gameHome, 'backups');
    this.migrateFlatHome(s);
    this.targets = new Map([[s.repo_sii_file, this.siiPath], [s.repo_dat_file, this.datPath]]);
    this.console = new LogTail(this.consoleFile);
    this.console.on('lines', (update) => this.emit('console', update));
    this.history = this.loadHistory();
    this.pids = []; // processes of this server, from the last scan of the host
    this.activity = null; // { key, params } of the job running on this server
    this.error = null; // last error of a job of this server (cleared by the next success)
    this.failedPollSha = null;
    this.lastPoll = '';
  }

  /**
   * A server created while the app still placed files directly in -homedir (instead of its real
   * "<homedir>/<documentsFolder>") has them one level too high: move the default ones (not a custom path) down
   * into gameHome, once, so it can actually start. No-op once gameHome already has its config, or homedir equals
   * gameHome (the legacy "Documents\<documentsFolder>" layout, already in the right place).
   */
  migrateFlatHome(s) {
    if (!this.homedir || this.gameHome === this.homedir) return;
    const staleConfig = path.join(this.homedir, 'server_config.sii');
    if (!fs.existsSync(staleConfig) || fs.existsSync(this.configFile)) return;
    try {
      fs.mkdirSync(this.gameHome, { recursive: true });
      const moves = [
        [s.config_path, staleConfig, this.configFile],
        [s.sii_path, path.join(this.homedir, 'server_packages.sii'), this.siiPath],
        [s.dat_path, path.join(this.homedir, 'server_packages.dat'), this.datPath],
        [s.log_path, path.join(this.homedir, 'server.log.txt'), this.consoleFile],
      ];
      for (const [custom, from, to] of moves) {
        if (!custom && fs.existsSync(from) && !fs.existsSync(to)) fs.renameSync(from, to);
      }
      const backupsFrom = path.join(this.homedir, 'backups');
      if (!s.backup_dir && fs.existsSync(backupsFrom) && !fs.existsSync(this.backupRoot)) fs.renameSync(backupsFrom, this.backupRoot);
      this.log.info(`Files moved to ${this.gameHome} (the server keeps them one level under -homedir)`);
    } catch (err) {
      this.log.error(`Cannot move the files to ${this.gameHome}`, err);
    }
  }

  get running() {
    return this.pids.length > 0;
  }

  get log() {
    const tag = (message) => `${this.name}: ${message}`;
    return {
      info: (message) => this.host.log.info(tag(message)),
      warn: (message) => this.host.log.warn(tag(message)),
      error: (message, err) => this.host.log.error(tag(message), err),
    };
  }

  setActivity(key, params) {
    this.activity = key ? { key, params } : null;
    this.host.emit('change');
  }

  /** Text shown for this server: what it is doing, its error, or running / stopped. */
  statusText() {
    if (this.activity) return t(this.activity.key, { game: this.name, ...this.activity.params });
    if (this.error) return t('status.error', { message: errorText(this.error) });
    return t(this.running ? 'status.running' : 'status.stopped');
  }

  state() {
    if (this.activity) return 'busy';
    if (this.error) return 'error';
    return this.running ? 'ok' : 'idle';
  }

  snapshot() {
    return {
      id: this.id,
      name: this.name,
      homedir: this.homedir,
      gameHome: this.gameHome,
      repository: this.s.repository,
      branch: this.s.branch,
      running: this.running,
      pids: this.pids,
      state: this.state(),
      status: this.statusText(),
      busy: Boolean(this.activity),
      lastCommit: this.history.last_commit || '',
      lastUpdate: this.history.last_update || '',
      lastPoll: this.lastPoll,
      configFile: this.configFile,
      consoleFile: this.consoleFile,
      hasPackages: fs.existsSync(this.siiPath) && fs.existsSync(this.datPath),
      hasConfig: fs.existsSync(this.configFile),
    };
  }

  // ------------------------------------------------------------------ history

  loadHistory() {
    try {
      return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
    } catch {
      return { processed: [], last_commit: '', last_update: '' };
    }
  }

  saveHistory() {
    fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
    fs.writeFileSync(this.stateFile, JSON.stringify(this.history, null, 2));
  }

  isProcessed(sha) {
    return (this.history.processed || []).includes(sha);
  }

  markProcessed(sha, installed) {
    const processed = (this.history.processed || []).filter((s) => s !== sha);
    processed.push(sha);
    this.history.processed = processed.slice(-100);
    if (installed) {
      this.history.last_commit = sha;
      this.history.last_update = new Date().toLocaleString();
    }
    this.saveHistory();
  }

  // ------------------------------------------------------------------ process

  /**
   * Arguments of the server: -nosingle -homedir "<home>" and the extra ones (unless they set them already). The
   * server always nests its own "<documentsFolder>" under -homedir, so this is homedir itself, or its parent
   * when homedir already IS that subfolder (see gameHomeOf in games.js): either way the server ends up using
   * gameHome as its real home.
   */
  launchArgs() {
    const extra = splitArgs(this.s.arguments);
    const has = (flag) => extra.some((arg) => arg.toLowerCase() === flag);
    const homedir = launchHomedirOf(this.game.documentsFolder, this.homedir);
    return [...(has('-nosingle') ? [] : ['-nosingle']), ...(has('-homedir') ? [] : ['-homedir', homedir]), ...extra];
  }

  async stopServer() {
    const pids = await this.host.pidsOf(this);
    if (!pids.length) {
      this.log.info('not running');
      return false;
    }
    this.log.info(`Stopping (pid ${pids.join(', ')})`);
    for (const pid of pids) {
      try {
        process.kill(pid);
      } catch (err) {
        if (err.code !== 'ESRCH') this.log.warn(`Cannot stop pid ${pid}: ${err.message}`);
      }
    }
    const deadline = Date.now() + Number(this.host.s.stop_timeout_seconds) * 1000;
    while ((await this.host.pidsOf(this)).length) {
      if (Date.now() > deadline) throw new UpdateError('err.cannotStopGame', { game: this.name });
      await sleep(1000);
    }
    await sleep(2000); // give Windows time to release file handles
    return true;
  }

  /** Start the server and check that it stays up. Returns false if it exits during the check. */
  async startServer() {
    if ((await this.host.pidsOf(this)).length) {
      this.log.info('already running');
      return true;
    }
    const exe = this.host.exe;
    if (!fs.existsSync(exe)) throw new UpdateError('err.exeNotFound', { game: this.game.name, path: exe });
    if (!fs.existsSync(this.siiPath) || !fs.existsSync(this.datPath)) throw new UpdateError('err.noPackages', { name: this.name });
    fs.mkdirSync(this.gameHome, { recursive: true });
    const child = spawn(exe, this.launchArgs(), {
      cwd: path.dirname(exe),
      detached: true, // own console window, keeps running if this app exits
      stdio: 'ignore',
    });
    let exitCode = null;
    let spawnError = null;
    child.on('exit', (code) => { exitCode = code ?? -1; });
    child.on('error', (err) => { spawnError = err; });
    child.unref();
    await sleep(500);
    if (spawnError) throw new UpdateError('err.cannotStartGame', { game: this.name, message: spawnError.message });
    this.log.info(`Started (pid ${child.pid}) with ${this.launchArgs().join(' ')}`);
    this.console.rewind();

    const deadline = Date.now() + Number(this.host.s.startup_check_seconds) * 1000;
    while (Date.now() < deadline) {
      if (exitCode !== null) {
        this.log.error(`Exited during startup with code ${exitCode}`);
        return false;
      }
      await sleep(500);
    }
    return true;
  }

  /** Best effort start used on error paths: never leave the server down. */
  async ensureServerRunning() {
    try {
      if (!(await this.startServer())) this.log.error('failed to start');
    } catch (err) {
      this.log.error('Unable to start', err);
    }
  }

  async restartServer() {
    await this.stopServer();
    if (!(await this.startServer())) throw new UpdateError('err.exitedAfterStart', { game: this.name });
  }

  // ------------------------------------------------------------------ files

  /** Copy of the current files in backups<date>_<commit> (null when there are none yet: first packages). */
  backupCurrent(tag) {
    if (![...this.targets.values()].some((dest) => fs.existsSync(dest))) return null;
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    const folder = path.join(this.backupRoot, `${stamp}_${tag}`);
    fs.mkdirSync(folder, { recursive: true });
    for (const dest of this.targets.values()) {
      if (fs.existsSync(dest)) fs.copyFileSync(dest, path.join(folder, path.basename(dest)));
    }
    this.log.info(`Backup created: ${folder}`);

    const backups = fs.readdirSync(this.backupRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    for (const old of backups.slice(0, Math.max(0, backups.length - Number(this.host.s.backup_keep)))) {
      fs.rmSync(path.join(this.backupRoot, old), { recursive: true, force: true });
    }
    return folder;
  }

  async restore(folder) {
    if (!folder) return;
    for (const dest of this.targets.values()) {
      const src = path.join(folder, path.basename(dest));
      if (fs.existsSync(src)) await retry(() => fs.copyFileSync(src, dest));
    }
    this.log.warn(`Previous files restored from ${folder}`);
  }

  /** Write the new files next to the destination (same volume -> atomic rename). */
  stage(files) {
    const staged = new Map();
    for (const [dest, data] of files) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const tmp = `${dest}.new`;
      fs.writeFileSync(tmp, data);
      if (!fs.readFileSync(tmp).equals(data)) throw new UpdateError('err.stagedCheck', { file: tmp });
      staged.set(dest, tmp);
    }
    return staged;
  }

  /** Files of a commit as they must be written: Map(dest -> Buffer), the .sii pointing to the .dat of this server. */
  prepare(downloaded) {
    const files = new Map();
    for (const [repoFile, data] of downloaded) {
      const dest = this.targets.get(repoFile);
      const pointsHome = path.dirname(this.datPath).toLowerCase() === this.gameHome.toLowerCase();
      files.set(dest, dest === this.siiPath && pointsHome ? pointToDat(data, path.basename(this.datPath)) : data);
    }
    return files;
  }

  /**
   * Install the packages of a commit of the repository of this server, when they changed. A server that was
   * running is restarted with them; a stopped one stays stopped (with many servers, some are off on purpose)
   * unless `start` is true.
   */
  async applyUpdate(sha, repo, { start = false } = {}) {
    const short = sha.slice(0, 7);
    this.setActivity('status.downloading', { sha: short });
    const files = this.prepare(await repo.download(sha, [...this.targets.keys()], this.log)); // failures leave the server untouched

    if ([...files].every(([dest, data]) => fileSha256(dest) === sha256(data))) {
      this.log.info(`Commit ${short}: packages already up to date, no restart needed`);
      this.markProcessed(sha, true);
      return false;
    }

    const wasRunning = (await this.host.pidsOf(this)).length > 0;
    const staged = this.stage(files);
    let backup = null;
    try {
      this.setActivity('status.installing', { sha: short });
      if (wasRunning) await this.stopServer();
      backup = this.backupCurrent(short);
      for (const [dest, tmp] of staged) {
        await retry(() => fs.renameSync(tmp, dest));
        this.log.info(`Installed ${dest}`);
      }
    } catch (err) {
      this.log.error(`Install of ${short} failed`, err);
      if (backup) await this.restore(backup);
      if (wasRunning) await this.ensureServerRunning();
      throw err;
    } finally {
      for (const tmp of staged.values()) fs.rmSync(tmp, { force: true });
    }

    if (wasRunning || start) {
      this.setActivity('status.startingGame');
      if (!(await this.startServer())) {
        await this.restore(backup);
        this.markProcessed(sha, false); // don't retry a broken commit automatically
        if (wasRunning) await this.ensureServerRunning();
        throw new UpdateError('err.rolledBack', { game: this.name, sha: short });
      }
    }
    this.markProcessed(sha, true);
    this.log.info(`Update to ${short} completed`);
    this.host.notify(t('notify.serverPackagesUpdated', { name: this.name, sha: short }));
    return true;
  }
}

module.exports = { ServerInstance, splitArgs, pointToDat };
