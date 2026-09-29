import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, FileCog, FileText, FolderOpen, HardDriveDownload, Play, Plus, RefreshCw, RotateCw, Save, Search, Settings as SettingsIcon,
  SlidersHorizontal, Square, SquareTerminal,
} from 'lucide-react';
import { Badge, Button, Card, Field, NumberInput, PageHeader, StatusDot, Toggle } from '../components/ui';
import ServerConfig from './ServerConfig';
import ServerList from './server/ServerList';
import { ServerSettings } from './server/EditServer';
import { GAME } from '../games';
import { useT } from '../i18n';

function lineStyle(line) {
  if (line.includes('*** ERROR ***')) return 'text-red-400';
  if (line.includes('*** WARNING ***')) return 'text-amber-300/80';
  if (line.startsWith('[MP]')) return 'text-sky-300';
  return 'text-slate-300';
}

/** Live log of a server (server.log.txt of its home folder), with filter and follow. */
function ConsoleView({ game, server, lines }) {
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
  }, [visible.length, follow, server.id]);

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
        <Button variant="ghost" icon={FileText} onClick={() => window.api.servers.open(game, server.id, 'console')} className="ml-auto py-1 text-xs">
          {t('console.openFile')}
        </Button>
      </div>
      <div className="select-text min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb:active]:bg-orange-500 [&::-webkit-scrollbar-thumb:hover]:bg-slate-600 px-4 py-3 font-mono text-xs leading-5 shadow-sm">
        {visible.length ? visible.map((line, i) => (
          <div key={i} className={`whitespace-pre-wrap wrap-break-word ${lineStyle(line)}`}>{line || ' '}</div>
        )) : (
          <p className="text-slate-500">{lines.length ? t('console.noMatch') : t('console.emptyServer', { name: server.name })}</p>
        )}
        <div ref={bottom} />
      </div>
    </>
  );
}

/**
 * Options of the updates of the installation: the switch is applied right away, the hours with Save.
 * They are saved in the settings of the game without restarting the servers.
 */
function UpdateOptions({ game, options, onSaved }) {
  const t = useT();
  const [hours, setHours] = useState(options.update_hours);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }
  const dirty = hours !== options.update_hours;

  const apply = async (values) => {
    setSaving(true);
    const result = await window.api.setServerUpdates(game, values);
    setSaving(false);
    setMessage(result.ok ? { ok: true, text: t('settings.saved') } : { ok: false, text: result.error });
    if (result.ok) await onSaved();
  };

  return (
    <Card title={t('settings.steamTitle')} icon={SettingsIcon} description={t('settings.steamDescription')}>
      <div className="space-y-4">
        <Toggle
          checked={options.auto_update}
          onChange={(value) => apply({ auto_update: value })}
          label={t('settings.steamAuto')}
          description={t('settings.steamAutoHint')}
        />
        <div className="flex items-end gap-4">
          <Field label={t('settings.steamHours')} hint={t('settings.steamHoursHint')}>
            <NumberInput value={hours} onChange={(value) => { setHours(value); setMessage(null); }} />
          </Field>
          <div className="ml-auto flex items-center gap-3 pb-5">
            {message && (
              <span className={`text-xs ${message.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{message.text}</span>
            )}
            <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={() => apply({ update_hours: hours })}>
              {t('server.save')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** The installation shared by the servers: builds (installed / on Steam), the SteamCMD buttons and the options. */
function InstallationView({ game, host, options, onSaved }) {
  const t = useT();
  const s = host.details.steam;
  const run = (action) => window.api.runAction(game, 'server', action);
  const available = s.installed && s.latest && s.installed !== s.latest;
  const description = !s.hours ? t('dash.steamManual') : t(s.auto ? 'dash.steamAuto' : 'dash.steamAutoOff', { hours: s.hours });
  const running = host.details.servers.filter((server) => server.running).length;
  return (
    <div className="space-y-4">
      <Card
        title={t('dash.steamTitle', { game: GAME[game].name })}
        icon={HardDriveDownload}
        description={description}
        actions={(
          <div className="flex gap-2">
            <Button icon={RefreshCw} disabled={host.busy} onClick={() => run('steam-check')} className="py-1 text-xs">{t('dash.steamCheck')}</Button>
            <Button variant={available || !host.details.exeExists ? 'primary' : 'secondary'} icon={HardDriveDownload} disabled={host.busy} onClick={() => run('steam-update')} className="py-1 text-xs">
              {host.details.exeExists ? t('dash.steamUpdate') : t('servers.install')}
            </Button>
          </div>
        )}
      >
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('dash.steamInstalled')}</div>
            <div className="mt-1 flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
              <span className={s.installed ? 'font-mono' : ''}>{s.installed || t('dash.steamUnknown')}</span>
              {s.installed && s.latest && (available
                ? <Badge tone="orange">{t('dash.steamAvailable')}</Badge>
                : <Badge tone="green">{t('dash.steamUpToDate')}</Badge>)}
            </div>
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
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('settings.installDir')}</span>
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700 select-text dark:text-slate-300" title={s.installDir}>{s.installDir}</code>
          <Button variant="ghost" icon={FolderOpen} onClick={() => window.api.servers.open(game, null, 'install')} className="px-2 py-1 text-xs" title={t('servers.openInstall')} />
        </div>
        {s.phase && (
          <div className="mt-4">
            <div className="mb-1.5 text-xs text-slate-500 dark:text-slate-400">{host.status}</div>
            {/* SteamCMD gives no percentage while it runs: an indeterminate bar */}
            <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="absolute inset-y-0 w-1/3 animate-slide rounded-full bg-orange-500" />
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          {running ? t('install.stopsServers', { count: running }) : t('install.noneRunning')}
        </p>
        {!s.installed && host.details.exeExists && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('dash.steamUnknownHint')}</p>}
      </Card>
      <UpdateOptions key={game} game={game} options={options} onSaved={onSaved} />
    </div>
  );
}

const TABS = [
  { id: 'console', icon: SquareTerminal },
  { id: 'config', icon: FileCog },
  { id: 'settings', icon: SlidersHorizontal },
];

/** Page of one server: its state and controls, and its own tabs (console, server_config.sii, settings). */
function ServerPage({ game, host, server, tab, lines, options, onNavigate, onSaved }) {
  const t = useT();
  const settings = options.servers.find((s) => s.id === server.id);
  const busy = server.busy || Boolean(host.details.steam.phase);
  const run = (action) => window.api.runAction(game, 'server', action, server.id);
  const go = (next) => onNavigate(`srv:${server.id}:${next}`);
  return (
    // the console fills the window (its log scrolls); the other tabs scroll as a whole
    <div className={`flex flex-col ${tab === 'console' ? 'h-full' : 'min-h-full'}`}>
      <PageHeader title={server.name} subtitle={t(`server.subtitle.${tab}`, { game: GAME[game].fullName })}>
        {server.running
          ? <Button icon={Square} disabled={busy} onClick={() => run('stop')}>{t('console.stop')}</Button>
          : <Button variant="primary" icon={Play} disabled={busy || !server.hasPackages} onClick={() => run('start')}>{t('console.start')}</Button>}
        <Button icon={RotateCw} disabled={busy || !server.running} onClick={() => run('restart')}>{t('console.restart')}</Button>
        <Button icon={RefreshCw} disabled={busy} onClick={() => run('update')} title={t('servers.updateTitle')}>{t('servers.update')}</Button>
      </PageHeader>

      <div className={`flex flex-1 flex-col px-8 ${tab === 'console' ? 'min-h-0 pb-8' : ''}`}>
        <div className="mb-4 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800">
          <div role="tablist" className="-mb-px flex gap-1">
            {TABS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => go(id)}
                className={`flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === id
                    ? 'border-orange-500 text-orange-700 dark:text-orange-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="size-4" />
                {t(`server.tab.${id}`)}
              </button>
            ))}
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2 pb-1 text-xs text-slate-500 dark:text-slate-400">
            <StatusDot state={server.state} className="shrink-0" />
            <span className="max-w-72 truncate" title={server.status}>{server.status}</span>
          </div>
        </div>
        {!server.hasPackages && tab !== 'settings' && (
          <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {t('servers.noPackages')}
          </p>
        )}
        {tab === 'console' && <ConsoleView game={game} server={server} lines={lines[`${game}/${server.id}`] || []} />}
        {tab === 'config' && <ServerConfig key={`${game}/${server.id}`} game={game} server={server} busy={busy} />}
        {tab === 'settings' && settings && (
          <ServerSettings
            key={`${game}/${server.id}`}
            game={game}
            server={settings}
            running={server.running}
            busy={busy}
            onSaved={onSaved}
            onDeleted={async () => { await onSaved(); onNavigate('server-list'); }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Server role of the chosen game. route: { kind: 'list' } (all the servers and the shared installation) or
 * { kind: 'server', id, tab } (one server); onNew opens the wizard of a new server; options: the server block of the settings of the
 * game; onSaved reloads them after a change.
 */
export default function Server({ snapshot, lines, game, route, onNavigate, onNew, options, onSaved }) {
  const t = useT();
  const host = snapshot.games[game].server;
  const servers = host.details.servers;

  if (route.kind === 'server') {
    const server = servers.find((s) => s.id === route.id);
    const tab = TABS.some((x) => x.id === route.tab) ? route.tab : 'console';
    return (
      <ServerPage
        key={server.id}
        game={game}
        host={host}
        server={server}
        tab={tab}
        lines={lines}
        options={options}
        onNavigate={onNavigate}
        onSaved={onSaved}
      />
    );
  }

  return (
    <div className="min-h-full pb-8">
      <PageHeader title={t('server.title.list', { game: GAME[game].name })} subtitle={t('server.subtitle.list', { game: GAME[game].fullName })}>
        {servers.length > 1 && (
          <>
            <Button icon={Play} disabled={host.busy} onClick={() => window.api.runAction(game, 'server', 'start-all')}>{t('servers.startAll')}</Button>
            <Button icon={Square} disabled={host.busy} onClick={() => window.api.runAction(game, 'server', 'stop-all')}>{t('servers.stopAll')}</Button>
          </>
        )}
        <Button variant="primary" icon={Plus} onClick={onNew}>{t('servers.new')}</Button>
      </PageHeader>
      <div className="space-y-4 px-8">
        <ServerList game={game} host={host} onNew={onNew} onOpen={(id, tab) => onNavigate(`srv:${id}:${tab}`)} />
        {/* the installation shared by the servers, below them */}
        <InstallationView game={game} host={host} options={options} onSaved={onSaved} />
      </div>
    </div>
  );
}
