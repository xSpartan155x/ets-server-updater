// Names and avatars of Steam profiles, for the moderators of server_config.sii (the file keeps the Steam IDs).
// Read from the public XML of the profile (no API key needed; name and avatar are public even for private
// profiles) and cached in steam_profiles.json, so the names are shown also when Steam is not reachable.
const fs = require('fs');
const path = require('path');

const MAX_AGE_MS = 24 * 60 * 60_000; // names change rarely: refreshed once a day
const STEAM_ID = /^7656119\d{10}$/; // 64-bit Steam ID of an individual account

const cdata = (xml, tag) => {
  const match = new RegExp(`<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tag}>`).exec(xml);
  return match ? (match[1] ?? match[2] ?? '').trim() : '';
};

class SteamProfiles {
  constructor(dir) {
    this.file = path.join(dir, 'steam_profiles.json');
    try {
      this.cache = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      this.cache = {}; // id -> { name, avatar, found, at }
    }
  }

  save() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.cache, null, 2));
    } catch {
      // only a cache
    }
  }

  /** Profile XML of a Steam ID or of a custom URL (steamcommunity.com/id/<name>). null = profile not found. */
  async fetchProfile(urlPath) {
    const response = await fetch(`https://steamcommunity.com/${urlPath}?xml=1`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    const id = cdata(xml, 'steamID64');
    if (!id) return null; // <response><error>The specified profile could not be found.</error></response>
    return { id, name: cdata(xml, 'steamID'), avatar: cdata(xml, 'avatarMedium') || cdata(xml, 'avatarIcon') };
  }

  /**
   * { id: { name, avatar, found, offline? } } for the given Steam IDs. IDs that are not 64-bit Steam IDs are
   * left out; when Steam is not reachable the cached names are returned (offline: true).
   */
  async lookup(ids) {
    const result = {};
    const queue = [...new Set(ids.map(String))].filter((id) => STEAM_ID.test(id));
    const worker = async () => {
      for (let id = queue.shift(); id; id = queue.shift()) {
        const cached = this.cache[id];
        if (cached && Date.now() - cached.at < MAX_AGE_MS) {
          result[id] = cached;
          continue;
        }
        try {
          const profile = await this.fetchProfile(`profiles/${id}`);
          this.cache[id] = profile ? { name: profile.name, avatar: profile.avatar, found: true, at: Date.now() } : { found: false, at: Date.now() };
          result[id] = this.cache[id];
        } catch {
          result[id] = cached ? { ...cached, offline: true } : { found: false, offline: true };
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    this.save();
    return result;
  }

  /**
   * Steam ID of what the user typed: a Steam ID, a profile link (.../profiles/<id> or .../id/<name>) or a
   * custom URL name. Resolves { id, name, avatar }; throws 'not-found' or 'offline'.
   */
  async resolve(input) {
    const text = String(input || '').trim();
    const byId = /^(\d{17})$/.exec(text) || /steamcommunity\.com\/profiles\/(\d{17})/i.exec(text);
    const custom = /steamcommunity\.com\/id\/([^/?#\s]+)/i.exec(text) || /^([A-Za-z0-9_-]{2,32})$/.exec(text);
    const urlPath = byId ? `profiles/${byId[1]}` : custom ? `id/${encodeURIComponent(custom[1])}` : null;
    if (!urlPath) throw new Error('not-found');
    let profile;
    try {
      profile = await this.fetchProfile(urlPath);
    } catch {
      throw new Error('offline');
    }
    if (!profile || !STEAM_ID.test(profile.id)) throw new Error('not-found');
    this.cache[profile.id] = { name: profile.name, avatar: profile.avatar, found: true, at: Date.now() };
    this.save();
    return profile;
  }
}

module.exports = { SteamProfiles, STEAM_ID };
