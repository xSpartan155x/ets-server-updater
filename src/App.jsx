import { useEffect, useRef, useState } from 'react';
import {
  BookOpen, ChevronDown, CloudUpload, LayoutDashboard, List, Loader2, Monitor, Moon, Plus, ScrollText, ServerCog,
  Settings as SettingsIcon, SlidersHorizontal, Sun,
} from 'lucide-react';
import { SearchInput, StatusDot, STATE_STYLES, matches } from './components/ui';
import GameSwitcher from './components/GameSwitcher';
import GitDialog from './components/GitDialog';
import DestinationChooser from './components/DestinationChooser';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import Server from './pages/Server';
import NewServer from './pages/server/NewServer';
import SendTo from './pages/server/SendTo';
import ServerOptions from './pages/server/ServerOptions';
import Guide from './pages/Guide';
import UpdateCard, { UpdateBanner } from './components/UpdateCard';
import { GAME, activeIds } from './games';
import { I18nProvider, useT } from './i18n';

const NAV = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'server', icon: ServerCog, server: true }, // everything about servers, of both roles (see ServerNav)
  { id: 'settings', icon: SettingsIcon },
  { id: 'logs', icon: ScrollText },
  { id: 'guide', icon: BookOpen },
];

const THEMES = [
  { id: 'light', icon: Sun },
  { id: 'system', icon: Monitor },
  { id: 'dark', icon: Moon },
];

const NAV_ITEM = 'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
const NAV_ACTIVE = 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400';
const NAV_IDLE = 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

const MAX_LOGS = 500;
const NAV_SEARCH_FROM = 7; // servers in the sidebar from which a search box helps
const MAX_CONSOLE = 2000;

/**
 * Pages of the Server group, where everything about servers is:
 * - server role: 'server-list' (all the servers and the shared installation), 'srv:<id>:<tab>' (one server, tab
 *   'console' | 'config' | 'settings') and 'server-options' (installation, updates, sync and rules of all the servers);
 * - client role: 'server-send' (the servers the exports are sent to).
 * 'server' opens the first page of the roles in use.
 */
export function serverRoute(page) {
  if (page === 'server') return { kind: 'home' };
  if (page === 'server-list' || page === 'server-updates') return { kind: 'list' };
  if (page === 'server-options') return { kind: 'options' };
  if (page === 'server-send') return { kind: 'send' };
  const match = /^srv:([^:]+):(\w+)$/.exec(page);
  return match ? { kind: 'server', id: match[1], tab: match[2] } : null;
}

/** The route of a page for the roles of the game (g: its snapshot): pages of a role not in use fall back. */
function resolveRoute(page, g) {
  if (!g?.client && !g?.server) return null;
  let route = serverRoute(page);
  if (!route) return null;
  const host = g.server;
  if (route.kind === 'home') route = { kind: host ? 'list' : 'send' };
  if (!host && route.kind !== 'send') route = { kind: 'send' };
  if (!g.client && route.kind === 'send') route = { kind: 'list' };
  if (route.kind === 'server' && !host.details.servers.some((s) => s.id === route.id)) route = { kind: 'list' };
  return route;
}

function ThemeSwitcher({ value, onChange }) {
  const t = useT();
  return (
    <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800/70">
      {THEMES.map(({ id, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={t(`theme.${id}`)}
          onClick={() => onChange(id)}
          className={`flex cursor-pointer items-center justify-center rounded-md py-1.5 transition-colors ${
            value === id
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

/** A line of the sidebar card: status of one role of the game. */
function RoleLine({ label, role }) {
  const style = STATE_STYLES[role.state] || STATE_STYLES.idle;
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">{label}</div>
      <div className={`flex items-center gap-2 text-xs font-medium ${style.text}`}>
        <StatusDot state={role.state} className="shrink-0" />
        <span className="truncate" title={role.status}>{role.status}</span>
      </div>
    </div>
  );
}

/** Sidebar card: roles and status of the chosen game. */
function GameStatus({ g }) {
  const t = useT();
  return (
    <div className="space-y-2.5 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      {g?.client && <RoleLine label={t('sidebar.role.client')} role={g.client} />}
      {g?.server && <RoleLine label={t('sidebar.role.server')} role={g.server} />}
      {!g && (
        <div className={`flex items-center gap-2 text-xs font-medium ${STATE_STYLES.idle.text}`}>
          <StatusDot state="idle" className="shrink-0" />
          <span className="truncate">{t('sidebar.notConfigured')}</span>
        </div>
      )}
    </div>
  );
}

/** Small title of a part of the Server group, shown when both roles are in use. */
function NavLabel({ children }) {
  return <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">{children}</div>;
}

/**
 * Sidebar group with everything about servers. Server role: all the servers (and the installation), one item per
 * server with its status, the wizard of a new server and the options shared by all of them. Client role: the servers
 * the exports are sent to.
 */
function ServerNav({ g, route, setPage, onNew }) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const inside = Boolean(route);
  useEffect(() => {
    if (inside) setOpen(true); // entering a Server page (e.g. from the Dashboard) shows its sub-items
  }, [inside]);
  const host = g.server;
  const both = Boolean(g.client && host);
  const steam = host?.details.steam;
  const updateNews = host && ((steam.installed && steam.latest && steam.installed !== steam.latest) || steam.phase || !host.details.exeExists);
  const [query, setQuery] = useState('');
  const servers = host ? host.details.servers : [];
  const shown = servers.filter((server) => (route?.kind === 'server' && route.id === server.id) || matches(query, server.name));
  const item = (active) => `${NAV_ITEM} py-1.5 ${active ? NAV_ACTIVE : NAV_IDLE}`;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!inside) {
            setPage('server');
            setOpen(true);
          } else {
            setOpen(!open);
          }
        }}
        className={`${NAV_ITEM} ${inside && !open ? NAV_ACTIVE : inside ? 'text-slate-900 dark:text-slate-100' : NAV_IDLE}`}
      >
        <ServerCog className="size-4" />
        <span className="flex-1 text-left">{t('nav.server')}</span>
        <ChevronDown className={`size-4 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="mt-1 ml-5 space-y-1 border-l border-slate-200 pl-2 dark:border-slate-800">
          {host && (
            <>
              {both && <NavLabel>{t('nav.group.hosted')}</NavLabel>}
              <button type="button" onClick={() => setPage('server-list')} className={item(route?.kind === 'list')}>
                <List className="size-3.5" />
                <span className="flex-1 text-left">{t('nav.server-list')}</span>
                {updateNews && <span className="size-1.5 rounded-full bg-orange-500" title={t('nav.installNews')} />}
              </button>
              {servers.length >= NAV_SEARCH_FROM && <SearchInput value={query} onChange={setQuery} className="py-0.5" />}
              {shown.map((server) => (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => setPage(`srv:${server.id}:${route?.kind === 'server' ? route.tab : 'console'}`)}
                  className={item(route?.kind === 'server' && route.id === server.id)}
                  title={server.status}
                >
                  <StatusDot state={server.state} className="mx-0.5 shrink-0 scale-90" />
                  <span className="min-w-0 flex-1 truncate text-left">{server.name}</span>
                </button>
              ))}
              <button type="button" onClick={onNew} className={`${NAV_ITEM} py-1.5 text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10`}>
                <Plus className="size-3.5" />
                <span className="flex-1 text-left">{t('nav.server-new')}</span>
              </button>
              <button type="button" onClick={() => setPage('server-options')} className={item(route?.kind === 'options')}>
                <SlidersHorizontal className="size-3.5" />
                <span className="flex-1 text-left">{t('nav.server-options')}</span>
              </button>
            </>
          )}
          {g.client && (
            <>
              {both && <NavLabel>{t('nav.group.client')}</NavLabel>}
              <button type="button" onClick={() => setPage('server-send')} className={item(route?.kind === 'send')}>
                <CloudUpload className="size-3.5" />
                <span className="flex-1 text-left">{t('nav.server-send')}</span>
                {!g.client.details.destinations.length && <span className="size-1.5 rounded-full bg-orange-500" title={t('nav.noDestinations')} />}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// per-viewer convenience: the game shown at the last visit
const GAME_KEY = 'game';

function savedGame() {
  try {
    return localStorage.getItem(GAME_KEY);
  } catch {
    return null;
  }
}

export default function App() {
  const [data, setData] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [logs, setLogs] = useState([]);
  const [consoleLines, setConsoleLines] = useState({}); // "game/server" -> lines
  const [page, setPage] = useState('dashboard');
  const [game, setGame] = useState(() => (GAME[savedGame()] ? savedGame() : 'ets2')); // game shown in every page
  const [choice, setChoice] = useState(null); // an export waiting for the choice of the server
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('system');
  const [locale, setLocale] = useState('en');
  const [git, setGit] = useState(null); // { found, version, downloadUrl }
  const [gitOpen, setGitOpen] = useState(false);

  useEffect(() => {
    window.api.getState().then((state) => {
      setData(state);
      setSnapshot(state.snapshot);
      setLogs(state.logs);
      setConsoleLines(state.console);
      setTheme(state.settings.theme || 'system');
      setLanguage(state.settings.language || 'system');
      setLocale(state.locale);
      setGit(state.git);
      // the client role cannot work without Git: say it right away
      if (!state.git.found && Object.values(state.settings.games).some((g) => g.client.enabled)) setGitOpen(true);
      if (!state.configured) setPage('settings');
      // first visit: show a game in use
      const used = activeIds(state.snapshot);
      if (!GAME[savedGame()] && used.length) setGame(used[0]);
      // an export was waiting for its server while the window was not open
      const waiting = Object.entries(state.choices || {})[0];
      if (waiting) {
        setChoice({ game: waiting[0], ...waiting[1] });
        setGame(waiting[0]);
      }
    });
    const offs = [
      window.api.onState(setSnapshot),
      window.api.onLog((line) => setLogs((prev) => [...prev.slice(-(MAX_LOGS - 1)), line])),
      window.api.onConsole(({ game: id, server, reset, lines }) => setConsoleLines((prev) => {
        const key = `${id}/${server}`;
        return { ...prev, [key]: (reset ? lines : [...(prev[key] || []), ...lines]).slice(-MAX_CONSOLE) };
      })),
      window.api.onNavigate(setPage),
      window.api.onChooseDestination((request) => {
        setChoice(request);
        setGame(request.game);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  if (!data || !snapshot) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const onSaved = async () => {
    const state = await window.api.getState();
    setData(state);
    setSnapshot(state.snapshot);
    setConsoleLines(state.console);
  };

  const changeTheme = async (next) => {
    setTheme(next);
    await window.api.setTheme(next);
  };

  const changeGame = (next) => {
    setGame(next);
    try {
      localStorage.setItem(GAME_KEY, next);
    } catch {
      // not saved: the next start shows the first game in use
    }
  };

  const changeLanguage = async (next) => {
    setLanguage(next);
    setLocale(await window.api.setLanguage(next)); // 'system' is resolved by the main process
  };

  return (
    <I18nProvider value={locale}>
      {gitOpen && <GitDialog git={git} onChecked={setGit} onClose={() => setGitOpen(false)} />}
      {choice && <DestinationChooser key={choice.game} request={choice} onDone={() => setChoice(null)} />}
      <Layout
        git={git}
        onGitHelp={() => setGitOpen(true)}
        data={data}
        snapshot={snapshot}
        logs={logs}
        consoleLines={consoleLines}
        page={page}
        setPage={setPage}
        game={game}
        setGame={changeGame}
        onSaved={onSaved}
        theme={theme}
        onTheme={changeTheme}
        language={language}
        onLanguage={changeLanguage}
      />
    </I18nProvider>
  );
}

function Layout({
  data, snapshot, logs, consoleLines, page, setPage, game, setGame, onSaved, theme, onTheme, language, onLanguage, git, onGitHelp,
}) {
  const t = useT();
  const g = snapshot.games[game];
  const host = g?.server || null;
  // the Server pages exist only for the roles in use, and a removed server falls back to the list
  const route = resolveRoute(page, g);
  const current = route ? 'server' : page.startsWith('srv:') || page.startsWith('server') ? 'dashboard' : page;
  const [creating, setCreating] = useState(false); // wizard of a new server, from the sidebar or the list of servers
  const mainRef = useRef(null);
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [page, game]);

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <GameSwitcher value={game} onChange={setGame} snapshot={snapshot} />

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.filter((item) => !item.server || g?.client || host).map(({ id, icon: Icon }) => (id === 'server' ? (
            <ServerNav key={id} g={g} route={route} setPage={setPage} onNew={() => setCreating(true)} />
          ) : (
            <button key={id} type="button" onClick={() => setPage(id)} className={`${NAV_ITEM} ${current === id ? NAV_ACTIVE : NAV_IDLE}`}>
              <Icon className="size-4" />
              {t(`nav.${id}`)}
            </button>
          )))}
        </nav>

        <div className="space-y-3 p-3">
          <UpdateCard />
          <ThemeSwitcher value={theme} onChange={onTheme} />
          <GameStatus g={g} />
        </div>
      </aside>

      <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
        <UpdateBanner />
        {current === 'dashboard' && <Dashboard data={data} snapshot={snapshot} logs={logs} game={game} onNavigate={setPage} onNewServer={() => setCreating(true)} git={git} onGitHelp={onGitHelp} />}
        {current === 'settings' && (
          <Settings
            data={data}
            onSaved={onSaved}
            game={game}
            language={language}
            onLanguage={onLanguage}
            onClientChosen={() => !git.found && onGitHelp()}
            onNavigate={setPage}
          />
        )}
        {current === 'logs' && <Logs logs={logs} />}
        {current === 'guide' && <Guide />}
        {route?.kind === 'send' && (
          <SendTo
            key={game}
            game={game}
            options={data.settings.games[game].client}
            local={host ? data.settings.games[game].server.servers : []}
            onSaved={onSaved}
          />
        )}
        {route?.kind === 'options' && (
          <ServerOptions
            key={game}
            game={game}
            options={data.settings.games[game].server}
            localIps={data.localIps}
            suggested={data.suggested[game]}
            onSaved={onSaved}
          />
        )}
        {(route?.kind === 'list' || route?.kind === 'server') && (
          <Server
            snapshot={snapshot}
            lines={consoleLines}
            game={game}
            route={route}
            onNavigate={setPage}
            onNew={() => setCreating(true)}
            options={data.settings.games[game].server}
            onSaved={onSaved}
          />
        )}
      </main>
      {creating && host && (
        <NewServer
          game={game}
          onClose={() => setCreating(false)}
          onCreated={async (id) => { setCreating(false); await onSaved(); setPage(`srv:${id}:config`); }}
        />
      )}
    </div>
  );
}
