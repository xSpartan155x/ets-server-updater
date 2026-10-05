import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, Link as RouterLink } from 'react-router'
import { Download, Languages, Menu, Monitor, Moon, Sun, X } from 'lucide-react'
import { NAV, REPO_URL, RELEASES_URL, ISSUES_URL, AUTHOR, AUTHOR_URL } from '../lib/site.js'
import { pageMeta } from '../lib/meta.js'
import { Link, NavLink, localize, rememberLang, storedLang, stripLang, useLang, useT } from '../lib/i18n.jsx'
import { useTheme } from '../lib/theme.jsx'
import { Container, GithubIcon } from './ui.jsx'

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const lang = useLang()

  // Braces matter: an effect must not return scrollTo's result (a Promise in recent Chrome) as its cleanup
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    const meta = pageMeta(stripLang(pathname), lang)
    document.documentElement.lang = lang
    document.title = meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)
  }, [pathname, lang])

  // First visit to the Italian home from a non-Italian browser: English
  useEffect(() => {
    if (pathname === '/' && !storedLang() && !navigator.language?.toLowerCase().startsWith('it')) {
      navigate('/en', { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" className="h-8 w-8" />
      <span className="font-bold text-slate-900 dark:text-white">
        ETS2 <span className="text-orange-500">Package Sync</span>
      </span>
    </Link>
  )
}

const navClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'text-orange-600 dark:text-orange-400'
      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
  }`

const iconButton = 'rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'

function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const lang = useLang()
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-950/80">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <div className="hidden items-center lg:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navClass}>
              {item[lang]}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitch />
          <ThemeToggle />
          <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub" className={iconButton}>
            <GithubIcon className="h-5 w-5" />
          </a>
          <Link
            to="/download"
            className="ml-1 hidden items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 sm:inline-flex"
          >
            <Download className="h-4 w-4" /> Download
          </Link>
          <button onClick={() => setOpen(!open)} aria-label="Menu" className={`${iconButton} lg:hidden`}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>
      {open && (
        <Container className="flex flex-col pb-4 lg:hidden">
          {[...NAV, { to: '/download', it: 'Download', en: 'Download' }].map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navClass}>
              {item[lang]}
            </NavLink>
          ))}
        </Container>
      )}
    </nav>
  )
}

/** Same page in the other language. */
function LanguageSwitch() {
  const { pathname } = useLocation()
  const lang = useLang()
  const other = lang === 'it' ? 'en' : 'it'
  return (
    <RouterLink
      to={localize(stripLang(pathname), other)}
      onClick={() => rememberLang(other)}
      title={other === 'en' ? 'English' : 'Italiano'}
      className={`${iconButton} flex items-center gap-1 text-xs font-semibold uppercase`}
    >
      <Languages className="h-4 w-4" />
      {other}
    </RouterLink>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useT()
  const order = ['system', 'light', 'dark']
  const icons = { system: Monitor, light: Sun, dark: Moon }
  const labels = {
    system: t('Tema: sistema', 'Theme: system'),
    light: t('Tema: chiaro', 'Theme: light'),
    dark: t('Tema: scuro', 'Theme: dark'),
  }
  const Icon = icons[theme]
  return (
    <button
      onClick={() => setTheme(order[(order.indexOf(theme) + 1) % order.length])}
      title={labels[theme]}
      aria-label={labels[theme]}
      className={iconButton}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

function Footer() {
  const t = useT()
  const columns = [
    {
      title: t('Prodotto', 'Product'),
      links: [
        { to: '/features', label: t('Funzionalità', 'Features') },
        { to: '/how-it-works', label: t('Come funziona', 'How it works') },
        { to: '/download', label: 'Download' },
        { to: '/changelog', label: 'Changelog' },
      ],
    },
    {
      title: t('Supporto', 'Support'),
      links: [
        { to: '/guide', label: t('Guida', 'Guide') },
        { to: '/faq', label: 'FAQ' },
        { href: ISSUES_URL, label: t('Segnala un problema', 'Report an issue') },
      ],
    },
    {
      title: t('Progetto', 'Project'),
      links: [
        { to: '/about', label: 'About' },
        { href: REPO_URL, label: t('Codice sorgente', 'Source code') },
        { href: RELEASES_URL, label: t('Release su GitHub', 'GitHub releases') },
      ],
    },
  ]
  const linkClass = 'text-slate-500 hover:text-orange-600 dark:hover:text-orange-400'
  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
            {t(
              'Sincronizza i pacchetti dei server dedicati di Euro Truck Simulator 2 e American Truck Simulator tramite GitHub.',
              'Syncs the packages of Euro Truck Simulator 2 and American Truck Simulator dedicated servers through GitHub.',
            )}
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link to={l.to} className={linkClass}>{l.label}</Link>
                  ) : (
                    <a href={l.href} target="_blank" rel="noreferrer" className={linkClass}>{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <Container className="flex flex-col gap-2 border-t border-slate-200 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between dark:border-slate-800">
        <p>
          © {new Date().getFullYear()}{' '}
          <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className="hover:text-orange-500">{AUTHOR}</a>
          {' · '}
          {t('Licenza MIT', 'MIT License')}
        </p>
        <p>{t('Progetto non ufficiale, non affiliato a SCS Software o Valve.', 'Unofficial project, not affiliated with SCS Software or Valve.')}</p>
      </Container>
    </footer>
  )
}
