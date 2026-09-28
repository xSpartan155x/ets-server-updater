import { useEffect, useState } from 'react';
import { BookOpen, LayoutDashboard, Loader2, Monitor, Moon, ScrollText, Settings as SettingsIcon, SquareTerminal, Sun } from 'lucide-react';
import icon from '../resources/icon.png';
import { StatusDot, STATE_STYLES } from './components/ui';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import Console from './pages/Console';
import Guide from './pages/Guide';
import UpdateCard from './components/UpdateCard';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'console', label: 'Console', icon: SquareTerminal, mode: 'server' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'guide', label: 'Guide', icon: BookOpen },
];

const THEMES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'dark', label: 'Dark', icon: Moon },
];

const MAX_LOGS = 500;
const MAX_CONSOLE = 2000;

function ThemeSwitcher({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800/70">
      {THEMES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={label}
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

export default function App() {
  const [data, setData] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [logs, setLogs] = useState([]);
  const [consoleLines, setConsoleLines] = useState([]);
  const [page, setPage] = useState('dashboard');
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    window.api.getState().then((state) => {
      setData(state);
      setSnapshot(state.snapshot);
      setLogs(state.logs);
      setConsoleLines(state.console);
      setTheme(state.settings.theme || 'system');
      if (!state.configured) setPage('settings');
    });
    const offs = [
      window.api.onState(setSnapshot),
      window.api.onLog((line) => setLogs((prev) => [...prev.slice(-(MAX_LOGS - 1)), line])),
      window.api.onConsole(({ reset, lines }) =>
        setConsoleLines((prev) => (reset ? lines : [...prev, ...lines]).slice(-MAX_CONSOLE))),
      window.api.onNavigate(setPage),
    ];
    return () => offs.forEach((off) => off());
  }, []);

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

  const style = STATE_STYLES[snapshot.state] || STATE_STYLES.idle;

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <img src={icon} alt="" className="size-10 object-contain" />
          <div>
            <div className="text-sm leading-tight font-semibold text-slate-900 dark:text-slate-50">ETS2 Package Sync</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">v{data.version}</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.filter((item) => !item.mode || item.mode === snapshot.mode).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPage(id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                page === id
                  ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="space-y-3 p-3">
          <UpdateCard />
          <ThemeSwitcher value={theme} onChange={changeTheme} />
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="mb-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
              {snapshot.mode ? `${snapshot.mode} mode` : 'Not configured'}
            </div>
            <div className={`flex items-center gap-2 text-xs font-medium ${style.text}`}>
              <StatusDot state={snapshot.state} className="shrink-0" />
              <span className="truncate" title={snapshot.status}>{snapshot.status}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {page === 'dashboard' && <Dashboard data={data} snapshot={snapshot} logs={logs} onNavigate={setPage} />}
        {page === 'settings' && <Settings data={data} onSaved={onSaved} />}
        {page === 'logs' && <Logs logs={logs} />}
        {page === 'guide' && <Guide />}
        {page === 'console' && snapshot.mode === 'server' && <Console snapshot={snapshot} lines={consoleLines} />}
      </main>
    </div>
  );
}
