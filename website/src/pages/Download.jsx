import { FileArchive, HardDriveDownload, Loader2, MonitorCheck, ShieldAlert } from 'lucide-react'
import { Button, Callout, Card, Container, IconBadge, PageHeader } from '../components/ui.jsx'
import { formatDate, formatSize, useReleases, version } from '../lib/github.js'
import { LATEST_URL, RELEASES_URL } from '../lib/site.js'
import { Link, useLang, useT } from '../lib/i18n.jsx'

export default function Download() {
  const t = useT()
  const lang = useLang()
  const { loading, error, releases } = useReleases()
  const latest = releases[0]
  const asset = (re) => latest?.assets.find((a) => re.test(a.name))
  const link = 'font-medium text-orange-600 hover:underline dark:text-orange-400'

  const options = [
    {
      icon: HardDriveDownload,
      title: 'Installer',
      badge: t('Consigliato', 'Recommended'),
      text: t(
        "Si installa per l'utente corrente, crea i collegamenti e si aggiorna da solo dalle release di GitHub.",
        'Installs for the current user, creates shortcuts and updates itself from GitHub releases.',
      ),
      cta: t("Scarica l'installer", 'Download installer'),
      file: asset(/Setup-.*\.exe$/),
    },
    {
      icon: FileArchive,
      title: 'Portable',
      text: t(
        'Uno zip da estrarre dove vuoi. Mostra le nuove versioni ma non si aggiorna in automatico.',
        "A zip to extract wherever you like. It shows new versions but doesn't update automatically.",
      ),
      cta: t('Scarica la portable', 'Download portable'),
      file: asset(/Portable-.*\.zip$/),
    },
  ]

  return (
    <>
      <PageHeader eyebrow="Download" title={t('Scarica ETS2 Package Sync', 'Download ETS2 Package Sync')}>
        {t(
          'Gratis e open source. Installa la stessa app su ogni PC: il ruolo (Client o Server) si sceglie nelle impostazioni.',
          'Free and open source. Install the same app on every PC: the role (Client or Server) is chosen in the settings.',
        )}
      </PageHeader>

      <section className="py-16">
        <Container>
          <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {loading && (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("Recupero l'ultima versione da GitHub…", 'Fetching the latest version from GitHub…')}
              </span>
            )}
            {latest && (
              <>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-400">
                  v{version(latest)}
                </span>
                <span>{t('pubblicata il', 'released on')} {formatDate(latest.published_at, lang)}</span>
                <Link to="/changelog" className={link}>{t('Novità →', "What's new →")}</Link>
              </>
            )}
            {error && <span>{t('Non riesco a leggere le release ora: usa i link diretti a GitHub qui sotto.', "Can't read the releases right now: use the direct GitHub links below.")}</span>}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {options.map((o) => (
              <Card key={o.title} className="flex flex-col">
                <div className="flex items-start justify-between">
                  <IconBadge icon={o.icon} />
                  {o.badge && <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-semibold text-white">{o.badge}</span>}
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{o.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{o.text}</p>
                {o.file && (
                  <p className="mt-4 truncate font-mono text-xs text-slate-500">
                    {o.file.name} · {formatSize(o.file.size)}
                  </p>
                )}
                <Button href={o.file?.browser_download_url ?? LATEST_URL} variant={o.badge ? 'primary' : 'secondary'} className="mt-5">
                  {o.file ? o.cta : t('Vai alla release su GitHub', 'Go to the GitHub release')}
                </Button>
              </Card>
            ))}
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <Callout icon={ShieldAlert} title={t("L'installer non è firmato", 'The installer is not signed')}>
              {t(
                <>Windows SmartScreen può mostrare <em>"Windows ha protetto il PC"</em>: clicca <strong>Ulteriori informazioni</strong> → <strong>Esegui comunque</strong>. Il codice è pubblico e le build sono create da GitHub Actions.</>,
                <>Windows SmartScreen may show <em>"Windows protected your PC"</em>: click <strong>More info</strong> → <strong>Run anyway</strong>. The code is public and builds are made by GitHub Actions.</>,
              )}
            </Callout>
            <Callout icon={MonitorCheck} title={t('Requisiti', 'Requirements')} tone="sky">
              {t('Windows 10 o 11 a 64 bit. Per la modalità Client serve ', 'Windows 10 or 11, 64-bit. Client mode needs ')}
              <a href="https://git-scm.com/download/win" target="_blank" rel="noreferrer" className="underline">Git for Windows</a>
              {t('; SteamCMD per il Server viene scaricato in automatico.', '; SteamCMD for the Server is downloaded automatically.')}
            </Callout>
          </div>

          <p className="mt-10 text-center text-sm text-slate-500">
            {t('Cerchi una versione precedente? Tutte le build sono su ', 'Looking for an older version? Every build is on ')}
            <a href={RELEASES_URL} target="_blank" rel="noreferrer" className={link}>GitHub Releases</a>
            {t('. Prossimo passo: la ', '. Next step: the ')}
            <Link to="/guide/first-run" className={link}>{t('guida al primo avvio', 'first run guide')}</Link>.
          </p>
        </Container>
      </section>
    </>
  )
}
