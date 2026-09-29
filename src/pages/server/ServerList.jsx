import {
  AlertTriangle, FileCog, FolderOpen, GitCommit, HardDriveDownload, Play, Plus, RefreshCw, RotateCw, ServerCog, SlidersHorizontal, Square,
  SquareTerminal,
} from 'lucide-react';
import { Badge, Button, Card, STATE_TONE, StatusDot } from '../../components/ui';
import { shortRepo } from '../../components/DestinationChooser';
import { GAME } from '../../games';
import { useT } from '../../i18n';

function Detail({ label, children, mono, title }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-0.5 truncate text-xs text-slate-800 dark:text-slate-200 ${mono ? 'select-text font-mono' : ''}`} title={title}>{children}</div>
    </div>
  );
}

/** One server: status, where it lives, its repository and what it last installed, with its controls. */
function ServerCard({ game, server, hostBusy, onOpen }) {
  const t = useT();
  const run = (action) => window.api.runAction(game, 'server', action, server.id);
  const busy = server.busy || hostBusy;
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <StatusDot state={server.state} className="shrink-0" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
          <button type="button" onClick={() => onOpen('console')} className="max-w-full cursor-pointer truncate text-slate-900 hover:text-orange-700 dark:text-slate-100 dark:hover:text-orange-400" title={t('servers.open')}>
            {server.name}
          </button>
        </h2>
        <Badge tone={STATE_TONE[server.state]}>
          <span className="inline-block max-w-72 truncate align-bottom" title={server.status}>{server.status}</span>
        </Badge>
      </header>
      <div className="space-y-4 p-5">
        {!server.hasPackages && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {t('servers.noPackages')}
          </p>
        )}
        {server.hasPackages && !server.hasConfig && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {t('servers.noConfig')}
          </p>
        )}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Detail label={t('new.homedir')} mono title={server.homedir}>{server.homedir}</Detail>
          <Detail label={t('servers.repository')} mono>{shortRepo(server.repository)} · {server.branch}</Detail>
          <Detail label={t('dash.installedCommit')} mono>{server.lastCommit ? server.lastCommit.slice(0, 7) : t('dash.noneYet')}</Detail>
          <Detail label={t('dash.lastUpdate')}>{server.lastUpdate || t('dash.Never')}</Detail>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {server.running
            ? <Button icon={Square} disabled={busy} onClick={() => run('stop')} className="py-1.5 text-xs">{t('console.stop')}</Button>
            : <Button variant="primary" icon={Play} disabled={busy || !server.hasPackages} onClick={() => run('start')} className="py-1.5 text-xs">{t('console.start')}</Button>}
          <Button icon={RotateCw} disabled={busy || !server.running} onClick={() => run('restart')} className="py-1.5 text-xs">{t('console.restart')}</Button>
          <Button icon={RefreshCw} disabled={busy} onClick={() => run('update')} className="py-1.5 text-xs" title={t('servers.updateTitle')}>{t('servers.update')}</Button>
          <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-800" />
          <Button variant="ghost" icon={SquareTerminal} onClick={() => onOpen('console')} className="py-1.5 text-xs">{t('server.tab.console')}</Button>
          <Button variant="ghost" icon={FileCog} onClick={() => onOpen('config')} className="py-1.5 text-xs">{t('server.tab.config')}</Button>
          <Button variant="ghost" icon={SlidersHorizontal} onClick={() => onOpen('settings')} className="py-1.5 text-xs">{t('server.tab.settings')}</Button>
          <Button variant="ghost" icon={FolderOpen} onClick={() => window.api.servers.open(game, server.id, 'home')} className="py-1.5 text-xs" title={t('servers.openHome')} />
        </div>
      </div>
    </section>
  );
}

/** Servers of the game: the installation state, a card per server and the button of a new one. */
export default function ServerList({ game, host, onNew, onOpen }) {
  const t = useT();
  const d = host.details;
  const servers = d.servers;
  return (
    <div className="space-y-4">
      {!d.exeExists && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <HardDriveDownload className="size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t('servers.notInstalled', { game: GAME[game].name })}</p>
            <p className="mt-0.5 truncate font-mono text-xs opacity-80">{d.installDir}</p>
          </div>
          <Button variant="primary" icon={HardDriveDownload} disabled={host.busy} onClick={() => window.api.runAction(game, 'server', 'steam-update')} className="py-1.5 text-xs">
            {t('servers.install')}
          </Button>
        </div>
      )}
      {servers.length ? servers.map((server) => (
        <ServerCard
          key={server.id}
          game={game}
          server={server}
          hostBusy={Boolean(d.steam.phase)}
          onOpen={(tab) => onOpen(server.id, tab)}
        />
      )) : (
        <Card>
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-4 rounded-full bg-orange-50 p-4 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
              <ServerCog className="size-7" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('servers.emptyTitle')}</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{t('servers.emptyText', { game: GAME[game].name })}</p>
            <Button variant="primary" icon={Plus} className="mt-6" onClick={onNew}>{t('servers.new')}</Button>
          </div>
        </Card>
      )}
      {servers.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <GitCommit className="size-3.5" />
          {d.sync.method === 'webhook' ? t('servers.syncWebhook', { port: d.sync.port }) : t('servers.syncPolling', { minutes: d.sync.pollMinutes })}
        </p>
      )}
    </div>
  );
}
