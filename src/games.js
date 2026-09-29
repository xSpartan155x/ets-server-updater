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
    steamAppId: 227300, // App ID of the game for the server_logon_token
    defaultPort: 8787,
  },
  {
    id: 'ats',
    name: 'ATS',
    fullName: 'American Truck Simulator',
    icon: atsIcon,
    documentsFolder: 'American Truck Simulator',
    serverExe: 'amtrucks_server.exe',
    steamAppId: 270880,
    defaultPort: 8788,
  },
];

export const GAME = Object.fromEntries(GAMES.map((game) => [game.id, game]));

/** Ids of the games in use in a state snapshot, in the order of GAMES (optionally only the ones with `role` on). */
export const activeIds = (snapshot, role) =>
  GAMES.map((g) => g.id).filter((id) => snapshot.games[id] && (!role || snapshot.games[id][role]));

/** Id of a server made from its name (the same rule as electron/settings.js). */
export function slug(text) {
  const base = String(text || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  return base || 'server';
}

/** A free id for `name` among the ids `taken`. */
export function uniqueId(name, taken) {
  const base = slug(name);
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}
