// server_config.sii of the dedicated server (the same format for ETS2 and ATS). Only the values are changed:
// indentation, comments, the order of the lines and the keys the app does not know stay as they are.
//
//   SiiNunit
//   {
//   server_config : _nameless.xxx.xxxx {
//    lobby_name: "Euro Truck Simulator 2 server"
//    max_players: 8
//    moderator_list: 2
//    moderator_list[0]: 76561198000000000
//    ...
//   }
//   }

const FIELDS = {
  lobby_name: { type: 'string', max: 63 },
  description: { type: 'string', max: 63 },
  welcome_message: { type: 'string', max: 127 },
  password: { type: 'string', max: 63 },
  max_players: { type: 'int', min: 1, max: 128 },
  max_vehicles_total: { type: 'int', min: 0, max: 10000 },
  max_ai_vehicles_player: { type: 'int', min: 0, max: 10000 },
  max_ai_vehicles_player_spawn: { type: 'int', min: 0, max: 10000 },
  connection_virtual_port: { type: 'int', min: 0, max: 65535 },
  query_virtual_port: { type: 'int', min: 0, max: 65535 },
  connection_dedicated_port: { type: 'int', min: 0, max: 65535 },
  query_dedicated_port: { type: 'int', min: 0, max: 65535 },
  server_logon_token: { type: 'token' },
  player_damage: { type: 'bool' },
  traffic: { type: 'bool' },
  hide_in_company: { type: 'bool' },
  hide_colliding: { type: 'bool' },
  force_speed_limiter: { type: 'bool' },
  mods_optioning: { type: 'bool' },
  timezones: { type: 'int', min: 0, max: 2 },
  service_no_collision: { type: 'bool' },
  in_menu_ghosting: { type: 'bool' },
  name_tags: { type: 'bool' },
};

const MODERATORS = 'moderator_list';

/** A "key: value // comment" line: value may be a quoted string (which can contain //). */
const LINE = /^(\s*)([A-Za-z_][\w]*(?:\[\d+\])?)(\s*:\s*)(.*)$/;

function splitValue(rest) {
  if (rest.startsWith('"')) {
    let i = 1;
    while (i < rest.length && rest[i] !== '"') i += rest[i] === '\\' ? 2 : 1;
    return { raw: rest.slice(0, i + 1), tail: rest.slice(i + 1) };
  }
  const comment = rest.indexOf('//');
  const raw = (comment < 0 ? rest : rest.slice(0, comment)).trimEnd();
  return { raw, tail: rest.slice(raw.length) };
}

const unquote = (raw) => (raw.startsWith('"') ? raw.slice(1, -1).replace(/\\(.)/g, '$1') : raw);
const quote = (text) => `"${String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

function readValue(key, raw) {
  const field = FIELDS[key];
  const text = unquote(raw);
  if (!field) return text;
  if (field.type === 'bool') return text === 'true';
  if (field.type === 'int') return Number.parseInt(text, 10) || 0;
  return text;
}

function writeValue(key, value) {
  const field = FIELDS[key];
  if (field.type === 'bool') return value ? 'true' : 'false';
  if (field.type === 'int') return String(value);
  if (field.type === 'token') return value ? String(value) : '""';
  return quote(value);
}

/** Lines of the text and the range of the server_config block (the lines between its braces). */
function locate(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s*server_config\s*:/.test(line));
  if (start < 0) return { lines, start: -1, end: -1 };
  let end = lines.findIndex((line, i) => i > start && /^\s*}\s*$/.test(line));
  if (end < 0) end = lines.length;
  return { lines, start, end };
}

/** { values, moderators } of a server_config.sii. Throws when the file has no server_config block. */
function parseServerConfig(text) {
  const { lines, start, end } = locate(String(text).replace(/^﻿/, ''));
  if (start < 0) throw new Error('no server_config block');
  const values = {};
  const moderators = [];
  for (const line of lines.slice(start + 1, end)) {
    const match = LINE.exec(line);
    if (!match) continue;
    const key = match[2];
    const { raw } = splitValue(match[4]);
    const item = /^moderator_list\[(\d+)\]$/.exec(key);
    if (item) moderators[Number(item[1])] = unquote(raw);
    else if (key in FIELDS) values[key] = readValue(key, raw);
  }
  return { values, moderators: moderators.filter((id) => id !== undefined && id !== '') };
}

/** Error of a value, as { field, rule, params } (null when valid). */
function checkValue(key, value) {
  const field = FIELDS[key];
  if (!field) return { field: key, rule: 'unknown' };
  if (field.type === 'bool') return typeof value === 'boolean' ? null : { field: key, rule: 'bool' };
  if (field.type === 'int') {
    return Number.isInteger(value) && value >= field.min && value <= field.max
      ? null : { field: key, rule: 'range', params: { min: field.min, max: field.max } };
  }
  if (field.type === 'token') return /^[A-Za-z0-9]*$/.test(String(value)) ? null : { field: key, rule: 'token' };
  if (typeof value !== 'string' || /[\r\n]/.test(value)) return { field: key, rule: 'text' };
  return [...value].length <= field.max ? null : { field: key, rule: 'length', params: { max: field.max } };
}

function checkConfig(values, moderators) {
  const errors = Object.entries(values).map(([key, value]) => checkValue(key, value)).filter(Boolean);
  moderators.forEach((id, i) => {
    if (!/^\d{1,20}$/.test(String(id))) errors.push({ field: MODERATORS, rule: 'steamId', params: { index: i + 1 } });
  });
  return errors;
}

/** New text of the file with the given values and moderators; everything else is kept. */
function updateServerConfig(text, values, moderators) {
  const bom = String(text).startsWith('﻿') ? '﻿' : '';
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  const { lines, start, end } = locate(String(text).replace(/^﻿/, ''));
  if (start < 0) throw new Error('no server_config block');

  const indent = (LINE.exec(lines.slice(start + 1, end).find((line) => LINE.test(line)) || '') || [])[1] ?? ' ';
  const pending = new Set(Object.keys(values));
  const body = [];
  let moderatorsAt = -1;
  for (const line of lines.slice(start + 1, end)) {
    const match = LINE.exec(line);
    if (match && (match[2] === MODERATORS || /^moderator_list\[\d+\]$/.test(match[2]))) {
      if (moderatorsAt < 0) moderatorsAt = body.length; // the list is written again at the place of the old one
      continue;
    }
    if (match && pending.has(match[2])) {
      const { tail } = splitValue(match[4]);
      body.push(`${match[1]}${match[2]}${match[3]}${writeValue(match[2], values[match[2]])}${tail}`);
      pending.delete(match[2]);
      continue;
    }
    body.push(line);
  }
  // keys missing in the file go at the end of the block
  for (const key of pending) body.push(`${indent}${key}: ${writeValue(key, values[key])}`);
  const list = [`${indent}${MODERATORS}: ${moderators.length}`, ...moderators.map((id, i) => `${indent}${MODERATORS}[${i}]: ${id}`)];
  body.splice(moderatorsAt < 0 ? body.length : moderatorsAt, 0, ...list);

  return bom + [...lines.slice(0, start + 1), ...body, ...lines.slice(end)].join(eol);
}

// ------------------------------------------------------------------ new servers

const PORT_KEYS = ['connection_virtual_port', 'query_virtual_port', 'connection_dedicated_port', 'query_dedicated_port'];

/** The four ports of a server_config.sii ({} when the file cannot be read). */
function portsOf(text) {
  try {
    const { values } = parseServerConfig(text);
    return Object.fromEntries(PORT_KEYS.filter((key) => key in values).map((key) => [key, values[key]]));
  } catch {
    return {};
  }
}

/**
 * Ports for one more server on this PC: the first pair of free virtual ports (100-200) and of free physical
 * ports (from 27015; LAN servers must stay within 27015-27020) after the ones already used by `taken`
 * (an array of portsOf() results). Two servers running at the same time must not share any of them.
 */
function freePorts(taken) {
  const used = new Set(taken.flatMap((ports) => Object.values(ports)));
  const pair = (from, to) => {
    for (let port = from; port + 1 <= to; port += 2) if (!used.has(port) && !used.has(port + 1)) return [port, port + 1];
    return [from, from + 1];
  };
  const [connectionVirtual, queryVirtual] = pair(100, 200);
  const [connectionDedicated, queryDedicated] = pair(27015, 27115);
  return {
    connection_virtual_port: connectionVirtual,
    query_virtual_port: queryVirtual,
    connection_dedicated_port: connectionDedicated,
    query_dedicated_port: queryDedicated,
  };
}

/** Defaults of the dedicated server (the same file it writes on its own), with a random nameless id. */
const TEMPLATE_VALUES = {
  lobby_name: 'Euro Truck Simulator 2 server',
  description: '',
  welcome_message: '',
  password: '',
  max_players: 8,
  max_vehicles_total: 100,
  max_ai_vehicles_player: 50,
  max_ai_vehicles_player_spawn: 50,
  connection_virtual_port: 100,
  query_virtual_port: 101,
  connection_dedicated_port: 27015,
  query_dedicated_port: 27016,
  server_logon_token: '',
  player_damage: true,
  traffic: true,
  hide_in_company: false,
  hide_colliding: true,
  force_speed_limiter: false,
  mods_optioning: false,
  timezones: 0,
  service_no_collision: false,
  in_menu_ghosting: false,
  name_tags: true,
};

/** Text of a new server_config.sii: the defaults with `values` on top (known fields only) and the moderators. */
function newServerConfig(values = {}, moderators = []) {
  const hex = (n) => Math.floor(Math.random() * 16 ** n).toString(16).padStart(n, '0');
  const merged = { ...TEMPLATE_VALUES };
  for (const [key, value] of Object.entries(values)) if (key in FIELDS) merged[key] = value;
  return [
    'SiiNunit',
    '{',
    `server_config : _nameless.${hex(3)}.${hex(4)}.${hex(4)} {`,
    ...Object.entries(merged).map(([key, value]) => ` ${key}: ${writeValue(key, value)}`),
    ' friends_only: false',
    ' show_server: true',
    ` ${MODERATORS}: ${moderators.length}`,
    ...moderators.map((id, i) => ` ${MODERATORS}[${i}]: ${id}`),
    '}',
    '',
    '}',
    '',
  ].join('\r\n');
}

module.exports = { FIELDS, PORT_KEYS, parseServerConfig, updateServerConfig, checkConfig, portsOf, freePorts, newServerConfig };
