import { useEffect, useState } from 'react';
import { CheckCircle2, Download, GitBranch, RefreshCw, X } from 'lucide-react';
import { Button } from './ui';
import { Trans, useT } from '../i18n';

/** Popup shown when the Client mode is used without Git for Windows: download link and a new check. */
export default function GitDialog({ git, onChecked, onClose }) {
  const t = useT();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // null | 'missing' | 'found'

  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onClose]);

  const check = async () => {
    setChecking(true);
    const next = await window.api.checkGit();
    setChecking(false);
    setResult(next.found ? 'found' : 'missing');
    onChecked(next);
    if (next.found) setTimeout(onClose, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-6 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="git-dialog-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5">
          <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
            <GitBranch className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="git-dialog-title" className="text-base font-semibold text-slate-900 dark:text-slate-50">{t('git.title')}</h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300"><Trans k="git.text" /></p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300"><Trans k="git.steps" /></p>
            {result === 'missing' && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{t('git.stillMissing')}</p>}
            {result === 'found' && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4 shrink-0" />
                {t('git.found', { version: git.version })}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} title={t('ui.close')} className="cursor-pointer rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>{t('git.later')}</Button>
          <Button icon={RefreshCw} loading={checking} onClick={check}>{t('git.check')}</Button>
          <Button variant="primary" icon={Download} onClick={() => window.api.openExternal(git.downloadUrl)}>{t('git.download')}</Button>
        </div>
      </div>
    </div>
  );
}
