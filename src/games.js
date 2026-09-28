// The games the app manages (same ids as electron/games.js).
import ets2Icon from '../resources/ets2.png';
import atsIcon from '../resources/ats.png';

export const GAMES = [
  {
    id: 'ets2',
    name: 'ETS2',
    fullName: 'Euro Truck Simulator 2',
    icon: ets2Icon,
    documentsFolder: 'Euro Truck Simulator 2',
    serverExe: 'eurotrucks2_server.exe',
    defaultPort: 8787,
  },
  {
    id: 'ats',
    name: 'ATS',
    fullName: 'American Truck Simulator',
    icon: atsIcon,
    documentsFolder: 'American Truck Simulator',
    serverExe: 'amtrucks_server.exe',
    defaultPort: 8788,
  },
];

export const GAME = Object.fromEntries(GAMES.map((game) => [game.id, game]));

/** Ids of the games in use in a state snapshot, in the order of GAMES (optionally only the ones in `mode`). */
export const activeIds = (snapshot, mode) =>
  GAMES.map((g) => g.id).filter((id) => snapshot.games[id] && (!mode || snapshot.games[id].mode === mode));
