import { ArrowRight, Download, GitBranch, Languages, Package, RotateCcw, Server, ShieldCheck, Terminal, Webhook, Zap } from 'lucide-react'
import { Button, Card, Container, Eyebrow, FeatureCard, Glow, SectionTitle, GithubIcon } from '../components/ui.jsx'
import Screenshot from '../components/Screenshot.jsx'
import FlowDiagram from '../components/FlowDiagram.jsx'
import { REPO_URL } from '../lib/site.js'
import { Link, useT } from '../lib/i18n.jsx'
import { useReleases, version } from '../lib/github.js'
import ets2 from '../assets/ets2.png'
import ats from '../assets/ats.png'

export default function Home() {
  const t = useT()
  const { releases } = useReleases()
  const latest = releases[0]
  const cmd = <code className="font-mono text-orange-600 dark:text-orange-400">export_server_packages</code>

  const features = [
    [GitBranch, t('Push automatico', 'Automatic push'), t(
      'Il Client osserva la cartella del gioco: appena esporti, clona la repository in una cartella temporanea, fa commit e push e la elimina.',
      'The Client watches the game folder: as soon as you export, it clones the repository into a temporary folder, commits, pushes and deletes it.',
    )],
    [Webhook, t('Polling o webhook', 'Polling or webhook'), t(
      "Il Server controlla GitHub ogni pochi minuti senza aprire porte, oppure riceve il webhook e si aggiorna all'istante.",
      'The Server checks GitHub every few minutes with no open ports, or receives the webhook and updates instantly.',
    )],
    [ShieldCheck, t('Download verificati', 'Verified downloads'), t(
      'I file vengono scaricati al commit preciso e controllati per dimensione e hash git prima di fermare il server.',
      'Files are downloaded at the exact commit and checked for size and git hash before the server is stopped.',
    )],
    [RotateCcw, t('Backup e rollback', 'Backup and rollback'), t(
      'Ogni aggiornamento salva i file precedenti. Se il server non parte con i nuovi pacchetti, torna da solo a quelli di prima.',
      "Every update saves the previous files. If the server won't start with the new packages, it rolls back by itself.",
    )],
    [Package, t('SteamCMD integrato', 'Built-in SteamCMD'), t(
      'Quando SCS rilascia una nuova build, il server dedicato viene aggiornato con SteamCMD, scaricato in automatico.',
      'When SCS ships a new build, the dedicated server is updated with SteamCMD, downloaded automatically.',
    )],
    [Languages, t('Italiano e inglese', 'English and Italian'), t(
      "Tutto si imposta dalla finestra dell'app, con guida passo passo, tema chiaro o scuro e aggiornamenti automatici.",
      'Everything is set up from the app window, with a step-by-step guide, light or dark theme and automatic updates.',
    )],
  ]

  return (
    <>
      <section className="relative overflow-hidden">
        <Glow />
        <Container className="relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Link to="/changelog">
              <Eyebrow>
                <Zap className="h-3.5 w-3.5" />
                {latest
                  ? t(`Versione ${version(latest)} disponibile`, `Version ${version(latest)} is out`)
                  : t('App Windows gratuita e open source', 'Free and open source Windows app')}
              </Eyebrow>
            </Link>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
              {t('La mod list del tuo server, ', 'Your server mod list, ')}
              <span className="text-orange-500">{t('sempre aggiornata.', 'always up to date.')}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              {t(
                <>Esporti i pacchetti in gioco con {cmd}: ETS2 Package Sync li pubblica su GitHub e il server dedicato si aggiorna e si riavvia da solo. Per Euro Truck Simulator 2 e American Truck Simulator.</>,
                <>Export the packages in game with {cmd}: ETS2 Package Sync publishes them to GitHub and the dedicated server updates and restarts by itself. For Euro Truck Simulator 2 and American Truck Simulator.</>,
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/download">
                <Download className="h-4 w-4" /> {t('Scarica per Windows', 'Download for Windows')}
              </Button>
              <Button href={REPO_URL} variant="secondary">
                <GithubIcon className="h-4 w-4" /> {t('Vedi su GitHub', 'View on GitHub')}
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm text-slate-500">
              <div className="flex -space-x-2">
                <img src={ets2} alt="Euro Truck Simulator 2" className="h-9 w-9 rounded-full bg-white ring-2 ring-white dark:ring-slate-950" />
                <img src={ats} alt="American Truck Simulator" className="h-9 w-9 rounded-full bg-white ring-2 ring-white dark:ring-slate-950" />
              </div>
              {t('ETS2 e ATS, anche insieme sullo stesso PC', 'ETS2 and ATS, even together on the same PC')}
            </div>
          </div>
          <Screenshot name="server-dashboard" alt={t('Dashboard della modalità Server', 'Server mode dashboard')} className="lg:translate-x-6" />
        </Container>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-10 dark:border-slate-800 dark:bg-slate-900/40">
        <Container className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
          {[
            ['0', t('file di configurazione a mano', 'config files to edit by hand')],
            ['2', t('giochi supportati, insieme', 'supported games, together')],
            [t('1 clic', '1 click'), t('per aggiornare il server', 'to update the server')],
            ['MIT', t('licenza open source', 'open source license')],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container>
          <SectionTitle center eyebrow={t('Il flusso', 'The flow')} title={t('Dal gioco al server, senza toccare un file', 'From the game to the server, without touching a file')}>
            {t(
              "Un'unica app nel tray che fa da Client sul tuo PC e da Server sulla macchina del dedicato. In mezzo c'è una repository GitHub.",
              "One tray app that acts as Client on your PC and as Server on the dedicated machine. In between there's a GitHub repository.",
            )}
          </SectionTitle>
          <div className="mt-14">
            <FlowDiagram />
          </div>
          <div className="mt-10 text-center">
            <Link to="/how-it-works" className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:gap-2.5 dark:text-orange-400">
              {t('Scopri come funziona nel dettaglio', 'See how it works in detail')} <ArrowRight className="h-4 w-4 transition-all" />
            </Link>
          </div>
        </Container>
      </section>

      <section className="bg-slate-50 py-20 sm:py-28 dark:bg-slate-900/30">
        <Container>
          <SectionTitle
            eyebrow={t('Funzionalità', 'Features')}
            title={t('Pensata per chi gestisce un server, non per chi scrive script', 'Built for server admins, not for script writers')}
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([icon, title, text]) => (
              <FeatureCard key={title} icon={icon} title={title}>{text}</FeatureCard>
            ))}
          </div>
          <div className="mt-10">
            <Button to="/features" variant="secondary">
              {t('Tutte le funzionalità', 'All features')} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle
              eyebrow={t('Due ruoli, una sola app', 'Two roles, one app')}
              title={t('Client sul tuo PC, Server sul dedicato', 'Client on your PC, Server on the dedicated box')}
            >
              {t(
                'Per ogni gioco scegli cosa deve fare quel PC. ETS2 e ATS hanno modalità, repository e stato separati.',
                'For each game you choose what that PC does. ETS2 and ATS have separate modes, repositories and status.',
              )}
            </SectionTitle>
            <div className="mt-8 space-y-4">
              <Card className="flex gap-4">
                <Terminal className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Client</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {t(
                      <>Controlla <code className="font-mono text-xs">Documenti\Euro Truck Simulator 2</code> e pusha solo i due file dei pacchetti, solo quando cambiano.</>,
                      <>Watches <code className="font-mono text-xs">Documents\Euro Truck Simulator 2</code> and pushes only the two package files, only when they change.</>,
                    )}
                  </p>
                </div>
              </Card>
              <Card className="flex gap-4">
                <Server className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Server</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {t(
                      <>Gestisce più server dedicati: console in tempo reale, <code className="font-mono text-xs">server_config.sii</code> modificabile, avvio, arresto e riavvio dal tray.</>,
                      <>Manages multiple dedicated servers: live console, editable <code className="font-mono text-xs">server_config.sii</code>, start, stop and restart from the tray.</>,
                    )}
                  </p>
                </div>
              </Card>
            </div>
          </div>
          <Screenshot name="server-console" alt={t('Console del server dedicato', 'Dedicated server console')} />
        </Container>
      </section>

      <section className="pb-20 sm:pb-28">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-14 text-center sm:px-16">
            <div aria-hidden className="absolute -top-24 left-1/2 h-64 w-160 -translate-x-1/2 rounded-full bg-orange-500/30 blur-3xl" />
            <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t('Pronto a smettere di copiare file a mano?', 'Ready to stop copying files by hand?')}
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-slate-300">
              {t(
                "Installa l'app su ogni PC, scegli il ruolo e collega la repository. Al resto ci pensa lei.",
                'Install the app on every PC, pick the role and connect the repository. It takes care of the rest.',
              )}
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Button to="/download">
                <Download className="h-4 w-4" /> Download
              </Button>
              <Button to="/guide" variant="secondary">
                {t('Leggi la guida', 'Read the guide')}
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
