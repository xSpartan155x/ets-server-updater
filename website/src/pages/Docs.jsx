import { useParams } from 'react-router'
import { ArrowLeft, ArrowRight, Info, ShieldAlert } from 'lucide-react'
import { Callout, Code, CodeBlock, Container } from '../components/ui.jsx'
import Screenshot from '../components/Screenshot.jsx'
import { RELEASES_URL } from '../lib/site.js'
import { GUIDE_SECTIONS } from '../lib/meta.js'
import { Link, NavLink, Navigate, useLang, useT } from '../lib/i18n.jsx'

function H2({ children }) {
  return <h2 className="mt-10 mb-3 text-xl font-bold text-slate-900 first:mt-0 dark:text-white">{children}</h2>
}
function P({ children }) {
  return <p className="my-3 leading-relaxed text-slate-600 dark:text-slate-400">{children}</p>
}
function Ul({ children }) {
  return <ul className="my-3 list-disc space-y-2 pl-5 leading-relaxed text-slate-600 marker:text-orange-500 dark:text-slate-400">{children}</ul>
}
function Ol({ children }) {
  return <ol className="my-3 list-decimal space-y-2 pl-5 leading-relaxed text-slate-600 marker:font-semibold marker:text-orange-500 dark:text-slate-400">{children}</ol>
}
function Table({ head, rows }) {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white">
          <tr>{head.map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className="px-4 py-2.5 align-top text-slate-600 dark:text-slate-400">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
const B = ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
const A = ({ href, to, children }) =>
  to ? (
    <Link to={to} className="text-orange-600 underline dark:text-orange-400">{children}</Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" className="text-orange-600 underline dark:text-orange-400">{children}</a>
  )

/** Body of each guide section, by id. */
function sectionBodies(t) {
  const field = t('Campo', 'Field')
  const desc = t('Descrizione', 'Description')
  return {
    installation: (
      <>
        <P>
          {t(
            <>Scarica <Code>ETS2PackageSync-Setup-&lt;versione&gt;.exe</Code> dalla pagina <A to="/download">Download</A> e avvialo su ogni PC, client e server. Il setup:</>,
            <>Download <Code>ETS2PackageSync-Setup-&lt;version&gt;.exe</Code> from the <A to="/download">Download</A> page and run it on every PC, client and server. The setup:</>,
          )}
        </P>
        <Ul>
          <li>{t("installa l'app per l'utente corrente (cartella modificabile);", 'installs the app for the current user (folder can be changed);')}</li>
          <li>{t('crea il collegamento sul desktop e nel menu Start;', 'creates desktop and Start menu shortcuts;')}</li>
          <li>{t("avvia l'app al termine.", 'launches the app when done.')}</li>
        </Ul>
        <Callout icon={ShieldAlert} title="Windows SmartScreen">
          {t(
            <>L'installer non è firmato digitalmente: Windows può mostrare <em>"Windows ha protetto il PC"</em>. Clicca <B>Ulteriori informazioni</B> → <B>Esegui comunque</B>.</>,
            <>The installer is not code-signed: Windows may show <em>"Windows protected your PC"</em>. Click <B>More info</B> → <B>Run anyway</B>.</>,
          )}
        </Callout>
        <P>
          {t(
            <>Per disinstallare: <em>Impostazioni di Windows → App → ETS2 Package Sync</em>. Esiste anche una versione portable (zip) nelle <A href={RELEASES_URL}>release</A>, senza aggiornamento automatico.</>,
            <>To uninstall: <em>Windows Settings → Apps → ETS2 Package Sync</em>. A portable version (zip) is also available in the <A href={RELEASES_URL}>releases</A>, without automatic updates.</>,
          )}
        </P>
      </>
    ),
    'first-run': (
      <>
        <P>{t(<>Al primo avvio si apre la finestra su <B>Impostazioni</B>:</>, <>On first launch the window opens on <B>Settings</B>:</>)}</P>
        <Ol>
          <li>{t(<><B>Generale</B>: lingua (automatica, English o Italiano) e, opzionale, <B>Avvia con Windows</B>.</>, <><B>General</B>: language (automatic, English or Italiano) and, optionally, <B>Start with Windows</B>.</>)}</li>
          <li>{t(<>Scegli il gioco dal menu in alto a sinistra e la sua modalità: <B>Client</B> o <B>Server</B>.</>, <>Pick the game from the top-left menu and its mode: <B>Client</B> or <B>Server</B>.</>)}</li>
          <li>{t("Per usare anche l'altro gioco, sceglilo dal menu e ripeti.", 'To use the other game too, pick it from the menu and repeat.')}</li>
          <li>{t(<><B>Salva impostazioni</B>: i giochi configurati partono subito e si apre la pagina Server.</>, <><B>Save settings</B>: the configured games start right away and the Server page opens.</>)}</li>
          <li>{t(<>In <B>Server</B> configura i server: <em>Server a cui inviare</em> (Client) oppure <em>Nuovo server</em> (Server).</>, <>In <B>Server</B> set up the servers: <em>Servers to send to</em> (Client) or <em>New server</em> (Server).</>)}</li>
        </Ol>
        <Screenshot name="primo-avvio" alt={t('Primo avvio', 'First run')} className="my-6" />
        <P>
          {t(
            <>Chiudendo la finestra l'app resta nel tray. Clic sull'icona → dashboard; tasto destro → menu. Il colore del pallino indica lo stato: <span className="text-emerald-500">verde</span> ok, <span className="text-sky-500">blu</span> operazione in corso, <span className="text-red-500">rosso</span> errore, grigio non configurato.</>,
            <>Closing the window keeps the app in the tray. Click the icon → dashboard; right-click → menu. The dot colour shows the status: <span className="text-emerald-500">green</span> ok, <span className="text-sky-500">blue</span> working, <span className="text-red-500">red</span> error, grey not configured.</>,
          )}
        </P>
      </>
    ),
    repository: (
      <>
        <P>
          {t(
            <>Crea una repository (anche privata) per ogni gioco, o almeno un branch diverso per gioco. Aggiungi questo <Code>.gitattributes</Code>, per evitare che git converta i fine riga:</>,
            <>Create a repository (private is fine) for each game, or at least a separate branch per game. Add this <Code>.gitattributes</Code> so git doesn't convert line endings:</>,
          )}
        </P>
        <CodeBlock>{`server_packages.sii -text
server_packages.dat binary`}</CodeBlock>
        <Screenshot name="github-nuova-repo" alt={t('Nuova repository su GitHub', 'New repository on GitHub')} className="my-6" />
      </>
    ),
    client: (
      <>
        <H2>{t('Prerequisiti', 'Requirements')}</H2>
        <Ol>
          <li>
            {t(
              <><B>Git for Windows</B> installato. Se manca, l'app mostra il link per scaricarlo; dopo l'installazione <em>Ricontrolla</em> avvia la modalità Client senza riavviare.</>,
              <><B>Git for Windows</B> installed. If missing, the app shows a download link; after installing, <em>Check again</em> starts Client mode without restarting.</>,
            )}
          </li>
          <li>
            {t(
              'Accesso in scrittura alla repository. Al primo push compare Git Credential Manager; le credenziali restano in Windows.',
              'Write access to the repository. Git Credential Manager appears on the first push; credentials stay in Windows.',
            )}
          </li>
        </Ol>
        <H2>{t('Impostazioni', 'Settings')}</H2>
        <Table
          head={[field, desc]}
          rows={[
            [t('URL della repository, Branch', 'Repository URL, Branch'), t('Dove pushare i file. Ogni gioco deve avere la sua repository o un branch diverso.', 'Where to push the files. Each game needs its own repository or a different branch.')],
            [
              t('Cartella documenti del gioco', 'Game documents folder'),
              t(
                <>Precompilata con <Code>Documenti\Euro Truck Simulator 2</Code> o <Code>Documenti\American Truck Simulator</Code>.</>,
                <>Prefilled with <Code>Documents\Euro Truck Simulator 2</Code> or <Code>Documents\American Truck Simulator</Code>.</>,
              ),
            ],
            [t('Opzioni avanzate', 'Advanced options'), t("Messaggio di commit, attesa dopo l'ultima modifica.", 'Commit message, wait after the last change.')],
          ]}
        />
        <H2>{t('Uso', 'Usage')}</H2>
        <P>
          {t(
            <>Nel gioco apri la console e digita <Code>export_server_packages</Code>. Il resto è automatico:</>,
            <>In game, open the console and type <Code>export_server_packages</Code>. The rest is automatic:</>,
          )}
        </P>
        <CodeBlock>{t(
          `Documenti\\<gioco>\\server_packages.sii/.dat
        │
        ▼
git clone (pulito, solo il branch)  →  %TEMP%\\ets2-package-sync\\<ets2|ats>\\repo-<n>
        │ i file sono diversi da quelli su GitHub?
        ▼ sì
copia  →  git commit  →  git push  →  cartella temporanea eliminata`,
          `Documents\\<game>\\server_packages.sii/.dat
        │
        ▼
git clone (clean, branch only)  →  %TEMP%\\ets2-package-sync\\<ets2|ats>\\repo-<n>
        │ do the files differ from GitHub?
        ▼ yes
copy  →  git commit  →  git push  →  temporary folder deleted`,
        )}</CodeBlock>
        <Screenshot name="client-impostazioni" alt={t('Impostazioni del Client', 'Client settings')} className="my-6" />
      </>
    ),
    server: (
      <>
        <Table
          head={[field, desc]}
          rows={[
            [t('Eseguibile del server', 'Server executable'), <><Code>...\bin\win_x64\eurotrucks2_server.exe</Code> (ETS2) {t('o', 'or')} <Code>amtrucks_server.exe</Code> (ATS)</>],
            ['server_packages.sii / .dat', t('I file letti dal server dedicato.', 'The files read by the dedicated server.')],
            [t('Nuovi pacchetti da GitHub', 'New packages from GitHub'), t('Controllo periodico (predefinito) o Webhook.', 'Periodic check (default) or Webhook.')],
            [t('Controlla GitHub ogni (minuti)', 'Check GitHub every (minutes)'), t('Default 5, minimo 1. Senza token: 60 richieste/ora per IP.', 'Default 5, minimum 1. Without a token: 60 requests/hour per IP.')],
            [t('Porta', 'Port'), t('Solo webhook: 8787 per ETS2, 8788 per ATS.', 'Webhook only: 8787 for ETS2, 8788 for ATS.')],
            ['Webhook secret', t('Solo webhook, obbligatorio. Genera ne crea uno casuale.', 'Webhook only, required. Generate creates a random one.')],
            [t('Token GitHub', 'GitHub token'), t('Solo per repository private: fine-grained token con Contents: Read-only.', 'Private repositories only: fine-grained token with Contents: Read-only.')],
          ]}
        />
        <Screenshot name="server-ets2" alt={t('Pagina di un server', 'Server page')} className="my-6" />
        <H2>{t('Configurazione della sessione', 'Session configuration')}</H2>
        <P>
          {t(
            <>Nella scheda <B>Sessione</B> si modifica <Code>server_config.sii</Code>: nome, descrizione, password, giocatori (1-8), token di login Steam (App ID <Code>227300</Code> ETS2, <Code>270880</Code> ATS), veicoli AI, porte e moderatori. Vengono riscritti solo i valori; la versione precedente finisce in <Code>server_config.sii.bak</Code>.</>,
            <>The <B>Session</B> tab edits <Code>server_config.sii</Code>: name, description, password, players (1-8), Steam login token (App ID <Code>227300</Code> ETS2, <Code>270880</Code> ATS), AI vehicles, ports and moderators. Only the values are rewritten; the previous version goes to <Code>server_config.sii.bak</Code>.</>,
          )}
        </P>
      </>
    ),
    steamcmd: (
      <>
        <P>
          {t(
            <>Quando SCS aggiorna il gioco serve anche la nuova build del server dedicato. Il PC Server la installa da solo con SteamCMD, scaricato al primo uso (circa 150 MB) e usato in modo anonimo: App ID <Code>1948160</Code> per ETS2, <Code>2239530</Code> per ATS.</>,
            <>When SCS updates the game, the dedicated server needs the new build too. The Server PC installs it by itself with SteamCMD, downloaded on first use (about 150 MB) and used anonymously: App ID <Code>1948160</Code> for ETS2, <Code>2239530</Code> for ATS.</>,
          )}
        </P>
        <Table
          head={[field, desc]}
          rows={[
            [t('Aggiorna il server automaticamente', 'Update the server automatically'), t('Attivo: ferma, aggiorna e riavvia. Disattivo: solo una notifica.', 'On: stop, update and restart. Off: just a notification.')],
            [t('Controlla Steam ogni (ore)', 'Check Steam every (hours)'), t('Default 2; 0 = solo con i pulsanti della pagina Server.', 'Default 2; 0 = only with the Server page buttons.')],
            [
              t('Cartella del server', 'Server folder'),
              t(
                <>Dove SteamCMD installa i file. Vuota = la cartella che contiene <Code>bin\win_x64</Code>.</>,
                <>Where SteamCMD installs the files. Empty = the folder containing <Code>bin\win_x64</Code>.</>,
              ),
            ],
          ]}
        />
        <Callout icon={Info} tone="sky">
          {t(
            <>Build <em>Sconosciuta</em>? Il server è stato installato con Steam o a mano: basta un clic su <B>Aggiorna installazione</B>.</>,
            <>Build <em>Unknown</em>? The server was installed with Steam or by hand: just click <B>Update installation</B>.</>,
          )}
        </Callout>
      </>
    ),
    webhook: (
      <>
        <P>{t('Solo se scegli il webhook: GitHub deve raggiungere il PC da internet sulla porta di ogni server.', 'Only if you choose the webhook: GitHub must reach the PC from the internet on each server port.')}</P>
        <Ol>
          <li>
            {t('Apri le porte nel firewall di Windows (prompt da amministratore):', 'Open the ports in Windows Firewall (administrator prompt):')}
            <CodeBlock>{`netsh advfirewall firewall add rule name="ETS2 Package Webhook" dir=in action=allow protocol=TCP localport=8787,8788`}</CodeBlock>
          </li>
          <li>{t("Sul router, port forwarding delle porte TCP verso l'IP LAN del PC (mostrato nell'app).", "On the router, forward the TCP ports to the PC's LAN IP (shown in the app).")}</li>
          <li>{t(<>Nell'app, <B>Rileva IP pubblico</B> compila il Payload URL.</>, <>In the app, <B>Detect public IP</B> fills in the Payload URL.</>)}</li>
        </Ol>
        <P>
          {t(<>Verifica: <Code>http://IP_PUBBLICO:8787/health</Code> deve rispondere <Code>OK</Code>.</>, <>Check: <Code>http://PUBLIC_IP:8787/health</Code> must answer <Code>OK</Code>.</>)}
        </P>
        <H2>{t('Su GitHub', 'On GitHub')}</H2>
        <P>{t(<>Nella repository: <B>Settings → Webhooks → Add webhook</B></>, <>In the repository: <B>Settings → Webhooks → Add webhook</B></>)}</P>
        <CodeBlock>{t(
          `Payload URL:   http://IP_PUBBLICO:8787/github-webhook   (ATS: porta 8788)
Content type:  application/json
Secret:        <lo stesso Webhook secret dell'app>
Events:        Just the push event`,
          `Payload URL:   http://PUBLIC_IP:8787/github-webhook   (ATS: port 8788)
Content type:  application/json
Secret:        <the same Webhook secret as in the app>
Events:        Just the push event`,
        )}</CodeBlock>
        <Screenshot name="github-webhook" alt={t('Webhook su GitHub', 'Webhook on GitHub')} className="my-6" />
        <P>{t(<>In <B>Recent Deliveries</B> deve comparire il <Code>ping</Code> con risposta <Code>200 pong</Code>.</>, <><B>Recent Deliveries</B> must show the <Code>ping</Code> with a <Code>200 pong</Code> response.</>)}</P>
        <Callout icon={Info} tone="sky">
          {t(
            'Il webhook viaggia in HTTP: il contenuto non è cifrato, ma è autenticato dalla firma HMAC e i file vengono sempre scaricati da GitHub, mai presi dal payload. Per HTTPS usa un reverse proxy (es. Caddy) o un tunnel.',
            'The webhook travels over HTTP: the content is not encrypted, but it is authenticated by the HMAC signature and files are always downloaded from GitHub, never taken from the payload. For HTTPS use a reverse proxy (e.g. Caddy) or a tunnel.',
          )}
        </Callout>
      </>
    ),
    data: (
      <>
        <P>{t(<>Tutto è in <Code>%APPDATA%\ETS2 Package Sync\</Code>:</>, <>Everything lives in <Code>%APPDATA%\ETS2 Package Sync\</Code>:</>)}</P>
        <Table
          head={['File', t('Contenuto', 'Contents')]}
          rows={[
            [<Code>settings.json</Code>, t('Impostazioni per gioco. Secret e token cifrati con Windows DPAPI.', 'Per-game settings. Secrets and tokens encrypted with Windows DPAPI.')],
            [<Code>ets2sync.log</Code>, t('Log, con rotazione automatica a 1 MB.', 'Log, rotated automatically at 1 MB.')],
            [<Code>server_state*.json</Code>, t('Commit processati, ultimo aggiornamento e build Steam (solo Server).', 'Processed commits, last update and Steam build (Server only).')],
            [<Code>steamcmd\</Code>, t('SteamCMD, scaricato al primo uso.', 'SteamCMD, downloaded on first use.')],
          ]}
        />
        <H2>{t('Copiare le impostazioni su un altro PC', 'Copying settings to another PC')}</H2>
        <Ul>
          <li>{t(<><B>Esporta</B> salva tutti i giochi in un <Code>.json</Code>; puoi scegliere se includere i secret (in chiaro nel file).</>, <><B>Export</B> saves all games to a <Code>.json</Code>; you choose whether to include the secrets (plain text in the file).</>)}</li>
          <li>{t(<><B>Importa</B> compila il modulo senza salvare: controlla i percorsi e poi <em>Salva impostazioni</em>.</>, <><B>Import</B> fills in the form without saving: check the paths, then <em>Save settings</em>.</>)}</li>
          <li>{t(<>Tema, lingua e <em>Avvia con Windows</em> non vengono copiati.</>, <>Theme, language and <em>Start with Windows</em> are not copied.</>)}</li>
        </Ul>
        <Screenshot name="logs" alt="Log" className="my-6" />
      </>
    ),
  }
}

export default function Docs() {
  const t = useT()
  const lang = useLang()
  const { section = GUIDE_SECTIONS[0].id } = useParams()
  const index = GUIDE_SECTIONS.findIndex((s) => s.id === section)
  if (index < 0) return <Navigate to="/guide" replace />
  const current = GUIDE_SECTIONS[index]
  const prev = GUIDE_SECTIONS[index - 1]
  const next = GUIDE_SECTIONS[index + 1]
  const body = sectionBodies(t)[current.id]

  return (
    <Container className="grid gap-10 py-12 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">{t('Guida', 'Guide')}</p>
        <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {GUIDE_SECTIONS.map((s) => (
            <NavLink
              key={s.id}
              to={`/guide/${s.id}`}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                s.id === current.id
                  ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
              }`}
            >
              {s[lang]}
            </NavLink>
          ))}
        </nav>
      </aside>
      <article className="max-w-3xl min-w-0">
        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
          {t('Guida', 'Guide')} · {index + 1}/{GUIDE_SECTIONS.length}
        </p>
        <h1 className="mt-2 mb-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{current[lang]}</h1>
        {body}
        <div className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 dark:border-slate-800">
          {prev ? (
            <Link to={`/guide/${prev.id}`} className="group rounded-xl border border-slate-200 p-4 hover:border-orange-500/50 dark:border-slate-800">
              <span className="flex items-center gap-1 text-xs text-slate-500"><ArrowLeft className="h-3 w-3" /> {t('Precedente', 'Previous')}</span>
              <span className="mt-1 block font-semibold text-slate-900 group-hover:text-orange-600 dark:text-white">{prev[lang]}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/guide/${next.id}`} className="group rounded-xl border border-slate-200 p-4 text-right hover:border-orange-500/50 dark:border-slate-800">
              <span className="flex items-center justify-end gap-1 text-xs text-slate-500">{t('Successivo', 'Next')} <ArrowRight className="h-3 w-3" /></span>
              <span className="mt-1 block font-semibold text-slate-900 group-hover:text-orange-600 dark:text-white">{next[lang]}</span>
            </Link>
          )}
        </div>
      </article>
    </Container>
  )
}
