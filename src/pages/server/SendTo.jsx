import { useMemo, useState } from 'react';
import { ChevronRight, Import, Plus, Terminal, Trash2 } from 'lucide-react';
import { Button, Field, PageHeader, SaveBar, SearchInput, TextInput, matches } from '../../components/ui';
import { shortRepo } from '../../components/DestinationChooser';
import { GAME, uniqueId } from '../../games';
import { Trans, useT } from '../../i18n';

/** Same repository and branch (the rule of the main process, loosely: case, trailing ".git" and slashes ignored). */
const repoKey = (d) => `${String(d.repository).trim().toLowerCase().replace(/\.git$/, '').replace(/\/+$/, '')}#${d.branch.trim()}`;

/** One server the client sends to: a row with its name, opened to edit repository, branch and file names. */
function Destination({ value, open, onToggle, onChange, onRemove }) {
  const t = useT();
  const set = (key) => (next) => onChange({ ...value, [key]: next });
  return (
    <div className={open ? 'bg-slate-50/70 dark:bg-slate-950/40' : ''}>
      <div className="flex items-center gap-2 px-4 py-2">
        <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left">
          <ChevronRight className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{value.name || t('send.unnamed')}</span>
          <span className="min-w-0 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {value.repository ? `${shortRepo(value.repository)} · ${value.branch}` : t('send.noRepo')}
          </span>
        </button>
        <Button variant="ghost" icon={Trash2} title={t('settings.removeDestination')} onClick={onRemove} className="shrink-0 px-2 py-1" />
      </div>
      {open && (
        <div className="space-y-2 px-4 pb-4 pl-10">
          <div className="grid grid-cols-[1fr_8rem] gap-2">
            <Field label={t('settings.destinationName')}><TextInput value={value.name} onChange={set('name')} autoFocus={!value.repository} /></Field>
            <Field label={t('settings.branch')}><TextInput value={value.branch} onChange={set('branch')} /></Field>
          </div>
          <Field label={t('settings.repoUrl')}>
            <TextInput value={value.repository} onChange={set('repository')} placeholder={t('settings.repoUrlPlaceholder')} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('settings.repoSii')}><TextInput value={value.repo_sii_file} onChange={set('repo_sii_file')} /></Field>
            <Field label={t('settings.repoDat')}><TextInput value={value.repo_dat_file} onChange={set('repo_dat_file')} /></Field>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Client role: the servers its exports are sent to, one GitHub repository each. options: the client block of the
 * settings of the game; local: the servers of the server role of this PC, which can be added in one click.
 */
export default function SendTo({ game: id, options, local, onSaved }) {
  const t = useT();
  const game = GAME[id];
  const initial = options.destinations;
  const [list, setList] = useState(initial);
  const [openId, setOpenId] = useState(null); // the row being edited
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState([]);
  const dirty = useMemo(() => JSON.stringify(list) !== JSON.stringify(initial), [list, initial]);
  const visible = list.filter((d) => d.id === openId || matches(query, d.name, d.repository, d.branch));

  const change = (next) => {
    setList(next);
    setSaved(false);
  };
  const add = () => {
    const name = t('settings.newDestination', { n: list.length + 1 });
    const newId = uniqueId(name, list.map((d) => d.id));
    change([{
      id: newId, name, repository: '', branch: 'master', repo_sii_file: 'server_packages.sii', repo_dat_file: 'server_packages.dat',
    }, ...list]);
    setOpenId(newId);
    setQuery('');
  };
  const known = new Set(list.map(repoKey));
  const missing = local.filter((server) => server.repository && !known.has(repoKey(server)));
  const addLocal = () => {
    const next = [...list];
    for (const server of missing) {
      const taken = next.map((d) => d.name.trim().toLowerCase());
      const name = taken.includes(server.name.trim().toLowerCase()) ? `${server.name} (${t('role.server')})` : server.name;
      next.push({
        id: uniqueId(name, next.map((d) => d.id)), name, repository: server.repository, branch: server.branch,
        repo_sii_file: server.repo_sii_file, repo_dat_file: server.repo_dat_file,
      });
    }
    change(next);
  };

  const save = async () => {
    setSaving(true);
    setErrors([]);
    let result;
    try {
      result = await window.api.saveRole(id, 'client', { destinations: list });
    } catch (err) {
      result = { ok: false, errors: [err.message] };
    }
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors || []);
      return;
    }
    setSaved(true);
    await onSaved();
  };

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title={t('send.title')} subtitle={t('send.subtitle', { game: game.name })}>
        {missing.length > 0 && (
          <Button icon={Import} onClick={addLocal} title={missing.map((server) => server.name).join(', ')}>
            {t('settings.addLocalServers', { count: missing.length })}
          </Button>
        )}
        <Button variant="primary" icon={Plus} onClick={add}>{t('settings.addDestination')}</Button>
      </PageHeader>
      <div className="flex-1 space-y-4 px-8 pb-6">
        <details className="group rounded-lg border border-orange-200 bg-orange-50 text-xs text-orange-900 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium">
            <Terminal className="size-4 shrink-0" />
            <span className="flex-1">{t('send.howTitle')}</span>
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          </summary>
          <p className="px-3 pb-3 pl-9">
            <Trans
              k="settings.clientInfo"
              params={{ game: game.name }}
              tags={{ code: (content) => <code className="rounded bg-orange-100 px-1 font-mono dark:bg-orange-500/20">{content}</code> }}
            />
          </p>
        </details>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <SearchInput value={query} onChange={setQuery} placeholder={t('send.search')} className="w-64" />
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {query ? t('ui.shownOf', { shown: visible.length, total: list.length }) : t('send.count', { count: list.length })}
            </span>
          </header>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((d) => (
              <Destination
                key={d.id}
                value={d}
                open={openId === d.id}
                onToggle={() => setOpenId(openId === d.id ? null : d.id)}
                onChange={(next) => change(list.map((x) => (x.id === d.id ? next : x)))}
                onRemove={() => change(list.filter((x) => x.id !== d.id))}
              />
            ))}
          </div>
          {!visible.length && (
            <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {list.length ? t('ui.noResults') : t('settings.noDestinations')}
            </p>
          )}
        </section>
      </div>
      <SaveBar dirty={dirty} saved={saved} saving={saving} errors={errors} onSave={save} />
    </div>
  );
}
