import { CircleCheck, Clock, TriangleAlert, Webhook } from 'lucide-react'
import { Callout, Card, CodeBlock, Container, PageHeader, SectionTitle, IconBadge } from '../components/ui.jsx'
import FlowDiagram from '../components/FlowDiagram.jsx'
import { useT } from '../lib/i18n.jsx'

function Steps({ steps }) {
  return (
    <ol className="relative mt-10 space-y-6 border-l border-slate-200 pl-8 dark:border-slate-800">
      {steps.map(([title, text], i) => (
        <li key={title} className="relative">
          <span className="absolute top-0 -left-[2.85rem] flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white ring-4 ring-white dark:ring-slate-950">
            {i + 1}
          </span>
          <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{text}</p>
        </li>
      ))}
    </ol>
  )
}

function CheckList({ items }) {
  return (
    <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {item}
        </li>
      ))}
    </ul>
  )
}

export default function HowItWorks() {
  const t = useT()

  const clientSteps = [
    [t('Esporti in gioco', 'You export in game'), t(
      'Nella console del gioco digiti export_server_packages: il gioco scrive server_packages.sii e .dat nella cartella documenti.',
      'In the game console you type export_server_packages: the game writes server_packages.sii and .dat into its documents folder.',
    )],
    [t('Il Client se ne accorge', 'The Client notices'), t(
      "Aspetta che i file smettano di cambiare, poi controlla se sono diversi dall'ultimo export.",
      'It waits until the files stop changing, then checks whether they differ from the last export.',
    )],
    [t('Clone temporaneo', 'Temporary clone'), t(
      'Clona solo il branch configurato in %TEMP%\\ets2-package-sync\\<gioco>\\repo-<n>.',
      'It clones only the configured branch into %TEMP%\\ets2-package-sync\\<game>\\repo-<n>.',
    )],
    [t('Commit e push', 'Commit and push'), t(
      'Se i file sono diversi da quelli su GitHub li copia byte per byte, fa commit e push, poi elimina il clone.',
      'If the files differ from GitHub it copies them byte for byte, commits and pushes, then deletes the clone.',
    )],
  ]

  const serverSteps = [
    [t('Nuovo commit', 'New commit'), t(
      "Il polling chiede a GitHub l'ultimo commit del branch, oppure arriva il webhook firmato.",
      'Polling asks GitHub for the latest commit of the branch, or the signed webhook arrives.',
    )],
    [t('Download e verifica', 'Download and verify'), t(
      'I due file vengono scaricati a quel preciso commit e controllati per dimensione e hash git.',
      'Both files are downloaded at that exact commit and checked for size and git hash.',
    )],
    [t('Niente da fare?', 'Nothing to do?'), t(
      'Se i file sono identici a quelli installati il server non viene riavviato.',
      'If the files match the installed ones, the server is not restarted.',
    )],
    [t('Preparazione', 'Preparation'), t(
      'I nuovi file vengono scritti e verificati prima di fermare il server, per ridurre il downtime.',
      'The new files are written and verified before stopping the server, to minimise downtime.',
    )],
    [t('Stop, backup, sostituzione', 'Stop, backup, replace'), t(
      'Il server si ferma, i vecchi file vanno in backups\\<data>_<commit>, i nuovi prendono il loro posto.',
      'The server stops, the old files go to backups\\<date>_<commit>, the new ones take their place.',
    )],
    [t('Avvio e controllo', 'Start and health check'), t(
      'Il server riparte e deve restare attivo per qualche secondo, altrimenti si torna al backup.',
      'The server restarts and must stay up for a few seconds, otherwise the backup is restored.',
    )],
  ]

  return (
    <>
      <PageHeader eyebrow={t('Come funziona', 'How it works')} title={t('GitHub come ponte tra il tuo PC e il server', 'GitHub as the bridge between your PC and the server')}>
        {t(
          'Il Client pubblica, GitHub conserva lo storico, il Server installa. Ogni passaggio è verificato e reversibile.',
          'The Client publishes, GitHub keeps the history, the Server installs. Every step is verified and reversible.',
        )}
      </PageHeader>

      <section className="py-20">
        <Container>
          <FlowDiagram />
        </Container>
      </section>

      <section className="bg-slate-50 py-20 dark:bg-slate-900/30">
        <Container className="grid gap-16 lg:grid-cols-2">
          <div>
            <SectionTitle eyebrow={t('Lato Client', 'Client side')} title={t("Dall'export al push", 'From export to push')} />
            <Steps steps={clientSteps} />
          </div>
          <div>
            <SectionTitle eyebrow={t('Lato Server', 'Server side')} title={t('Dal commit al server aggiornato', 'From commit to updated server')} />
            <Steps steps={serverSteps} />
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <SectionTitle center eyebrow={t('Due modi per scoprire i commit', 'Two ways to discover commits')} title={t('Polling o webhook: scegli tu', 'Polling or webhook: your choice')} />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Card>
              <IconBadge icon={Clock} />
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{t('Controllo periodico', 'Periodic check')}</h3>
              <p className="mt-1 text-sm text-orange-600 dark:text-orange-400">{t('Predefinito', 'Default')}</p>
              <CheckList
                items={[
                  t('Nessuna porta da aprire, nessun router da configurare', 'No ports to open, no router to configure'),
                  t('Una sola richiesta a GitHub ogni N minuti (default 5)', 'A single request to GitHub every N minutes (default 5)'),
                  t('Funziona dietro NAT, CGNAT e firewall aziendali', 'Works behind NAT, CGNAT and corporate firewalls'),
                  t('Token opzionale per le repository private', 'Optional token for private repositories'),
                ]}
              />
            </Card>
            <Card>
              <IconBadge icon={Webhook} />
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{t('Webhook GitHub', 'GitHub webhook')}</h3>
              <p className="mt-1 text-sm text-orange-600 dark:text-orange-400">{t('Immediato', 'Instant')}</p>
              <CheckList
                items={[
                  t('Aggiornamento appena arriva il push', 'Updates as soon as the push lands'),
                  t('Firma X-Hub-Signature-256 verificata con il secret', 'X-Hub-Signature-256 signature verified with the secret'),
                  t('Risposta 202 immediata, lavoro in coda in background', 'Immediate 202 response, work queued in the background'),
                  t('Richiede una porta aperta (8787 ETS2, 8788 ATS)', 'Needs an open port (8787 ETS2, 8788 ATS)'),
                ]}
              />
            </Card>
          </div>
        </Container>
      </section>

      <section className="bg-slate-50 py-20 dark:bg-slate-900/30">
        <Container className="grid gap-12 lg:grid-cols-2">
          <SectionTitle eyebrow={t('Se qualcosa va storto', 'If something goes wrong')} title={t('Il server non resta mai a metà', 'The server is never left half-updated')}>
            {t("Ogni errore ha una via d'uscita prevista.", 'Every failure has a planned way out.')}
          </SectionTitle>
          <div className="space-y-4">
            <Callout icon={TriangleAlert} title={t('Download o verifica falliti', 'Download or verification failed')}>
              {t('Il server non viene toccato. Il controllo successivo riprova.', 'The server is not touched. The next check retries.')}
            </Callout>
            <Callout icon={TriangleAlert} title={t('Errore durante la sostituzione', 'Error while replacing')}>
              {t('Ripristino del backup e riavvio del server.', 'The backup is restored and the server restarted.')}
            </Callout>
            <Callout icon={TriangleAlert} title={t('Il server si chiude con i nuovi file', 'The server exits with the new files')}>
              {t(
                <>Ripristino del backup e riavvio con i file precedenti. Quel commit non viene riprovato da solo: si può forzare con <strong>Aggiorna ora</strong>.</>,
                <>The backup is restored and the server restarted with the previous files. That commit is not retried automatically: force it with <strong>Update now</strong>.</>,
              )}
            </Callout>
            <Callout icon={TriangleAlert} title={t('SteamCMD fallisce', 'SteamCMD fails')} tone="sky">
              {t(
                'Il server riparte con i file di prima; un controllo automatico non riuscito finisce solo nel log.',
                'The server restarts with the previous files; a failed automatic check only ends up in the log.',
              )}
            </Callout>
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container className="max-w-3xl">
          <SectionTitle eyebrow={t('Struttura della repository', 'Repository layout')} title={t('Cosa finisce su GitHub', 'What goes to GitHub')} />
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            {t(
              <>Solo i due file dei pacchetti, più un <code className="font-mono">.gitattributes</code> che impedisce a git di convertire i fine riga:</>,
              <>Only the two package files, plus a <code className="font-mono">.gitattributes</code> that stops git from converting line endings:</>,
            )}
          </p>
          <div className="mt-6">
            <CodeBlock>{`${t('mia-repo-pacchetti', 'my-packages-repo')}/
├── .gitattributes        server_packages.sii -text
│                         server_packages.dat binary
├── server_packages.sii
└── server_packages.dat`}</CodeBlock>
          </div>
        </Container>
      </section>
    </>
  )
}
