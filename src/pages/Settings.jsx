import { useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronRight, FileDown, FileUp, FolderGit2, Info, Laptop, Save, Server, Settings2,
  Sparkles, SlidersHorizontal, Terminal, Webhook, X,
} from 'lucide-react';
import {
  Button, Card, Field, NumberInput, PageHeader, PathInput, SecretInput, TextInput, Toggle, WebhookUrl,
} from '../components/ui';
import { GameIcon } from '../components/GameSwitcher';
import { GAME } from '../games';
import { Trans, useT } from '../i18n';

const MODES = [
  { id: 'client', icon: Laptop, text: 'settings.clientText' },
  { id: 'server', icon: Server, text: 'settings.serverText' },
];

const LANGUAGES = [
  { id: 'system', label: 'language.system' },
  { id: 'en', label: 'English' },
  { id: 'it', label: 'Italiano' },
];

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
          className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap ${
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

/** Settings of one game: mode, repository and the fields of the chosen mode. */
/** onClientChosen: called when Client is picked (the Git popup opens if Git is missing). */
function GameSettings({ game, values, set, localIps, onClientChosen }) {
  const t = useT();
  const name = game.name;
  return (
    <>
      <Card
        title={t('settings.modeTitle', { game: game.fullName })}
        icon={SlidersHorizontal}
        description={t('settings.gamesHint')}
        actions={<GameIcon id={game.id} className="size-9" />}
      >
        <div className="grid grid-cols-2 gap-3">
          {MODES.map(({ id, icon: Icon, text }) => {
            const active = values.mode === id;
            return (
              <button
                key={id}
                type="button"
                title={active ? t('settings.modeClear') : undefined}
                onClick={() => {
                  set('mode')(active ? '' : id); // a second click leaves the game empty (not configured)
                  if (!active && id === 'client') onClientChosen();
                }}
                className={`flex gap-3 rounded-xl border p-4 text-left transition-all ${
                  active
                    ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 dark:bg-orange-500/10'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`h-fit rounded-lg p-2 ${active ? 'bg-orange-600 text-white dark:bg-orange-500' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t(`mode.${id}`)}</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t(text, { game: name })}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {values.mode && (
        <Card title={t('settings.repoTitle')} icon={FolderGit2} description={t('settings.repoDescription', { game: name })}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label={t('settings.repoUrl')}>
                <TextInput value={values.repository} onChange={set('repository')} placeholder={t('settings.repoUrlPlaceholder')} />
              </Field>
            </div>
            <Field label={t('settings.branch')}><TextInput value={values.branch} onChange={set('branch')} /></Field>
            <div />
            <Field label={t('settings.repoSii')}><TextInput value={values.repo_sii_file} onChange={set('repo_sii_file')} /></Field>
            <Field label={t('settings.repoDat')}><TextInput value={values.repo_dat_file} onChange={set('repo_dat_file')} /></Field>
          </div>
        </Card>
      )}

      {values.mode === 'client' && (
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
                value={values.documents_path}
                onChange={set('documents_path')}
                placeholder={t('settings.docsFolderPlaceholder', { folder: game.documentsFolder })}
              />
            </Field>
          </div>
          <Advanced>
            <Field label={t('settings.debounce')}><NumberInput value={values.debounce_seconds} onChange={set('debounce_seconds')} /></Field>
            <div />
            <div className="col-span-2">
              <Field label={t('settings.commitMessage')}><TextInput value={values.commit_message} onChange={set('commit_message')} /></Field>
            </div>
          </Advanced>
        </Card>
      )}

      {values.mode === 'server' && (
        <>
          <Card title={t('settings.serverTitle', { game: name })} icon={Server}>
            <div className="space-y-4">
              <Field label={t('settings.exe', { game: name })} hint={t('settings.exeHint', { exe: game.serverExe })}>
                <PathInput kind="exe" value={values.executable} onChange={set('executable')} />
              </Field>
              <Field label={t('settings.sii')}>
                <PathInput kind="file" value={values.sii_path} onChange={set('sii_path')} />
              </Field>
              <Field label={t('settings.dat')}>
                <PathInput kind="file" value={values.dat_path} onChange={set('dat_path')} />
              </Field>
            </div>
            <Advanced>
              <div className="col-span-2">
                <Field label={t('settings.workdir')} hint={t('settings.workdirHint')}>
                  <PathInput kind="dir" value={values.working_directory} onChange={set('working_directory')} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label={t('settings.arguments')}><TextInput value={values.arguments} onChange={set('arguments')} className="font-mono text-xs" /></Field>
              </div>
              <div className="col-span-2">
                <Field label={t('settings.backupDir')} hint={t('settings.backupDirHint')}>
                  <PathInput kind="dir" value={values.backup_dir} onChange={set('backup_dir')} />
                </Field>
              </div>
              <Field label={t('settings.backupKeep')}><NumberInput value={values.backup_keep} onChange={set('backup_keep')} /></Field>
              <Field label={t('settings.stopTimeout')}><NumberInput value={values.stop_timeout_seconds} onChange={set('stop_timeout_seconds')} /></Field>
              <Field label={t('settings.startupCheck')} hint={t('settings.startupCheckHint', { game: name })}>
                <NumberInput value={values.startup_check_seconds} onChange={set('startup_check_seconds')} />
              </Field>
              <div className="col-span-2">
                <Field label={t('settings.serverLog')} hint={t('settings.serverLogHint')}>
                  <PathInput kind="file" value={values.server_log_path} onChange={set('server_log_path')} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label={t('settings.serverConfig')} hint={t('settings.serverConfigHint')}>
                  <PathInput kind="file" value={values.server_config_path} onChange={set('server_config_path')} />
                </Field>
              </div>
            </Advanced>
          </Card>

          <Card title={t('settings.webhookTitle', { game: name })} icon={Webhook} description={t('settings.webhookDescription')}>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('settings.port')} hint={t('settings.portHint', { port: game.defaultPort })}>
                <NumberInput value={values.webhook_port} onChange={set('webhook_port')} />
              </Field>
              <div />
              <div className="col-span-2">
                <Field label={t('settings.payloadUrl')}><WebhookUrl port={values.webhook_port} localIps={localIps} /></Field>
              </div>
              <div className="col-span-2">
                <Field label={t('settings.secret')} hint={t('settings.secretHint')}>
                  <SecretInput
                    value={values.webhook_secret}
                    onChange={set('webhook_secret')}
                    extra={(reveal) => (
                      <Button icon={Sparkles} onClick={() => { set('webhook_secret')(randomSecret()); reveal(); }}>{t('settings.generate')}</Button>
                    )}
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label={t('settings.token')} hint={t('settings.tokenHint')}>
                  <SecretInput value={values.github_token} onChange={set('github_token')} placeholder="github_pat_..." />
                </Field>
              </div>
            </div>
            <Advanced>
              <Field label={t('settings.listen')} hint={t('settings.listenHint')}>
                <TextInput value={values.webhook_host} onChange={set('webhook_host')} />
              </Field>
            </Advanced>
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
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: 'info' | 'error', text }

  // theme and language are saved on their own, right away: only the games and autostart need Save settings
  const dirty = useMemo(
    () => JSON.stringify(form.games) !== JSON.stringify(data.settings.games) || autostart !== data.autostart,
    [form, autostart, data],
  );

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, games: { ...prev.games, [game]: { ...prev.games[game], [key]: value } } }));
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
    // only the games in the file are replaced (a file of version 2.1 has ETS2 only)
    setForm((prev) => ({
      ...prev,
      games: Object.fromEntries(Object.entries(prev.games).map(([id, values]) => [id, { ...values, ...result.settings.games[id] }])),
    }));
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
    const result = await window.api.saveSettings(form, autostart);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
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
            <p className="selectable flex-1">{notice.text}</p>
            <button type="button" onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100" title={t('ui.close')}><X className="size-4" /></button>
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

        <GameSettings key={game} game={GAME[game]} values={form.games[game]} set={set} localIps={data.localIps} onClientChosen={onClientChosen} />
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
