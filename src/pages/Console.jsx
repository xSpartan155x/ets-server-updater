import { useEffect, useRef, useState } from 'react';
import { FileText, Play, RotateCw, Search, Square } from 'lucide-react';
import { Button, PageHeader, StatusDot } from '../components/ui';

function lineStyle(line) {
  if (line.includes('*** ERROR ***')) return 'text-red-400';
  if (line.includes('*** WARNING ***')) return 'text-amber-300/80';
  if (line.startsWith('[MP]')) return 'text-sky-300';
  return 'text-slate-300';
}

export default function Console({ snapshot, lines }) {
  const d = snapshot.details;
  const [query, setQuery] = useState('');
  const [hideWarnings, setHideWarnings] = useState(false);
  const [follow, setFollow] = useState(true);
  const bottom = useRef(null);

  const needle = query.trim().toLowerCase();
  const visible = lines.filter((line) =>
    (!hideWarnings || !line.includes('*** WARNING ***')) && (!needle || line.toLowerCase().includes(needle)));

  useEffect(() => {
    if (follow) bottom.current?.scrollIntoView({ block: 'end' });
  }, [visible.length, follow]);

  const busy = snapshot.busy;
  const run = (id) => window.api.runAction(id);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Server console" subtitle={<span className="selectable font-mono text-xs">{d.consoleFile}</span>}>
        <Button variant={d.ets2Running ? 'secondary' : 'primary'} icon={Play} disabled={busy || d.ets2Running} onClick={() => run('start')}>Start</Button>
        <Button icon={Square} disabled={busy || !d.ets2Running} onClick={() => run('stop')}>Stop</Button>
        <Button icon={RotateCw} disabled={busy} onClick={() => run('restart')}>Restart</Button>
      </PageHeader>
      <div className="flex min-h-0 flex-1 flex-col px-8 pb-8">
        <div className="mb-3 flex items-center gap-4">
          <span className={`inline-flex items-center gap-2 text-xs font-medium ${d.ets2Running ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <StatusDot state={busy ? 'busy' : d.ets2Running ? 'ok' : 'idle'} />
            {busy ? snapshot.status : d.ets2Running ? 'Running' : 'Stopped'}
          </span>
          <div className="relative ml-auto w-56">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter"
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <input type="checkbox" checked={hideWarnings} onChange={(e) => setHideWarnings(e.target.checked)} className="accent-orange-600" />
            Hide warnings
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="accent-orange-600" />
            Follow
          </label>
          <Button variant="ghost" icon={FileText} onClick={() => window.api.openConsoleFile()} className="py-1 text-xs">Open file</Button>
        </div>
        <div className="selectable min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 shadow-sm">
          {visible.length ? visible.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap wrap-break-word ${lineStyle(line)}`}>{line || ' '}</div>
          )) : (
            <p className="text-slate-500">{lines.length ? 'No lines match the filter.' : 'No output yet. The console shows the server log file while ETS2 runs.'}</p>
          )}
          <div ref={bottom} />
        </div>
      </div>
    </div>
  );
}
