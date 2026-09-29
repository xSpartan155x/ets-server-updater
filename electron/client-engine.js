// Client role: watch server_packages.sii/.dat in the documents folder of the game (ETS2 or ATS) and push them to one
// of the destinations (one GitHub repository per server). With one destination an export goes there right away;
// with more, the app asks which server gets it (the one chosen last time is preselected).
// At every push the repository is cloned fresh into a temporary folder, the files are compared, copied, committed
// and pushed, and the temporary clone is deleted: every push starts from a clean repository.
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Engine, run, sleep } = require('./engine');
const { findGit } = require('./git');
const log = require('./logger');
const { t, LocalizedError, errorText } = require('./i18n');

const TEMP_ROOT = path.join(os.tmpdir(), 'ets2-package-sync'); // one subfolder per game
const BOT_NAME = 'ETS2 Package Sync';
const BOT_EMAIL = 'ets2-package-sync@users.noreply.github.com';
const EXPORT_FILES = ['server_packages.sii', 'server_packages.dat']; // what export_server_packages writes

class GitError extends LocalizedError {
  get name() { return 'GitError'; }
}

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** Clear the read-only attribute that git puts on its object files (rmSync cannot delete them otherwise). */
function makeWritable(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) makeWritable(full);
    else fs.chmodSync(full, 0o666);
  }
}

/** Delete a folder (retrying: Windows may briefly lock files that were just used by git). */
function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    makeWritable(dir);
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (err) {
    log.warn(`Cannot delete temporary folder ${dir}: ${err.message}`);
  }
}

class ClientEngine extends Engine {
  /** settings: the client block of the game. */
  constructor(settings, game) {
    super(settings, game);
    this.mode = 'client';
    this.source = settings.documents_path ? path.resolve(settings.documents_path) : '';
    this.tempRoot = path.join(TEMP_ROOT, game.id);
    this.gitExe = 'git'; // replaced in start() by the git found (PATH or usual install folders)
    this.sourceFiles = EXPORT_FILES.map((f) => path.join(this.source, f));
    this.watched = new Set(EXPORT_FILES);
    this.destinations = settings.destinations;
    this.lastPush = {}; // destination id -> "date (sha)"
    this.lastCheck = null;
    this.handledHash = null; // hash of the export last pushed or dismissed: the same export is not offered again
    this.pending = null; // { hash, at } of an export waiting for the choice of the server
    this.waitingForExport = false;
    this.syncing = false;
    this.timer = null;
    this.watchers = [];
  }

  destination(id) {
    return this.destinations.find((d) => d.id === id);
  }

  // ------------------------------------------------------------------ lifecycle

  async start() {
    if (!this.source) throw new LocalizedError('err.docsNotSet', { game: this.game.name });
    if (!fs.existsSync(this.source)) throw new LocalizedError('err.docsNotFound', { game: this.game.name, path: this.source });
    if (!this.destinations.length) throw new LocalizedError('err.noDestinations');
    const git = await findGit();
    if (!git) throw new LocalizedError('err.gitMissing');
    this.gitExe = git.path;
    removeDir(this.tempRoot); // leftovers of a previous run that was interrupted
    this.log.info(`Client role, watching ${this.source} -> ${this.destinations.map((d) => d.name).join(', ')}`);
    this.startWatcher();
    this.setStatus('status.watching', 'ok');
    // changes made while the app was not running: with one server they go there, with more nobody is asked
    // at every start (the next export, or Push now, asks)
    if (this.destinations.length === 1) this.sync(this.destinations[0].id, false);
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
    for (const watcher of this.watchers) watcher.close();
    this.watchers = [];
  }

  infoLines() {
    return [
      t('tray.status', { status: this.status }),
      ...this.destinations.map((d) => t('tray.lastPushTo', { name: d.name, value: this.lastPush[d.id] || t('tray.never') })),
    ];
  }

  actions() {
    return [{ id: 'push', label: t(this.destinations.length > 1 ? 'action.pushChoose' : 'action.push') }];
  }

  snapshot() {
    return {
      ...super.snapshot(),
      details: {
        sourcePath: this.source,
        tempPath: this.tempRoot,
        files: EXPORT_FILES,
        lastCheck: this.lastCheck,
        waitingForExport: this.waitingForExport,
        pending: this.pending,
        lastDestination: this.s.last_destination,
        destinations: this.destinations.map((d) => ({
          id: d.id, name: d.name, repository: d.repository, branch: d.branch, lastPush: this.lastPush[d.id] || '',
        })),
      },
    };
  }

  /** push: to the only destination, or ask which one; push:<id>: to that destination. */
  runAction(id) {
    if (id === 'push') {
      if (this.destinations.length === 1) this.sync(this.destinations[0].id, true);
      else this.ask(null, true);
    } else if (id.startsWith('push:') && this.destination(id.slice(5))) {
      this.sync(id.slice(5), true);
    }
  }

  /** Answer of the chooser: the id of a destination, or null (not sent). */
  choose(id) {
    const pending = this.pending;
    this.pending = null;
    if (id && this.destination(id)) {
      this.sync(id, true);
    } else {
      if (pending?.hash) this.handledHash = pending.hash; // dismissed: not offered again until the next export
      this.log.info('Export not sent to any server');
      this.emit('change');
    }
  }

  /** Ask which server gets the export (event 'choose' -> the chooser of main.js). */
  ask(hash, manual) {
    this.pending = { hash, at: new Date().toLocaleString(), manual };
    this.emit('choose', { destinations: this.destinations.map((d) => ({ id: d.id, name: d.name, repository: d.repository })), last: this.s.last_destination });
    this.emit('change');
  }

  // ------------------------------------------------------------------ git

  /** Run git in `cwd`. autocrlf is forced off so the files are stored and compared byte for byte. */
  async git(args, cwd, check = true) {
    const result = await run(this.gitExe, ['-c', 'core.autocrlf=false', ...args], {
      cwd,
      timeout: 300_000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    if (check && result.code !== 0) {
      throw new GitError('err.gitFailed', { command: args[0], detail: (result.stderr || result.stdout).trim() });
    }
    return result;
  }

  /** Fresh shallow clone of the branch of a destination into a new temporary folder. */
  async cloneFresh(dest) {
    const dir = path.join(this.tempRoot, `repo-${Date.now()}`);
    fs.mkdirSync(this.tempRoot, { recursive: true });
    const { repository, branch } = dest;
    const clone = await this.git(['clone', '--depth', '1', '--single-branch', '--branch', branch, repository, dir], this.tempRoot, false);
    if (clone.code !== 0) {
      if (!/not found in upstream|Remote branch .* not found|empty repository/i.test(clone.stderr)) {
        removeDir(dir);
        throw new GitError('err.gitFailed', { command: 'clone', detail: clone.stderr.trim() });
      }
      // empty repository or branch not created yet: start the branch from scratch
      removeDir(dir);
      await this.git(['clone', repository, dir], this.tempRoot);
      await this.git(['checkout', '-B', branch], dir);
      this.log.info(`Branch '${branch}' of ${dest.name} does not exist on GitHub yet: it will be created`);
    }
    // commits need an author: use the Git for Windows identity if configured, otherwise a neutral one
    if (!(await this.git(['config', 'user.email'], dir, false)).stdout.trim()) {
      await this.git(['config', 'user.email', BOT_EMAIL], dir);
    }
    if (!(await this.git(['config', 'user.name'], dir, false)).stdout.trim()) {
      await this.git(['config', 'user.name', BOT_NAME], dir);
    }
    return dir;
  }

  /** Wait until the source files stop changing (the game may still be writing them). */
  async waitUntilStable(timeoutMs = 30_000) {
    const snapshot = () => this.sourceFiles.map((f) => {
      const st = fs.statSync(f);
      return `${st.size}:${st.mtimeMs}`;
    }).join('|');
    const deadline = Date.now() + timeoutMs;
    let previous = snapshot();
    while (Date.now() < deadline) {
      await sleep(1000);
      const current = snapshot();
      if (current === previous) return;
      previous = current;
    }
    throw new GitError('err.stillWriting');
  }

  /**
   * Clone, compare, copy, commit and push to one destination. Returns 'pushed', 'up-to-date' or 'rejected'
   * (someone else pushed in the meantime: the caller retries with a new clone).
   */
  async syncOnce(dest) {
    this.setStatus('status.cloningTo', 'busy', { name: dest.name });
    const dir = await this.cloneFresh(dest);
    try {
      const repoFiles = [dest.repo_sii_file, dest.repo_dat_file];
      const changed = repoFiles.filter((repoFile, i) => {
        const target = path.join(dir, repoFile);
        return !fs.existsSync(target) || sha256(target) !== sha256(this.sourceFiles[i]);
      });
      if (!changed.length) {
        this.log.info(`The files of ${dest.name} on GitHub are already up to date`);
        return 'up-to-date';
      }

      this.setStatus('status.pushingTo', 'busy', { name: dest.name });
      for (const repoFile of changed) {
        const target = path.join(dir, repoFile);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(this.sourceFiles[repoFiles.indexOf(repoFile)], target);
        this.log.info(`Copied ${path.basename(repoFile)} from the ${this.game.name} folder`);
      }
      await this.git(['add', '--', ...changed], dir);
      await this.git(['commit', '-m', this.s.commit_message, '--', ...changed], dir);
      const sha = (await this.git(['rev-parse', '--short', 'HEAD'], dir)).stdout.trim();

      const push = await this.git(['push', 'origin', `HEAD:refs/heads/${dest.branch}`], dir, false);
      if (push.code !== 0) {
        if (/\[rejected\]|non-fast-forward|fetch first/i.test(push.stderr)) return 'rejected';
        throw new GitError('err.gitFailed', { command: 'push', detail: push.stderr.trim() });
      }
      this.lastPush[dest.id] = `${new Date().toLocaleString()} (${sha})`;
      this.log.info(`Pushed ${sha} to ${dest.name} (${dest.branch})`);
      return 'pushed';
    } finally {
      removeDir(dir); // every push starts from a clean clone
    }
  }

  /** The export ready to be sent: its hash, or null while the files are missing (not exported yet). */
  async readyExport() {
    const missing = this.sourceFiles.filter((f) => !fs.existsSync(f)).map((f) => path.basename(f));
    if (missing.length) {
      // not an error: the files appear the first time export_server_packages is run in the game
      this.log.info(`Waiting for ${missing.join(', ')} in ${this.source} (run export_server_packages in the ${this.game.name} console)`);
      this.waitingForExport = true;
      return null;
    }
    this.waitingForExport = false;
    await this.waitUntilStable();
    return this.sourceFiles.map(sha256).join(':');
  }

  /** Returns true if something was pushed. */
  async pushTo(dest, hash) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await this.syncOnce(dest);
      if (result !== 'rejected') {
        this.handledHash = hash;
        this.lastCheck = new Date().toLocaleString();
        return result === 'pushed';
      }
      this.log.warn(`Push rejected: ${dest.name} changed on GitHub, retrying with a fresh clone (${attempt}/3)`);
    }
    throw new GitError('err.pushRejected');
  }

  /**
   * Send the export: to `destId`, or (null) to the only destination / the one the user chooses.
   * Automatic runs skip an export already sent or dismissed.
   */
  async sync(destId, manual) {
    if (this.syncing) {
      if (!manual) this.scheduleSync(); // a sync is running: try again after it
      return;
    }
    this.syncing = true;
    this.busy = true;
    let asked = null; // { hash } when the user must choose the server
    try {
      this.setStatus('status.syncing', 'busy');
      const hash = await this.readyExport();
      if (hash && !manual && hash === this.handledHash) {
        this.log.info('Package files unchanged since the last export');
      } else if (hash) {
        const dest = destId ? this.destination(destId) : this.destinations.length === 1 ? this.destinations[0] : null;
        if (!dest) {
          asked = { hash };
        } else {
          if (await this.pushTo(dest, hash)) this.notify(t('notify.pushedTo', { name: dest.name, value: this.lastPush[dest.id] }));
          this.emit('destination', dest.id); // remembered as the one to preselect next time
        }
      }
      this.setStatus(this.waitingForExport ? 'status.watchingWaiting' : 'status.watching', 'ok');
    } catch (err) {
      this.log.error('Sync failed', err);
      this.setError(err);
      this.notify(t('notify.pushFailed', { message: errorText(err) }));
    } finally {
      this.syncing = false;
      this.busy = false;
      this.emit('change');
    }
    if (asked) this.ask(asked.hash, manual);
  }

  scheduleSync() {
    if (!this.watchers.length) return; // engine stopped
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(null, false), Number(this.s.debounce_seconds) * 1000);
  }

  // ------------------------------------------------------------------ watcher

  startWatcher() {
    // the game folder changes constantly (game.log.txt, profiles...): react only to the package files
    const watcher = fs.watch(this.source, { persistent: false }, (event, filename) => {
      if (!filename || !this.watched.has(path.basename(filename).toLowerCase())) return;
      this.log.info(`Change detected: ${filename} (${event})`);
      this.scheduleSync();
    });
    watcher.on('error', (err) => this.log.error('File watcher error', err));
    this.watchers.push(watcher);
  }
}

module.exports = { ClientEngine, TEMP_ROOT, EXPORT_FILES };
