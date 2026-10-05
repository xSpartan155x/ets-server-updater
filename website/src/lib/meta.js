// Titles and descriptions of every page, in both languages. Plain JS: also read by scripts/pages.mjs,
// which writes an index.html with these meta tags for each page at build time.

export const SITE_URL = 'https://xspartan155x.github.io/ets-server-updater'
export const SITE_NAME = 'ETS2 Package Sync'

export const GUIDE_SECTIONS = [
  { id: 'installation', it: 'Installazione', en: 'Installation' },
  { id: 'first-run', it: 'Primo avvio', en: 'First run' },
  { id: 'repository', it: 'Repository GitHub', en: 'GitHub repository' },
  { id: 'client', it: 'Modalità Client', en: 'Client mode' },
  { id: 'server', it: 'Modalità Server', en: 'Server mode' },
  { id: 'steamcmd', it: 'SteamCMD', en: 'SteamCMD' },
  { id: 'webhook', it: 'Webhook e rete', en: 'Webhook and network' },
  { id: 'data', it: 'Dati e impostazioni', en: 'Data and settings' },
]

export const PAGES = {
  '/': {
    it: {
      title: 'ETS2 Package Sync · La mod list del tuo server, sempre aggiornata',
      description:
        'Esporti i pacchetti in gioco, il server dedicato di Euro Truck Simulator 2 e American Truck Simulator si aggiorna da solo tramite GitHub. Gratis e open source per Windows.',
    },
    en: {
      title: 'ETS2 Package Sync · Your server mod list, always up to date',
      description:
        'Export the packages in game and your Euro Truck Simulator 2 and American Truck Simulator dedicated server updates itself through GitHub. Free and open source for Windows.',
    },
  },
  '/features': {
    it: {
      title: 'Funzionalità · ETS2 Package Sync',
      description:
        'Push automatico, polling o webhook, download verificati, backup e rollback, SteamCMD integrato, console in tempo reale ed editor di server_config.sii.',
    },
    en: {
      title: 'Features · ETS2 Package Sync',
      description:
        'Automatic push, polling or webhook, verified downloads, backup and rollback, built-in SteamCMD, live console and server_config.sii editor.',
    },
  },
  '/how-it-works': {
    it: {
      title: 'Come funziona · ETS2 Package Sync',
      description:
        "Dal comando export_server_packages al server aggiornato: come il Client pubblica su GitHub e il Server verifica, fa il backup e installa i pacchetti.",
    },
    en: {
      title: 'How it works · ETS2 Package Sync',
      description:
        'From the export_server_packages command to an updated server: how the Client publishes to GitHub and the Server verifies, backs up and installs the packages.',
    },
  },
  '/guide': {
    it: {
      title: 'Guida · ETS2 Package Sync',
      description: 'Guida passo passo: installazione, primo avvio, repository GitHub, modalità Client e Server, SteamCMD, webhook e rete.',
    },
    en: {
      title: 'Guide · ETS2 Package Sync',
      description: 'Step-by-step guide: installation, first run, GitHub repository, Client and Server modes, SteamCMD, webhook and network.',
    },
  },
  '/download': {
    it: {
      title: 'Download · ETS2 Package Sync',
      description: "Scarica l'ultima versione di ETS2 Package Sync per Windows: installer con aggiornamento automatico o versione portable.",
    },
    en: {
      title: 'Download · ETS2 Package Sync',
      description: 'Download the latest ETS2 Package Sync for Windows: installer with automatic updates or portable version.',
    },
  },
  '/changelog': {
    it: { title: 'Changelog · ETS2 Package Sync', description: 'Le novità di ogni versione di ETS2 Package Sync, dalle release di GitHub.' },
    en: { title: 'Changelog · ETS2 Package Sync', description: "What's new in every ETS2 Package Sync version, from the GitHub releases." },
  },
  '/faq': {
    it: { title: 'FAQ · ETS2 Package Sync', description: 'Domande frequenti su ETS2 Package Sync: GitHub, porte, ETS2 e ATS insieme, sicurezza, aggiornamenti.' },
    en: { title: 'FAQ · ETS2 Package Sync', description: 'Frequently asked questions about ETS2 Package Sync: GitHub, ports, ETS2 and ATS together, security, updates.' },
  },
  '/about': {
    it: { title: 'About · ETS2 Package Sync', description: "La storia del progetto, le tecnologie e chi c'è dietro ETS2 Package Sync." },
    en: { title: 'About · ETS2 Package Sync', description: 'The story of the project, the technology and who is behind ETS2 Package Sync.' },
  },
}

/** Meta of a path without language prefix, e.g. "/guide/client". */
export function pageMeta(path, lang) {
  const section = path.match(/^\/guide\/([^/]+)$/)?.[1]
  if (section) {
    const s = GUIDE_SECTIONS.find((g) => g.id === section)
    const guide = PAGES['/guide'][lang]
    if (s) return { title: `${s[lang]} · ${guide.title}`, description: guide.description }
  }
  return (PAGES[path] ?? PAGES['/'])[lang]
}

/** Every path of the site without language prefix (used to write one HTML file per page). */
export const ALL_PATHS = [...Object.keys(PAGES), ...GUIDE_SECTIONS.map((s) => `/guide/${s.id}`)]
