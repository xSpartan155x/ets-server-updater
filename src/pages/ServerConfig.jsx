import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ExternalLink, FileText, Gamepad2, KeyRound, Loader2, Network, Plus, RotateCw, Save, Shield, Trash2, Truck, User,
  Users,
} from 'lucide-react';
import { Button, Card, Field, NumberInput, SecretInput, TextInput, Toggle } from '../components/ui';
import { GAME } from '../games';
import { Trans, useT } from '../i18n';

const TOKEN_URL = 'https://steamcommunity.com/dev/managegameservers';

const TEXTS = [['lobby_name', 63], ['description', 63], ['welcome_message', 127]];
const TOGGLES = [
  'player_damage', 'traffic', 'name_tags', 'force_speed_limiter', 'hide_in_company', 'hide_colliding',
  'service_no_collision', 'in_menu_ghosting', 'mods_optioning',
];
const AI = ['max_vehicles_total', 'max_ai_vehicles_player', 'max_ai_vehicles_player_spawn'];
const PORTS = ['connection_dedicated_port', 'query_dedicated_port', 'connection_virtual_port', 'query_virtual_port'];

/** Text field with the count of the characters (the server cuts longer texts). */
function CountedInput({ label, hint, value, max, onChange, error }) {
  const length = [...(value || '')].length;
  return (
    <Field label={label} hint={hint} error={error}>
      <div className="relative">
        <TextInput value={value} onChange={onChange} className={`pr-16 ${error ? 'border-red-400 dark:border-red-500/60' : ''}`} />
        <span className={`absolute inset-y-0 right-3 flex items-center text-[11px] ${length > max ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
          {length}/{max}
        </span>
      </div>
    </Field>
  );
}

const STEAM_ID = /^7656119\d{10}$/;

/** Avatar of a Steam profile (a neutral icon while loading, without avatar or when it cannot be loaded). */
function Avatar({ src }) {
  const [failed, setFailed] = useState(false);
  return src && !failed
    ? <img src={src} alt="" onError={() => setFailed(true)} className="size-9 shrink-0 rounded-lg object-cover" />
    : <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800"><User className="size-4" /></span>;
}

/**
 * Moderators: the file keeps the Steam IDs, here each one is shown with its Steam name and avatar.
 * New ones are added with a Steam ID or the link of the profile.
 */
function Moderators({ ids, onChange, error }) {
  const t = useT();
  const [profiles, setProfiles] = useState({}); // id -> { name, avatar, found, offline }
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const missing = ids.filter((id) => !(id in profiles));
    if (!missing.length) return;
    let current = true;
    window.api.steamProfiles(missing).then((found) => current && setProfiles((prev) => ({ ...prev, ...found })));
    return () => { current = false; };
  }, [ids, profiles]);

  const add = async () => {
    if (!input.trim()) return;
    setAdding(true);
    setMessage('');
    const result = await window.api.steamResolve(input);
    setAdding(false);
    if (!result.ok) {
      setMessage(t(result.reason === 'offline' ? 'cfg.steamOffline' : 'cfg.resolveFailed'));
      return;
    }
    const { id, name, avatar } = result.profile;
    if (ids.includes(id)) {
      setMessage(t('cfg.alreadyModerator', { name }));
      return;
    }
    setProfiles((prev) => ({ ...prev, [id]: { name, avatar, found: true } }));
    onChange([...ids, id]);
    setInput('');
  };

  const line = (id) => {
    const p = profiles[id];
    if (!STEAM_ID.test(id)) return <span className="text-amber-600 dark:text-amber-400">{t('cfg.notSteamId')}</span>;
    if (!p) return <span className="text-slate-400">{t('cfg.profileLoading')}</span>;
    if (p.found) return <span className="truncate font-medium text-slate-900 dark:text-slate-100">{p.name}</span>;
    return <span className="text-slate-500 dark:text-slate-400">{t(p.offline ? 'cfg.profileOffline' : 'cfg.profileMissing')}</span>;
  };

  return (
    <div className="space-y-3">
      {ids.length ? (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {ids.map((id) => (
            <div key={id} className="flex items-center gap-3 px-3 py-2">
              <Avatar src={profiles[id]?.found ? profiles[id].avatar : null} />
              <div className="flex min-w-0 flex-1 flex-col text-sm">
                {line(id)}
                <span className="selectable font-mono text-[11px] text-slate-500 dark:text-slate-400">{id}</span>
              </div>
              {STEAM_ID.test(id) && (
                <Button
                  variant="ghost"
                  icon={ExternalLink}
                  title={t('cfg.openProfile')}
                  onClick={() => window.api.openExternal(`https://steamcommunity.com/profiles/${id}`)}
                />
              )}
              <Button variant="ghost" icon={Trash2} title={t('cfg.remove')} onClick={() => onChange(ids.filter((m) => m !== id))} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('cfg.noModerators')}</p>
      )}
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); add(); }}>
        <TextInput value={input} onChange={(value) => { setInput(value); setMessage(''); }} placeholder={t('cfg.addPlaceholder')} />
        <Button type="submit" icon={Plus} loading={adding} disabled={!input.trim()}>{t('cfg.add')}</Button>
      </form>
      {(message || error) && <p className="text-xs text-red-600 dark:text-red-400">{message || error}</p>}
    </div>
  );
}

/** Editor of server_config.sii of the dedicated server: values only, the rest of the file is kept. */
export default function ServerConfig({ id, g }) {
  const t = useT();
  const game = GAME[id];
  const [file, setFile] = useState(null); // { file, exists, values, moderators } as read from disk
  const [values, setValues] = useState({});
  const [moderators, setModerators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { ok, text }
  const [errors, setErrors] = useState({}); // field -> message

  const load = useCallback(async () => {
    setLoading(true);
    const result = await window.api.serverConfig.read(id);
    setLoading(false);
    setErrors({});
    if (!result.ok) {
      setFile(null);
      setNotice(result.error ? { ok: false, text: result.error } : null);
      return;
    }
    setFile(result);
    setValues(result.values || {});
    setModerators(result.moderators || []);
  }, [id]);

  useEffect(() => {
    setNotice(null);
    load();
  }, [load]);

  const dirty = useMemo(() => Boolean(file && file.exists) && (
    JSON.stringify(values) !== JSON.stringify(file.values) || JSON.stringify(moderators) !== JSON.stringify(file.moderators)
  ), [file, values, moderators]);

  const set = (key) => (value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setNotice(null);
  };

  const errorText = (error) => t(`cfg.err.${error.rule}`, error.params || {});

  const save = async (restart) => {
    setSaving(true);
    const result = await window.api.serverConfig.write(id, values, moderators.map((m) => m.trim()), restart);
    setSaving(false);
    if (result.errors) {
      setErrors(Object.fromEntries(result.errors.map((e) => [e.field, errorText(e)])));
      setNotice({ ok: false, text: t('cfg.fixErrors') });
      // show the first wrong field (the form is longer than the window)
      requestAnimationFrame(() => document.querySelector('main label .text-red-600')?.closest('label')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      return;
    }
    if (!result.ok) {
      setNotice({ ok: false, text: result.error });
      return;
    }
    setFile((prev) => ({ ...prev, values, moderators: moderators.map((m) => m.trim()) }));
    setModerators((prev) => prev.map((m) => m.trim()));
    setNotice({ ok: true, text: t(restart ? 'cfg.savedRestart' : 'cfg.saved') });
  };

  if (loading && !file) {
    return <div className="flex flex-1 items-center justify-center py-16 text-slate-400"><Loader2 className="size-5 animate-spin" /></div>;
  }

  if (!file || !file.exists) {
    return (
      <div className="pb-8">
        <Card>
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-3 rounded-full bg-amber-50 p-3 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertCircle className="size-6" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('cfg.missingTitle')}</h2>
            {notice && !notice.ok && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{notice.text}</p>}
            <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
              <Trans
                k="cfg.missingText"
                params={{ file: <code className="selectable break-all">{file?.file || g.details.configFile}</code>, game: game.name }}
                tags={{ code: (content) => <code className="rounded bg-slate-100 px-1 font-mono dark:bg-slate-800">{content}</code> }}
              />
            </p>
            <Button icon={RotateCw} className="mt-5" onClick={load}>{t('cfg.reload')}</Button>
          </div>
        </Card>
      </div>
    );
  }

  const v = values;
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 pb-6">
        <Card title={t('cfg.session')} icon={Users}>
          <div className="grid grid-cols-2 gap-4">
            {TEXTS.map(([key, max]) => (
              <div key={key} className={key === 'lobby_name' ? 'col-span-2' : key === 'welcome_message' ? 'col-span-2' : ''}>
                <CountedInput label={t(`cfg.${key}`)} value={v[key]} max={max} onChange={set(key)} error={errors[key]} />
              </div>
            ))}
            <Field label={t('cfg.password')} hint={t('cfg.passwordHint')} error={errors.password}>
              <SecretInput value={v.password} onChange={set('password')} />
            </Field>
            <Field label={t('cfg.max_players')} hint={t('cfg.maxPlayersHint')} error={errors.max_players}>
              <NumberInput value={v.max_players} onChange={set('max_players')} max={8} />
            </Field>
          </div>
        </Card>

        <Card title={t('cfg.steam')} icon={KeyRound} description={t('cfg.steamDescription', { game: game.name, appId: game.steamAppId })}>
          <Field label={t('cfg.server_logon_token')} error={errors.server_logon_token}>
            <SecretInput
              value={v.server_logon_token}
              onChange={(value) => set('server_logon_token')(value.trim())}
              extra={() => <Button icon={ExternalLink} onClick={() => window.api.openExternal(TOKEN_URL)}>{t('cfg.tokenPage')}</Button>}
            />
          </Field>
        </Card>

        <Card title={t('cfg.gameplay')} icon={Gamepad2}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {TOGGLES.map((key) => (
              <Toggle key={key} checked={Boolean(v[key])} onChange={set(key)} label={t(`cfg.${key}`)} description={t(`cfg.${key}.hint`)} />
            ))}
            <Field label={t('cfg.timezones')} hint={t('cfg.timezonesHint')} error={errors.timezones}>
              <NumberInput value={v.timezones} onChange={set('timezones')} max={2} />
            </Field>
          </div>
        </Card>

        <Card title={t('cfg.ai')} icon={Truck}>
          <div className="grid grid-cols-3 gap-4">
            {AI.map((key) => (
              <Field key={key} label={t(`cfg.${key}`)} error={errors[key]}>
                <NumberInput value={v[key]} onChange={set(key)} />
              </Field>
            ))}
          </div>
        </Card>

        <Card title={t('cfg.ports')} icon={Network} description={t('cfg.portsDescription')}>
          <div className="grid grid-cols-2 gap-4">
            {PORTS.map((key) => (
              <Field key={key} label={t(`cfg.${key}`)} error={errors[key]}>
                <NumberInput value={v[key]} onChange={set(key)} max={65535} />
              </Field>
            ))}
          </div>
        </Card>

        <Card title={t('cfg.moderators')} icon={Shield} description={t('cfg.moderatorsDescription')}>
          <Moderators ids={moderators} onChange={(next) => { setModerators(next); setNotice(null); }} error={errors.moderator_list} />
        </Card>
      </div>

      {/* stays at the bottom of the window while the form scrolls, like the footer of Settings */}
      <footer className="sticky bottom-0 -mx-8 border-t border-slate-200 bg-white/90 px-8 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center gap-3">
          <span className="selectable min-w-0 flex-1 truncate font-mono text-xs text-slate-500 dark:text-slate-400" title={file.file}>{file.file}</span>
          <Button variant="ghost" icon={FileText} onClick={() => window.api.serverConfig.open(id)} className="py-1 text-xs">{t('console.openFile')}</Button>
          <Button variant="ghost" icon={RotateCw} onClick={load} disabled={saving} className="py-1 text-xs">{t('cfg.reload')}</Button>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          {notice ? (
            <span className={`flex items-center gap-1.5 text-xs ${notice.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {notice.ok ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
              {notice.text}
            </span>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">{dirty ? t('settings.unsaved') : t('cfg.applyHint')}</span>
          )}
          <Button icon={Save} loading={saving} disabled={!dirty} onClick={() => save(false)}>{t('cfg.save')}</Button>
          <Button variant="primary" icon={RotateCw} loading={saving} disabled={!dirty || g.busy} onClick={() => save(true)}>{t('cfg.saveRestart')}</Button>
        </div>
      </footer>
    </div>
  );
}
