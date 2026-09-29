import { useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, CheckCircle2, FileDown, FileUp, Info, Laptop, Save, Server, ServerCog, Settings2, SlidersHorizontal, Terminal, X,
} from 'lucide-react';
import {
  Advanced, Button, Card, Field, NumberInput, OptionCard, PageHeader, PathInput, TextInput, Toggle,
} from '../components/ui';
import { GameIcon } from '../components/GameSwitcher';
import ServerOptions from './server/ServerOptions';
import { GAME } from '../games';
import { Trans, useT } from '../i18n';

const ROLES = [
  { id: 'client', icon: Laptop, text: 'settings.clientText' },
  { id: 'server', icon: Server, text: 'settings.serverText' },
];

const LANGUAGES = [
  { id: 'system', label: 'language.system' },
  { id: 'en', label: 'English' },
  { id: 'it', label: 'Italiano' },
];

const SECRET_KEYS = ['webhook_secret', 'github_token'];

/** Row of buttons where one is selected (applied right away, not with Save settings). */
function Segmented({ options, value, onChange }) {
  const t = useT();
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap ${
            value === option.id
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          {t(option.label)}
        </button>
      ))}
    </div>
  );
}

/**
 * Settings of one game: its roles and the options of the client that are not about servers. Everything about servers
 * (where the client sends, the installation, sync and servers of the server role) is in the Server pages.
 * saved: the roles as saved (the Server pages exist only for them).
 */
function GameSettings({ game, values, saved, setClient, setServer, onClientChosen, suggested, onNavigate }) {
  const t = useT();
  const name = game.name;
  const { client } = values;
  const inUse = saved.client.enabled || saved.server.enabled;

  const toggle = (role) => {
    const on = !values[role].enabled;
    if (role === 'client') {
      setClient('enabled')(on);
      if (on) onClientChosen();
    } else {
      setServer('enabled')(on);
    }
  };

  return (
    <>
      <Card
        title={t('settings.rolesTitle', { game: game.fullName })}
        icon={SlidersHorizontal}
        description={t('settings.rolesHint')}
        actions={<GameIcon id={game.id} className="size-9" />}
      >
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(({ id, icon, text }) => (
            <OptionCard key={id} check icon={icon} title={t(`role.${id}`)} text={t(text, { game: name })} active={values[id].enabled} onClick={() => toggle(id)} />
          ))}
        </div>
        {(values.client.enabled || values.server.enabled) && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-950">
            <ServerCog className="size-4 shrink-0 text-orange-600 dark:text-orange-400" />
            <p className="flex-1 text-xs text-slate-600 dark:text-slate-300">{t(inUse ? 'settings.serversMoved' : 'settings.serversAfterSave')}</p>
            {inUse && <Button icon={ArrowRight} onClick={() => onNavigate('server')} className="shrink-0 py-1 text-xs">{t('settings.openServers')}</Button>}
          </div>
        )}
      </Card>

      {client.enabled && (
        <Card title={t('settings.clientTitle', { game: name })} icon={Laptop} description={t('settings.clientDescription')}>
          <div className="space-y-4">
            <div className="flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
              <Terminal className="mt-0.5 size-4 shrink-0" />
              <p>
                <Trans
                  k="settings.clientInfo"
                  params={{ game: name }}
                  tags={{ code: (content) => <code className="rounded bg-orange-100 px-1 font-mono dark:bg-orange-500/20">{content}</code> }}
                />
              </p>
            </div>
            <Field label={t('settings.docsFolder', { game: name })} hint={t('settings.docsFolderHint')}>
              <PathInput kind="dir" value={client.documents_path} onChange={setClient('documents_path')} placeholder={suggested.documents} />
            </Field>
          </div>
          <Advanced>
            <Field label={t('settings.debounce')}><NumberInput value={client.debounce_seconds} onChange={setClient('debounce_seconds')} /></Field>
            <div />
            <div className="col-span-2">
              <Field label={t('settings.commitMessage')}><TextInput value={client.commit_message} onChange={setClient('commit_message')} /></Field>
            </div>
          </Advanced>
        </Card>
      )}
    </>
  );
}

const TABS = [
  { id: 'general', page: 'settings', icon: Settings2 },
  { id: 'server', page: 'server-options', icon: ServerCog },
];

/**
 * game: the game chosen in the sidebar; the form keeps the changes of both games until Save settings.
 * tab: 'general' or 'server' (the options shared by the servers of the game, saved on their own; only while its
 * server role is in use).
 */
export default function Settings({ data, onSaved, game, language, onLanguage, onClientChosen, onNavigate, tab = 'general' }) {
  const t = useT();
  const hosting = data.settings.games[game].server.enabled;
  const current = hosting ? tab : 'general';
  const [form, setForm] = useState(data.settings);
  const [autostart, setAutostart] = useState(data.autostart);
  const [imported, setImported] = useState([]); // games whose values (servers too) come from an imported file
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: 'info' | 'error', text }

  // theme and language are saved on their own, right away: only the games and autostart need Save settings
  const dirty = useMemo(
    () => JSON.stringify(form.games) !== JSON.stringify(data.settings.games) || autostart !== data.autostart,
    [form, autostart, data],
  );

  const setRole = (role) => (key) => (value) => {
    setForm((prev) => ({
      ...prev,
      games: { ...prev.games, [game]: { ...prev.games[game], [role]: { ...prev.games[game][role], [key]: value } } },
    }));
    setSaved(false);
  };

  const fileName = (file) => file.split(/[\\/]/).pop();

  const exportFile = async () => {
    const result = await window.api.exportSettings(form);
    if (result.canceled) return;
    setNotice(result.ok
      ? { kind: 'info', text: t(result.includeSecrets ? 'settings.exported' : 'settings.exportedNoSecrets', { file: fileName(result.file) }) }
      : { kind: 'error', text: result.error });
  };

  const importFile = async () => {
    const result = await window.api.importSettings();
    if (result.canceled) return;
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error });
      return;
    }
    // only the games in the file are replaced (a file of 2.x has ETS2 only); secrets missing in the file are kept
    const games = Object.keys(result.settings.games);
    setForm((prev) => ({
      ...prev,
      games: Object.fromEntries(Object.entries(prev.games).map(([id, values]) => {
        const next = result.settings.games[id];
        if (!next) return [id, values];
        const keep = Object.fromEntries(SECRET_KEYS.filter((key) => !(key in next.server)).map((key) => [key, values.server[key]]));
        return [id, { client: next.client, server: { ...next.server, ...keep } }];
      })),
    }));
    setImported(games);
    setSaved(false);
    setErrors([]);
    const parts = [result.version
      ? t('settings.loadedVersion', { file: fileName(result.file), version: result.version })
      : t('settings.loaded', { file: fileName(result.file) })];
    if (!result.includesSecrets) parts.push(t('settings.noSecrets'));
    if (result.skipped.length) parts.push(t('settings.skipped', { keys: result.skipped.join(', ') }));
    parts.push(t('settings.checkPaths'));
    setNotice({ kind: 'info', text: parts.join(' ') });
  };

  const save = async () => {
    setSaving(true);
    setErrors([]);
    const before = data.settings.games[game];
    const now = form.games[game];
    const result = await window.api.saveSettings(form, autostart, imported);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setImported([]);
    setSaved(true);
    await onSaved();
    // a role just turned on: its servers are the next thing to set up
    if ((now.client.enabled && !before.client.enabled) || (now.server.enabled && !before.server.enabled)) onNavigate('server');
  };

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')}>
        <Button icon={FileUp} onClick={importFile} title={t('settings.importTitle')}>{t('settings.import')}</Button>
        <Button icon={FileDown} onClick={exportFile} title={t('settings.exportTitle')}>{t('settings.export')}</Button>
      </PageHeader>
      {notice && (
        <div className="px-8 pb-4">
          <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${notice.kind === 'error'
            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
            : 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200'}`}
          >
            {notice.kind === 'error' ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
            <p className="select-text flex-1">{notice.text}</p>
            <button type="button" onClick={() => setNotice(null)} className="cursor-pointer opacity-60 hover:opacity-100" title={t('ui.close')}><X className="size-4" /></button>
          </div>
        </div>
      )}

      {hosting && (
        <div className="mb-4 flex gap-1 border-b border-slate-200 px-8 dark:border-slate-800" role="tablist">
          {TABS.map(({ id, page, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={current === id}
              onClick={() => onNavigate(page)}
              className={`-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                current === id
                  ? 'border-orange-500 text-orange-700 dark:text-orange-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="size-4" />
              {t(`settings.tab.${id}`)}
            </button>
          ))}
        </div>
      )}

      {current === 'server' ? (
        <ServerOptions
          key={game}
          embedded
          game={game}
          options={data.settings.games[game].server}
          localIps={data.localIps}
          suggested={data.suggested[game]}
          onSaved={onSaved}
        />
      ) : (
      <>
      <div className="flex-1 space-y-4 px-8 pb-6">
        <Card title={t('settings.generalTitle')} icon={Settings2}>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{t('settings.language')}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('settings.languageHint')}</div>
              </div>
              <Segmented options={LANGUAGES} value={language} onChange={onLanguage} />
            </div>
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <Toggle
                checked={autostart}
                onChange={(v) => { setAutostart(v); setSaved(false); }}
                label={t('settings.autostart')}
                description={t(!data.canAutostart ? 'settings.autostartDev'
                  : data.autostartBlocked ? 'settings.autostartBlocked' : 'settings.autostartDescription')}
                disabled={!data.canAutostart}
              />
            </div>
          </div>
        </Card>

        <GameSettings
          key={game}
          game={GAME[game]}
          values={form.games[game]}
          saved={data.settings.games[game]}
          setClient={setRole('client')}
          setServer={setRole('server')}
          suggested={data.suggested[game]}
          onClientChosen={onClientChosen}
          onNavigate={onNavigate}
        />
      </div>

      <footer className="sticky bottom-0 border-t border-slate-200 bg-white/90 px-8 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        {errors.length > 0 && (
          <div className="mb-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <ul className="space-y-0.5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
        <div className="flex items-center justify-end gap-4">
          {saved && !dirty && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4" /> {t('settings.saved')}
            </span>
          )}
          {dirty && <span className="text-xs text-slate-500 dark:text-slate-400">{t('settings.unsaved')}</span>}
          <Button variant="primary" icon={Save} loading={saving} onClick={save}>{t('settings.save')}</Button>
        </div>
      </footer>
      </>
      )}
    </div>
  );
}
