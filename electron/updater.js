// App updates from the GitHub releases of the project (electron-updater, NSIS installer).
// Every release must include ETS2PackageSync-Setup-<version>.exe, its .blockmap and latest.yml
// (all three are created by `npm run dist` in the release folder).
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('./logger');
const { t, LocalizedError, errorText } = require('./i18n');

const OWNER = 'xSpartan155x';
const REPO = 'ets-server-updater';
const RELEASES_URL = `https://github.com/${OWNER}/${REPO}/releases`;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
const FIRST_CHECK_MS = 15_000;

/** Only the NSIS installation can update itself (not npm run dev, not the portable zip). */
function canInstall() {
  if (!app.isPackaged) return false;
  return fs.existsSync(path.join(path.dirname(process.execPath), `Uninstall ${app.getName()}.exe`));
}

/** Short error for the UI: a LocalizedError for the known cases, else the first line of the message. */
function friendlyError(err) {
  const text = String((err && err.message) || err || 'unknown error');
  if (/latest\.yml/i.test(text) && /cannot find|404/i.test(text)) return new LocalizedError('err.noLatestYml');
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|net::ERR_/i.test(text)) return new LocalizedError('err.offline');
  if (/403|rate limit/i.test(text)) return new LocalizedError('err.rateLimit');
  return new Error(text.split('\n')[0].slice(0, 160));
}

class Updater extends EventEmitter {
  constructor() {
    super();
    this.state = {
      status: 'idle', // idle | checking | available | not-available | downloading | downloaded | error
      current: app.getVersion(),
      latest: '',
      progress: 0,
      error: null, // Error: translated by view()
      checkedAt: '',
      canInstall: canInstall(),
      releaseUrl: RELEASES_URL,
    };
    this.manual = false;
    this.timer = null;

    autoUpdater.logger = null;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true; // a downloaded update is also installed on Exit
    autoUpdater.allowPrerelease = false;
    autoUpdater.setFeedURL({ provider: 'github', owner: OWNER, repo: REPO });
    if (!app.isPackaged) autoUpdater.forceDevUpdateConfig = true; // npm run dev: check only

    autoUpdater.on('checking-for-update', () => this.set({ status: 'checking', error: null }));
    autoUpdater.on('update-available', (info) => {
      this.set({ status: 'available', latest: info.version, releaseUrl: `${RELEASES_URL}/tag/v${info.version}`, checkedAt: now() });
      if (this.notified !== info.version) { // once per version, not at every periodic check
        this.notified = info.version;
        log.info(`Update available: ${info.version} (current ${this.state.current})`);
        this.emit('notify', t('notify.appUpdateAvailable', { version: info.version }));
      }
    });
    autoUpdater.on('update-not-available', (info) => {
      this.set({ status: 'not-available', latest: info.version, checkedAt: now() });
      if (this.manual) log.info(`No updates: ${this.state.current} is the latest version`);
    });
    autoUpdater.on('download-progress', (p) => this.set({ status: 'downloading', progress: Math.round(p.percent || 0) }));
    autoUpdater.on('update-downloaded', (info) => {
      this.set({ status: 'downloaded', progress: 100, latest: info.version });
      log.info(`Update ${info.version} downloaded: it is installed on restart`);
      this.emit('notify', t('notify.appUpdateReady', { version: info.version }));
    });
    autoUpdater.on('error', (err) => {
      // a failed background check must not bother the user: only manual checks show the error
      const wasDownloading = this.state.status === 'downloading';
      const error = friendlyError(err);
      log.warn(`Update ${wasDownloading ? 'download' : 'check'} failed: ${error.message}`);
      if (this.manual || wasDownloading) this.set({ status: 'error', error, checkedAt: now() });
      else this.set({ status: this.before || 'idle' });
    });
  }

  set(values) {
    this.state = { ...this.state, ...values };
    this.emit('change', this.view());
  }

  /** State sent to the UI, with the error in the current language. */
  view() {
    return { ...this.state, error: errorText(this.state.error) };
  }

  start() {
    setTimeout(() => this.check(false), FIRST_CHECK_MS);
    this.timer = setInterval(() => this.check(false), CHECK_EVERY_MS);
  }

  async check(manual = true) {
    if (['checking', 'downloading', 'downloaded'].includes(this.state.status)) return this.view();
    this.manual = manual;
    this.before = this.state.status; // restored if a background check fails
    try {
      await autoUpdater.checkForUpdates();
    } catch {
      // reported by the 'error' event
    }
    return this.view();
  }

  async download() {
    if (this.state.status !== 'available' || !this.state.canInstall) return this.view();
    this.manual = true;
    this.set({ status: 'downloading', progress: 0, error: null });
    try {
      await autoUpdater.downloadUpdate();
    } catch {
      // reported by the 'error' event
    }
    return this.view();
  }

  /** Quit and run the installer (silent, same folder), then start the new version. */
  install() {
    if (this.state.status !== 'downloaded') return false;
    log.info(`Installing update ${this.state.latest}`);
    autoUpdater.quitAndInstall(true, true);
    return true;
  }
}

const now = () => new Date().toLocaleString('sv-SE').slice(0, 16);

module.exports = { Updater };
