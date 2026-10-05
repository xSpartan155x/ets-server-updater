import { Link } from '../lib/i18n.jsx'

export function Container({ className = '', children }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>
}

export function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
      <Glow />
      <Container className="relative py-16 sm:py-20">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          {title}
        </h1>
        {children && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">{children}</p>}
      </Container>
    </header>
  )
}

export function Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
      <div className="absolute -top-40 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-orange-500/15 blur-3xl dark:bg-orange-500/10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(148_163_184/0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184/0.08)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
    </div>
  )
}

export function Eyebrow({ children }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-orange-700 uppercase dark:text-orange-300">
      {children}
    </p>
  )
}

export function SectionTitle({ eyebrow, title, children, center }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{title}</h2>
      {children && <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400">{children}</p>}
    </div>
  )
}

const buttonStyles = {
  primary: 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600',
  secondary:
    'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800',
  ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
}

export function Button({ to, href, variant = 'primary', className = '', children, ...rest }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${buttonStyles[variant]} ${className}`
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>
  return (
    <a href={href} className={cls} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer" {...rest}>
      {children}
    </a>
  )
}

export function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60 ${className}`}>
      {children}
    </div>
  )
}

export function IconBadge({ icon: Icon, className = '' }) {
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20 dark:text-orange-400 ${className}`}>
      <Icon className="h-5 w-5" />
    </div>
  )
}

export function FeatureCard({ icon, title, children }) {
  return (
    <Card className="transition hover:-translate-y-0.5 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/5">
      <IconBadge icon={icon} />
      <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{children}</p>
    </Card>
  )
}

export function Code({ children }) {
  return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800 dark:bg-slate-800 dark:text-slate-200">{children}</code>
}

export function CodeBlock({ children }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm leading-relaxed text-slate-200">
      {children}
    </pre>
  )
}

export function Callout({ icon: Icon, title, children, tone = 'orange' }) {
  const tones = {
    orange: 'border-orange-500/30 bg-orange-500/5 text-orange-700 dark:text-orange-300',
    sky: 'border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300',
  }
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${tones[tone]}`}>
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {title && <p className={`mb-1 font-semibold ${tones[tone].split(' ').slice(2).join(' ')}`}>{title}</p>}
        {children}
      </div>
    </div>
  )
}

export function GithubIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  )
}
