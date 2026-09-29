import {
  Activity, ArrowRight, ChevronRight, Cloud, CloudUpload, Copy, ExternalLink, FolderGit2, FolderOpen, GitBranch, List, Play, PlusCircle, Square,
  RefreshCw, Server, ServerCog, Settings as SettingsIcon, SlidersHorizontal, Tag, TriangleAlert, Webhook,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, STATE_STYLES, STATE_TONE, StatusDot, WebhookUrl } from '../components/ui';
import { shortRepo } from '../components/DestinationChooser';
import { GAME } from '../games';
import { LogLine } from './Logs';
import { Trans, useT } from '../i18n';

// rows of a list shown in the Dashboard: the whole list (with search) is in its Server page
const DASH_ROWS = 8;

/** Last row of a list cut in the Dashboard: opens its page. */
function MoreRow({ total, onClick }) {
  const t = useT();
  if (total <= DASH_ROWS) return null;
  return (
    <button type="button" onClick={onClick} className="flex w-full cursor-pointer items-center justify-center gap-1 border-t border-slate-100 py-2.5 text-xs font-medium text-orange-700 hover:bg-slate-50 dark:border-slate-800 dark:text-orange-400 dark:hover:bg-slate-800/40">
      {t('dash.showAll', { count: total })}
      <ChevronRight className="size-3.5" />
    </button>
  );
}

function Stat({ icon: Icon, label, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="text-sm font-medium break-all text-slate-900 dark:text-slate-100">{children}</div>
    </div>
  );
}

function StatusHero({ role, label }) {
  const t = useT();
  const style = STATE_STYLES[role.state] || STATE_STYLES.idle;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${style.soft} ring-8 ${style.ring}`}>
        <StatusDot state={role.state} className="scale-150" />
      </div>
      <div className="min-w-0">
        <div className={`text-xs font-semibold tracking-wide uppercase ${style.text}`}>
          {label} · {t(`dash.state.${role.state in STATE_STYLES ? role.state : 'idle'}`)}
        </div>
        <div className="select-text mt-0.5 text-base font-medium wrap-break-word text-slate-900 dark:text-slate-100">{role.status}</div>
      </div>
    </div>
  );
}

function RecentActivity({ logs, onNavigate }) {
  const t = useT();
  const recent = logs.slice(-8).reverse();
  return (
    <Card
      title={t('dash.recent')}
      icon={Activity}
      actions={<Button variant="ghost" onClick={() => onNavigate('logs')} className="py-1 text-xs">{t('dash.viewAll')}</Button>}
    >
      {recent.length ? (
        <div className="-my-1 space-y-0.5">{recent.map((line, i) => <LogLine key={i} line={line} compact />)}</div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('dash.noActivity')}</p>
      )}
    </Card>
  );
}

function FlowStep({ icon: Icon, title, detail, footer }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
        <Icon className="size-4 text-orange-600 dark:text-orange-400" />
        {title}
      </div>
      <div className="select-text mt-1.5 font-mono text-[11px] break-all text-slate-500 dark:text-slate-400">{detail}</div>
      {footer && <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">{footer}</div>}
    </div>
  );
}

function FlowArrow({ label }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-1 text-slate-400 dark:text-slate-500">
      <ArrowRight className="size-4" />
      <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
    </div>
  );
}

/** Warning of the client role without Git, with the button that opens the Git popup. */
function GitMissing({ onGitHelp }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <TriangleAlert className="size-5 shrink-0" />
      <p className="flex-1">{t('git.alert')}</p>
      <Button icon={GitBranch} onClick={onGitHelp} className="py-1 text-xs">{t('git.howTo')}</Button>
    </div>
  );
}

/** Client role: the servers the exports can be sent to, then where the files go. */
function ClientView({ id, game, client, onNavigate }) {
  const t = useT();
  const d = client.details;
  const push = (action) => window.api.runAction(id, 'client', action);
  return (
    <>
      <Card
        title={t('dash.destinations')}
        icon={Server}
        description={t(!d.destinations.length ? 'dash.destinationsNone' : d.destinations.length > 1 ? 'dash.destinationsMany' : 'dash.destinationsOne')}
        actions={(
          <Button variant={d.destinations.length ? 'secondary' : 'primary'} icon={SlidersHorizontal} onClick={() => onNavigate('server-send')} className="shrink-0 py-1 text-xs">
            {t('dash.manage')}
          </Button>
        )}
      >
        <div className="-my-2 divide-y divide-slate-100 dark:divide-slate-800">
          {d.destinations.slice(0, DASH_ROWS).map((dest) => (
            <div key={dest.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{dest.name}</span>
                  {dest.id === d.lastDestination && d.destinations.length > 1 && <Badge>{t('dash.lastChosen')}</Badge>}
                </div>
                <div className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {shortRepo(dest.repository)} · {dest.branch} · {t('dash.flowLastPush', { value: dest.lastPush || t('dash.never') })}
                </div>
              </div>
              <Button variant="ghost" icon={ExternalLink} title={t('action.openRepo')} onClick={() => push(`open-repo:${dest.id}`)} className="px-2 py-1" />
              <Button icon={CloudUpload} disabled={client.busy} onClick={() => push(`push:${dest.id}`)} className="py-1 text-xs">{t('dash.pushHere')}</Button>
            </div>
          ))}
        </div>
        <div className="-mx-5 -mb-5 mt-2"><MoreRow total={d.destinations.length} onClick={() => onNavigate('server-send')} /></div>
      </Card>
      <Card title={t('dash.flowTitle')} icon={Copy} description={t('dash.flowDescription', { game: game.name })}>
        <div className="flex items-stretch gap-2">
          <FlowStep icon={FolderOpen} title={t('dash.flowSource', { game: game.name })} detail={d.sourcePath} footer={d.files?.join(', ')} />
          <FlowArrow label={t('dash.flowCopy')} />
          <FlowStep icon={FolderGit2} title={t('dash.flowTemp')} detail={d.tempPath} footer={t('dash.flowTempFooter')} />
          <FlowArrow label={t('dash.flowPush')} />
          <FlowStep
            icon={Cloud}
            title="GitHub"
            detail={d.destinations.length === 1 ? shortRepo(d.destinations[0].repository) : t('dash.flowRepos', { count: d.destinations.length })}
            footer={d.destinations.length > 1 ? t('dash.flowChoose') : null}
          />
        </div>
      </Card>
    </>
  );
}

/**
 * All the servers of the game, with "Create new server" in the header: a row per server (status, repository,
 * installed commit, start/stop), or a welcome when there are none yet.
 */
function ServersSection({ id, game, server, onNavigate, onNewServer }) {
  const t = useT();
  const servers = server.details.servers;
  const run = (action, serverId) => window.api.runAction(id, 'server', action, serverId);
  const installing = Boolean(server.details.steam.phase);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <header className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40">
        <button type="button" onClick={() => onNavigate('server-list')} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-900 hover:text-orange-700 dark:text-slate-100 dark:hover:text-orange-400">
          <List className="size-4" />
          {t('dash.allServers', { game: game.name })}
        </button>
        <button type="button" onClick={onNewServer} className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-orange-700 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300">
          <PlusCircle className="size-4" />
          {t('dash.createServer')}
        </button>
      </header>
      {servers.length ? (
        <>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:border-slate-800 dark:text-slate-400">
                <th className="px-5 py-2 font-medium">{t('dash.colServer')}</th>
                <th className="px-3 py-2 font-medium">{t('servers.repository')}</th>
                <th className="px-3 py-2 font-medium">{t('dash.colCommit')}</th>
                <th className="px-3 py-2 font-medium">{t('dash.colStatus')}</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {servers.slice(0, DASH_ROWS).map((s) => (
                <tr key={s.id}>
                  <td className="max-w-48 px-5 py-2.5">
                    <button type="button" onClick={() => onNavigate(`srv:${s.id}:console`)} className="flex max-w-full cursor-pointer items-center gap-2 font-medium text-slate-900 hover:text-orange-700 dark:text-slate-100 dark:hover:text-orange-400" title={t('servers.open')}>
                      <StatusDot state={s.state} className="shrink-0" />
                      <span className="truncate">{s.name}</span>
                    </button>
                  </td>
                  <td className="max-w-48 truncate px-3 py-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{shortRepo(s.repository)}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{s.lastCommit ? s.lastCommit.slice(0, 7) : '-'}</td>
                  <td className="max-w-56 px-3 py-2.5">
                    <Badge tone={STATE_TONE[s.state]}><span className="inline-block max-w-48 truncate align-bottom" title={s.status}>{s.status}</span></Badge>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {s.running
                      ? <Button icon={Square} disabled={s.busy || installing} onClick={() => run('stop', s.id)} className="px-2.5 py-1 text-xs">{t('console.stop')}</Button>
                      : <Button icon={Play} disabled={s.busy || installing || !s.hasPackages} onClick={() => run('start', s.id)} className="px-2.5 py-1 text-xs">{t('console.start')}</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <MoreRow total={servers.length} onClick={() => onNavigate('server-list')} />
        </>
      ) : (
        <div className="px-5 py-10 text-center">
          <h2 className="text-lg font-medium text-slate-700 dark:text-slate-200">{t('dash.welcomeTitle', { game: game.fullName })}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('dash.welcomeText')}</p>
        </div>
      )}
    </section>
  );
}

/** Server role: the servers at a glance and how the new packages arrive. */
function ServerView({ id, game, server, localIps, onNavigate, onNewServer }) {
  const t = useT();
  const d = server.details;
  const running = d.servers.filter((s) => s.running).length;
  const lastPoll = d.servers.map((s) => s.lastPoll).filter(Boolean).sort().pop();
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <button type="button" onClick={() => onNavigate('server')} className="group cursor-pointer text-left" title={t('dash.openServer')}>
          <Stat icon={ServerCog} label={t('dash.servers')}>
            <span className="flex items-center justify-between gap-2">
              <span>{t('dash.serversRunning', { running, total: d.servers.length })}</span>
              <ChevronRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Stat>
        </button>
        <Stat icon={Tag} label={t('dash.steamInstalled')}>
          <span className={d.exeExists && d.steam.installed ? 'font-mono' : ''}>
            {d.exeExists ? d.steam.installed || t('dash.steamUnknown') : t('dash.notInstalled')}
          </span>
        </Stat>
        <Stat icon={RefreshCw} label={t('dash.lastCheck')}>
          {d.sync.method === 'webhook' ? t('dash.webhookMode') : lastPoll || t('dash.Never')}
        </Stat>
      </div>
      <ServersSection id={id} game={game} server={server} onNavigate={onNavigate} onNewServer={onNewServer} />
      {d.sync.method === 'polling' ? (
        <Card
          title={t('dash.pollingTitle', { game: game.name })}
          icon={RefreshCw}
          actions={(
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" icon={SlidersHorizontal} onClick={() => onNavigate('server-options')} className="py-1 text-xs">{t('dash.manage')}</Button>
              <Button icon={RefreshCw} disabled={server.busy || !d.servers.length} onClick={() => window.api.runAction(id, 'server', 'poll')} className="py-1 text-xs">
                {t('dash.checkNow')}
              </Button>
            </div>
          )}
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('dash.pollingEvery', { minutes: d.sync.pollMinutes })}</p>
        </Card>
      ) : (
        <Card
          title={t('dash.webhookTitle', { game: game.name })}
          icon={Webhook}
          description={t('dash.webhookDescription')}
          actions={<Button variant="ghost" icon={SlidersHorizontal} onClick={() => onNavigate('server-options')} className="shrink-0 py-1 text-xs">{t('dash.manage')}</Button>}
        >
          <WebhookUrl port={d.sync.port} localIps={localIps} />
        </Card>
      )}
    </>
  );
}

export default function Dashboard({ data, snapshot, logs, game: id, onNavigate, onNewServer, git, onGitHelp }) {
  const t = useT();
  const game = GAME[id];
  const g = snapshot.games[id];

  if (!g) {
    return (
      <>
        <PageHeader title={t('dash.title')} />
        <div className="px-8">
          <Card>
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-4 rounded-full bg-orange-50 p-4 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                <SettingsIcon className="size-7" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('dash.chooseTitle')}</h2>
              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                <Trans k="dash.chooseText" params={{ game: game.fullName }} />
              </p>
              <Button variant="primary" className="mt-6" onClick={() => onNavigate('settings')}>{t('dash.openSettings')}</Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const subtitle = g.client && g.server ? 'dash.subtitleBoth' : g.client ? 'dash.subtitleClient' : 'dash.subtitleServer';
  return (
    <>
      <PageHeader title={t('dash.title')} subtitle={t(subtitle, { game: game.name })}>
        {g.client && (
          <Button variant="primary" icon={CloudUpload} disabled={g.client.busy || !g.client.details.destinations.length} onClick={() => window.api.runAction(id, 'client', 'push')}>
            {t(g.client.details.destinations.length > 1 ? 'action.pushChoose' : 'action.push')}
          </Button>
        )}
      </PageHeader>
      <div className="space-y-4 px-8 pb-8">
        {g.client && git && !git.found && <GitMissing onGitHelp={onGitHelp} />}
        {g.client && <StatusHero role={g.client} label={t('role.client')} />}
        {g.client && <ClientView id={id} game={game} client={g.client} onNavigate={onNavigate} />}
        {g.server && <StatusHero role={g.server} label={t('role.server')} />}
        {g.server && <ServerView id={id} game={game} server={g.server} localIps={data.localIps} onNavigate={onNavigate} onNewServer={onNewServer} />}
        <RecentActivity logs={logs} onNavigate={onNavigate} />
      </div>
    </>
  );
}
