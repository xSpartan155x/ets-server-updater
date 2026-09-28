import { useEffect, useState } from 'react';
import { AlertCircle, ArrowDownToLine, CheckCircle2, ExternalLink, Loader2, RefreshCw, RotateCw, Sparkles } from 'lucide-react';

const SMALL_BUTTON = 'inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const PRIMARY = `${SMALL_BUTTON} bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600`;
const SECONDARY = `${SMALL_BUTTON} border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800`;

/** Sidebar card: current version, update check, download progress and install. */
export default function UpdateCard() {
  const [u, setU] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    window.api.update.state().then(setU);
    return window.api.onUpdate(setU);
  }, []);

  if (!u) return null;

  const openRelease = () => window.api.openExternal(u.releaseUrl);
  const install = async () => {
    const result = await window.api.update.install();
    setError(result.ok ? '' : result.error || '');
  };

  let line;
  let action = null;
  switch (u.status) {
    case 'checking':
      line = <span className="flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" />Checking...</span>;
      break;
    case 'available':
      line = <span className="flex items-center gap-1.5 font-medium text-orange-700 dark:text-orange-400"><Sparkles className="size-3" />Version {u.latest} available</span>;
      action = (
        <div className="mt-2 flex gap-1.5">
          {u.canInstall && <button type="button" className={PRIMARY} onClick={() => window.api.update.download()}><ArrowDownToLine className="size-3.5" />Download</button>}
          <button type="button" className={SECONDARY} onClick={openRelease} title="Release notes on GitHub">
            <ExternalLink className="size-3.5" />{u.canInstall ? 'Notes' : 'Open release'}
          </button>
        </div>
      );
      break;
    case 'downloading':
      line = <span>Downloading {u.latest}... {u.progress}%</span>;
      action = (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-orange-500 transition-[width]" style={{ width: `${u.progress}%` }} />
        </div>
      );
      break;
    case 'downloaded':
      line = <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-3" />Version {u.latest} ready</span>;
      action = <button type="button" className={`${PRIMARY} mt-2`} onClick={install}><RotateCw className="size-3.5" />Restart to update</button>;
      break;
    case 'not-available':
      line = <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />Up to date</span>;
      break;
    case 'error':
      line = <span className="flex items-start gap-1.5 text-red-600 dark:text-red-400"><AlertCircle className="mt-0.5 size-3 shrink-0" /><span className="line-clamp-2" title={u.error}>{u.error}</span></span>;
      break;
    default:
      line = <span>Not checked yet</span>;
  }

  const busy = ['checking', 'downloading'].includes(u.status);

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">Version {u.current}</div>
        <button
          type="button"
          title="Check for updates"
          disabled={busy || u.status === 'downloaded'}
          onClick={() => window.api.update.check()}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <RefreshCw className={`size-3.5 ${u.status === 'checking' ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{line}</div>
      {u.checkedAt && ['not-available', 'error'].includes(u.status) && (
        <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">Checked {u.checkedAt}</div>
      )}
      {u.status === 'available' && !u.canInstall && (
        <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Automatic install works only in the installed app.</div>
      )}
      {action}
      {error && <div className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">{error}</div>}
    </div>
  );
}
