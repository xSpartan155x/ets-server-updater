import { useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronRight, FileDown, FileUp, FolderGit2, Info, Laptop, Save, Server, Sparkles, SlidersHorizontal, Terminal, Webhook, X,
} from 'lucide-react';
import {
  Button, Card, Field, NumberInput, PageHeader, PathInput, SecretInput, TextInput, Toggle, WebhookUrl,
} from '../components/ui';

const MODES = [
  {
    id: 'client',
    icon: Laptop,
    title: 'Client',
    text: 'This PC exports the packages from ETS2: they are copied into the repository and pushed to GitHub.',
  },
  {
    id: 'server',
    icon: Server,
    title: 'Server',
    text: 'This PC runs the ETS2 dedicated server: it receives the GitHub webhook and installs the new files.',
  },
];

function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function Advanced({ children }) {
  return (
    <details className="group mt-5 rounded-lg border border-slate-200 dark:border-slate-800">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        Advanced options
      </summary>
      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 p-4 dark:border-slate-800">{children}</div>
    </details>
  );
}

export default function Settings({ data, onSaved }) {
  const [form, setForm] = useState(data.settings);
  const [autostart, setAutostart] = useState(data.autostart);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: 'info' | 'error', text }

  const dirty = useMemo(() => {
    const { theme: _a, ...current } = form;
    const { theme: _b, ...stored } = data.settings;
    return JSON.stringify(current) !== JSON.stringify(stored) || autostart !== data.autostart;
  }, [form, autostart, data]);

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const fileName = (file) => file.split(/[\\/]/).pop();

  const exportFile = async () => {
    const result = await window.api.exportSettings(form);
    if (result.canceled) return;
    setNotice(result.ok
      ? { kind: 'info', text: `Settings exported to ${fileName(result.file)}${result.includeSecrets ? ' with the secrets in clear text: keep the file private.' : ' (without secrets).'}` }
      : { kind: 'error', text: result.error });
  };

  const importFile = async () => {
    const result = await window.api.importSettings();
    if (result.canceled) return;
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error });
      return;
    }
    setForm((prev) => ({ ...prev, ...result.settings }));
    setSaved(false);
    setErrors([]);
    const parts = [`Loaded ${fileName(result.file)}${result.version ? ` (exported by version ${result.version})` : ''}.`];
    if (!result.includesSecrets) parts.push('The file has no secrets: the ones of this PC are kept.');
    if (result.skipped.length) parts.push(`Ignored invalid values: ${result.skipped.join(', ')}.`);
    parts.push('Check the paths for this PC, then click Save settings.');
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
      <PageHeader title="Settings" subtitle="Everything is stored on this PC. Secrets are encrypted for your Windows user.">
        <Button icon={FileUp} onClick={importFile} title="Load settings from a file exported by another PC">Import</Button>
        <Button icon={FileDown} onClick={exportFile} title="Save these settings to a file">Export</Button>
      </PageHeader>
      {notice && (
        <div className="px-8 pb-4">
          <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${notice.kind === 'error'
            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
            : 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200'}`}
          >
            {notice.kind === 'error' ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
            <p className="selectable flex-1">{notice.text}</p>
            <button type="button" onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100" title="Close"><X className="size-4" /></button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-4 px-8 pb-6">
        <Card title="Mode of this PC" icon={SlidersHorizontal}>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map(({ id, icon: Icon, title, text }) => {
              const active = form.mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => set('mode')(id)}
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
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{text}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Toggle
              checked={autostart}
              onChange={(v) => { setAutostart(v); setSaved(false); }}
              label="Start with Windows"
              description={
                !data.canAutostart ? 'Available only in the installed app (not with npm run dev / start).'
                  : data.autostartBlocked ? 'Disabled in Windows (Task Manager → Startup apps): enable it there too.'
                    : 'Starts minimized in the tray when you sign in.'
              }
              disabled={!data.canAutostart}
            />
          </div>
        </Card>

        <Card title="GitHub repository" icon={FolderGit2} description="Shared by client and server.">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Repository URL">
                <TextInput value={form.repository} onChange={set('repository')} placeholder="https://github.com/USER/REPOSITORY" />
              </Field>
            </div>
            <Field label="Branch"><TextInput value={form.branch} onChange={set('branch')} /></Field>
            <div />
            <Field label="SII file in the repository"><TextInput value={form.repo_sii_file} onChange={set('repo_sii_file')} /></Field>
            <Field label="DAT file in the repository"><TextInput value={form.repo_dat_file} onChange={set('repo_dat_file')} /></Field>
          </div>
        </Card>

        {form.mode === 'client' && (
          <Card title="Client" icon={Laptop} description="Git access uses the credentials of Git for Windows (a sign-in window appears the first time).">
            <div className="space-y-4">
              <div className="flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
                <Terminal className="mt-0.5 size-4 shrink-0" />
                <p>
                  In ETS2 open the console and run <code className="rounded bg-orange-100 px-1 font-mono dark:bg-orange-500/20">export_server_packages</code>:
                  the game writes <b>server_packages.sii</b> and <b>server_packages.dat</b> in its documents folder. The app then
                  clones the repository into a temporary folder, copies the files if they changed, pushes them and deletes the
                  temporary clone. No local repository to manage.
                </p>
              </div>
              <Field label="ETS2 documents folder" hint="Where the game writes the exported files (the folder with profiles, config.cfg, game.log.txt...).">
                <PathInput kind="dir" value={form.ets2_documents_path} onChange={set('ets2_documents_path')} placeholder="C:\Users\you\Documents\Euro Truck Simulator 2" />
              </Field>
            </div>
            <Advanced>
              <Field label="Wait after last change (seconds)"><NumberInput value={form.debounce_seconds} onChange={set('debounce_seconds')} /></Field>
              <div />
              <div className="col-span-2">
                <Field label="Commit message"><TextInput value={form.commit_message} onChange={set('commit_message')} /></Field>
              </div>
            </Advanced>
          </Card>
        )}

        {form.mode === 'server' && (
          <>
            <Card title="ETS2 dedicated server" icon={Server}>
              <div className="space-y-4">
                <Field label="ETS2 server executable" hint="Usually ...\bin\win_x64\eurotrucks2_server.exe">
                  <PathInput kind="exe" value={form.ets2_executable} onChange={set('ets2_executable')} />
                </Field>
                <Field label="server_packages.sii used by the server">
                  <PathInput kind="file" value={form.sii_path} onChange={set('sii_path')} />
                </Field>
                <Field label="server_packages.dat used by the server">
                  <PathInput kind="file" value={form.dat_path} onChange={set('dat_path')} />
                </Field>
              </div>
              <Advanced>
                <div className="col-span-2">
                  <Field label="Working directory" hint="Empty = folder of the executable.">
                    <PathInput kind="dir" value={form.ets2_working_directory} onChange={set('ets2_working_directory')} />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Command line arguments"><TextInput value={form.ets2_arguments} onChange={set('ets2_arguments')} className="font-mono text-xs" /></Field>
                </div>
                <div className="col-span-2">
                  <Field label="Backup folder" hint="Empty = 'backups' next to the .sii file.">
                    <PathInput kind="dir" value={form.backup_dir} onChange={set('backup_dir')} />
                  </Field>
                </div>
                <Field label="Backups to keep"><NumberInput value={form.backup_keep} onChange={set('backup_keep')} /></Field>
                <Field label="Stop timeout (seconds)"><NumberInput value={form.stop_timeout_seconds} onChange={set('stop_timeout_seconds')} /></Field>
                <Field label="Startup check (seconds)" hint="ETS2 must stay up this long, otherwise the update is rolled back. 0 = off.">
                  <NumberInput value={form.startup_check_seconds} onChange={set('startup_check_seconds')} />
                </Field>
                <div className="col-span-2">
                  <Field label="Server log file (Console page)" hint="Empty = server.log.txt next to the .sii file.">
                    <PathInput kind="file" value={form.server_log_path} onChange={set('server_log_path')} />
                  </Field>
                </div>
              </Advanced>
            </Card>

            <Card title="GitHub webhook" icon={Webhook} description="GitHub → Settings → Webhooks → Add webhook · content type application/json · push event only.">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Port"><NumberInput value={form.webhook_port} onChange={set('webhook_port')} /></Field>
                <div />
                <div className="col-span-2">
                  <Field label="Payload URL"><WebhookUrl port={form.webhook_port} localIps={data.localIps} /></Field>
                </div>
                <div className="col-span-2">
                  <Field label="Webhook secret" hint="Use the same value in GitHub.">
                    <SecretInput
                      value={form.webhook_secret}
                      onChange={set('webhook_secret')}
                      extra={(reveal) => (
                        <Button icon={Sparkles} onClick={() => { set('webhook_secret')(randomSecret()); reveal(); }}>Generate</Button>
                      )}
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="GitHub token" hint="Only for private repositories: fine-grained token with Contents: Read-only.">
                    <SecretInput value={form.github_token} onChange={set('github_token')} placeholder="github_pat_..." />
                  </Field>
                </div>
              </div>
              <Advanced>
                <Field label="Listen address" hint="0.0.0.0 = all network interfaces.">
                  <TextInput value={form.webhook_host} onChange={set('webhook_host')} />
                </Field>
              </Advanced>
            </Card>
          </>
        )}
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
              <CheckCircle2 className="size-4" /> Saved and applied
            </span>
          )}
          {dirty && <span className="text-xs text-slate-500 dark:text-slate-400">Unsaved changes</span>}
          <Button variant="primary" icon={Save} loading={saving} onClick={save}>Save settings</Button>
        </div>
      </footer>
    </div>
  );
}
