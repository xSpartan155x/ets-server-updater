import { useState } from 'react';
import { Check, Copy, Eye, EyeOff, FolderOpen, Globe, Loader2 } from 'lucide-react';

export const STATE_STYLES = {
  ok: {
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-100 dark:ring-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    soft: 'bg-emerald-50 dark:bg-emerald-500/15',
  },
  busy: {
    dot: 'bg-blue-500',
    ring: 'ring-blue-100 dark:ring-blue-500/10',
    text: 'text-blue-700 dark:text-blue-400',
    soft: 'bg-blue-50 dark:bg-blue-500/15',
  },
  error: {
    dot: 'bg-red-500',
    ring: 'ring-red-100 dark:ring-red-500/10',
    text: 'text-red-700 dark:text-red-400',
    soft: 'bg-red-50 dark:bg-red-500/15',
  },
  idle: {
    dot: 'bg-slate-400',
    ring: 'ring-slate-100 dark:ring-slate-500/10',
    text: 'text-slate-600 dark:text-slate-400',
    soft: 'bg-slate-100 dark:bg-slate-500/15',
  },
};

export function StatusDot({ state, className = '' }) {
  const s = STATE_STYLES[state] || STATE_STYLES.idle;
  return (
    <span className={`relative inline-flex size-2.5 ${className}`}>
      {state === 'busy' && <span className={`absolute inset-0 animate-ping rounded-full ${s.dot} opacity-60`} />}
      <span className={`relative inline-flex size-2.5 rounded-full ${s.dot}`} />
    </span>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-end justify-between gap-4 px-8 pt-8 pb-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function Card({ title, description, icon: Icon, actions, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            {Icon && (
              <div className="mt-0.5 rounded-lg bg-orange-50 p-2 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                <Icon className="size-4" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
              {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-orange-600 text-white shadow-sm hover:bg-orange-700 disabled:bg-orange-300 dark:bg-orange-500 dark:hover:bg-orange-600 dark:disabled:bg-orange-900 dark:disabled:text-orange-300/60',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:disabled:text-slate-600',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300 dark:text-slate-300 dark:hover:bg-slate-800 dark:disabled:text-slate-600',
};

export function Button({ variant = 'secondary', icon: Icon, loading, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon && <Icon className="size-4" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}

const INPUT = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600 dark:shadow-none';

export function TextInput({ value, onChange, className = '', ...props }) {
  return <input className={`${INPUT} ${className}`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...props} />;
}

export function NumberInput({ value, onChange, ...props }) {
  return (
    <input
      type="number"
      min={0}
      className={`${INPUT} max-w-36`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      {...props}
    />
  );
}

export function PathInput({ value, onChange, kind, placeholder }) {
  const browse = async () => {
    const picked = await window.api.browse(kind, value);
    if (picked) onChange(picked);
  };
  return (
    <div className="flex gap-2">
      <TextInput value={value} onChange={onChange} placeholder={placeholder} className="font-mono text-xs" />
      <Button icon={FolderOpen} onClick={browse}>Browse</Button>
    </div>
  );
}

export function SecretInput({ value, onChange, placeholder, extra }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex gap-2">
      <div className="relative w-full">
        <TextInput
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="pr-10 font-mono text-xs"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setShown(!shown)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          title={shown ? 'Hide' : 'Show'}
        >
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {extra && extra(() => setShown(true))}
    </div>
  );
}

export function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1 pr-1 pl-3 dark:border-slate-800 dark:bg-slate-950">
      <code className="selectable flex-1 truncate font-mono text-xs text-slate-700 dark:text-slate-300">{value}</code>
      <Button variant="ghost" icon={copied ? Check : Copy} onClick={copy} className="px-2 py-1">
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
        {description && <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-orange-600 dark:bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

let cachedPublicIp = null; // survives page switches

export function WebhookUrl({ port, localIps = [] }) {
  const [ip, setIp] = useState(cachedPublicIp);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const detect = async () => {
    setLoading(true);
    const found = await window.api.publicIp();
    setLoading(false);
    setFailed(!found);
    if (found) {
      cachedPublicIp = found;
      setIp(found);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <CopyField value={`http://${ip || 'YOUR_PUBLIC_IP'}:${port || 8787}/github-webhook`} />
        </div>
        <Button icon={Globe} loading={loading} onClick={detect}>Detect public IP</Button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        GitHub must reach this PC from the internet: use its public IP or a DNS name, and forward TCP port {port || 8787} on
        the router to this PC{localIps.length > 0 && <> (LAN IP: <span className="selectable font-mono">{localIps.join(', ')}</span>)</>}.
        {failed && <span className="text-red-600 dark:text-red-400"> Could not detect the public IP.</span>}
      </p>
    </div>
  );
}
