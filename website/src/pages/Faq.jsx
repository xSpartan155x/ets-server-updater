import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button, Container, PageHeader } from '../components/ui.jsx'
import { ISSUES_URL } from '../lib/site.js'
import { Link, useT } from '../lib/i18n.jsx'

function Item({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-200 dark:border-slate-800">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 py-5 text-left" aria-expanded={open}>
        <span className="font-semibold text-slate-900 dark:text-white">{q}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${open ? 'rotate-180 text-orange-500' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'}`}>
        <p className="overflow-hidden leading-relaxed text-slate-600 dark:text-slate-400">{a}</p>
      </div>
    </div>
  )
}

export default function Faq() {
  const t = useT()
  const faqs = [
    [t('Serve per forza GitHub?', 'Is GitHub required?'), t(
      'Sì: la repository GitHub è il ponte tra Client e Server e conserva lo storico di ogni mod list. Basta un account gratuito; la repository può essere privata (in quel caso il Server usa un token in sola lettura).',
      'Yes: the GitHub repository is the bridge between Client and Server and keeps the history of every mod list. A free account is enough; the repository can be private (the Server then uses a read-only token).',
    )],
    [t('Devo aprire porte sul router?', 'Do I need to open router ports?'), t(
      'No, con il controllo periodico (predefinito) il Server chiede a GitHub i nuovi commit ogni pochi minuti. Le porte servono solo se scegli il webhook per avere aggiornamenti immediati.',
      'No. With the periodic check (default) the Server asks GitHub for new commits every few minutes. Ports are only needed if you choose the webhook for instant updates.',
    )],
    [t('Posso usare ETS2 e ATS insieme?', 'Can I use ETS2 and ATS together?'), t(
      "Sì. Ogni gioco ha modalità, repository, metodo di aggiornamento (e porta del webhook) e stato separati. Puoi anche usarne uno solo e lasciare l'altro senza modalità.",
      'Yes. Each game has its own mode, repository, update method (and webhook port) and status. You can also use just one and leave the other without a mode.',
    )],
    [t('Client e Server possono stare sullo stesso PC?', 'Can Client and Server run on the same PC?'), t(
      'Sì, i ruoli si scelgono per gioco e un PC può essere sia Client sia Server. Dalla pagina Server il Client può aggiungere in un clic le repository dei server ospitati sullo stesso PC.',
      'Yes, roles are chosen per game and a PC can be both Client and Server. From the Server page the Client can add the repositories of servers hosted on the same PC in one click.',
    )],
    [t('Cosa succede se il server non parte con le nuove mod?', "What if the server won't start with the new mods?"), t(
      "Il server deve restare attivo per qualche secondo dopo l'avvio. Se si chiude, l'app ripristina il backup e lo riavvia con i file precedenti. Quel commit non viene riprovato da solo: puoi forzarlo con Aggiorna ora.",
      'The server must stay up for a few seconds after starting. If it exits, the app restores the backup and restarts it with the previous files. That commit is not retried by itself: you can force it with Update now.',
    )],
    [t('Il server viene riavviato a ogni export?', 'Is the server restarted on every export?'), t(
      'No. Se i file scaricati sono identici a quelli installati il server non viene toccato. E il Client non fa commit se i file sono uguali a quelli già su GitHub.',
      "No. If the downloaded files match the installed ones the server is left alone. And the Client doesn't commit if the files are the same as those already on GitHub.",
    )],
    [t('Dove finiscono token e password?', 'Where do tokens and passwords go?'), t(
      "Webhook secret e token GitHub sono cifrati con Windows DPAPI in settings.json: solo il tuo utente Windows può leggerli. Per il push il Client usa Git Credential Manager, quindi l'app non contiene token.",
      "Webhook secret and GitHub token are encrypted with Windows DPAPI in settings.json: only your Windows user can read them. For pushing the Client uses Git Credential Manager, so the app holds no tokens.",
    )],
    [t("Windows dice che l'app potrebbe essere pericolosa. È normale?", 'Windows says the app might be unsafe. Is that normal?'), t(
      'L\'installer non è firmato digitalmente, quindi SmartScreen avvisa. Clicca "Ulteriori informazioni" → "Esegui comunque". Il codice è pubblico su GitHub e le build vengono create da GitHub Actions.',
      'The installer is not code-signed, so SmartScreen warns. Click "More info" → "Run anyway". The code is public on GitHub and builds are made by GitHub Actions.',
    )],
    [t("Come si aggiorna l'app?", 'How does the app update?'), t(
      "Da sola: controlla le nuove versioni all'avvio e ogni 6 ore, scarica l'aggiornamento e lo installa al riavvio. L'installazione è bloccata mentre un server si sta aggiornando. La versione portable mostra la nuova versione e apre la pagina della release.",
      'By itself: it checks for new versions at startup and every 6 hours, downloads the update and installs it on restart. Installing is blocked while a server is updating. The portable version shows the new version and opens the release page.',
    )],
    [t('Aggiorna anche il server dedicato quando esce una patch del gioco?', 'Does it also update the dedicated server when a game patch ships?'), t(
      'Sì, con SteamCMD integrato (scaricato al primo uso, usato in modo anonimo). Puoi scegliere se aggiornare in automatico o ricevere solo una notifica.',
      'Yes, with built-in SteamCMD (downloaded on first use, used anonymously). You choose between automatic updates and just a notification.',
    )],
    [t('Posso copiare la configurazione su un altro PC?', 'Can I copy the configuration to another PC?'), t(
      "Sì, da Impostazioni → Esporta / Importa. L'import compila il modulo senza salvare, così puoi correggere i percorsi prima.",
      'Yes, from Settings → Export / Import. Import fills in the form without saving, so you can fix the paths first.',
    )],
  ]

  return (
    <>
      <PageHeader eyebrow="FAQ" title={t('Domande frequenti', 'Frequently asked questions')}>
        {t('Le risposte rapide. Per i passaggi completi c\'è la ', 'Quick answers. For the full steps there is the ')}
        <Link to="/guide" className="text-orange-600 underline dark:text-orange-400">{t('guida', 'guide')}</Link>.
      </PageHeader>
      <section className="py-16">
        <Container className="max-w-3xl">
          {faqs.map(([q, a]) => (
            <Item key={q} q={q} a={a} />
          ))}
          <div className="mt-12 rounded-2xl bg-slate-50 p-8 text-center dark:bg-slate-900/60">
            <p className="font-semibold text-slate-900 dark:text-white">{t('Non trovi la risposta?', "Can't find the answer?")}</p>
            <p className="mt-1 text-sm text-slate-500">
              {t("Apri una issue su GitHub, con il log dell'app se si tratta di un errore.", "Open an issue on GitHub, with the app's log if it's an error.")}
            </p>
            <Button href={ISSUES_URL} variant="secondary" className="mt-5">{t('Apri una issue', 'Open an issue')}</Button>
          </div>
        </Container>
      </section>
    </>
  )
}
