import { useEffect, useState } from 'react';
import { AlertCircle, ArrowDownToLine, CheckCircle2, ExternalLink, Loader2, RefreshCw, RotateCw, Sparkles, X } from 'lucide-react';
import { useT } from '../i18n';

const SMALL_BUTTON = 'inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const PRIMARY = `${SMALL_BUTTON} bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600`;
const SECONDARY = `${SMALL_BUTTON} border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800`;

/** Update state of the main process, kept in sync. */
function useUpdateState() {
  const [u, setU] = useState(null);
  useEffect(() => {
    window.api.update.state().then(setU);
    return window.api.onUpdate(setU);
  }, []);
  return u;
}

/** Banner on top of every page when a new version is available or ready; can be hidden until the next version. */
export function UpdateBanner() {
  const t = useT();
  const u = useUpdateState();
  const [hidden, setHidden] = useState('');
  const [error, setError] = useState('');

  if (!u || !['available', 'downloading', 'downloaded'].includes(u.status) || hidden === `${u.status}:${u.latest}`) return null;

  const install = async () => {
    const result = await window.api.update.install();
    setError(result.ok ? '' : result.error || '');
  };

  let text;
  let actions;
  if (u.status === 'downloaded') {
    text = t('update.bannerReady', { version: u.latest });
    actions = <button type="button" className={PRIMARY} onClick={install}><RotateCw className="size-3.5" />{t('update.restart')}</button>;
  } else if (u.status === 'downloading') {
    text = t('update.bannerDownloading', { version: u.latest, progress: u.progress });
    actions = null;
  } else {
    text = t('update.bannerAvailable', { version: u.latest, current: u.current });
    actions = (
      <>
        {u.canInstall && <button type="button" className={PRIMARY} onClick={() => window.api.update.download()}><ArrowDownToLine className="size-3.5" />{t('update.download')}</button>}
        <button type="button" className={SECONDARY} onClick={() => window.api.openExternal(u.releaseUrl)}>
          <ExternalLink className="size-3.5" />{u.canInstall ? t('update.notes') : t('update.openRelease')}
        </button>
      </>
    );
  }

  return (
    <div className="sticky top-0 z-10 border-b border-orange-200 bg-orange-50 px-6 py-2.5 dark:border-orange-500/30 dark:bg-orange-950">
      <div className="flex items-center gap-3">
        <Sparkles className="size-4 shrink-0 text-orange-600 dark:text-orange-400" />
        <div className="min-w-0 flex-1 text-sm font-medium text-orange-900 dark:text-orange-200">
          {text}
          {error && <div className="text-xs text-red-600 dark:text-red-400">{error}</div>}
        </div>
        {actions && <div className="flex shrink-0 gap-1.5 [&>button]:w-auto [&>button]:px-3">{actions}</div>}
        {u.status !== 'downloading' && (
          <button
            type="button"
            title={t('update.bannerHide')}
            onClick={() => setHidden(`${u.status}:${u.latest}`)}
            className="rounded p-1 text-orange-700 transition-colors hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Sidebar card: current version, update check, download progress and install. */
export default function UpdateCard() {
  const t = useT();
  const u = useUpdateState();
  const [error, setError] = useState('');

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
      line = <span className="flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" />{t('update.checking')}</span>;
      break;
    case 'available':
      line = <span className="flex items-center gap-1.5 font-medium text-orange-700 dark:text-orange-400"><Sparkles className="size-3" />{t('update.available', { version: u.latest })}</span>;
      action = (
        <div className="mt-2 flex gap-1.5">
          {u.canInstall && <button type="button" className={PRIMARY} onClick={() => window.api.update.download()}><ArrowDownToLine className="size-3.5" />{t('update.download')}</button>}
          <button type="button" className={SECONDARY} onClick={openRelease} title={t('update.notesTitle')}>
            <ExternalLink className="size-3.5" />{u.canInstall ? t('update.notes') : t('update.openRelease')}
          </button>
        </div>
      );
      break;
    case 'downloading':
      line = <span>{t('update.downloading', { version: u.latest, progress: u.progress })}</span>;
      action = (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-orange-500 transition-[width]" style={{ width: `${u.progress}%` }} />
        </div>
      );
      break;
    case 'downloaded':
      line = <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-3" />{t('update.ready', { version: u.latest })}</span>;
      action = <button type="button" className={`${PRIMARY} mt-2`} onClick={install}><RotateCw className="size-3.5" />{t('update.restart')}</button>;
      break;
    case 'not-available':
      line = <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />{t('update.upToDate')}</span>;
      break;
    case 'error':
      line = <span className="flex items-start gap-1.5 text-red-600 dark:text-red-400"><AlertCircle className="mt-0.5 size-3 shrink-0" /><span className="line-clamp-2" title={u.error}>{u.error}</span></span>;
      break;
    default:
      line = <span>{t('update.notChecked')}</span>;
  }

  const busy = ['checking', 'downloading'].includes(u.status);

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">{t('update.version', { version: u.current })}</div>
        <button
          type="button"
          title={t('update.check')}
          disabled={busy || u.status === 'downloaded'}
          onClick={() => window.api.update.check()}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <RefreshCw className={`size-3.5 ${u.status === 'checking' ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{line}</div>
      {u.checkedAt && ['not-available', 'error'].includes(u.status) && (
        <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{t('update.checked', { time: u.checkedAt })}</div>
      )}
      {u.status === 'available' && !u.canInstall && (
        <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{t('update.installedOnly')}</div>
      )}
      {action}
      {error && <div className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">{error}</div>}
    </div>
  );
}
