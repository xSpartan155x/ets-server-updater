import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { Button, PageHeader } from '../components/ui';
import { useT } from '../i18n';

const LEVEL_STYLES = {
  INFO: 'text-slate-500 dark:text-slate-400',
  WARN: 'text-amber-600 dark:text-amber-400',
  ERROR: 'text-red-600 dark:text-red-400',
};

const FILTERS = {
  all: () => true,
  warn: (l) => l.level !== 'INFO',
  error: (l) => l.level === 'ERROR',
};

export function LogLine({ line, compact }) {
  return (
    <div className={`select-text flex gap-3 font-mono text-xs leading-5 ${compact ? '' : 'px-4 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
      <span className="shrink-0 text-slate-400 dark:text-slate-500">{compact ? line.time.slice(11) : line.time}</span>
      <span className={`w-10 shrink-0 font-semibold ${LEVEL_STYLES[line.level]}`}>{line.level}</span>
      <span className={`min-w-0 ${compact ? 'truncate' : 'whitespace-pre-wrap wrap-break-word'} ${line.level === 'ERROR' ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-300'}`}>
        {compact ? line.message.split('\n')[0] : line.message}
      </span>
    </div>
  );
}

export default function Logs({ logs }) {
  const t = useT();
  const [filter, setFilter] = useState('all');
  const [follow, setFollow] = useState(true);
  const bottom = useRef(null);
  const visible = logs.filter(FILTERS[filter]);

  useEffect(() => {
    if (follow) bottom.current?.scrollIntoView({ block: 'end' });
  }, [visible.length, follow]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('logs.title')} subtitle={t('logs.subtitle')}>
        <Button icon={FileText} onClick={() => window.api.openLogFile()}>{t('logs.openFile')}</Button>
      </PageHeader>
      <div className="flex min-h-0 flex-1 flex-col px-8 pb-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {['all', 'warn', 'error'].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium ${
                  filter === id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {t(`logs.${id}`)}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="cursor-pointer accent-orange-600" />
            {t('logs.follow')}
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          {visible.length ? visible.map((line, i) => <LogLine key={i} line={line} />) : (
            <p className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">{t('logs.empty')}</p>
          )}
          <div ref={bottom} />
        </div>
      </div>
    </div>
  );
}
