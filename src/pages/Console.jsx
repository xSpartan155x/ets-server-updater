import { useEffect, useRef, useState } from 'react';
import { FileText, Play, RotateCw, Search, Square } from 'lucide-react';
import { Button, PageHeader, StatusDot } from '../components/ui';
import { GAME } from '../games';
import { useT } from '../i18n';

function lineStyle(line) {
  if (line.includes('*** ERROR ***')) return 'text-red-400';
  if (line.includes('*** WARNING ***')) return 'text-amber-300/80';
  if (line.startsWith('[MP]')) return 'text-sky-300';
  return 'text-slate-300';
}

/** Log of the dedicated server of the chosen game (shown only when it is in Server mode). */
export default function Console({ snapshot, lines: allLines, game: id }) {
  const t = useT();
  const g = snapshot.games[id];
  const d = g.details;
  const lines = allLines[id] || [];
  const [query, setQuery] = useState('');
  const [hideWarnings, setHideWarnings] = useState(false);
  const [follow, setFollow] = useState(true);
  const bottom = useRef(null);

  const needle = query.trim().toLowerCase();
  const visible = lines.filter((line) =>
    (!hideWarnings || !line.includes('*** WARNING ***')) && (!needle || line.toLowerCase().includes(needle)));

  useEffect(() => {
    if (follow) bottom.current?.scrollIntoView({ block: 'end' });
  }, [visible.length, follow, id]);

  const busy = g.busy;
  const run = (action) => window.api.runAction(id, action);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('console.title', { game: GAME[id].name })} subtitle={<span className="selectable font-mono text-xs">{d.consoleFile}</span>}>
        <Button variant={d.serverRunning ? 'secondary' : 'primary'} icon={Play} disabled={busy || d.serverRunning} onClick={() => run('start')}>{t('console.start')}</Button>
        <Button icon={Square} disabled={busy || !d.serverRunning} onClick={() => run('stop')}>{t('console.stop')}</Button>
        <Button icon={RotateCw} disabled={busy} onClick={() => run('restart')}>{t('console.restart')}</Button>
      </PageHeader>
      <div className="flex min-h-0 flex-1 flex-col px-8 pb-8">
        <div className="mb-3 flex items-center gap-4">
          <span className={`inline-flex items-center gap-2 text-xs font-medium ${d.serverRunning ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <StatusDot state={busy ? 'busy' : d.serverRunning ? 'ok' : 'idle'} />
            {busy ? g.status : d.serverRunning ? t('console.running') : t('console.stopped')}
          </span>
          <div className="relative ml-auto w-56">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('console.filter')}
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <input type="checkbox" checked={hideWarnings} onChange={(e) => setHideWarnings(e.target.checked)} className="accent-orange-600" />
            {t('console.hideWarnings')}
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="accent-orange-600" />
            {t('console.follow')}
          </label>
          <Button variant="ghost" icon={FileText} onClick={() => window.api.openConsoleFile(id)} className="py-1 text-xs">{t('console.openFile')}</Button>
        </div>
        <div className="selectable min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 shadow-sm">
          {visible.length ? visible.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap wrap-break-word ${lineStyle(line)}`}>{line || ' '}</div>
          )) : (
            <p className="text-slate-500">{lines.length ? t('console.noMatch') : t('console.empty', { game: GAME[id].name })}</p>
          )}
          <div ref={bottom} />
        </div>
      </div>
    </div>
  );
}
