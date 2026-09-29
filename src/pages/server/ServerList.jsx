import { useState } from 'react';
import {
  AlertTriangle, ChevronRight, CloudDownload, FolderOpen, GitCommit, HardDriveDownload, Play, Plus, RotateCw, ServerCog, Square,
} from 'lucide-react';
import { Button, Card, SearchInput, StatusDot, matches } from '../../components/ui';
import { shortRepo } from '../../components/DestinationChooser';
import { GAME } from '../../games';
import { useT } from '../../i18n';

const FILTERS = ['all', 'running', 'stopped'];

/** One server in a row: status, name and repository; icon buttons for its controls; a click opens its page. */
function ServerRow({ game, server, hostBusy, onOpen }) {
  const t = useT();
  const run = (action) => window.api.runAction(game, 'server', action, server.id);
  const busy = server.busy || hostBusy;
  const warning = !server.hasPackages ? t('servers.noPackages') : !server.hasConfig ? t('servers.noConfig') : '';
  const icon = 'px-2 py-1';
  return (
    <div className="group flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left" title={t('servers.open')}>
        <StatusDot state={server.state} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-slate-900 group-hover:text-orange-700 dark:text-slate-100 dark:group-hover:text-orange-400">{server.name}</span>
            {warning && <span title={warning} className="shrink-0 text-amber-500"><AlertTriangle className="size-3.5" /></span>}
          </span>
          <span className="block truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {shortRepo(server.repository)} · {server.lastCommit ? server.lastCommit.slice(0, 7) : t('dash.noneYet')}
          </span>
        </span>
        <span className="hidden w-56 shrink-0 truncate text-xs text-slate-500 lg:block dark:text-slate-400" title={server.status}>{server.status}</span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {server.running
          ? <Button variant="ghost" icon={Square} disabled={busy} onClick={() => run('stop')} title={t('console.stop')} className={icon} />
          : <Button variant="ghost" icon={Play} disabled={busy || !server.hasPackages} onClick={() => run('start')} title={t('console.start')} className={`${icon} text-emerald-600 dark:text-emerald-400`} />}
        <Button variant="ghost" icon={RotateCw} disabled={busy || !server.running} onClick={() => run('restart')} title={t('console.restart')} className={icon} />
        <Button variant="ghost" icon={CloudDownload} disabled={busy} onClick={() => run('update')} title={t('servers.updateTitle')} className={icon} />
        <Button variant="ghost" icon={FolderOpen} onClick={() => window.api.servers.open(game, server.id, 'home')} title={t('servers.openHome')} className={icon} />
        <ChevronRight className="size-4 text-slate-300 dark:text-slate-600" />
      </div>
    </div>
  );
}

/** Servers of the game: the installation state, a searchable row per server and the button of a new one. */
export default function ServerList({ game, host, onNew, onOpen, onSettings }) {
  const t = useT();
  const d = host.details;
  const servers = d.servers;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const visible = servers.filter((s) => (filter === 'all' || (filter === 'running') === Boolean(s.running))
    && matches(query, s.name, s.repository, s.status));
  const running = servers.filter((s) => s.running).length;
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
      {servers.length ? (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <SearchInput value={query} onChange={setQuery} placeholder={t('servers.search')} className="w-64" />
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800/70">
              {FILTERS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium ${filter === id
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  {t(`servers.filter.${id}`)}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {query || filter !== 'all'
                ? t('ui.shownOf', { shown: visible.length, total: servers.length })
                : t('dash.serversRunning', { running, total: servers.length })}
            </span>
          </header>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((server) => (
              <ServerRow key={server.id} game={game} server={server} hostBusy={Boolean(d.steam.phase)} onOpen={() => onOpen(server.id, 'console')} />
            ))}
          </div>
          {!visible.length && <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('ui.noResults')}</p>}
        </section>
      ) : (
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
          <button type="button" onClick={onSettings} className="cursor-pointer font-medium text-orange-700 hover:underline dark:text-orange-400">
            {t('servers.syncChange')}
          </button>
        </p>
      )}
    </div>
  );
}
