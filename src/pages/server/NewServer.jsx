import { useEffect, useState } from 'react';
import { AlertCircle, ChevronRight, ExternalLink, HardDriveDownload, Plus, ServerCog } from 'lucide-react';
import { Button, Field, Modal, NumberInput, PathInput, SecretInput, TextInput } from '../../components/ui';
import { GAME } from '../../games';
import { useT } from '../../i18n';

const TOKEN_URL = 'https://steamcommunity.com/dev/managegameservers';
const PORTS = ['connection_dedicated_port', 'query_dedicated_port', 'connection_virtual_port', 'query_virtual_port'];

function Section({ title, children }) {
  return (
    <section className="space-y-3 border-t border-slate-100 pt-4 first:border-t-0 first:pt-0 dark:border-slate-800">
      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Wizard of a new server: name, repository, home folder, ports free on this PC, Steam token and first packages.
 * The installation of the dedicated server is downloaded with SteamCMD when missing.
 */
export default function NewServer({ game: id, onClose, onCreated }) {
  const t = useT();
  const game = GAME[id];
  const [plan, setPlan] = useState(null);
  const [name, setName] = useState('');
  const [homedir, setHomedir] = useState('');
  const [homeEdited, setHomeEdited] = useState(false);
  const [repository, setRepository] = useState('');
  const [branch, setBranch] = useState('master');
  const [files, setFiles] = useState({ repo_sii_file: 'server_packages.sii', repo_dat_file: 'server_packages.dat' });
  const [config, setConfig] = useState({ server_logon_token: '', password: '', max_players: 8 });
  const [packagesFrom, setPackagesFrom] = useState('');
  const [installDir, setInstallDir] = useState('');
  const [install, setInstall] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  // the proposal of the main process: free ports, suggested folders, where the first packages can come from
  useEffect(() => {
    window.api.servers.plan(id, '').then((p) => {
      setPlan(p);
      setHomedir(p.homedir);
      setInstallDir(p.installDir);
      setConfig((prev) => ({ ...prev, ...p.ports }));
      setPackagesFrom(p.sources[0]?.id || '');
    });
  }, [id]);

  // the home folder follows the name until it is edited by hand
  useEffect(() => {
    if (!plan || homeEdited) return;
    window.api.servers.plan(id, name).then((p) => setHomedir(p.homedir));
  }, [id, name, plan, homeEdited]);

  const setValue = (key) => (value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const create = async () => {
    setSaving(true);
    setErrors([]);
    setFieldErrors({});
    const result = await window.api.servers.create(id, {
      name: name.trim(),
      homedir,
      installDir,
      install,
      packagesFrom,
      instance: { repository: repository.trim(), branch: branch.trim(), ...files },
      config: { ...config, lobby_name: name.trim() },
    });
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors || []);
      setFieldErrors(Object.fromEntries((result.configErrors || []).map((e) => [e.field, t(`cfg.err.${e.rule}`, e.params || {})])));
      return;
    }
    onCreated(result.id);
  };

  return (
    <Modal
      icon={ServerCog}
      size="xl"
      title={t('new.title', { game: game.name })}
      description={t('new.text')}
      onClose={onClose}
      footer={(
        <>
          {errors.length > 0 && (
            <div className="mr-auto flex min-w-0 items-start gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <ul className="space-y-0.5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          <Button variant="ghost" onClick={onClose}>{t('ui.cancel')}</Button>
          <Button variant="primary" icon={Plus} loading={saving} disabled={!plan || !name.trim()} onClick={create}>{t('new.create')}</Button>
        </>
      )}
    >
      {!plan ? null : (
        <div className="space-y-5">
          <Section title={t('new.identity')}>
            <Field label={t('new.name')} hint={t('new.nameHint')}>
              <TextInput value={name} onChange={setName} placeholder={t('new.namePlaceholder')} autoFocus />
            </Field>
            <Field label={t('new.homedir')} hint={t('new.homedirHint')}>
              <PathInput kind="dir" value={homedir} onChange={(value) => { setHomedir(value); setHomeEdited(true); }} />
            </Field>
          </Section>

          <Section title={t('new.repository')}>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('new.repositoryText')}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label={t('settings.repoUrl')}>
                  <TextInput value={repository} onChange={setRepository} placeholder={t('settings.repoUrlPlaceholder')} />
                </Field>
              </div>
              <Field label={t('settings.branch')}><TextInput value={branch} onChange={setBranch} /></Field>
            </div>
          </Section>

          <Section title={t('new.session')}>
            <Field label={t('cfg.server_logon_token')} hint={t('new.tokenHint', { appId: game.steamAppId })} error={fieldErrors.server_logon_token}>
              <SecretInput
                value={config.server_logon_token}
                onChange={(value) => setValue('server_logon_token')(value.trim())}
                extra={() => <Button icon={ExternalLink} onClick={() => window.api.openExternal(TOKEN_URL)}>{t('cfg.tokenPage')}</Button>}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('cfg.password')} hint={t('cfg.passwordHint')} error={fieldErrors.password}>
                <SecretInput value={config.password} onChange={setValue('password')} />
              </Field>
              <Field label={t('cfg.max_players')} hint={t('cfg.maxPlayersHint')} error={fieldErrors.max_players}>
                <NumberInput value={config.max_players} onChange={setValue('max_players')} />
              </Field>
            </div>
          </Section>

          <Section title={t('new.packages')}>
            <div className="space-y-2">
              {[{ id: '', label: t('new.packagesWait') }, ...plan.sources.map((src) => ({
                id: src.id, label: src.id === 'documents' ? t('new.packagesDocuments', { path: src.label }) : t('new.packagesServer', { name: src.label }),
              }))].map((option) => (
                <label key={option.id || 'wait'} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="radio" name="packages" checked={packagesFrom === option.id} onChange={() => setPackagesFrom(option.id)} className="cursor-pointer accent-orange-600" />
                  <span className="min-w-0 truncate">{option.label}</span>
                </label>
              ))}
            </div>
          </Section>

          {!plan.installed && (
            <Section title={t('new.installation')}>
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <HardDriveDownload className="mt-0.5 size-4 shrink-0" />
                <p>{t('new.notInstalled', { game: game.name })}</p>
              </div>
              <Field label={t('settings.installDir')} hint={t('new.installDirHint')}>
                <PathInput kind="dir" value={installDir} onChange={setInstallDir} />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={install} onChange={(e) => setInstall(e.target.checked)} className="cursor-pointer accent-orange-600" />
                {t('new.installNow')}
              </label>
            </Section>
          )}

          <section className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAdvanced(!advanced)}
              className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <ChevronRight className={`size-4 transition-transform ${advanced ? 'rotate-90' : ''}`} />
              {t('settings.advanced')}
            </button>
            {advanced && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('new.portsText')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {PORTS.map((key) => (
                    <Field key={key} label={t(`cfg.${key}`)} error={fieldErrors[key]}>
                      <NumberInput value={config[key]} onChange={setValue(key)} max={65535} />
                    </Field>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('settings.repoSii')}>
                    <TextInput value={files.repo_sii_file} onChange={(value) => setFiles((prev) => ({ ...prev, repo_sii_file: value }))} />
                  </Field>
                  <Field label={t('settings.repoDat')}>
                    <TextInput value={files.repo_dat_file} onChange={(value) => setFiles((prev) => ({ ...prev, repo_dat_file: value }))} />
                  </Field>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}

