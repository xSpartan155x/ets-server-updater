import { useMemo, useState } from 'react';
import { HardDriveDownload, RefreshCw, ShieldCheck, Sparkles, Webhook } from 'lucide-react';
import {
  Advanced, Button, Card, Field, NumberInput, OptionCard, PageHeader, PathInput, SaveBar, SecretInput, TextInput, Toggle, WebhookUrl,
} from '../../components/ui';
import { GAME } from '../../games';
import { useT } from '../../i18n';

const SYNC_METHODS = [
  { id: 'polling', icon: RefreshCw },
  { id: 'webhook', icon: Webhook },
];

// the options of the server role shared by all its servers (the servers themselves are saved on their own)
const KEYS = [
  'install_dir', 'auto_update', 'update_hours', 'sync_method', 'poll_minutes', 'webhook_port', 'webhook_secret', 'webhook_host',
  'github_token', 'backup_keep', 'stop_timeout_seconds', 'startup_check_seconds',
];

function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Server role: the installation shared by the servers and its updates, how new packages are found on GitHub, and the
 * rules of every server. options: the server block of the settings of the game. embedded: shown inside Settings,
 * which has the page header.
 */
export default function ServerOptions({ game: id, options, localIps, suggested, onSaved, embedded }) {
  const t = useT();
  const game = GAME[id];
  const name = game.name;
  const initial = useMemo(() => Object.fromEntries(KEYS.map((key) => [key, options[key]])), [options]);
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState([]);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const set = (key) => (value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setErrors([]);
    let result;
    try {
      result = await window.api.saveRole(id, 'server', values);
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
    <div className={`flex flex-col ${embedded ? 'flex-1' : 'min-h-full'}`}>
      {!embedded && <PageHeader title={t('options.title')} subtitle={t('options.subtitle', { game: game.fullName })} />}
      <div className="flex-1 space-y-4 px-8 pb-6">
        {embedded && <p className="text-sm text-slate-500 dark:text-slate-400">{t('options.subtitle', { game: game.fullName })}</p>}
        <Card title={t('settings.installTitle', { game: name })} icon={HardDriveDownload} description={t('settings.installDescription')}>
          <div className="space-y-4">
            <Field label={t('settings.installDir')} hint={t('settings.installDirHint2', { exe: game.serverExe })}>
              <PathInput kind="dir" value={values.install_dir} onChange={set('install_dir')} placeholder={suggested.installDir} />
            </Field>
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <Toggle checked={values.auto_update} onChange={set('auto_update')} label={t('settings.steamAuto')} description={t('settings.steamAutoHint')} />
            </div>
            <Field label={t('settings.steamHours')} hint={t('settings.steamHoursHint')}>
              <NumberInput value={values.update_hours} onChange={set('update_hours')} />
            </Field>
          </div>
        </Card>

        <Card title={t('settings.syncTitle', { game: name })} icon={RefreshCw} description={t('settings.syncDescription')}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {SYNC_METHODS.map(({ id: method, icon }) => (
                <OptionCard
                  key={method}
                  icon={icon}
                  title={t(`sync.${method}`)}
                  text={t(`sync.${method}Text`)}
                  active={values.sync_method === method}
                  onClick={() => set('sync_method')(method)}
                />
              ))}
            </div>
            {values.sync_method === 'polling' ? (
              <div className="col-span-2">
                <Field label={t('settings.pollMinutes')} hint={t('settings.pollMinutesHint')}>
                  <NumberInput value={values.poll_minutes} onChange={set('poll_minutes')} />
                </Field>
              </div>
            ) : (
              <>
                <Field label={t('settings.port')} hint={t('settings.portHint', { port: game.defaultPort })}>
                  <NumberInput value={values.webhook_port} onChange={set('webhook_port')} />
                </Field>
                <div />
                <div className="col-span-2">
                  <Field label={t('settings.payloadUrl')} hint={t('settings.webhookDescription')}><WebhookUrl port={values.webhook_port} localIps={localIps} /></Field>
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
              </>
            )}
            <div className="col-span-2">
              <Field label={t('settings.token')} hint={t('settings.tokenHint')}>
                <SecretInput value={values.github_token} onChange={set('github_token')} placeholder="github_pat_..." />
              </Field>
            </div>
          </div>
          {values.sync_method === 'webhook' && (
            <Advanced>
              <Field label={t('settings.listen')} hint={t('settings.listenHint')}>
                <TextInput value={values.webhook_host} onChange={set('webhook_host')} />
              </Field>
            </Advanced>
          )}
        </Card>

        <Card title={t('options.rulesTitle')} icon={ShieldCheck} description={t('options.rulesDescription')}>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('settings.backupKeep')} hint={t('settings.backupKeepHint')}>
              <NumberInput value={values.backup_keep} onChange={set('backup_keep')} />
            </Field>
            <Field label={t('settings.stopTimeout')} hint={t('settings.stopTimeoutHint')}>
              <NumberInput value={values.stop_timeout_seconds} onChange={set('stop_timeout_seconds')} />
            </Field>
            <div className="col-span-2">
              <Field label={t('settings.startupCheck')} hint={t('settings.startupCheckHint', { game: name })}>
                <NumberInput value={values.startup_check_seconds} onChange={set('startup_check_seconds')} />
              </Field>
            </div>
          </div>
        </Card>
      </div>
      <SaveBar dirty={dirty} saved={saved} saving={saving} errors={errors} onSave={save} />
    </div>
  );
}
