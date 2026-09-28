// Client mode: watch server_packages.sii/.dat in the documents folder of the game (ETS2 or ATS). At every sync
// the GitHub repository is cloned fresh into a temporary folder, the files are compared, copied, committed and
// pushed, and the temporary clone is deleted: every push starts from a clean repository.
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Engine, run, sleep } = require('./engine');
const log = require('./logger');
const { t, LocalizedError, errorText } = require('./i18n');

const TEMP_ROOT = path.join(os.tmpdir(), 'ets2-package-sync'); // one subfolder per game
const BOT_NAME = 'ETS2 Package Sync';
const BOT_EMAIL = 'ets2-package-sync@users.noreply.github.com';

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
  constructor(settings, game) {
    super(settings, game);
    this.mode = 'client';
    this.source = settings.documents_path ? path.resolve(settings.documents_path) : '';
    this.tempRoot = path.join(TEMP_ROOT, game.id);
    this.files = [settings.repo_sii_file, settings.repo_dat_file]; // paths inside the repository
    // the game always writes server_packages.sii/.dat: same file names as in the repository
    this.sourceFiles = this.files.map((f) => path.join(this.source, path.basename(f)));
    this.watched = new Set(this.files.map((f) => path.basename(f).toLowerCase()));
    this.lastPush = null;
    this.lastCheck = null;
    this.syncedHash = null; // hash of the source files the last time GitHub was known to have them
    this.waitingForExport = false;
    this.syncing = false;
    this.timer = null;
    this.watchers = [];
  }

  // ------------------------------------------------------------------ lifecycle

  async start() {
    if (!this.source) throw new LocalizedError('err.docsNotSet', { game: this.game.name });
    if (!fs.existsSync(this.source)) throw new LocalizedError('err.docsNotFound', { game: this.game.name, path: this.source });
    if (!this.s.repository) throw new LocalizedError('err.repoNotSet');
    const git = await run('git', ['--version']);
    if (git.code !== 0) throw new LocalizedError('err.gitMissing');
    removeDir(this.tempRoot); // leftovers of a previous run that was interrupted
    this.log.info(`Client mode, watching ${this.source} -> ${this.s.repository} (${this.s.branch})`);
    this.startWatcher();
    this.setStatus('status.watching', 'ok');
    this.pushNow(); // catch changes made while the app was not running
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
    for (const watcher of this.watchers) watcher.close();
    this.watchers = [];
  }

  infoLines() {
    return [t('tray.status', { status: this.status }), t('tray.lastPush', { value: this.lastPush || t('tray.never') })];
  }

  actions() {
    return [{ id: 'push', label: t('action.push') }, { id: 'open-repo', label: t('action.openRepo') }];
  }

  snapshot() {
    return {
      ...super.snapshot(),
      details: {
        sourcePath: this.source,
        tempPath: this.tempRoot,
        files: this.files.map((f) => path.basename(f)),
        lastCheck: this.lastCheck,
        lastPush: this.lastPush,
        branch: this.s.branch,
      },
    };
  }

  runAction(id) {
    if (id === 'push') this.pushNow();
  }

  pushNow() {
    this.sync(true);
  }

  // ------------------------------------------------------------------ git

  /** Run git in `cwd`. autocrlf is forced off so the files are stored and compared byte for byte. */
  async git(args, cwd, check = true) {
    const result = await run('git', ['-c', 'core.autocrlf=false', ...args], {
      cwd,
      timeout: 300_000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    if (check && result.code !== 0) {
      throw new GitError('err.gitFailed', { command: args[0], detail: (result.stderr || result.stdout).trim() });
    }
    return result;
  }

  /** Fresh shallow clone of the branch into a new temporary folder. */
  async cloneFresh() {
    const dir = path.join(this.tempRoot, `repo-${Date.now()}`);
    fs.mkdirSync(this.tempRoot, { recursive: true });
    const { repository, branch } = this.s;
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
      this.log.info(`Branch '${branch}' does not exist on GitHub yet: it will be created`);
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
   * Clone, compare, copy, commit and push. Returns 'pushed', 'up-to-date' or 'rejected'
   * (someone else pushed in the meantime: the caller retries with a new clone).
   */
  async syncOnce() {
    this.setStatus('status.cloning', 'busy');
    const dir = await this.cloneFresh();
    try {
      const changed = this.files.filter((repoFile, i) => {
        const dest = path.join(dir, repoFile);
        return !fs.existsSync(dest) || sha256(dest) !== sha256(this.sourceFiles[i]);
      });
      if (!changed.length) {
        this.log.info('The files on GitHub are already up to date');
        return 'up-to-date';
      }

      this.setStatus('status.pushing', 'busy');
      for (const repoFile of changed) {
        const dest = path.join(dir, repoFile);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(this.sourceFiles[this.files.indexOf(repoFile)], dest);
        this.log.info(`Copied ${path.basename(repoFile)} from the ${this.game.name} folder`);
      }
      await this.git(['add', '--', ...changed], dir);
      await this.git(['commit', '-m', this.s.commit_message, '--', ...changed], dir);
      const sha = (await this.git(['rev-parse', '--short', 'HEAD'], dir)).stdout.trim();

      const push = await this.git(['push', 'origin', `HEAD:refs/heads/${this.s.branch}`], dir, false);
      if (push.code !== 0) {
        if (/\[rejected\]|non-fast-forward|fetch first/i.test(push.stderr)) return 'rejected';
        throw new GitError('err.gitFailed', { command: 'push', detail: push.stderr.trim() });
      }
      this.lastPush = `${new Date().toLocaleString()} (${sha})`;
      this.log.info(`Pushed ${sha} to ${this.s.branch}`);
      return 'pushed';
    } finally {
      removeDir(dir); // every push starts from a clean clone
    }
  }

  /** Returns true if something was pushed. */
  async doSync(manual) {
    const missing = this.sourceFiles.filter((f) => !fs.existsSync(f)).map((f) => path.basename(f));
    if (missing.length) {
      // not an error: the files appear the first time export_server_packages is run in the game
      this.log.info(`Waiting for ${missing.join(', ')} in ${this.source} (run export_server_packages in the ${this.game.name} console)`);
      this.waitingForExport = true;
      return false;
    }
    this.waitingForExport = false;

    await this.waitUntilStable();
    const hash = this.sourceFiles.map(sha256).join(':');
    if (!manual && hash === this.syncedHash) {
      this.log.info('Package files unchanged since the last sync');
      return false;
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await this.syncOnce();
      if (result !== 'rejected') {
        this.syncedHash = hash;
        this.lastCheck = new Date().toLocaleString();
        return result === 'pushed';
      }
      this.log.warn(`Push rejected: the branch changed on GitHub, retrying with a fresh clone (${attempt}/3)`);
    }
    throw new GitError('err.pushRejected');
  }

  async sync(manual = false) {
    if (this.syncing) {
      if (!manual) this.scheduleSync(); // a sync is running: try again after it
      return;
    }
    this.syncing = true;
    this.busy = true;
    try {
      this.setStatus('status.syncing', 'busy');
      if (await this.doSync(manual)) this.notify(t('notify.pushed', { value: this.lastPush }));
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
  }

  scheduleSync() {
    if (!this.watchers.length) return; // engine stopped
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), Number(this.s.debounce_seconds) * 1000);
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

module.exports = { ClientEngine, TEMP_ROOT };
