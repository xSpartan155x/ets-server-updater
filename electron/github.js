// GitHub REST API used by the servers: latest commit of a branch and download of the package files at a commit,
// verified against git's blob hash. Each server has its own repository; the token (fine-grained, Contents:
// Read-only) is needed only for private repositories.
const crypto = require('crypto');
const { parseRepository } = require('./engine');
const { LocalizedError } = require('./i18n');

const GITHUB_API = 'https://api.github.com';

class UpdateError extends LocalizedError {
  get name() { return 'UpdateError'; }
}

/** SHA-1 exactly as git computes it for a blob (matches the GitHub contents API "sha"). */
const gitBlobSha = (data) =>
  crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');

/** "owner/repo" of a repository URL, lowercase: the key used to match webhooks and polling. */
function repoKey(url) {
  const { owner, repo } = parseRepository(url);
  return `${owner}/${repo}`.toLowerCase();
}

class GitHubRepo {
  /** url: https://github.com/owner/repo; token: '' for public repositories. */
  constructor(url, token) {
    ({ owner: this.owner, repo: this.repo } = parseRepository(url));
    this.token = token || '';
  }

  async get(apiPath, accept = 'application/vnd.github+json', params = {}) {
    const url = new URL(`${GITHUB_API}/repos/${this.owner}/${this.repo}/${apiPath}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const headers = { Accept: accept, 'User-Agent': 'ETS2PackageSync', 'X-GitHub-Api-Version': '2022-11-28' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) });
    if (response.status !== 200) {
      let detail = (await response.text()).slice(0, 200);
      try {
        detail = JSON.parse(detail).message || detail;
      } catch {
        // not JSON: keep the text
      }
      throw new UpdateError(response.status === 404 ? 'err.githubApi404' : 'err.githubApi',
        { status: response.status, path: `${this.owner}/${this.repo}/${apiPath}`, detail });
    }
    return response;
  }

  async latestCommit(branch) {
    const r = await this.get(`commits/${encodeURIComponent(branch)}`, 'application/vnd.github.sha');
    return (await r.text()).trim();
  }

  /** Download files of the repository at a commit: Map(repoFile -> Buffer), each one checked against its blob hash. */
  async download(sha, repoFiles, log) {
    const files = new Map();
    for (const repoFile of repoFiles) {
      const apiPath = `contents/${repoFile.split('/').map(encodeURIComponent).join('/')}`;
      const meta = await (await this.get(apiPath, undefined, { ref: sha })).json();
      if (meta.type !== 'file') throw new UpdateError('err.notAFile', { file: repoFile, sha: sha.slice(0, 7) });
      const data = Buffer.from(await (await this.get(apiPath, 'application/vnd.github.raw', { ref: sha })).arrayBuffer());
      if (!data.length) throw new UpdateError('err.emptyFile', { file: repoFile, sha: sha.slice(0, 7) });
      if (data.length !== meta.size || gitBlobSha(data) !== meta.sha) throw new UpdateError('err.mismatch', { file: repoFile });
      files.set(repoFile, data);
      log?.info(`Downloaded ${repoFile} (${data.length} bytes, blob ${meta.sha.slice(0, 7)})`);
    }
    return files;
  }
}

module.exports = { GitHubRepo, UpdateError, gitBlobSha, repoKey };
