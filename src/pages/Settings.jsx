import { useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronRight, FileDown, FileUp, FolderGit2, HardDriveDownload, Info, Laptop, Plus, RefreshCw, Save, Server,
  Settings2, Sparkles, SlidersHorizontal, Terminal, Trash2, Webhook, X,
} from 'lucide-react';
import {
  Button, Card, Field, NumberInput, PageHeader, PathInput, SecretInput, TextInput, Toggle, WebhookUrl,
} from '../components/ui';
import { GameIcon } from '../components/GameSwitcher';
import { GAME, uniqueId } from '../games';
import { Trans, useT } from '../i18n';

const ROLES = [
  { id: 'client', icon: Laptop, text: 'settings.clientText' },
  { id: 'server', icon: Server, text: 'settings.serverText' },
];

const SYNC_METHODS = [
  { id: 'polling', icon: RefreshCw },
  { id: 'webhook', icon: Webhook },
];

const LANGUAGES = [
  { id: 'system', label: 'language.system' },
  { id: 'en', label: 'English' },
  { id: 'it', label: 'Italiano' },
];

const SECRET_KEYS = ['webhook_secret', 'github_token'];

function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function Advanced({ children }) {
  const t = useT();
  return (
    <details className="group mt-5 rounded-lg border border-slate-200 dark:border-slate-800">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        {t('settings.advanced')}
      </summary>
      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 p-4 dark:border-slate-800">{children}</div>
    </details>
  );
}

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

/** Big choice button with icon, title and one line of text (roles of the game, polling or webhook). */
function OptionCard({ icon: Icon, title, text, active, onClick, tooltip, check }) {
  return (
    <button
      type="button"
      role={check ? 'checkbox' : undefined}
      aria-checked={check ? active : undefined}
      title={tooltip}
      onClick={onClick}
      className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-left transition-all ${
        active
          ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 dark:bg-orange-500/10'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className={`h-fit rounded-lg p-2 ${active ? 'bg-orange-600 text-white dark:bg-orange-500' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{text}</div>
      </div>
      {check && (
        <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${active ? 'border-orange-600 bg-orange-600 text-white dark:border-orange-500 dark:bg-orange-500' : 'border-slate-300 dark:border-slate-600'}`}>
          {active && <CheckCircle2 className="size-3.5" />}
        </span>
      )}
    </button>
  );
}

/** Servers the client sends its exports to: one GitHub repository each. */
function Destinations({ list, onChange }) {
  const t = useT();
  const [open, setOpen] = useState(null); // id of the row with its file names shown
  const update = (id, key) => (value) => onChange(list.map((d) => (d.id === id ? { ...d, [key]: value } : d)));
  const add = () => {
    const name = t('settings.newDestination', { n: list.length + 1 });
    onChange([...list, {
      id: uniqueId(name, list.map((d) => d.id)), name, repository: '', branch: 'master',
      repo_sii_file: 'server_packages.sii', repo_dat_file: 'server_packages.dat',
    }]);
  };
  return (
    <div className="space-y-3">
      {list.map((d) => (
        <div key={d.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <div className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
            <Field label={t('settings.destinationName')}><TextInput value={d.name} onChange={update(d.id, 'name')} /></Field>
            <Field label={t('settings.branch')}><TextInput value={d.branch} onChange={update(d.id, 'branch')} /></Field>
            <div className="flex gap-1">
              <Button variant="ghost" icon={ChevronRight} title={t('settings.fileNames')} onClick={() => setOpen(open === d.id ? null : d.id)} className={`px-2 ${open === d.id ? '[&_svg]:rotate-90' : ''}`} />
              <Button variant="ghost" icon={Trash2} title={t('settings.removeDestination')} onClick={() => onChange(list.filter((x) => x.id !== d.id))} className="px-2" />
            </div>
          </div>
          <div className="mt-2">
            <Field label={t('settings.repoUrl')}>
              <TextInput value={d.repository} onChange={update(d.id, 'repository')} placeholder={t('settings.repoUrlPlaceholder')} />
            </Field>
          </div>
          {open === d.id && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Field label={t('settings.repoSii')}><TextInput value={d.repo_sii_file} onChange={update(d.id, 'repo_sii_file')} /></Field>
              <Field label={t('settings.repoDat')}><TextInput value={d.repo_dat_file} onChange={update(d.id, 'repo_dat_file')} /></Field>
            </div>
          )}
        </div>
      ))}
      {!list.length && <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.noDestinations')}</p>}
      <Button icon={Plus} onClick={add}>{t('settings.addDestination')}</Button>
    </div>
  );
}

/** Settings of one game: its roles and the options of each role. */
function GameSettings({ game, values, setClient, setServer, localIps, suggested, onClientChosen }) {
  const t = useT();
  const name = game.name;
  const { client, server } = values;

  const toggle = (role) => {
    const on = !values[role].enabled;
    if (role === 'client') {
      setClient('enabled')(on);
      if (on) onClientChosen();
    } else {
      setServer('enabled')(on);
      if (on && !server.install_dir) setServer('install_dir')(suggested.installDir);
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
      </Card>

      {client.enabled && (
        <>
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
                <PathInput
                  kind="dir"
                  value={client.documents_path}
                  onChange={setClient('documents_path')}
                  placeholder={suggested.documents}
                />
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
          <Card title={t('settings.destinationsTitle')} icon={FolderGit2} description={t('settings.destinationsDescription', { game: name })}>
            <Destinations list={client.destinations} onChange={setClient('destinations')} />
          </Card>
        </>
      )}

      {server.enabled && (
        <>
          <Card title={t('settings.installTitle', { game: name })} icon={HardDriveDownload} description={t('settings.installDescription')}>
            <Field label={t('settings.installDir')} hint={t('settings.installDirHint2', { exe: game.serverExe })}>
              <PathInput kind="dir" value={server.install_dir} onChange={setServer('install_dir')} placeholder={suggested.installDir} />
            </Field>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('settings.serversWhere', { count: server.servers.length })}</p>
            <Advanced>
              <Field label={t('settings.backupKeep')}><NumberInput value={server.backup_keep} onChange={setServer('backup_keep')} /></Field>
              <Field label={t('settings.stopTimeout')}><NumberInput value={server.stop_timeout_seconds} onChange={setServer('stop_timeout_seconds')} /></Field>
              <Field label={t('settings.startupCheck')} hint={t('settings.startupCheckHint', { game: name })}>
                <NumberInput value={server.startup_check_seconds} onChange={setServer('startup_check_seconds')} />
              </Field>
            </Advanced>
          </Card>

          <Card title={t('settings.syncTitle', { game: name })} icon={RefreshCw} description={t('settings.syncDescription')}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 grid grid-cols-2 gap-3">
                {SYNC_METHODS.map(({ id, icon }) => (
                  <OptionCard
                    key={id}
                    icon={icon}
                    title={t(`sync.${id}`)}
                    text={t(`sync.${id}Text`)}
                    active={server.sync_method === id}
                    onClick={() => setServer('sync_method')(id)}
                  />
                ))}
              </div>
              {server.sync_method === 'polling' ? (
                <div className="col-span-2">
                  <Field label={t('settings.pollMinutes')} hint={t('settings.pollMinutesHint')}>
                    <NumberInput value={server.poll_minutes} onChange={setServer('poll_minutes')} />
                  </Field>
                </div>
              ) : (
                <>
                  <Field label={t('settings.port')} hint={t('settings.portHint', { port: game.defaultPort })}>
                    <NumberInput value={server.webhook_port} onChange={setServer('webhook_port')} />
                  </Field>
                  <div />
                  <div className="col-span-2">
                    <Field label={t('settings.payloadUrl')} hint={t('settings.webhookDescription')}><WebhookUrl port={server.webhook_port} localIps={localIps} /></Field>
                  </div>
                  <div className="col-span-2">
                    <Field label={t('settings.secret')} hint={t('settings.secretHint')}>
                      <SecretInput
                        value={server.webhook_secret}
                        onChange={setServer('webhook_secret')}
                        extra={(reveal) => (
                          <Button icon={Sparkles} onClick={() => { setServer('webhook_secret')(randomSecret()); reveal(); }}>{t('settings.generate')}</Button>
                        )}
                      />
                    </Field>
                  </div>
                </>
              )}
              <div className="col-span-2">
                <Field label={t('settings.token')} hint={t('settings.tokenHint')}>
                  <SecretInput value={server.github_token} onChange={setServer('github_token')} placeholder="github_pat_..." />
                </Field>
              </div>
            </div>
            {server.sync_method === 'webhook' && (
              <Advanced>
                <Field label={t('settings.listen')} hint={t('settings.listenHint')}>
                  <TextInput value={server.webhook_host} onChange={setServer('webhook_host')} />
                </Field>
              </Advanced>
            )}
          </Card>
        </>
      )}
    </>
  );
}

/** game: the game chosen in the sidebar; the form keeps the changes of both games until Save settings. */
export default function Settings({ data, onSaved, game, language, onLanguage, onClientChosen }) {
  const t = useT();
  const [form, setForm] = useState(data.settings);
  const [autostart, setAutostart] = useState(data.autostart);
  const [imported, setImported] = useState([]); // games whose servers come from an imported file
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
    const result = await window.api.saveSettings(form, autostart, imported);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setImported([]);
    setSaved(true);
    await onSaved();
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
          setClient={setRole('client')}
          setServer={setRole('server')}
          localIps={data.localIps}
          suggested={data.suggested[game]}
          onClientChosen={onClientChosen}
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
    </div>
  );
}
