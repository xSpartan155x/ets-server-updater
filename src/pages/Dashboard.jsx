import {
  Activity, ChevronRight, TriangleAlert, ArrowRight, CloudUpload, Copy, ExternalLink, FolderGit2, FolderOpen, GitBranch, GitCommit, Cloud,
  RefreshCw, Server, Settings as SettingsIcon, Webhook,
} from 'lucide-react';
import { Button, Card, PageHeader, StatusDot, STATE_STYLES, WebhookUrl } from '../components/ui';
import { GAME } from '../games';
import { LogLine } from './Logs';
import { Trans, useT } from '../i18n';

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

function StatusHero({ snapshot }) {
  const t = useT();
  const style = STATE_STYLES[snapshot.state] || STATE_STYLES.idle;
  const label = t(`dash.state.${snapshot.state in STATE_STYLES ? snapshot.state : 'idle'}`);
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${style.soft} ring-8 ${style.ring}`}>
        <StatusDot state={snapshot.state} className="scale-150" />
      </div>
      <div className="min-w-0">
        <div className={`text-xs font-semibold tracking-wide uppercase ${style.text}`}>{label}</div>
        <div className="select-text mt-0.5 text-base font-medium wrap-break-word text-slate-900 dark:text-slate-100">{snapshot.status}</div>
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

/** g: snapshot of the game; s: its settings. */
function ClientView({ game, g, s }) {
  const t = useT();
  const d = g.details;
  return (
    <>
      <Card title={t('dash.flowTitle')} icon={Copy} description={t('dash.flowDescription', { game: game.name })}>
        <div className="flex items-stretch gap-2">
          <FlowStep icon={FolderOpen} title={t('dash.flowSource', { game: game.name })} detail={d.sourcePath} footer={d.files?.join(', ')} />
          <FlowArrow label={t('dash.flowCopy')} />
          <FlowStep icon={FolderGit2} title={t('dash.flowTemp')} detail={d.tempPath} footer={t('dash.flowTempFooter')} />
          <FlowArrow label={t('dash.flowPush')} />
          <FlowStep icon={Cloud} title="GitHub" detail={s.repository} footer={t('dash.flowLastPush', { value: d.lastPush || t('dash.never') })} />
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-4">
        <Stat icon={GitBranch} label={t('dash.branch')}>{d.branch}</Stat>
        <Stat icon={RefreshCw} label={t('dash.lastCheck')}>{d.lastCheck || t('dash.Never')}</Stat>
        <Stat icon={CloudUpload} label={t('dash.lastPush')}>{d.lastPush || t('dash.Never')}</Stat>
      </div>
    </>
  );
}

/** Warning of the Client mode without Git, with the button that opens the Git popup. */
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

/** How the server finds new commits: polling of the branch, or the GitHub webhook with its Payload URL. */
function SyncCard({ game, d, localIps }) {
  const t = useT();
  if (d.syncMethod === 'polling') {
    return (
      <Card title={t('dash.pollingTitle', { game: game.name })} icon={RefreshCw}>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('dash.pollingText', { minutes: d.pollMinutes, value: d.lastPoll || t('dash.never') })}
        </p>
      </Card>
    );
  }
  return (
    <Card title={t('dash.webhookTitle', { game: game.name })} icon={Webhook} description={t('dash.webhookDescription')}>
      <WebhookUrl port={d.port} localIps={localIps} />
    </Card>
  );
}

/** Server mode: the package sync (commit, polling or webhook); the dedicated server itself is in the Server page. */
function ServerView({ game, g, localIps, onNavigate }) {
  const t = useT();
  const d = g.details;
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <button type="button" onClick={() => onNavigate('server')} className="group cursor-pointer text-left" title={t('dash.openServer')}>
          <Stat icon={Server} label={t('dash.gameServer', { game: game.name })}>
            <span className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-2 ${d.serverRunning ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                <StatusDot state={d.serverRunning ? 'ok' : 'idle'} />
                {d.serverRunning ? t('console.running') : t('console.stopped')}
              </span>
              <ChevronRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Stat>
        </button>
        <Stat icon={GitCommit} label={t('dash.installedCommit')}>
          {d.lastCommit ? <span className="font-mono">{d.lastCommit.slice(0, 7)}</span> : t('dash.noneYet')}
        </Stat>
        <Stat icon={RefreshCw} label={t('dash.lastUpdate')}>{d.lastUpdate || t('dash.Never')}</Stat>
      </div>
      <SyncCard game={game} d={d} localIps={localIps} />
    </>
  );
}

export default function Dashboard({ data, snapshot, logs, game: id, onNavigate, git, onGitHelp }) {
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

  const actions = g.mode === 'client'
    ? [
      { id: 'open-repo', label: t('action.openRepo'), icon: ExternalLink },
      { id: 'push', label: t('action.push'), icon: CloudUpload, primary: true },
    ]
    : [
      { id: 'update', label: t('action.update'), icon: RefreshCw, primary: true },
    ];

  return (
    <>
      <PageHeader
        title={t('dash.title')}
        subtitle={t(g.mode === 'client' ? 'dash.subtitleClient' : 'dash.subtitleServer', { game: game.name })}
      >
        {actions.map((a) => (
          <Button
            key={a.id}
            variant={a.primary ? 'primary' : 'secondary'}
            icon={a.icon}
            disabled={g.busy && a.id !== 'open-repo'}
            onClick={() => window.api.runAction(id, a.id)}
          >
            {a.label}
          </Button>
        ))}
      </PageHeader>
      <div className="space-y-4 px-8 pb-8">
        {g.mode === 'client' && git && !git.found && <GitMissing onGitHelp={onGitHelp} />}
        <StatusHero snapshot={g} />
        {g.mode === 'client'
          ? <ClientView game={game} g={g} s={data.settings.games[id]} />
          : <ServerView game={game} g={g} localIps={data.localIps} onNavigate={onNavigate} />}
        <RecentActivity logs={logs} onNavigate={onNavigate} />
      </div>
    </>
  );
}
