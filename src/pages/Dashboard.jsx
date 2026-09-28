import {
  Activity, ArrowRight, CloudUpload, Copy, ExternalLink, FolderGit2, FolderOpen, GitBranch, GitCommit, Cloud,
  Power, RefreshCw, Server, Settings as SettingsIcon, Webhook,
} from 'lucide-react';
import { Button, Card, PageHeader, StatusDot, STATE_STYLES, WebhookUrl } from '../components/ui';
import { LogLine } from './Logs';

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
  const style = STATE_STYLES[snapshot.state] || STATE_STYLES.idle;
  const label = { ok: 'Running', busy: 'Working', error: 'Needs attention', idle: 'Not configured' }[snapshot.state];
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${style.soft} ring-8 ${style.ring}`}>
        <StatusDot state={snapshot.state} className="scale-150" />
      </div>
      <div className="min-w-0">
        <div className={`text-xs font-semibold tracking-wide uppercase ${style.text}`}>{label}</div>
        <div className="selectable mt-0.5 text-base font-medium wrap-break-word text-slate-900 dark:text-slate-100">{snapshot.status}</div>
      </div>
    </div>
  );
}

function RecentActivity({ logs, onNavigate }) {
  const recent = logs.slice(-8).reverse();
  return (
    <Card
      title="Recent activity"
      icon={Activity}
      actions={<Button variant="ghost" onClick={() => onNavigate('logs')} className="py-1 text-xs">View all</Button>}
    >
      {recent.length ? (
        <div className="-my-1 space-y-0.5">{recent.map((line, i) => <LogLine key={i} line={line} compact />)}</div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</p>
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
      <div className="selectable mt-1.5 font-mono text-[11px] break-all text-slate-500 dark:text-slate-400">{detail}</div>
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

function ClientView({ data, snapshot }) {
  const d = snapshot.details;
  return (
    <>
      <Card
        title="How files flow"
        icon={Copy}
        description="Run export_server_packages in the ETS2 console: the repository is cloned fresh, the changed files are pushed and the clone is deleted."
      >
        <div className="flex items-stretch gap-2">
          <FlowStep icon={FolderOpen} title="ETS2 documents folder" detail={d.sourcePath} footer={d.files?.join(', ')} />
          <FlowArrow label="copy" />
          <FlowStep icon={FolderGit2} title="Temporary clone" detail={d.tempPath} footer="Deleted after every push" />
          <FlowArrow label="push" />
          <FlowStep icon={Cloud} title="GitHub" detail={data.settings.repository} footer={`Last push: ${d.lastPush || 'never'}`} />
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-4">
        <Stat icon={GitBranch} label="Branch">{d.branch}</Stat>
        <Stat icon={RefreshCw} label="Last check">{d.lastCheck || 'Never'}</Stat>
        <Stat icon={CloudUpload} label="Last push">{d.lastPush || 'Never'}</Stat>
      </div>
    </>
  );
}

function ServerView({ data, snapshot }) {
  const d = snapshot.details;
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Stat icon={Server} label="ETS2 server">
          <span className={`inline-flex items-center gap-2 ${d.ets2Running ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <StatusDot state={d.ets2Running ? 'ok' : 'idle'} />
            {d.ets2Running ? 'Running' : 'Stopped'}
          </span>
        </Stat>
        <Stat icon={GitCommit} label="Installed commit">
          {d.lastCommit ? <span className="font-mono">{d.lastCommit.slice(0, 7)}</span> : 'None yet'}
        </Stat>
        <Stat icon={RefreshCw} label="Last update">{d.lastUpdate || 'Never'}</Stat>
      </div>
      <Card title="GitHub webhook" icon={Webhook} description="Paste this Payload URL in GitHub → Settings → Webhooks (content type application/json, push event only).">
        <WebhookUrl port={d.port} localIps={data.localIps} />
      </Card>
    </>
  );
}

export default function Dashboard({ data, snapshot, logs, onNavigate }) {
  const mode = snapshot.mode;

  if (!mode) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="px-8">
          <Card>
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-4 rounded-full bg-orange-50 p-4 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                <SettingsIcon className="size-7" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Choose how this PC is used</h2>
              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Set this PC as <b>Client</b> (pushes the package files to GitHub) or <b>Server</b> (receives the
                GitHub webhook and updates the ETS2 dedicated server).
              </p>
              <Button variant="primary" className="mt-6" onClick={() => onNavigate('settings')}>Open Settings</Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const actions = mode === 'client'
    ? [
      { id: 'open-repo', label: 'Open Repository', icon: ExternalLink },
      { id: 'push', label: 'Push Now', icon: CloudUpload, primary: true },
    ]
    : [
      { id: 'restart', label: 'Restart ETS2', icon: Power },
      { id: 'update', label: 'Update Now', icon: RefreshCw, primary: true },
    ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={mode === 'client' ? 'Client mode - copies the exported packages and pushes them to GitHub' : 'Server mode - installs packages pushed to GitHub'}
      >
        {actions.map((a) => (
          <Button
            key={a.id}
            variant={a.primary ? 'primary' : 'secondary'}
            icon={a.icon}
            disabled={snapshot.busy && a.id !== 'open-repo'}
            onClick={() => window.api.runAction(a.id)}
          >
            {a.label}
          </Button>
        ))}
      </PageHeader>
      <div className="space-y-4 px-8 pb-8">
        <StatusHero snapshot={snapshot} />
        {mode === 'client' ? <ClientView data={data} snapshot={snapshot} /> : <ServerView data={data} snapshot={snapshot} />}
        <RecentActivity logs={logs} onNavigate={onNavigate} />
      </div>
    </>
  );
}
