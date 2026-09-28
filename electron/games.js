// The games the app can manage. Each game has its own settings, engine, webhook port and server state,
// so a PC can sync ETS2 and ATS at the same time (e.g. two dedicated servers on one machine).

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

module.exports = { GAMES, GAME_IDS };
