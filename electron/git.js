// Git for Windows, needed by the Client mode. Besides the PATH it is looked for in the usual install folders,
// so a Git installed while the app is running is found without restarting the app (the PATH of a running
// process is not updated).
const fs = require('fs');
const path = require('path');
const { run } = require('./engine');

const DOWNLOAD_URL = 'https://git-scm.com/download/win';

function candidates() {
  const env = process.env;
  return [
    'git',
    env.ProgramFiles && path.join(env.ProgramFiles, 'Git', 'cmd', 'git.exe'),
    env['ProgramFiles(x86)'] && path.join(env['ProgramFiles(x86)'], 'Git', 'cmd', 'git.exe'),
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs', 'Git', 'cmd', 'git.exe'),
  ].filter(Boolean);
}

/** { path, version } of a working git, or null. */
async function findGit() {
  for (const exe of candidates()) {
    if (exe !== 'git' && !fs.existsSync(exe)) continue;
    const result = await run(exe, ['--version'], { timeout: 15_000 });
    if (result.code === 0) return { path: exe, version: result.stdout.trim() };
  }
  return null;
}

module.exports = { findGit, DOWNLOAD_URL };
