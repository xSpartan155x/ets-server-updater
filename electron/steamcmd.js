// SteamCMD, used by the servers to keep the dedicated server of the game up to date. It is downloaded on first
// use into the data folder of the app (no Steam client needed) and runs anonymously: the dedicated servers of
// ETS2 and ATS are free. One SteamCMD run at a time: the games share the same installation.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { run } = require('./engine');
const { LocalizedError } = require('./i18n');

const ZIP_URL = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip';
const INFO_TIMEOUT = 5 * 60_000;
const UPDATE_TIMEOUT = 3 * 60 * 60_000;

// Phases of an update in logs\content_log.txt ("AppID 1948160 App update changed : Running Update,Downloading,Staging,").
// The console output of SteamCMD arrives only at the end when it is not a real console, the log is written live.
const PHASES = [['Committing', 'committing'], ['Verifying', 'verifying'], ['Downloading', 'downloading'], ['Preallocating', 'preparing']];

/** Build id of the public branch in the output of app_info_print. */
function parseLatestBuild(output) {
  const match = /"branches"\s*\{\s*"public"\s*\{[^}]*?"buildid"\s*"(\d+)"/.exec(output);
  return match ? match[1] : '';
}

/**
 * Build id of the installed server, from the Steam manifest: SteamCMD writes it in <install dir>\steamapps,
 * the Steam client in the steamapps folder of its library (two levels above <library>\steamapps\common\<game>).
 */
function installedBuild(installDir, appId) {
  if (!installDir) return '';
  for (const file of [
    path.join(installDir, 'steamapps', `appmanifest_${appId}.acf`),
    path.join(installDir, '..', '..', `appmanifest_${appId}.acf`),
  ]) {
    try {
      const match = /"buildid"\s+"(\d+)"/.exec(fs.readFileSync(file, 'utf8'));
      if (match) return match[1];
    } catch {
      // not there: try the next place
    }
  }
  return '';
}

class SteamCmd {
  constructor(dir) {
    this.dir = dir;
    this.exe = path.join(dir, 'steamcmd.exe');
    this.queue = Promise.resolve();
  }

  /** Run tasks one after the other (SteamCMD cannot run twice from the same folder). */
  exclusive(task) {
    const result = this.queue.then(task, task);
    this.queue = result.catch(() => {});
    return result;
  }

  /** Download and set up SteamCMD if missing. onStatus('download' | 'setup'); signal: stops it (see exec). */
  async ensure(onStatus = () => {}, signal = undefined) {
    if (fs.existsSync(this.exe)) return;
    onStatus('download');
    fs.mkdirSync(this.dir, { recursive: true });
    const zip = path.join(this.dir, 'steamcmd.zip');
    try {
      const timeout = AbortSignal.timeout(120_000);
      const response = await fetch(ZIP_URL, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      fs.writeFileSync(zip, Buffer.from(await response.arrayBuffer()));
      const script = `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${this.dir.replace(/'/g, "''")}' -Force`;
      const unzip = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 120_000 });
      if (unzip.code !== 0) throw new Error(unzip.stderr.trim() || `exit code ${unzip.code}`);
    } catch (err) {
      throw new LocalizedError('err.steamcmdDownload', { message: err.message });
    } finally {
      fs.rmSync(zip, { force: true });
    }
    if (!fs.existsSync(this.exe)) throw new LocalizedError('err.steamcmdDownload', { message: 'steamcmd.exe missing' });
    onStatus('setup');
    await this.exec(['+quit'], () => {}, UPDATE_TIMEOUT, signal); // first run: SteamCMD updates itself (exit code 7)
  }

  /**
   * Run SteamCMD with the given commands; onLine gets every output line. Resolves { code, output }. signal: an
   * AbortSignal that ends SteamCMD (and what it started) and rejects with err.steamcmdCancelled.
   */
  exec(commands, onLine, timeout, signal = undefined) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new LocalizedError('err.steamcmdCancelled'));
        return;
      }
      const child = spawn(this.exe, ['+@ShutdownOnFailedCommand', '1', '+@NoPromptForPassword', '1', ...commands], {
        cwd: this.dir,
        windowsHide: true,
      });
      let output = '';
      let partial = '';
      const feed = (chunk) => {
        const text = partial + chunk.toString('utf8');
        const lines = text.split(/\r\n|\r|\n/);
        partial = lines.pop();
        for (const line of lines) {
          output += `${line}\n`;
          if (line.trim()) onLine(line.trim());
        }
      };
      child.stdout.on('data', feed);
      child.stderr.on('data', feed);
      const timer = setTimeout(() => child.kill(), timeout);
      // the whole tree: after updating itself SteamCMD may go on in a new process
      const cancel = () => run('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], { timeout: 15_000 }).catch(() => child.kill());
      signal?.addEventListener('abort', cancel, { once: true });
      child.on('error', (err) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        reject(new LocalizedError('err.steamcmdRun', { message: err.message }));
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        if (signal?.aborted) {
          reject(new LocalizedError('err.steamcmdCancelled'));
          return;
        }
        if (partial.trim()) {
          output += partial;
          onLine(partial.trim());
        }
        resolve({ code: code ?? -1, output });
      });
    });
  }

  /** Build id of the public branch of an app on Steam. signal: stops the check (nothing is installed by it). */
  latestBuild(appId, onStatus, signal) {
    return this.exclusive(async () => {
      await this.ensure(onStatus, signal);
      const { output } = await this.exec(
        ['+login', 'anonymous', '+app_info_update', '1', '+app_info_print', String(appId), '+quit'], () => {}, INFO_TIMEOUT, signal);
      const build = parseLatestBuild(output);
      if (!build) throw new LocalizedError('err.steamcmdInfo', { detail: lastError(output) || 'no build id' });
      return build;
    });
  }

  /**
   * Install or update an app in installDir. onPhase({ phase, bytes }) while it runs: phase is 'preparing',
   * 'downloading', 'verifying' or 'committing', bytes the size of the download (when known).
   */
  update(appId, installDir, onPhase, onStatus) {
    return this.exclusive(async () => {
      await this.ensure(onStatus);
      fs.mkdirSync(installDir, { recursive: true });
      const attempt = async () => {
        const stopWatching = this.watchLog(appId, onPhase);
        try {
          // app_info_update first: a fresh SteamCMD fails app_update with "Missing configuration" otherwise
          return await this.exec(
            ['+force_install_dir', installDir, '+login', 'anonymous', '+app_info_update', '1', '+app_update', String(appId), '+quit'],
            () => {}, UPDATE_TIMEOUT);
        } finally {
          stopWatching();
        }
      };
      let { code, output } = await attempt();
      if (/Missing configuration/i.test(output)) ({ code, output } = await attempt()); // still new to the app: once more
      if (!new RegExp(`Success! App '${appId}'`).test(output)) {
        throw new LocalizedError('err.steamcmdUpdate', { detail: lastError(output) || `exit code ${code}` });
      }
      return /already up to date/.test(output) ? 'up-to-date' : 'updated';
    });
  }

  /** Follow logs\content_log.txt and report the phases of the update of appId. Returns the function that stops. */
  watchLog(appId, onPhase) {
    const file = path.join(this.dir, 'logs', 'content_log.txt');
    let offset = fs.existsSync(file) ? fs.statSync(file).size : 0;
    let bytes = 0;
    let last = '';
    const report = (phase) => {
      if (phase === last) return;
      last = phase;
      onPhase({ phase, bytes });
    };
    report('preparing');
    const timer = setInterval(() => {
      let text;
      try {
        const size = fs.statSync(file).size;
        if (size < offset) offset = 0; // log rotated
        if (size === offset) return;
        const buffer = Buffer.alloc(size - offset);
        const fd = fs.openSync(file, 'r');
        fs.readSync(fd, buffer, 0, buffer.length, offset);
        fs.closeSync(fd);
        offset = size;
        text = buffer.toString('utf8');
      } catch {
        return; // not written yet: next time
      }
      for (const line of text.split(/\r?\n/)) {
        if (!line.includes(`AppID ${appId} `)) continue;
        const started = /update started : download \d+\/(\d+)/.exec(line);
        if (started) bytes = Number(started[1]);
        if (!/App update changed/.test(line)) continue;
        const phase = PHASES.find(([word]) => line.includes(word));
        if (phase) report(phase[1]);
      }
    }, 1000);
    return () => clearInterval(timer);
  }
}

/** Last "ERROR! ..." line of SteamCMD (e.g. "ERROR! Failed to install app '...' (Disk write failure)"). */
function lastError(output) {
  const errors = output.split('\n').filter((line) => /^\s*(ERROR!|Error!)/.test(line));
  return errors.length ? errors[errors.length - 1].trim() : '';
}

module.exports = { SteamCmd, installedBuild, parseLatestBuild };
