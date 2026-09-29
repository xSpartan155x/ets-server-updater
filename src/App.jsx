import { useEffect, useState } from 'react';
import {
  BookOpen, ChevronDown, FileCog, HardDriveDownload, LayoutDashboard, Loader2, Monitor, Moon, ScrollText, ServerCog,
  Settings as SettingsIcon, SquareTerminal, Sun,
} from 'lucide-react';
import { StatusDot, STATE_STYLES } from './components/ui';
import GameSwitcher from './components/GameSwitcher';
import GitDialog from './components/GitDialog';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import Server from './pages/Server';
import Guide from './pages/Guide';
import UpdateCard, { UpdateBanner } from './components/UpdateCard';
import { GAME, activeIds } from './games';
import { I18nProvider, useT } from './i18n';

const NAV = [
  { id: 'dashboard', icon: LayoutDashboard },
  { // server manager: controls on every sub-page, console and updates as sub-items
    id: 'server',
    icon: ServerCog,
    server: true,
    children: [
      { id: 'server-console', icon: SquareTerminal },
      { id: 'server-updates', icon: HardDriveDownload },
      { id: 'server-config', icon: FileCog },
    ],
  },
  { id: 'settings', icon: SettingsIcon },
  { id: 'logs', icon: ScrollText },
  { id: 'guide', icon: BookOpen },
];

const THEMES = [
  { id: 'light', icon: Sun },
  { id: 'system', icon: Monitor },
  { id: 'dark', icon: Moon },
];

const NAV_ITEM = 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
const NAV_ACTIVE = 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400';
const NAV_IDLE = 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

const MAX_LOGS = 500;
const MAX_CONSOLE = 2000;

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
          className={`flex items-center justify-center rounded-md py-1.5 transition-colors ${
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

/** Sidebar card: mode and status of the chosen game. */
function GameStatus({ g }) {
  const t = useT();
  const style = STATE_STYLES[g ? g.state : 'idle'] || STATE_STYLES.idle;
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      {g && (
        <div className="mb-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
          {t(`sidebar.mode.${g.mode}`)}
        </div>
      )}
      <div className={`flex items-center gap-2 text-xs font-medium ${style.text}`}>
        <StatusDot state={g ? g.state : 'idle'} className="shrink-0" />
        <span className="truncate" title={g?.status}>{g ? g.status : t('sidebar.notConfigured')}</span>
      </div>
    </div>
  );
}

const GAME_KEY = 'game'; // per-viewer convenience: the game shown at the last visit

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
  const [consoleLines, setConsoleLines] = useState({}); // game id -> lines
  const [page, setPage] = useState('dashboard');
  const [game, setGame] = useState(() => (GAME[savedGame()] ? savedGame() : 'ets2')); // game shown in every page
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
      // the Client mode cannot work without Git: say it right away
      if (!state.git.found && Object.values(state.settings.games).some((g) => g.mode === 'client')) setGitOpen(true);
      if (!state.configured) setPage('settings');
      // first visit: show a game in use
      const used = activeIds(state.snapshot);
      if (!GAME[savedGame()] && used.length) setGame(used[0]);
    });
    const offs = [
      window.api.onState(setSnapshot),
      window.api.onLog((line) => setLogs((prev) => [...prev.slice(-(MAX_LOGS - 1)), line])),
      window.api.onConsole(({ game: id, reset, lines }) => setConsoleLines((prev) => ({
        ...prev,
        [id]: (reset ? lines : [...(prev[id] || []), ...lines]).slice(-MAX_CONSOLE),
      }))),
      window.api.onNavigate(setPage),
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
  const isServer = g?.mode === 'server';
  // 'server' (e.g. from the Dashboard) opens the console; the Server pages exist only in Server mode
  const wanted = page === 'server' ? 'server-console' : page;
  const current = wanted.startsWith('server-') && !isServer ? 'dashboard' : wanted;
  const onServerPage = current.startsWith('server-');
  const [serverOpen, setServerOpen] = useState(true);
  useEffect(() => {
    if (onServerPage) setServerOpen(true); // entering a Server page (e.g. from the Dashboard) shows its sub-items
  }, [onServerPage]);
  const steam = isServer ? g.details.steam : null;
  const updateNews = steam && ((steam.installed && steam.latest && steam.installed !== steam.latest) || steam.phase);

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <GameSwitcher value={game} onChange={setGame} snapshot={snapshot} />

        <nav className="flex-1 space-y-1 px-3">
          {NAV.filter((item) => !item.server || isServer).map(({ id, icon: Icon, children }) => (children ? (
            <div key={id}>
              <button
                type="button"
                aria-expanded={serverOpen}
                onClick={() => {
                  if (!onServerPage) {
                    setPage(children[0].id);
                    setServerOpen(true);
                  } else {
                    setServerOpen(!serverOpen);
                  }
                }}
                className={`${NAV_ITEM} ${onServerPage && !serverOpen ? NAV_ACTIVE : onServerPage ? 'text-slate-900 dark:text-slate-100' : NAV_IDLE}`}
              >
                <Icon className="size-4" />
                <span className="flex-1 text-left">{t(`nav.${id}`)}</span>
                <ChevronDown className={`size-4 text-slate-400 transition-transform ${serverOpen ? '' : '-rotate-90'}`} />
              </button>
              {serverOpen && (
                <div className="mt-1 ml-5 space-y-1 border-l border-slate-200 pl-2 dark:border-slate-800">
                  {children.map(({ id: childId, icon: ChildIcon }) => (
                    <button
                      key={childId}
                      type="button"
                      onClick={() => setPage(childId)}
                      className={`${NAV_ITEM} py-1.5 ${current === childId ? NAV_ACTIVE : NAV_IDLE}`}
                    >
                      <ChildIcon className="size-3.5" />
                      <span className="flex-1 text-left">{t(`nav.${childId}`)}</span>
                      {childId === 'server-updates' && updateNews && <span className="size-1.5 rounded-full bg-orange-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
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

      <main className="min-w-0 flex-1 overflow-y-auto">
        <UpdateBanner />
        {current === 'dashboard' && <Dashboard data={data} snapshot={snapshot} logs={logs} game={game} onNavigate={setPage} git={git} onGitHelp={onGitHelp} />}
        {current === 'settings' && (
          <Settings
            data={data}
            onSaved={onSaved}
            game={game}
            language={language}
            onLanguage={onLanguage}
            onClientChosen={() => !git.found && onGitHelp()}
          />
        )}
        {current === 'logs' && <Logs logs={logs} />}
        {current === 'guide' && <Guide />}
        {onServerPage && (
          <Server
            snapshot={snapshot}
            lines={consoleLines}
            game={game}
            tab={current.slice('server-'.length)}
            options={data.settings.games[game]}
            onSaved={onSaved}
          />
        )}
      </main>
    </div>
  );
}
