import {
  Activity,
  Bell,
  Download,
  FileCog,
  FolderSync,
  GitBranch,
  HardDrive,
  Languages,
  Layers,
  Lock,
  Package,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Timer,
  Upload,
  Users,
  Webhook,
} from 'lucide-react'
import { Button, Container, FeatureCard, PageHeader, SectionTitle } from '../components/ui.jsx'
import Screenshot from '../components/Screenshot.jsx'
import { useT } from '../lib/i18n.jsx'

export default function Features() {
  const t = useT()

  const groups = [
    {
      eyebrow: t('Modalità Client', 'Client mode'),
      title: t('Esporti in gioco, il resto è automatico', 'Export in game, the rest is automatic'),
      text: t(
        'Il Client vive nel tray e osserva la cartella documenti del gioco. Niente cloni da gestire, niente conflitti.',
        'The Client lives in the tray and watches the game documents folder. No clones to manage, no conflicts.',
      ),
      shot: 'client-dashboard',
      features: [
        [FolderSync, t('Watch della cartella', 'Folder watch'), t(
          'Considera solo server_packages.sii e .dat: profili, game.log.txt e il resto vengono ignorati.',
          'Only server_packages.sii and .dat count: profiles, game.log.txt and everything else are ignored.',
        )],
        [GitBranch, t('Clone pulito ogni volta', 'Clean clone every time'), t(
          'A ogni sincronizzazione la repository viene clonata da zero in una cartella temporanea ed eliminata subito dopo.',
          'On every sync the repository is cloned from scratch into a temporary folder and deleted right after.',
        )],
        [Timer, t('Modifiche raggruppate', 'Batched changes'), t(
          'Si procede solo quando i file hanno smesso di cambiare. File identici a quelli su GitHub: nessun commit.',
          'It only proceeds once the files stop changing. Files identical to GitHub: no commit.',
        )],
        [RefreshCw, t('Retry senza perdite', 'Lossless retry'), t(
          'Se qualcun altro ha pushato nel frattempo, riclona e riprova fino a 3 volte senza sovrascrivere i commit degli altri.',
          'If someone else pushed meanwhile, it re-clones and retries up to 3 times without overwriting their commits.',
        )],
        [Upload, t('Più server di destinazione', 'Multiple target servers'), t(
          'Un export può andare a più server, ognuno con la sua repository GitHub.',
          'One export can go to several servers, each with its own GitHub repository.',
        )],
        [Lock, t("Nessun token nell'app", 'No tokens in the app'), t(
          'Il push usa Git Credential Manager: le credenziali restano salvate in Windows.',
          'Pushing uses Git Credential Manager: credentials stay stored in Windows.',
        )],
      ],
    },
    {
      eyebrow: t('Modalità Server', 'Server mode'),
      title: t('Aggiornamenti sicuri, downtime minimo', 'Safe updates, minimal downtime'),
      text: t(
        'Il Server scopre i nuovi commit, scarica i file, li verifica e li installa riavviando il dedicato solo quando serve.',
        'The Server discovers new commits, downloads and verifies the files and installs them, restarting the dedicated server only when needed.',
      ),
      shot: 'server-sync',
      features: [
        [Webhook, t('Polling o webhook', 'Polling or webhook'), t(
          'Controllo periodico (predefinito, nessuna porta da aprire) o webhook GitHub firmato HMAC per aggiornamenti immediati.',
          'Periodic check (default, no ports to open) or HMAC-signed GitHub webhook for instant updates.',
        )],
        [ShieldCheck, t('Verifica prima dello stop', 'Verified before stopping'), t(
          'Download al commit preciso, controllo di dimensione e hash git. I nuovi file sono pronti prima di fermare il server.',
          'Download at the exact commit, size and git hash check. New files are ready before the server stops.',
        )],
        [RotateCcw, t('Backup e ripristino', 'Backup and restore'), t(
          'Backup in backups\\<data>_<commit>. Se il server non resta attivo, ripristino automatico dei file precedenti.',
          "Backup in backups\\<date>_<commit>. If the server doesn't stay up, the previous files are restored automatically.",
        )],
        [Package, t('SteamCMD integrato', 'Built-in SteamCMD'), t(
          'Nuova build del gioco? Il server dedicato viene aggiornato da solo, con fase e avanzamento visibili.',
          'New game build? The dedicated server updates by itself, with visible phase and progress.',
        )],
        [Terminal, t('Console in tempo reale', 'Live console'), t(
          'Il log del server dedicato in diretta, con filtro testo e "Nascondi warning".',
          'The dedicated server log live, with text filter and "Hide warnings".',
        )],
        [FileCog, t('Editor di server_config.sii', 'server_config.sii editor'), t(
          'Sessione, password, giocatori, porte, token Steam e moderatori con nome e avatar Steam. Commenti e formattazione restano intatti.',
          'Session, password, players, ports, Steam token and moderators with Steam name and avatar. Comments and formatting stay intact.',
        )],
      ],
    },
  ]

  const general = [
    [Layers, t('ETS2 e ATS insieme', 'ETS2 and ATS together'), t(
      'Ogni gioco ha modalità, repository, metodo di aggiornamento e stato separati.',
      'Each game has its own mode, repository, update method and status.',
    )],
    [Activity, t('Stato nel tray', 'Tray status'), t(
      'Pallino verde, blu, rosso o grigio. Menu con Push ora, Aggiorna ora, Avvia / Ferma / Riavvia.',
      'Green, blue, red or grey dot. Menu with Push now, Update now, Start / Stop / Restart.',
    )],
    [Lock, t('Secret cifrati', 'Encrypted secrets'), t(
      'Webhook secret e token GitHub sono cifrati con Windows DPAPI: solo il tuo utente può leggerli.',
      'Webhook secret and GitHub token are encrypted with Windows DPAPI: only your user can read them.',
    )],
    [Download, t('Aggiornamenti automatici', 'Automatic updates'), t(
      "L'app si aggiorna dalle release di GitHub, mai durante un aggiornamento del server.",
      'The app updates itself from GitHub releases, never during a server update.',
    )],
    [Users, t('Esporta / Importa', 'Export / Import'), t(
      'Copia le impostazioni su un altro PC con un file .json, con o senza i secret.',
      'Copy settings to another PC with a .json file, with or without secrets.',
    )],
    [Languages, t('Italiano e inglese', 'English and Italian'), t(
      'Interfaccia e guida integrata in due lingue, tema chiaro, scuro o di sistema.',
      'Interface and built-in guide in two languages, light, dark or system theme.',
    )],
    [Bell, t('Notifiche', 'Notifications'), t(
      'Un aggiornamento fallito viene notificato una volta sola, senza spam.',
      'A failed update is notified only once, no spam.',
    )],
    [HardDrive, t('Log con rotazione', 'Rotating logs'), t(
      'Log in tempo reale con filtri, e file su disco con rotazione automatica a 1 MB.',
      'Live log with filters, and an on-disk file rotated automatically at 1 MB.',
    )],
  ]

  return (
    <>
      <PageHeader
        eyebrow={t('Funzionalità', 'Features')}
        title={t('Tutto quello che serve per tenere allineato un server dedicato', 'Everything you need to keep a dedicated server in sync')}
      >
        {t('Una sola app Windows, due ruoli, due giochi. Ecco cosa fa nel dettaglio.', 'One Windows app, two roles, two games. Here is what it does in detail.')}
      </PageHeader>

      {groups.map((g, i) => (
        <section key={g.shot} className={`py-20 ${i % 2 ? 'bg-slate-50 dark:bg-slate-900/30' : ''}`}>
          <Container>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className={i % 2 ? 'lg:order-2' : ''}>
                <SectionTitle eyebrow={g.eyebrow} title={g.title}>{g.text}</SectionTitle>
              </div>
              <Screenshot name={g.shot} alt={g.eyebrow} />
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.features.map(([icon, title, text]) => (
                <FeatureCard key={title} icon={icon} title={title}>{text}</FeatureCard>
              ))}
            </div>
          </Container>
        </section>
      ))}

      <section className="py-20">
        <Container>
          <SectionTitle center eyebrow={t('Per entrambe le modalità', 'For both modes')} title={t('I dettagli che fanno la differenza', 'The details that make the difference')} />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {general.map(([icon, title, text]) => (
              <FeatureCard key={title} icon={icon} title={title}>{text}</FeatureCard>
            ))}
          </div>
          <div className="mt-12 flex justify-center gap-3">
            <Button to="/download">{t("Scarica l'app", 'Download the app')}</Button>
            <Button to="/how-it-works" variant="secondary">{t('Come funziona', 'How it works')}</Button>
          </div>
        </Container>
      </section>
    </>
  )
}
