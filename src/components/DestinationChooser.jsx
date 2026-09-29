import { useState } from 'react';
import { CloudUpload, Server } from 'lucide-react';
import { Button, Modal } from './ui';
import { GameIcon } from './GameSwitcher';
import { GAME } from '../games';
import { useT } from '../i18n';

/** "https://github.com/me/eu-packages" -> "me/eu-packages". */
const shortRepo = (url) => String(url || '').replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\.git$/, '').replace(/\/+$/, '');

/**
 * A new export and more than one server: which one gets it. The server of the last export is preselected;
 * "Don't send" leaves it (Push now sends it later).
 * request: { game, destinations: [{ id, name, repository }], last }.
 */
export default function DestinationChooser({ request, onDone }) {
  const t = useT();
  const { game, destinations, last } = request;
  const [picked, setPicked] = useState(destinations.some((d) => d.id === last) ? last : destinations[0]?.id);
  const [sending, setSending] = useState(false);
  const target = destinations.find((d) => d.id === picked);

  const answer = async (id) => {
    setSending(true);
    await window.api.chooseDestination(game, id);
    onDone();
  };

  return (
    <Modal
      icon={CloudUpload}
      title={t('choose.title', { game: GAME[game].name })}
      description={t('choose.text')}
      onClose={null}
      footer={(
        <>
          <Button variant="ghost" disabled={sending} onClick={() => answer(null)}>{t('choose.skip')}</Button>
          <Button variant="primary" icon={CloudUpload} loading={sending} disabled={!target} onClick={() => answer(picked)}>
            {t('choose.send', { name: target?.name || '' })}
          </Button>
        </>
      )}
    >
      <div role="radiogroup" className="space-y-2">
        {destinations.map((d) => {
          const active = d.id === picked;
          return (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPicked(d.id)}
              onDoubleClick={() => answer(d.id)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                active
                  ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 dark:bg-orange-500/10'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className={`rounded-lg p-2 ${active ? 'bg-orange-600 text-white dark:bg-orange-500' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                <Server className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{d.name}</div>
                <div className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{shortRepo(d.repository)}</div>
              </div>
              {d.id === last && <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{t('choose.last')}</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <GameIcon id={game} className="size-4" />
        {t('choose.hint')}
      </p>
    </Modal>
  );
}

export { shortRepo };
