import { useEffect, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { StatusDot } from './ui';
import { GAME, GAMES } from '../games';
import { useT } from '../i18n';

export function GameIcon({ id, className = 'size-5' }) {
  return <img src={GAME[id].icon} alt="" className={`shrink-0 object-contain ${className}`} />;
}

/** Roles and status of a game, e.g. "Client · Server - 2 of 3 servers running" (nothing for a game not configured). */
function GameLine({ g }) {
  const t = useT();
  if (!g) return null;
  const roles = ['client', 'server'].filter((role) => g[role]);
  const status = (g.server || g.client).status;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <StatusDot state={g.state} className="shrink-0" />
      <span className="truncate">{roles.map((role) => t(`role.${role}`)).join(' · ')} - {status}</span>
    </span>
  );
}

/** Sidebar header: the game shown by Dashboard, Console and Settings; a click opens the list of games. */
export default function GameSwitcher({ value, onChange, snapshot }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const game = GAME[value];

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={root} className="relative px-3 pt-4 pb-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t('game.select')}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
          open ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
        }`}
      >
        <GameIcon id={value} className="size-10" />
        <div className="line-clamp-2 min-w-0 flex-1 text-sm leading-tight font-semibold text-slate-900 dark:text-slate-50">
          {game.fullName}
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-3 z-20 -mt-1 w-80 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
        >
          <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
            {t('game.select')}
          </div>
          {GAMES.map(({ id, fullName }) => (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={id === value}
              onClick={() => { onChange(id); setOpen(false); }}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                id === value ? 'bg-orange-50 dark:bg-orange-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <GameIcon id={id} className="size-8" />
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm font-medium ${id === value ? 'text-orange-700 dark:text-orange-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  {fullName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400"><GameLine g={snapshot.games[id]} /></div>
              </div>
              {id === value && <Check className="size-4 shrink-0 text-orange-600 dark:text-orange-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
