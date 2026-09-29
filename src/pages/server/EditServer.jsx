import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FolderGit2, FolderOpen, Save, Terminal, Trash2 } from 'lucide-react';
import { Button, Card, Field, Modal, PathInput, TextInput } from '../../components/ui';
import { useT } from '../../i18n';

function Errors({ errors }) {
  if (!errors.length) return null;
  return (
    <div className="mr-auto flex min-w-0 items-start gap-2 text-xs text-red-600 dark:text-red-400">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <ul className="space-y-0.5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
    </div>
  );
}

const KEYS = ['name', 'repository', 'branch', 'repo_sii_file', 'repo_dat_file', 'homedir', 'arguments'];

/**
 * Settings tab of one server: name, repository, home folder (only while it is stopped), extra arguments, and
 * the removal of the server. server: its block of the settings; running: its state now.
 */
export function ServerSettings({ game, server, running, busy, onSaved, onDeleted }) {
  const t = useT();
  const initial = useMemo(() => Object.fromEntries(KEYS.map((key) => [key, server[key]])), [server]);
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const set = (key) => (value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };
  const custom = ['sii_path', 'dat_path', 'config_path', 'log_path'].filter((key) => server[key]);

  const save = async () => {
    setSaving(true);
    setErrors([]);
    const result = await window.api.servers.save(game, server.id, values);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors || []);
      return;
    }
    setSaved(true);
    await onSaved();
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 pb-6">
        <Card title={t('edit.general')} icon={Terminal}>
          <div className="space-y-4">
            <Field label={t('new.name')} hint={t('edit.nameHint')}><TextInput value={values.name} onChange={set('name')} /></Field>
            <Field label={t('new.homedir')} hint={running ? t('edit.homedirRunning') : t('edit.homedirHint')}>
              {running
                ? <TextInput value={values.homedir} onChange={() => {}} disabled className="font-mono text-xs opacity-70" />
                : <PathInput kind="dir" value={values.homedir} onChange={set('homedir')} />}
            </Field>
            <Field label={t('settings.arguments')} hint={t('edit.argumentsHint')}>
              <TextInput value={values.arguments} onChange={set('arguments')} className="font-mono text-xs" />
            </Field>
            {custom.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('edit.customPaths')}{' '}
                {custom.map((key) => <code key={key} className="mr-2 font-mono text-[11px] break-all">{server[key]}</code>)}
              </p>
            )}
          </div>
        </Card>

        <Card title={t('new.repository')} icon={FolderGit2} description={t('new.repositoryText')}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label={t('settings.repoUrl')}><TextInput value={values.repository} onChange={set('repository')} placeholder={t('settings.repoUrlPlaceholder')} /></Field>
              </div>
              <Field label={t('settings.branch')}><TextInput value={values.branch} onChange={set('branch')} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('settings.repoSii')}><TextInput value={values.repo_sii_file} onChange={set('repo_sii_file')} /></Field>
              <Field label={t('settings.repoDat')}><TextInput value={values.repo_dat_file} onChange={set('repo_dat_file')} /></Field>
            </div>
          </div>
        </Card>

        <Card title={t('edit.dangerTitle')} icon={Trash2}>
          <div className="flex items-center gap-4">
            <p className="flex-1 text-sm text-slate-600 dark:text-slate-300">{running ? t('servers.stopToDelete') : t('edit.dangerText')}</p>
            <Button icon={Trash2} disabled={running || busy} onClick={() => setDeleting(true)} className="text-red-600 dark:text-red-400">
              {t('servers.delete')}
            </Button>
          </div>
        </Card>
      </div>

      {/* stays at the bottom of the window while the form scrolls, like the footer of Settings */}
      <footer className="sticky bottom-0 -mx-8 border-t border-slate-200 bg-white/90 px-8 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-end gap-3">
          <Errors errors={errors} />
          {saved && !dirty && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-4" /> {t('settings.saved')}</span>
          )}
          {dirty && <span className="text-xs text-slate-500 dark:text-slate-400">{t('settings.unsaved')}</span>}
          <Button variant="ghost" icon={FolderOpen} onClick={() => window.api.servers.open(game, server.id, 'home')} className="py-1.5 text-xs">{t('servers.openHome')}</Button>
          <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={save}>{t('edit.save')}</Button>
        </div>
      </footer>
      {deleting && <DeleteServer game={game} server={server} onClose={() => setDeleting(false)} onDeleted={onDeleted} />}
    </div>
  );
}

/** Remove a server from the app; its home folder (config, packages, log, backups) can go to the Recycle Bin. */
export function DeleteServer({ game, server, onClose, onDeleted }) {
  const t = useT();
  const [removeFiles, setRemoveFiles] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    setDeleting(true);
    const result = await window.api.servers.remove(game, server.id, removeFiles);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDeleted();
  };

  return (
    <Modal
      icon={Trash2}
      title={t('delete.title', { name: server.name })}
      description={t('delete.text')}
      onClose={onClose}
      footer={(
        <>
          <Errors errors={error ? [error] : []} />
          <Button variant="ghost" onClick={onClose}>{t('ui.cancel')}</Button>
          <Button variant="primary" icon={Trash2} loading={deleting} onClick={remove} className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600">
            {t('delete.confirm')}
          </Button>
        </>
      )}
    >
      <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={removeFiles} onChange={(e) => setRemoveFiles(e.target.checked)} className="mt-1 cursor-pointer accent-orange-600" />
        <span>
          {t('delete.files')}
          <code className="mt-1 block font-mono text-[11px] break-all text-slate-500 dark:text-slate-400">{server.homedir}</code>
        </span>
      </label>
    </Modal>
  );
}
