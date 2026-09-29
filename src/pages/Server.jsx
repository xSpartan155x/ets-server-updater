import { useEffect, useRef, useState } from 'react';
import {
  Activity, FileText, HardDriveDownload, Play, RefreshCw, RotateCw, Save, Search, Settings as SettingsIcon, Square, Tag,
} from 'lucide-react';
import { Button, Card, Field, NumberInput, PageHeader, PathInput, StatusDot, Toggle } from '../components/ui';
import ServerConfig from './ServerConfig';
import { GAME } from '../games';
import { useT } from '../i18n';

function lineStyle(line) {
  if (line.includes('*** ERROR ***')) return 'text-red-400';
  if (line.includes('*** WARNING ***')) return 'text-amber-300/80';
  if (line.startsWith('[MP]')) return 'text-sky-300';
  return 'text-slate-300';
}

function Tile({ icon: Icon, label, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">{children}</div>
    </div>
  );
}

/** "Up to date" / "Update available" next to the installed build (nothing while a build is unknown). */
function BuildBadge({ steam }) {
  const t = useT();
  if (!steam.installed || !steam.latest) return null;
  return steam.installed !== steam.latest
    ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">{t('dash.steamAvailable')}</span>
    : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">{t('dash.steamUpToDate')}</span>;
}

/** Live log of the dedicated server (server.log.txt), with filter and follow. */
function ConsoleView({ id, lines }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [hideWarnings, setHideWarnings] = useState(false);
  const [follow, setFollow] = useState(true);
  const bottom = useRef(null);

  const needle = query.trim().toLowerCase();
  const visible = lines.filter((line) =>
    (!hideWarnings || !line.includes('*** WARNING ***')) && (!needle || line.toLowerCase().includes(needle)));

  useEffect(() => {
    if (follow) bottom.current?.scrollIntoView({ block: 'end' });
  }, [visible.length, follow, id]);

  return (
    <>
      <div className="mb-3 flex items-center gap-4">
        <div className="relative w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('console.filter')}
            className="w-full select-text rounded-lg border border-slate-300 bg-white py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <input type="checkbox" checked={hideWarnings} onChange={(e) => setHideWarnings(e.target.checked)} className="cursor-pointer accent-orange-600" />
          {t('console.hideWarnings')}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="cursor-pointer accent-orange-600" />
          {t('console.follow')}
        </label>
        <Button variant="ghost" icon={FileText} onClick={() => window.api.openConsoleFile(id)} className="ml-auto py-1 text-xs">
          {t('console.openFile')}
        </Button>
      </div>
      <div className="select-text min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb:active]:bg-orange-500 [&::-webkit-scrollbar-thumb:hover]:bg-slate-600 px-4 py-3 font-mono text-xs leading-5 shadow-sm">
        {visible.length ? visible.map((line, i) => (
          <div key={i} className={`whitespace-pre-wrap wrap-break-word ${lineStyle(line)}`}>{line || ' '}</div>
        )) : (
          <p className="text-slate-500">{lines.length ? t('console.noMatch') : t('console.empty', { game: GAME[id].name })}</p>
        )}
        <div ref={bottom} />
      </div>
    </>
  );
}

/**
 * Options of the updates: the switch is applied right away, hours and folder with Save.
 * They are saved in the settings of the game without restarting the server.
 */
function UpdateOptions({ id, options, installDir, onSaved }) {
  const t = useT();
  const [hours, setHours] = useState(options.server_update_hours);
  const [folder, setFolder] = useState(options.server_install_dir);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }
  const dirty = hours !== options.server_update_hours || folder !== options.server_install_dir;

  const apply = async (values) => {
    setSaving(true);
    const result = await window.api.setServerUpdates(id, values);
    setSaving(false);
    setMessage(result.ok ? { ok: true, text: t('settings.saved') } : { ok: false, text: result.error });
    if (result.ok) await onSaved();
  };

  return (
    <Card title={t('settings.steamTitle')} icon={SettingsIcon} description={t('settings.steamDescription')}>
      <div className="space-y-4">
        <Toggle
          checked={options.server_auto_update}
          onChange={(value) => apply({ server_auto_update: value })}
          label={t('settings.steamAuto')}
          description={t('settings.steamAutoHint')}
        />
        <div className="grid grid-cols-3 gap-4">
          <Field label={t('settings.steamHours')} hint={t('settings.steamHoursHint')}>
            <NumberInput value={hours} onChange={(value) => { setHours(value); setMessage(null); }} />
          </Field>
          <div className="col-span-2">
            <Field label={t('settings.installDir')} hint={t('settings.installDirHint', { path: installDir || '-' })}>
              <PathInput kind="dir" value={folder} onChange={(value) => { setFolder(value); setMessage(null); }} />
            </Field>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          {message && (
            <span className={`text-xs ${message.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{message.text}</span>
          )}
          <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={() => apply({ server_update_hours: hours, server_install_dir: folder })}>
            {t('server.save')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Builds of the dedicated server (installed / on Steam), the SteamCMD buttons and the options of the updates. */
function UpdatesView({ id, g, options, onSaved }) {
  const t = useT();
  const s = g.details.steam;
  const run = (action) => window.api.runAction(id, action);
  const available = s.installed && s.latest && s.installed !== s.latest;
  const description = !s.hours ? t('dash.steamManual') : t(s.auto ? 'dash.steamAuto' : 'dash.steamAutoOff', { hours: s.hours });
  return (
    <div className="space-y-4">
      <Card
        title={t('dash.steamTitle', { game: GAME[id].name })}
        icon={HardDriveDownload}
        description={description}
        actions={(
          <div className="flex gap-2">
            <Button icon={RefreshCw} disabled={g.busy} onClick={() => run('steam-check')} className="py-1 text-xs">{t('dash.steamCheck')}</Button>
            <Button variant={available ? 'primary' : 'secondary'} icon={HardDriveDownload} disabled={g.busy} onClick={() => run('steam-update')} className="py-1 text-xs">
              {t('dash.steamUpdate')}
            </Button>
          </div>
        )}
      >
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('dash.steamInstalled')}</div>
            <div className={`mt-1 font-medium text-slate-900 dark:text-slate-100 ${s.installed ? 'font-mono' : ''}`}>{s.installed || t('dash.steamUnknown')}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('dash.steamLatest')}</div>
            <div className={`mt-1 font-medium text-slate-900 dark:text-slate-100 ${s.latest ? 'font-mono' : ''}`}>{s.latest || t('dash.steamNotChecked')}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('dash.lastCheck')}</div>
            <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">{s.checkedAt || t('dash.Never')}</div>
          </div>
        </div>
        {s.phase && (
          <div className="mt-4">
            <div className="mb-1.5 text-xs text-slate-500 dark:text-slate-400">{g.status}</div>
            {/* SteamCMD gives no percentage while it runs: an indeterminate bar */}
            <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="absolute inset-y-0 w-1/3 animate-slide rounded-full bg-orange-500" />
            </div>
          </div>
        )}
        {!s.installed && <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{t('dash.steamUnknownHint')}</p>}
      </Card>
      <UpdateOptions key={id} id={id} options={options} installDir={s.installDir} onSaved={onSaved} />
    </div>
  );
}

/** Server manager of the chosen game: state and controls, live console and updates of the server files. */
/**
 * tab: 'console' | 'updates' | 'config' (sub-items of Server in the sidebar); options: settings of the game (options of
 * the updates); onSaved reloads them after a change.
 */
export default function Server({ snapshot, lines, game: id, tab, options, onSaved }) {
  const t = useT();
  const g = snapshot.games[id];
  const d = g.details;
  const busy = g.busy;
  const running = d.serverRunning;
  const run = (action) => window.api.runAction(id, action);

  return (
    // the console fills the window (its log scrolls); the other pages scroll as a whole
    <div className={`flex flex-col ${tab === 'console' ? 'h-full' : 'min-h-full'}`}>
      <PageHeader title={t(`server.title.${tab}`, { game: GAME[id].name })} subtitle={t(`server.subtitle.${tab}`, { game: GAME[id].fullName })}>
        <Button variant={running ? 'secondary' : 'primary'} icon={Play} disabled={busy || running} onClick={() => run('start')}>{t('console.start')}</Button>
        <Button icon={Square} disabled={busy || !running} onClick={() => run('stop')}>{t('console.stop')}</Button>
        <Button icon={RotateCw} disabled={busy} onClick={() => run('restart')}>{t('console.restart')}</Button>
      </PageHeader>

      <div className={`flex flex-1 flex-col px-8 ${tab === 'console' ? 'min-h-0 pb-8' : tab === 'config' ? '' : 'pb-8'}`}>
        <div className="mb-4 grid grid-cols-3 gap-4">
          <Tile icon={Activity} label={t('server.state')}>
            <StatusDot state={busy ? 'busy' : running ? 'ok' : 'idle'} className="shrink-0" />
            <span className={`truncate ${running && !busy ? 'text-emerald-700 dark:text-emerald-400' : ''}`} title={busy ? g.status : undefined}>
              {busy ? g.status : running ? t('console.running') : t('console.stopped')}
            </span>
          </Tile>
          <Tile icon={Tag} label={t('dash.steamInstalled')}>
            <span className={d.steam.installed ? 'font-mono' : ''}>{d.steam.installed || t('dash.steamUnknown')}</span>
            <BuildBadge steam={d.steam} />
          </Tile>
          <Tile icon={HardDriveDownload} label={t('dash.steamLatest')}>
            <span className={d.steam.latest ? 'font-mono' : ''}>{d.steam.latest || t('dash.steamNotChecked')}</span>
          </Tile>
        </div>

        {tab === 'console' && <ConsoleView id={id} lines={lines[id] || []} />}
        {tab === 'updates' && <UpdatesView id={id} g={g} options={options} onSaved={onSaved} />}
        {tab === 'config' && <ServerConfig key={id} id={id} g={g} />}
      </div>
    </div>
  );
}
