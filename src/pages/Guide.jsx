import { PageHeader } from '../components/ui';

// Screenshots in src/assets/guide: "<name>.png" for the light theme, "<name>-dark.png" for the dark one
const SHOTS = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/guide/*.png', { eager: true, query: '?url', import: 'default' }))
    .map(([file, url]) => [file.split('/').pop().replace(/\.png$/, ''), url]),
);

/** Screenshot that follows the app theme (prefers-color-scheme is driven by the theme switch). */
function Shot({ name, alt }) {
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet={SHOTS[`${name}-dark`]} />
      <img src={SHOTS[name]} alt={alt} />
    </picture>
  );
}

export default function Guide() {
  const onClick = (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    event.preventDefault();
    if (href.startsWith('#')) document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    else if (/^https:\/\//i.test(href)) window.api.openExternal(href);
  };

  return (
    <>
      <PageHeader title="Guida all'installazione" subtitle="Configurazione passo passo del Client e del Server." />
      <div className="px-8 pb-8">
        <article
          className="guide selectable max-w-4xl rounded-xl border border-slate-200 bg-white px-8 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
          onClick={onClick}
        >
          <p>Questa guida spiega passo per passo come configurare <strong>ETS2 Package Sync</strong> sul PC da cui esporti i pacchetti (<strong>Client</strong>) e sul PC che fa girare il server dedicato di ETS2 (<strong>Server</strong>).</p>
          <p>Alla fine, ogni volta che esporti i pacchetti dal gioco, il server dedicato si aggiornerà e si riavvierà da solo.</p>
          <pre><code>{`PC Client (giochi tu)        GitHub                  PC Server (server dedicato)
export_server_packages  -->  repository  --webhook-->  scarica i file, ferma ETS2,
l'app fa il push                                       sostituisce, riavvia ETS2`}</code></pre>
          <h2 id="indice">Indice</h2>
          <ol>
          <li><a href="#1-cosa-serve">Cosa serve</a></li>
          <li><a href="#2-creare-la-repository-su-github">Creare la repository su GitHub</a></li>
          <li><a href="#3-installare-lapp">Installare l&#39;app</a></li>
          <li><a href="#4-configurare-il-client">Configurare il Client</a></li>
          <li><a href="#5-configurare-il-server">Configurare il Server</a></li>
          <li><a href="#6-aprire-la-porta-del-webhook">Aprire la porta del webhook</a></li>
          <li><a href="#7-creare-il-webhook-su-github">Creare il webhook su GitHub</a></li>
          <li><a href="#8-token-per-repository-private">Token per repository private</a></li>
          <li><a href="#9-prova-completa">Prova completa</a></li>
          <li><a href="#10-console-e-controllo-del-server">Console e controllo del server</a></li>
          <li><a href="#11-problemi-comuni">Problemi comuni</a></li>
          </ol>
          <hr />
          <h2 id="1-cosa-serve">1. Cosa serve</h2>
          <table>
          <thead>
          <tr>
          <th>Dove</th>
          <th>Cosa</th>
          </tr>
          </thead>
          <tbody><tr>
          <td>Ovunque</td>
          <td>Un account GitHub</td>
          </tr>
          <tr>
          <td>PC Client</td>
          <td>ETS2 installato, <a href="https://git-scm.com/download/win">Git for Windows</a></td>
          </tr>
          <tr>
          <td>PC Server</td>
          <td>Il server dedicato di ETS2 già funzionante (con il suo <code>server_config.sii</code> e il <code>server_logon_token</code> di Steam), la possibilità di aprire una porta sul router</td>
          </tr>
          </tbody></table>
          <blockquote>
          <p>Prima di usare l&#39;app, verifica che il server dedicato parta correttamente da solo (doppio clic su <code>eurotrucks2_server.exe</code>). L&#39;app lo avvia e lo ferma, ma non può correggere una configurazione di ETS2 sbagliata.</p>
          </blockquote>
          <h2 id="2-creare-la-repository-su-github">2. Creare la repository su GitHub</h2>
          <p>La repository è il &quot;punto d&#39;incontro&quot; tra Client e Server: contiene solo i due file dei pacchetti.</p>
          <ol>
          <li><p>Su GitHub clicca <strong>+</strong> in alto a destra → <strong>New repository</strong>.</p>
          </li>
          <li><p><strong>Repository name</strong>: ad esempio <code>ets2-server-packages</code>.</p>
          </li>
          <li><p>Scegli <strong>Private</strong> (consigliato) o <em>Public</em>.</p>
          </li>
          <li><p>Spunta <strong>Add a README file</strong>, così la repository non è vuota e ha già il branch <code>main</code>.</p>
          </li>
          <li><p>Clicca <strong>Create repository</strong>.</p>
          <Shot name="github-nuova-repo" alt="Nuova repository su GitHub" />
          </li>
          <li><p>Nella repository clicca <strong>Add file → Create new file</strong>, chiamalo <code>.gitattributes</code> e incolla:</p>
          <pre><code>{`server_packages.sii -text
server_packages.dat binary`}</code></pre>
          <p>poi <strong>Commit changes</strong>. Questo evita che Git modifichi i fine riga dei file dei pacchetti.</p>
          <Shot name="github-gitattributes" alt="Creazione del file .gitattributes" />
          </li>
          </ol>
          <p>Annota l&#39;indirizzo della repository (es. <code>https://github.com/tuo-utente/ets2-server-packages</code>) e il nome del branch (di solito <strong><code>main</code></strong>): servono sia sul Client che sul Server.</p>
          <h2 id="3-installare-lapp">3. Installare l&#39;app</h2>
          <p>Su <strong>entrambi</strong> i PC:</p>
          <ol>
          <li>Esegui <code>ETS2PackageSync-Setup-&lt;versione&gt;.exe</code>.</li>
          <li>Se compare <em>&quot;Windows ha protetto il PC&quot;</em>: <strong>Ulteriori informazioni</strong> → <strong>Esegui comunque</strong> (l&#39;installer non è firmato digitalmente).</li>
          <li>Scegli la cartella e completa l&#39;installazione. L&#39;app si avvia da sola.</li>
          </ol>
          <p>Al primo avvio si apre la pagina <strong>Settings</strong> con la modalità ancora da scegliere:</p>
          <Shot name="primo-avvio" alt="Primo avvio: pagina Settings" />
          <p>Chiudendo la finestra l&#39;app <strong>non</strong> si chiude: resta nell&#39;area di notifica (tray), vicino all&#39;orologio. Clic sull&#39;icona per riaprirla, tasto destro per il menu rapido. Il pallino sull&#39;icona indica lo stato: verde ok, blu operazione in corso, rosso errore, grigio non configurato.</p>
          <hr />
          <h2 id="4-configurare-il-client">4. Configurare il Client</h2>
          <p>Il Client è il PC su cui giochi ed esporti i pacchetti.</p>
          <h3 id="41-git-for-windows">4.1 Git for Windows</h3>
          <p>Installa <a href="https://git-scm.com/download/win">Git for Windows</a> lasciando le opzioni predefinite. L&#39;app lo usa per fare il push: non devi clonare nulla a mano e non serve nessun token, le credenziali le gestisce Git.</p>
          <h3 id="42-modalità">4.2 Modalità</h3>
          <p>In <strong>Settings → Mode of this PC</strong> scegli <strong>Client</strong>. Attiva <strong>Start with Windows</strong> se vuoi che l&#39;app parta da sola all&#39;accesso (si avvia ridotta nel tray).</p>
          <Shot name="client-modalita" alt="Modalità Client" />
          <h3 id="43-repository">4.3 Repository</h3>
          <p>Nella scheda <strong>GitHub repository</strong>:</p>
          <table>
          <thead>
          <tr>
          <th>Campo</th>
          <th>Valore</th>
          </tr>
          </thead>
          <tbody><tr>
          <td>Repository URL</td>
          <td>l&#39;indirizzo della repository, es. <code>https://github.com/tuo-utente/ets2-server-packages</code></td>
          </tr>
          <tr>
          <td>Branch</td>
          <td><code>main</code> (o il branch della tua repository)</td>
          </tr>
          <tr>
          <td>SII / DAT file in the repository</td>
          <td>lascia <code>server_packages.sii</code> e <code>server_packages.dat</code></td>
          </tr>
          </tbody></table>
          <Shot name="repository" alt="Scheda GitHub repository" />
          <blockquote>
          <p>Il branch predefinito è <code>master</code>: le repository nuove di GitHub usano <code>main</code>, quindi controllalo.</p>
          </blockquote>
          <h3 id="44-cartella-del-gioco">4.4 Cartella del gioco</h3>
          <p>Nella scheda <strong>Client</strong>, <strong>ETS2 documents folder</strong> è già compilata con <code>Documenti\Euro Truck Simulator 2</code>: è la cartella in cui il gioco scrive i file esportati (quella con <code>profiles</code>, <code>config.cfg</code>, <code>game.log.txt</code>). Cambiala solo se il tuo ETS2 usa un&#39;altra cartella.</p>
          <p>In <em>Advanced options</em> puoi cambiare il messaggio dei commit e quanti secondi aspettare dopo l&#39;ultima modifica dei file prima del push.</p>
          <Shot name="client-impostazioni" alt="Scheda Client" />
          <h3 id="45-salvare">4.5 Salvare</h3>
          <p>Clicca <strong>Save settings</strong> in basso a destra. La Dashboard mostra lo stato <strong>Watching - waiting for export_server_packages</strong>: è normale, l&#39;app è pronta e aspetta il primo export.</p>
          <Shot name="client-dashboard" alt="Dashboard del Client" />
          <p>Il riquadro <em>How files flow</em> riassume il percorso dei file: cartella del gioco → clone temporaneo (cancellato dopo ogni push) → GitHub.</p>
          <h3 id="46-primo-push">4.6 Primo push</h3>
          <ol>
          <li>Avvia ETS2, apri la console (tasto <code>~</code>, se l&#39;hai abilitata) e scrivi <code>export_server_packages</code>.</li>
          <li>Dopo pochi secondi l&#39;app clona la repository, copia i file e fa il push.</li>
          <li><strong>Solo la prima volta</strong> si apre la finestra di accesso di GitHub (Git Credential Manager): accedi con l&#39;account che ha accesso in scrittura alla repository. Le credenziali restano salvate in Windows.</li>
          <li>Su GitHub, nella repository, compaiono <code>server_packages.sii</code> e <code>server_packages.dat</code>.</li>
          </ol>
          <p>Il pulsante <strong>Push Now</strong> rifà subito il controllo, <strong>Open Repository</strong> apre la repository nel browser.</p>
          <hr />
          <h2 id="5-configurare-il-server">5. Configurare il Server</h2>
          <p>Il Server è il PC dove gira il server dedicato di ETS2.</p>
          <h3 id="51-modalità-e-repository">5.1 Modalità e repository</h3>
          <p>In <strong>Settings → Mode of this PC</strong> scegli <strong>Server</strong> e, se vuoi, attiva <strong>Start with Windows</strong> (consigliato su un server sempre acceso).</p>
          <Shot name="server-modalita" alt="Modalità Server" />
          <p>Compila la scheda <strong>GitHub repository</strong> con <strong>gli stessi valori del Client</strong> (URL e branch).</p>
          <h3 id="52-server-dedicato-ets2">5.2 Server dedicato ETS2</h3>
          <p>Nella scheda <strong>ETS2 dedicated server</strong>:</p>
          <table>
          <thead>
          <tr>
          <th>Campo</th>
          <th>Valore</th>
          </tr>
          </thead>
          <tbody><tr>
          <td>ETS2 server executable</td>
          <td><code>eurotrucks2_server.exe</code>, di solito in <code>...\bin\win_x64\</code> della cartella del server</td>
          </tr>
          <tr>
          <td>server_packages.sii used by the server</td>
          <td>il file <code>server_packages.sii</code> che il server legge, di solito in <code>Documenti\Euro Truck Simulator 2</code> dell&#39;utente che avvia il server</td>
          </tr>
          <tr>
          <td>server_packages.dat used by the server</td>
          <td>lo stesso per il <code>.dat</code></td>
          </tr>
          </tbody></table>
          <p>Usa <strong>Browse</strong> per selezionarli senza sbagliare il percorso.</p>
          <Shot name="server-ets2" alt="Scheda ETS2 dedicated server" />
          <p><em>Advanced options</em> (di solito si possono lasciare vuote/predefinite):</p>
          <table>
          <thead>
          <tr>
          <th>Campo</th>
          <th>A cosa serve</th>
          </tr>
          </thead>
          <tbody><tr>
          <td>Working directory</td>
          <td>cartella da cui avviare il server. Vuoto = cartella dell&#39;eseguibile</td>
          </tr>
          <tr>
          <td>Command line arguments</td>
          <td>argomenti extra per <code>eurotrucks2_server.exe</code></td>
          </tr>
          <tr>
          <td>Backup folder</td>
          <td>dove salvare i file precedenti prima di ogni aggiornamento. Vuoto = <code>backups</code> accanto al <code>.sii</code></td>
          </tr>
          <tr>
          <td>Backups to keep</td>
          <td>quanti backup conservare</td>
          </tr>
          <tr>
          <td>Stop timeout</td>
          <td>secondi di attesa per la chiusura di ETS2</td>
          </tr>
          <tr>
          <td>Startup check</td>
          <td>ETS2 deve restare acceso almeno questi secondi dopo l&#39;avvio, altrimenti l&#39;aggiornamento viene annullato e si torna ai file precedenti. 0 = disattivato</td>
          </tr>
          <tr>
          <td>Server log file</td>
          <td>il log mostrato nella pagina <strong>Console</strong>. Vuoto = <code>server.log.txt</code> accanto al <code>.sii</code></td>
          </tr>
          </tbody></table>
          <h3 id="53-webhook">5.3 Webhook</h3>
          <p>Nella scheda <strong>GitHub webhook</strong>:</p>
          <ol>
          <li><strong>Port</strong>: lascia <code>8787</code> (cambiala solo se è già usata da altro).</li>
          <li><strong>Webhook secret</strong>: clicca <strong>Generate</strong>. Poi clicca sull&#39;icona dell&#39;occhio e copia il valore: servirà su GitHub (sezione 7).</li>
          <li><strong>GitHub token</strong>: solo se la repository è <strong>privata</strong> (vedi sezione 8).</li>
          <li><strong>Payload URL</strong>: clicca <strong>Detect public IP</strong> per ottenere l&#39;indirizzo completo da incollare su GitHub, poi <strong>Copy</strong>.</li>
          </ol>
          <Shot name="server-webhook" alt="Scheda GitHub webhook" />
          <h3 id="54-salvare">5.4 Salvare</h3>
          <p>Clicca <strong>Save settings</strong>. La Dashboard mostra lo stato del server ETS2, il commit installato e il Payload URL del webhook.</p>
          <Shot name="server-dashboard" alt="Dashboard del Server" />
          <ul>
          <li><strong>Update Now</strong>: scarica subito l&#39;ultimo commit da GitHub e lo installa (utile anche per provare la configurazione).</li>
          <li><strong>Restart ETS2</strong>: riavvia il server dedicato.</li>
          </ul>
          <hr />
          <h2 id="6-aprire-la-porta-del-webhook">6. Aprire la porta del webhook</h2>
          <p>GitHub deve poter raggiungere il PC Server da internet sulla porta del webhook (8787).</p>
          <ol>
          <li><p><strong>Firewall di Windows</strong>: apri il <em>Prompt dei comandi</em> <strong>come amministratore</strong> e lancia:</p>
          <pre><code>{`netsh advfirewall firewall add rule name="ETS2 Package Webhook" dir=in action=allow protocol=TCP localport=8787`}</code></pre>
          </li>
          <li><p><strong>Router</strong>: nella pagina di configurazione del router crea un <em>port forwarding</em> (a volte chiamato &quot;virtual server&quot; o &quot;NAT&quot;):
          porta esterna <strong>8787</strong> TCP → IP LAN del PC Server (è scritto sotto il Payload URL nell&#39;app, es. <code>192.168.1.50</code>), porta interna <strong>8787</strong>.</p>
          </li>
          <li><p><strong>Verifica</strong>: da un altro dispositivo <strong>fuori dalla tua rete</strong> (es. lo smartphone con la rete mobile) apri <code>http://IP_PUBBLICO:8787/health</code>. Deve comparire <code>OK</code>.</p>
          </li>
          </ol>
          <blockquote>
          <p>Se il tuo IP pubblico cambia spesso, usa un servizio DNS dinamico (es. DuckDNS, No-IP) e metti il nome al posto dell&#39;IP nel Payload URL.</p>
          </blockquote>
          <h2 id="7-creare-il-webhook-su-github">7. Creare il webhook su GitHub</h2>
          <ol>
          <li><p>Nella repository su GitHub vai su <strong>Settings → Webhooks → Add webhook</strong>.</p>
          </li>
          <li><p>Compila:</p>
          <table>
          <thead>
          <tr>
          <th>Campo</th>
          <th>Valore</th>
          </tr>
          </thead>
          <tbody><tr>
          <td>Payload URL</td>
          <td>quello copiato dall&#39;app, es. <code>http://IP_PUBBLICO:8787/github-webhook</code></td>
          </tr>
          <tr>
          <td>Content type</td>
          <td><strong><code>application/json</code></strong> (non lasciare <code>application/x-www-form-urlencoded</code>)</td>
          </tr>
          <tr>
          <td>Secret</td>
          <td>lo stesso <strong>Webhook secret</strong> generato nell&#39;app</td>
          </tr>
          <tr>
          <td>SSL verification</td>
          <td>irrilevante: l&#39;indirizzo è <code>http://</code></td>
          </tr>
          <tr>
          <td>Which events would you like to trigger this webhook?</td>
          <td><strong>Just the push event</strong></td>
          </tr>
          <tr>
          <td>Active</td>
          <td>spuntato</td>
          </tr>
          </tbody></table>
          <Shot name="github-webhook" alt="Modulo Add webhook compilato" />
          </li>
          <li><p>Clicca <strong>Add webhook</strong>.</p>
          </li>
          <li><p>Riapri il webhook → scheda <strong>Recent Deliveries</strong>: deve esserci un evento <code>ping</code> con risposta <strong>200</strong> e testo <code>pong</code>.</p>
          </li>
          </ol>
          <Shot name="github-webhook-consegne" alt="Recent Deliveries del webhook" />
          <p>La spunta verde indica una consegna riuscita, il triangolo rosso una consegna fallita: cliccaci sopra e apri la scheda <strong>Response</strong> per vedere cosa ha risposto l&#39;app. Con <strong>Redeliver</strong> puoi reinviarla dopo aver corretto il problema.</p>
          <table>
          <thead>
          <tr>
          <th>Risposta in Recent Deliveries</th>
          <th>Significato</th>
          </tr>
          </thead>
          <tbody><tr>
          <td>200 <code>pong</code></td>
          <td>tutto ok</td>
          </tr>
          <tr>
          <td>401 <code>invalid signature</code></td>
          <td>il secret su GitHub è diverso da quello dell&#39;app, o il Content type non è <code>application/json</code></td>
          </tr>
          <tr>
          <td>404</td>
          <td>il Payload URL non finisce con <code>/github-webhook</code></td>
          </tr>
          <tr>
          <td>timeout / <em>couldn&#39;t connect</em></td>
          <td>la porta non è raggiungibile: firewall o port forwarding (sezione 6)</td>
          </tr>
          </tbody></table>
          <h2 id="8-token-per-repository-private">8. Token per repository private</h2>
          <p>Serve <strong>solo sul Server</strong> e <strong>solo se la repository è privata</strong>. Il Client non ne ha bisogno.</p>
          <ol>
          <li><p>Su GitHub: avatar in alto a destra → <strong>Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token</strong> (link diretto: <a href="https://github.com/settings/personal-access-tokens/new">https://github.com/settings/personal-access-tokens/new</a>).</p>
          </li>
          <li><p>Compila:</p>
          <table>
          <thead>
          <tr>
          <th>Campo</th>
          <th>Valore</th>
          </tr>
          </thead>
          <tbody><tr>
          <td>Token name</td>
          <td>es. <code>ets2-package-sync</code></td>
          </tr>
          <tr>
          <td>Expiration</td>
          <td>a scelta. Alla scadenza va generato un nuovo token e reinserito nell&#39;app</td>
          </tr>
          <tr>
          <td>Resource owner</td>
          <td>l&#39;account (o l&#39;organizzazione) proprietario della repository</td>
          </tr>
          <tr>
          <td>Repository access</td>
          <td><strong>Only select repositories</strong> → la repository dei pacchetti</td>
          </tr>
          <tr>
          <td>Permissions → Repository permissions → <strong>Contents</strong></td>
          <td><strong>Read-only</strong></td>
          </tr>
          </tbody></table>
          <p><em>Metadata: Read-only</em> viene aggiunto automaticamente. Tutto il resto resta <em>No access</em>.</p>
          <p>Per i permessi clicca <strong>Add permissions</strong>, cerca <strong>Contents</strong> e lascia <strong>Access: Read-only</strong>. Con <em>Only select repositories</em> clicca <strong>Select repositories</strong> e scegli la repository dei pacchetti.</p>
          <Shot name="github-token" alt="Nuovo fine-grained token" />
          </li>
          <li><p><strong>Generate token</strong>, copia il valore (<code>github_pat_...</code>, viene mostrato una sola volta) e incollalo nell&#39;app in <strong>GitHub token</strong>, poi <strong>Save settings</strong>.</p>
          </li>
          </ol>
          <blockquote>
          <p>Con un token sbagliato, scaduto o senza accesso alla repository GitHub risponde <strong>404</strong> (non 401).</p>
          </blockquote>
          <hr />
          <h2 id="9-prova-completa">9. Prova completa</h2>
          <ol>
          <li>Sul <strong>Server</strong> clicca <strong>Update Now</strong>: nei <strong>Logs</strong> deve comparire <code>Manual update: latest commit on main is ...</code> e poi l&#39;installazione.</li>
          <li>Sul <strong>Client</strong> esegui <code>export_server_packages</code> in ETS2 (o <strong>Push Now</strong> dopo aver cambiato qualcosa).</li>
          <li>Sul <strong>Server</strong>, entro pochi secondi: il webhook arriva, i file vengono scaricati e verificati, ETS2 viene fermato, i vecchi file finiscono in backup, i nuovi vengono installati ed ETS2 riparte.</li>
          </ol>
          <p>La pagina <strong>Logs</strong> di ciascun PC mostra tutto quello che succede, con i filtri <em>Warnings</em> ed <em>Errors</em> e il pulsante <strong>Open log file</strong> per lo storico completo.</p>
          <Shot name="logs" alt="Pagina Logs" />
          <p>Se i file del nuovo commit sono identici a quelli già installati, ETS2 <strong>non</strong> viene riavviato.</p>
          <h2 id="10-console-e-controllo-del-server">10. Console e controllo del server</h2>
          <p>Solo in modalità Server, la pagina <strong>Console</strong> mostra in tempo reale il log del server dedicato (<code>server.log.txt</code>) e permette di controllarlo:</p>
          <ul>
          <li><strong>Start</strong>, <strong>Stop</strong>, <strong>Restart</strong> (anche dal menu del tray);</li>
          <li><strong>Filter</strong> per cercare una parola, <strong>Hide warnings</strong> per nascondere i warning (es. i tanti <code>Missing default icon</code>), <strong>Follow</strong> per seguire le nuove righe, <strong>Open file</strong> per aprire il log.</li>
          </ul>
          <p>Gli errori sono in rosso, i warning in giallo, le righe <code>[MP]</code> (multiplayer) in azzurro. Il log viene riletto da capo a ogni avvio del server.</p>
          <Shot name="server-console" alt="Pagina Console" />
          <p>Se il server si chiude subito dopo l&#39;avvio, la risposta è quasi sempre nelle ultime righe della Console.</p>
          <h2 id="11-problemi-comuni">11. Problemi comuni</h2>
          <table>
          <thead>
          <tr>
          <th>Messaggio</th>
          <th>Causa e soluzione</th>
          </tr>
          </thead>
          <tbody><tr>
          <td><code>GitHub API 404 on commits/master</code></td>
          <td>Il branch nelle impostazioni è sbagliato (spesso deve essere <code>main</code>), oppure la repository è privata e il token manca / è scaduto / non include quella repository. Controlla anche il Repository URL</td>
          </tr>
          <tr>
          <td><code>ETS2 exited right after start</code></td>
          <td>Il server dedicato si è chiuso da solo: guarda la pagina <strong>Console</strong> per il motivo</td>
          </tr>
          <tr>
          <td><code>Steam log on failed - code ...</code> (nella Console)</td>
          <td>Problema del <code>server_logon_token</code> in <code>server_config.sii</code>: mancante, sbagliato, scaduto o già usato da un&#39;altra istanza del server. Generane uno nuovo su <a href="https://steamcommunity.com/dev/managegameservers">https://steamcommunity.com/dev/managegameservers</a> con App ID <code>227300</code></td>
          </tr>
          <tr>
          <td>Webhook con risposta 401</td>
          <td>Secret diverso tra GitHub e app, oppure Content type non <code>application/json</code></td>
          </tr>
          <tr>
          <td>Webhook in timeout</td>
          <td>Porta 8787 non raggiungibile: firewall di Windows o port forwarding del router</td>
          </tr>
          <tr>
          <td><code>port 8787 is already in use</code></td>
          <td>Un altro programma usa la porta: cambiala nell&#39;app <strong>e</strong> nel Payload URL su GitHub</td>
          </tr>
          <tr>
          <td>Il Client resta su <em>waiting for export_server_packages</em></td>
          <td>Il gioco non ha ancora esportato i file, oppure <strong>ETS2 documents folder</strong> punta alla cartella sbagliata</td>
          </tr>
          <tr>
          <td>Il push fallisce con errore di autenticazione</td>
          <td>Accedi di nuovo nella finestra di Git Credential Manager con un account che ha accesso in scrittura alla repository</td>
          </tr>
          <tr>
          <td><strong>Start with Windows</strong> non si attiva</td>
          <td>Funziona solo nell&#39;app installata. Se nella descrizione compare <em>Disabled in Windows</em>, riattiva l&#39;app in <em>Gestione attività → App di avvio</em></td>
          </tr>
          <tr>
          <td><em>Save settings</em> o <em>Exit</em> non rispondono</td>
          <td>È in corso un aggiornamento: aspetta che finisca</td>
          </tr>
          </tbody></table>
          <p>I file dell&#39;app (impostazioni, log, stato del server) sono in <code>%APPDATA%\ETS2 Package Sync\</code>. Webhook secret e token sono salvati cifrati e leggibili solo dal tuo utente Windows.</p>
        </article>
      </div>
    </>
  );
}
