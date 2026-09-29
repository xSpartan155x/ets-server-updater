// The games the app can manage. Each game has its own settings, engine, webhook port and server state,
// so a PC can sync ETS2 and ATS at the same time (e.g. two dedicated servers on one machine).
const path = require('path');

const GAMES = {
  ets2: {
    id: 'ets2',
    name: 'ETS2',
    fullName: 'Euro Truck Simulator 2',
    documentsFolder: 'Euro Truck Simulator 2', // in Documents: where the game writes export_server_packages
    serverExe: 'eurotrucks2_server.exe',
    serverAppId: 1948160, // Steam app of the dedicated server (anonymous download with SteamCMD)
    defaultPort: 8787,
    icon: 'ets2.png',
  },
  ats: {
    id: 'ats',
    name: 'ATS',
    fullName: 'American Truck Simulator',
    documentsFolder: 'American Truck Simulator',
    serverExe: 'amtrucks_server.exe',
    serverAppId: 2239530,
    defaultPort: 8788,
    icon: 'ats.png',
  },
};

const GAME_IDS = Object.keys(GAMES);

/**
 * The dedicated server always keeps its files under a "<documentsFolder>" subfolder of whatever -homedir it is
 * given (the same way -homedir substitutes for "My Documents" for the normal client): it is never the -homedir
 * folder itself. `homedir` here is the folder configured in the app; the actual files are at the returned path,
 * except when `homedir` already IS that subfolder (e.g. the legacy default "Documents\<documentsFolder>"), in
 * which case it already is the right place.
 */
function gameHomeOf(documentsFolder, homedir) {
  if (!homedir) return '';
  return path.basename(homedir).toLowerCase() === documentsFolder.toLowerCase() ? homedir : path.join(homedir, documentsFolder);
}

/** The value to actually pass as -homedir so the server's real home folder ends up being gameHomeOf(...). */
function launchHomedirOf(documentsFolder, homedir) {
  return path.basename(homedir).toLowerCase() === documentsFolder.toLowerCase() ? path.dirname(homedir) : homedir;
}

module.exports = { GAMES, GAME_IDS, gameHomeOf, launchHomedirOf };
