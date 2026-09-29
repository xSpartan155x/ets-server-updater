import Shot from './Shot';

export default function GuideIt() {
  return (
    <>
      <p>Questa guida spiega passo per passo come configurare <strong>ETS2 Package Sync</strong> sul PC da cui esporti i pacchetti (<strong>Client</strong>) e sul PC che fa girare i server dedicati (<strong>Server</strong>). Lo stesso PC può fare anche tutte e due le cose.</p>
      <p>L&#39;app gestisce sia <strong>Euro Truck Simulator 2</strong> (ETS2) sia <strong>American Truck Simulator</strong> (ATS). Sul PC Server può <strong>creare e far girare più server</strong> dello stesso gioco con una sola installazione: ogni server ha la sua cartella home (configurazione, pacchetti, log) e la sua repository GitHub. Quando esporti i pacchetti dal gioco, scegli a quale server mandarli.</p>
      <pre><code>{`PC Client (giochi tu)            GitHub              PC Server (una installazione)
export_server_packages  -->  repo "EU Convoy"  <--  server "EU Convoy"  (-homedir ...\\eu-convoy)
scegli il server             repo "Scuola"     <--  server "Scuola"     (-homedir ...\\scuola)`}</code></pre>
      <h2 id="indice">Indice</h2>
      <ol>
      <li><a href="#1-cosa-serve">Cosa serve</a></li>
      <li><a href="#2-creare-le-repository-su-github">Creare le repository su GitHub</a></li>
      <li><a href="#3-installare-lapp">Installare l&#39;app</a></li>
      <li><a href="#4-configurare-il-client">Configurare il Client</a></li>
      <li><a href="#5-configurare-il-server">Configurare il Server</a></li>
      <li><a href="#6-aprire-la-porta-del-webhook">Aprire la porta del webhook</a> (solo webhook)</li>
      <li><a href="#7-creare-il-webhook-su-github">Creare il webhook su GitHub</a> (solo webhook)</li>
      <li><a href="#8-token-per-repository-private">Token per repository private</a></li>
      <li><a href="#9-prova-completa">Prova completa</a></li>
      <li><a href="#10-pagina-server">Le pagine Server</a></li>
      <li><a href="#11-aggiornare-lapp">Aggiornare l&#39;app (e passare dalla 4.x alla 5)</a></li>
      <li><a href="#12-problemi-comuni">Problemi comuni</a></li>
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
      <td>ETS2 o ATS installato, <a href="https://git-scm.com/download/win">Git for Windows</a></td>
      </tr>
      <tr>
      <td>PC Server</td>
      <td>Qualche GB liberi su disco: il server dedicato lo scarica l&#39;app con SteamCMD (va bene anche un&#39;installazione che hai già). Un <code>server_logon_token</code> di Steam per ogni server. Solo se usi il webhook: la possibilità di aprire una porta sul router</td>
      </tr>
      </tbody></table>
      <h2 id="2-creare-le-repository-su-github">2. Creare le repository su GitHub</h2>
      <p>Ogni server ha la sua repository: è il &quot;punto d&#39;incontro&quot; tra Client e quel server e contiene solo i due file dei pacchetti. Con tre server crei tre repository. Per ognuna:</p>
      <ol>
      <li><p>Su GitHub clicca <strong>+</strong> in alto a destra → <strong>New repository</strong>.</p>
      </li>
      <li><p><strong>Repository name</strong>: un nome che ricordi il server, ad esempio <code>ets2-eu-convoy</code>.</p>
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
      <p>Annota l&#39;indirizzo di ogni repository (es. <code>https://github.com/tuo-utente/ets2-eu-convoy</code>) e il branch (di solito <strong><code>main</code></strong>): servono sia sul Client che sul Server.</p>
      <h2 id="3-installare-lapp">3. Installare l&#39;app</h2>
      <p>Su <strong>entrambi</strong> i PC (o una volta sola, se Client e Server sono lo stesso PC):</p>
      <ol>
      <li>Esegui <code>ETS2PackageSync-Setup-&lt;versione&gt;.exe</code>.</li>
      <li>Se compare <em>&quot;Windows ha protetto il PC&quot;</em>: <strong>Ulteriori informazioni</strong> → <strong>Esegui comunque</strong> (l&#39;installer non è firmato digitalmente).</li>
      <li>Scegli la cartella e completa l&#39;installazione. L&#39;app si avvia da sola e apre la pagina <strong>Impostazioni</strong>.</li>
      </ol>
      <p>In alto a sinistra scegli il gioco (<strong>Euro Truck Simulator 2</strong> o <strong>American Truck Simulator</strong>): tutte le pagine mostrano il gioco scelto. Nella scheda <strong>su questo PC</strong> attiva il ruolo <strong>Client</strong>, il ruolo <strong>Server</strong> o tutti e due.</p>
      <Shot name="roles" alt="Ruoli del gioco su questo PC" />
      <blockquote>
      <p><strong>Hai già configurato l&#39;app su un altro PC?</strong> Lì apri <strong>Impostazioni → Esporta</strong> e salva il file; qui apri <strong>Impostazioni → Importa</strong> e scegli quel file. Il modulo viene compilato ma non salvato: controlla i percorsi (possono essere diversi su questo PC) e clicca <strong>Salva impostazioni</strong>. Anche l&#39;elenco dei server viene importato: copia le loro cartelle home o creane di nuove.</p>
      <p>All&#39;export l&#39;app chiede se includere webhook secret e token GitHub: nel file sono <strong>in chiaro</strong>, quindi includili solo per spostare la configurazione e non condividere il file.</p>
      </blockquote>
      <p>Chiudendo la finestra l&#39;app <strong>non</strong> si chiude: resta nell&#39;area di notifica (tray), vicino all&#39;orologio. Clic sull&#39;icona per riaprirla, tasto destro per il menu rapido (con un sottomenu per ogni server). Il pallino sull&#39;icona indica lo stato: verde ok, blu operazione in corso, rosso errore, grigio non configurato.</p>
      <p>La lingua dell&#39;app si cambia in <strong>Impostazioni → Generale → Lingua</strong>.</p>
      <hr />
      <h2 id="4-configurare-il-client">4. Configurare il Client</h2>
      <p>Il Client è il PC su cui giochi ed esporti i pacchetti.</p>
      <h3 id="41-git-for-windows">4.1 Git for Windows</h3>
      <p>Installa <a href="https://git-scm.com/download/win">Git for Windows</a> lasciando le opzioni predefinite. L&#39;app lo usa per fare il push: non devi clonare nulla a mano e non serve nessun token, le credenziali le gestisce Git.</p>
      <p>Se Git manca, quando attivi il ruolo <strong>Client</strong> compare il popup <strong>Git non rilevato</strong>: <strong>Scarica Git for Windows</strong> apre la pagina di download; dopo l&#39;installazione clicca <strong>Ricontrolla</strong>, senza riavviare l&#39;app.</p>
      <h3 id="42-cartella-del-gioco">4.2 Cartella del gioco</h3>
      <p>Nella scheda <strong>Client ETS2</strong>, <strong>Cartella documenti</strong> vuota vuol dire <code>Documenti\Euro Truck Simulator 2</code> (per ATS <code>Documenti\American Truck Simulator</code>): è la cartella in cui il gioco scrive i file esportati. Cambiala solo se il gioco usa un&#39;altra cartella.</p>
      <h3 id="43-server-a-cui-inviare">4.3 Server a cui inviare</h3>
      <p>Salva le impostazioni con il ruolo Client attivo: l&#39;app apre <strong>Server → Server a cui inviare</strong> (nella barra laterale, dove si gestisce tutto ciò che riguarda i server). Qui clicca <strong>Aggiungi server</strong> per ogni server e compila <strong>nome</strong>, <strong>URL della repository</strong> e <strong>branch</strong> (spesso <code>main</code>: quello predefinito è <code>master</code>, controllalo). Usa le stesse repository che userà il PC Server. Se su questo PC c&#39;è anche il ruolo Server dello stesso gioco, <strong>Aggiungi i server di questo PC</strong> copia in un clic le repository dei suoi server. I nomi dei file nella repository sono sotto <strong>Nomi dei file nella repository</strong> (di solito non vanno cambiati).</p>
      <Shot name="client-destinations" alt="Server a cui inviare" />
      <p>Clicca <strong>Salva</strong> in fondo alla pagina. La Dashboard mostra lo stato <strong>In ascolto</strong> e l&#39;elenco dei server, ognuno con il suo pulsante <strong>Push</strong>.</p>
      <Shot name="client-dashboard" alt="Dashboard del Client" />
      <h3 id="44-primo-export">4.4 Primo export e scelta del server</h3>
      <ol>
      <li>Avvia il gioco, apri la console (tasto <code>~</code>, se l&#39;hai abilitata) e scrivi <code>export_server_packages</code>.</li>
      <li>Con <strong>un solo server</strong> l&#39;app invia subito i file alla sua repository. Con <strong>più server</strong> compare la finestra <strong>Nuovo export</strong>: scegli il server e clicca <strong>Invia</strong> (doppio clic per fare prima). È già selezionato il server dell&#39;ultima volta. Se il gioco è a schermo intero, la finestra lampeggia nella barra delle applicazioni e arriva una notifica.</li>
      <li><strong>Solo la prima volta</strong> si apre la finestra di accesso di GitHub (Git Credential Manager): accedi con l&#39;account che può scrivere nelle repository.</li>
      <li>Su GitHub, nella repository del server scelto, compaiono <code>server_packages.sii</code> e <code>server_packages.dat</code>.</li>
      </ol>
      <Shot name="choose-server" alt="Scelta del server dopo un export" />
      <p>Con <strong>Non inviare</strong> l&#39;export resta sul PC: lo invii quando vuoi con <strong>Push</strong> accanto al server nella Dashboard.</p>
      <hr />
      <h2 id="5-configurare-il-server">5. Configurare il Server</h2>
      <p>Il Server è il PC dove girano i server dedicati.</p>
      <h3 id="51-ruolo-e-installazione">5.1 Ruolo Server e installazione</h3>
      <p>In <strong>Impostazioni</strong> attiva il ruolo <strong>Server</strong> e clicca <strong>Salva impostazioni</strong> (in <strong>Generale</strong> attiva anche <strong>Avvia con Windows</strong>, consigliato su un PC sempre acceso). Da qui in poi tutto è nella pagina <strong>Server</strong> della barra laterale. In <strong>Server → Installazione e opzioni</strong>, scheda <strong>Installazione del server dedicato</strong>, c&#39;è la cartella dove l&#39;app installa il server dedicato con SteamCMD (proposta: <code>ETS2 Package Sync\ETS2\installation</code> nella cartella del tuo utente, fuori da Documenti). Se il server dedicato è già installato, indica la sua cartella (quella che contiene <code>bin\win_x64</code>). Nella stessa pagina ci sono le opzioni di SteamCMD (sezione 5.6), il controllo di GitHub (sezione 5.3) e le <strong>Regole comuni dei server</strong> (backup, timeout di arresto, controllo all&#39;avvio).</p>
      <Shot name="server-install" alt="Installazione del server dedicato" />
      <p>Tutti i server del gioco usano questa installazione: ognuno viene avviato con <code>-nosingle -homedir &quot;&lt;sua cartella home&gt;&quot;</code>, quindi legge configurazione e pacchetti dalla sua cartella e non da Documenti.</p>
      <h3 id="52-creare-un-server">5.2 Creare un server</h3>
      <p>Clicca <strong>Nuovo server</strong> nella barra laterale (l&#39;ultima voce del gruppo <strong>Server</strong>, o il pulsante in <strong>Server → Tutti i server</strong>) e compila:</p>
      <table>
      <thead>
      <tr>
      <th>Campo</th>
      <th>Valore</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>Nome</td>
      <td>il nome del server, es. <code>EU Convoy</code>: diventa anche il nome della sessione</td>
      </tr>
      <tr>
      <td>Cartella home</td>
      <td>proposta dall&#39;app (<code>...\ETS2 Package Sync\ETS2\servers\eu-convoy</code>): qui vanno <code>server_config.sii</code>, i pacchetti e <code>server.log.txt</code></td>
      </tr>
      <tr>
      <td>Repository e branch</td>
      <td>la repository di questo server (sezione 2)</td>
      </tr>
      <tr>
      <td>Token di login del server</td>
      <td>il <code>server_logon_token</code> di Steam, uno per ogni server: <strong>Pagina di Steam</strong> apre la pagina dove crearlo (App ID <code>227300</code> per ETS2, <code>270880</code> per ATS). Si può aggiungere anche dopo</td>
      </tr>
      <tr>
      <td>Password, giocatori massimi</td>
      <td>facoltativi, modificabili dopo nella scheda <strong>Sessione</strong></td>
      </tr>
      <tr>
      <td>Primi pacchetti</td>
      <td><em>Aspetta il primo export del Client</em>, oppure copiali da un altro server o dall&#39;ultimo export del gioco su questo PC</td>
      </tr>
      </tbody></table>
      <Shot name="server-new" alt="Nuovo server" />
      <p>L&#39;app crea la cartella home con un <code>server_config.sii</code> completo e <strong>porte libere</strong> su questo PC (diverse da quelle degli altri server, anche dell&#39;altro gioco). Le porte proposte si vedono e si cambiano in <em>Opzioni avanzate</em>. Se il server dedicato non è ancora installato, con <strong>Installalo adesso</strong> parte il download con SteamCMD.</p>
      <p>Il nuovo server compare nella barra laterale sotto <strong>Server</strong>, con il suo pallino di stato: cliccalo per aprire la sua pagina (sezione 10).</p>
      <h3 id="53-nuovi-pacchetti">5.3 Controllo periodico o webhook</h3>
      <p>In <strong>Server → Installazione e opzioni</strong>, scheda <strong>Nuovi pacchetti da GitHub</strong>, scegli come il Server scopre che il Client ha inviato nuovi pacchetti alla repository di uno dei suoi server:</p>
      <table>
      <thead>
      <tr>
      <th></th>
      <th>Controllo periodico</th>
      <th>Webhook</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>Come funziona</td>
      <td>l&#39;app chiede a GitHub l&#39;ultimo commit di ogni repository ogni tot minuti</td>
      <td>GitHub avvisa il Server appena arriva il push, e l&#39;app lo passa al server di quella repository</td>
      </tr>
      <tr>
      <td>Tempo di aggiornamento</td>
      <td>al massimo l&#39;intervallo scelto (predefinito 5 minuti)</td>
      <td>pochi secondi</td>
      </tr>
      <tr>
      <td>Cosa serve</td>
      <td>niente: nessuna porta da aprire, nessun webhook</td>
      <td>una porta aperta per gioco (sezione 6) e il webhook in ogni repository (sezione 7)</td>
      </tr>
      </tbody></table>
      <Shot name="server-sync" alt="Scheda Nuovi pacchetti da GitHub" />
      <p><strong>Controllo periodico</strong>: imposta <strong>Controlla GitHub ogni</strong> in minuti (minimo 1). Ogni controllo fa una richiesta per repository e senza token GitHub ne accetta 60 all&#39;ora da uno stesso PC: con molti server o intervalli brevi imposta il <strong>Token GitHub</strong> (sezione 8).</p>
      <p><strong>Webhook</strong>: una porta per gioco (<code>8787</code> ETS2, <code>8788</code> ATS) e un solo <strong>Webhook secret</strong> (clicca <strong>Genera</strong>): nel webhook di ogni repository metti lo stesso Payload URL e lo stesso secret.</p>
      <p>Clicca <strong>Salva</strong> in fondo alla pagina.</p>
      <h3 id="54-piu-server-sullo-stesso-pc">5.4 Più server sullo stesso PC</h3>
      <ul>
      <li>Ogni server ha il suo <code>server_logon_token</code>: due server accesi con lo stesso token non partono.</li>
      <li>Ogni server ha le sue porte in <code>server_config.sii</code> (<em>connection/query dedicated port</em> e <em>virtual port</em>). L&#39;app le sceglie libere quando crea il server; per i giocatori da internet inoltra sul router le porte <em>dedicated</em> di ogni server.</li>
      <li>Per la LAN la porta di query deve stare tra <code>27015</code> e <code>27020</code>: al massimo tre server visibili in LAN.</li>
      <li>Un aggiornamento dei pacchetti riavvia solo il server della repository che è cambiata, e solo se era acceso. Un aggiornamento del server dedicato (SteamCMD) ferma tutti i server accesi di quel gioco e li riavvia alla fine.</li>
      </ul>
      <h3 id="55-ets2-e-ats-insieme">5.5 ETS2 e ATS sullo stesso PC</h3>
      <p>Scegli l&#39;altro gioco in alto a sinistra e ripeti i passi. Ogni gioco ha la sua installazione, i suoi server, la sua porta del webhook e la sua scelta tra controllo periodico e webhook.</p>
      <table>
      <thead>
      <tr>
      <th></th>
      <th>ETS2</th>
      <th>ATS</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>Eseguibile del server</td>
      <td><code>eurotrucks2_server.exe</code></td>
      <td><code>amtrucks_server.exe</code></td>
      </tr>
      <tr>
      <td>Porta del webhook</td>
      <td><code>8787</code></td>
      <td><code>8788</code></td>
      </tr>
      <tr>
      <td>App ID Steam per il <code>server_logon_token</code></td>
      <td><code>227300</code></td>
      <td><code>270880</code></td>
      </tr>
      </tbody></table>
      <p>Nella pagina <strong>Log</strong> le righe iniziano con <code>[ETS2]</code> o <code>[ATS]</code>, seguite dal nome del server.</p>
      <h3 id="56-aggiornamenti-del-server-steamcmd">5.6 Aggiornamenti del server dedicato (SteamCMD)</h3>
      <p>Quando SCS pubblica un aggiornamento del gioco, anche il server dedicato va aggiornato. L&#39;app lo fa con <strong>SteamCMD</strong>, senza client Steam e senza account: la prima volta scarica SteamCMD (circa 150 MB), poi ogni 2 ore (<strong>Controlla Steam ogni</strong>) confronta la build installata con l&#39;ultima su Steam. Con <strong>Aggiorna automaticamente</strong> attivo ferma i server accesi, aggiorna l&#39;installazione e li riavvia; se è disattivato ricevi solo una notifica.</p>
      <p>In fondo alla pagina <strong>Server → Tutti i server</strong> ci sono build installata e ultima su Steam, i pulsanti <strong>Controlla</strong> e <strong>Aggiorna installazione</strong> (o <strong>Installa ora</strong> se il server non è ancora installato) e la fase in corso durante l&#39;aggiornamento. Le opzioni (<strong>Aggiorna automaticamente</strong>, <strong>Controlla Steam ogni</strong>) sono in <strong>Server → Installazione e opzioni</strong>.</p>
      <blockquote>
      <p>Se il server dedicato è stato installato con il client Steam o copiato a mano, la build installata può risultare <em>Sconosciuta</em>: clicca una volta <strong>Aggiorna</strong> e da lì in poi gli aggiornamenti sono automatici.</p>
      </blockquote>
      <hr />
      <h2 id="6-aprire-la-porta-del-webhook">6. Aprire la porta del webhook</h2>
      <blockquote>
      <p>Solo se hai scelto il <strong>Webhook</strong> (sezione 5.3). Con il controllo periodico salta alla sezione 8.</p>
      </blockquote>
      <p>GitHub deve poter raggiungere il PC Server da internet sulla porta del webhook del gioco: 8787 per ETS2, 8788 per ATS. Una porta basta per tutti i server di quel gioco.</p>
      <ol>
      <li><p><strong>Firewall di Windows</strong>: apri il <em>Prompt dei comandi</em> <strong>come amministratore</strong> e lancia:</p>
      <pre><code>{`netsh advfirewall firewall add rule name="ETS2 Package Webhook" dir=in action=allow protocol=TCP localport=8787,8788`}</code></pre>
      </li>
      <li><p><strong>Router</strong>: crea un <em>port forwarding</em> della porta <strong>8787</strong> TCP (e <strong>8788</strong> per ATS) verso l&#39;IP LAN del PC Server (è scritto sotto il Payload URL nell&#39;app, es. <code>192.168.1.50</code>).</p>
      </li>
      <li><p><strong>Verifica</strong>: da un dispositivo <strong>fuori dalla tua rete</strong> (es. lo smartphone con la rete mobile) apri <code>http://IP_PUBBLICO:8787/health</code>. Deve comparire <code>OK</code>.</p>
      </li>
      </ol>
      <blockquote>
      <p>Se il tuo IP pubblico cambia spesso, usa un servizio DNS dinamico (es. DuckDNS, No-IP) e metti il nome al posto dell&#39;IP nel Payload URL.</p>
      </blockquote>
      <h2 id="7-creare-il-webhook-su-github">7. Creare il webhook su GitHub</h2>
      <p>Solo con il <strong>Webhook</strong>. Ripeti questi passi <strong>in ogni repository</strong> dei server del gioco, sempre con lo stesso Payload URL e lo stesso secret: l&#39;app capisce da sola a quale server appartiene il push.</p>
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
      <td>quello copiato dall&#39;app, es. <code>http://IP_PUBBLICO:8787/github-webhook</code> (ATS: porta <code>8788</code>)</td>
      </tr>
      <tr>
      <td>Content type</td>
      <td><strong><code>application/json</code></strong> (non lasciare <code>application/x-www-form-urlencoded</code>)</td>
      </tr>
      <tr>
      <td>Secret</td>
      <td>il <strong>Webhook secret</strong> dell&#39;app</td>
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
      <table>
      <thead>
      <tr>
      <th>Risposta in Recent Deliveries</th>
      <th>Significato</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>200 <code>pong</code> / 202 <code>queued ... for EU Convoy</code></td>
      <td>tutto ok</td>
      </tr>
      <tr>
      <td>202 <code>ignored: no server uses ...</code></td>
      <td>nessun server usa quella repository e quel branch: controlla repository e branch del server</td>
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
      <p>Serve <strong>solo sul Server</strong> e <strong>solo se le repository sono private</strong> (oppure, con il controllo periodico, quando le richieste superano le 60 all&#39;ora). Un token può coprire tutte le repository dei server. Il Client non ne ha bisogno.</p>
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
      <td>l&#39;account (o l&#39;organizzazione) proprietario delle repository</td>
      </tr>
      <tr>
      <td>Repository access</td>
      <td><strong>Only select repositories</strong> → le repository dei server</td>
      </tr>
      <tr>
      <td>Permissions → Repository permissions → <strong>Contents</strong></td>
      <td><strong>Read-only</strong></td>
      </tr>
      </tbody></table>
      <Shot name="github-token" alt="Nuovo fine-grained token" />
      </li>
      <li><p><strong>Generate token</strong>, copia il valore (<code>github_pat_...</code>, viene mostrato una sola volta) e incollalo nell&#39;app in <strong>Server → Installazione e opzioni → Token GitHub</strong>, poi <strong>Salva</strong>.</p>
      </li>
      </ol>
      <blockquote>
      <p>Con un token sbagliato, scaduto o senza accesso alla repository GitHub risponde <strong>404</strong> (non 401).</p>
      </blockquote>
      <hr />
      <h2 id="9-prova-completa">9. Prova completa</h2>
      <ol>
      <li>Sul <strong>Client</strong> esegui <code>export_server_packages</code> nel gioco e, se hai più server, scegli quello da provare.</li>
      <li>Sul <strong>Server</strong>, entro pochi secondi con il webhook (o al controllo successivo, oppure subito con <strong>Controlla ora</strong> nella Dashboard): arriva il nuovo commit, i file vengono scaricati e verificati, installati nella cartella home del server e, se il server era acceso, riavviato con i nuovi pacchetti.</li>
      <li>Nella pagina del server clicca <strong>Avvia</strong> e guarda la <strong>Console</strong>.</li>
      </ol>
      <Shot name="server-dashboard" alt="Dashboard del Server" />
      <p>La pagina <strong>Log</strong> di ciascun PC mostra tutto quello che succede, con i filtri <em>Warning</em> ed <em>Errori</em> e il pulsante <strong>Apri file di log</strong>.</p>
      <Shot name="logs" alt="Pagina Logs" />
      <p>Se i file del nuovo commit sono identici a quelli installati, il server <strong>non</strong> viene riavviato. Prima di ogni installazione i file precedenti finiscono in <code>backups</code> nella cartella home; se il server si chiude subito dopo l&#39;aggiornamento, l&#39;app rimette i file di prima.</p>
      <h2 id="10-pagina-server">10. Le pagine Server</h2>
      <p>Tutto ciò che riguarda i server è nel gruppo <strong>Server</strong> della barra laterale, che si apre a tendina. Con tutti e due i ruoli attivi è diviso in <strong>Ospitati su questo PC</strong> e <strong>Invio dal Client</strong>:</p>
      <ul>
      <li><strong>Tutti i server</strong>: una scheda per server con stato, cartella home, repository, commit installato e i pulsanti <strong>Avvia/Ferma</strong>, <strong>Riavvia</strong>, <strong>Scarica pacchetti</strong> (<strong>Avvia tutti</strong> e <strong>Ferma tutti</strong> in alto); in fondo l&#39;installazione condivisa e i suoi aggiornamenti (sezione 5.6). Un pallino arancione sulla voce indica una build nuova, un aggiornamento in corso o il server dedicato non ancora installato.</li>
      <li><strong>un elemento per ogni server</strong>, con il pallino del suo stato: apre la pagina di quel server.</li>
      <li><strong>Nuovo server</strong>: apre la creazione guidata di un server (sezione 5.2).</li>
      <li><strong>Installazione e opzioni</strong>: cartella dell&#39;installazione e aggiornamenti con SteamCMD, controllo periodico o webhook di GitHub, token e regole comuni a tutti i server.</li>
      <li><strong>Server a cui inviare</strong> (ruolo Client): i server a cui il Client invia i pacchetti esportati (sezione 4.3).</li>
      </ul>
      <Shot name="servers-list" alt="Tutti i server" />
      <p>La pagina di un server ha i comandi in alto (<strong>Avvia/Ferma</strong>, <strong>Riavvia</strong>, <strong>Scarica pacchetti</strong>: scarica da GitHub e installa l&#39;ultimo commit della sua repository) e tre schede, tutte solo di quel server:</p>
      <ul>
      <li><strong>Console</strong>: il suo <code>server.log.txt</code> in tempo reale, con <strong>Filtra</strong>, <strong>Nascondi warning</strong>, <strong>Segui</strong> e <strong>Apri file</strong>. Errori in rosso, warning in giallo, righe <code>[MP]</code> in azzurro.</li>
      <li><strong>Sessione</strong>: il suo <code>server_config.sii</code>: nome, descrizione, messaggio di benvenuto, password, giocatori massimi, token di Steam, opzioni di gioco, veicoli AI, porte e moderatori (con nome e avatar di Steam, aggiunti con lo Steam ID o il link del profilo). Vengono cambiati solo i valori e la versione precedente resta in <code>server_config.sii.bak</code>. <strong>Salva e riavvia il server</strong> applica subito le modifiche. Se il file manca, <strong>Crea server_config.sii</strong> lo crea con porte libere.</li>
      <li><strong>Server e repository</strong>: nome nell&#39;app, cartella home (solo a server fermo), argomenti di avvio, repository e branch, ed <strong>Elimina</strong>: toglie il server dall&#39;app e, se vuoi, sposta la sua cartella home nel Cestino. La repository su GitHub non viene toccata.</li>
      </ul>
      <Shot name="server-page" alt="Pagina di un server" />
      <p>Se un server si chiude subito dopo l&#39;avvio, la risposta è quasi sempre nelle ultime righe della sua Console.</p>
      <h2 id="11-aggiornare-lapp">11. Aggiornare l&#39;app (e passare dalla 4.x alla 5)</h2>
      <p>In basso a sinistra c&#39;è il riquadro della <strong>versione</strong>. L&#39;app controlla da sola le nuove versioni all&#39;avvio e ogni 6 ore: quando compare <strong>Versione X disponibile</strong> clicca <strong>Scarica</strong>, poi <strong>Riavvia per aggiornare</strong>. L&#39;aggiornamento non ferma i server dedicati. La versione <strong>portable</strong> (.zip) non si aggiorna da sola.</p>
      <p><strong>Dalla 4.x alla 5</strong> le impostazioni vengono convertite da sole, senza perdere niente:</p>
      <ul>
      <li>un PC in modalità <strong>Server</strong> diventa il ruolo Server con un server chiamato <em>ETS2 server</em> (o <em>ATS server</em>): cartella home = la cartella del suo <code>server_packages.sii</code> (di solito Documenti), stessa repository e stesso webhook o controllo periodico. L&#39;installazione è quella del suo eseguibile e lo storico dei commit installati viene mantenuto;</li>
      <li>un PC in modalità <strong>Client</strong> diventa il ruolo Client con un server a cui inviare: la sua repository;</li>
      <li>il file delle impostazioni della 4.x resta accanto al nuovo come <code>settings.v4.json</code>.</li>
      </ul>
      <p>Da lì puoi aggiungere altri server. Una differenza: un aggiornamento dei pacchetti ora riavvia un server solo se era acceso (nella 4.x lo avviava sempre).</p>
      <h2 id="12-problemi-comuni">12. Problemi comuni</h2>
      <table>
      <thead>
      <tr>
      <th>Messaggio</th>
      <th>Causa e soluzione</th>
      </tr>
      </thead>
      <tbody><tr>
      <td><code>GitHub API 404 su .../commits/master</code></td>
      <td>Il branch del server è sbagliato (spesso deve essere <code>main</code>), oppure la repository è privata e il token manca / è scaduto / non include quella repository. Controlla anche l&#39;URL della repository</td>
      </tr>
      <tr>
      <td><code>GitHub API 403 ... rate limit exceeded</code></td>
      <td>Con il controllo periodico senza token si superano le 60 richieste all&#39;ora di GitHub: aumenta <strong>Controlla GitHub ogni</strong> o imposta il <strong>Token GitHub</strong> (sezione 8)</td>
      </tr>
      <tr>
      <td><code>server_packages.sii/.dat di ... non ancora presenti</code></td>
      <td>Il server non ha ancora ricevuto pacchetti: esegui <code>export_server_packages</code> sul Client e invialo a quel server (o <strong>Scarica pacchetti</strong> se sono già nella repository)</td>
      </tr>
      <tr>
      <td><code>Steam log on failed - code ...</code> (nella Console)</td>
      <td>Problema del <code>server_logon_token</code>: mancante, sbagliato, scaduto o <strong>usato da un altro server acceso</strong>. Ogni server vuole il suo token: generane uno su <a href="https://steamcommunity.com/dev/managegameservers">https://steamcommunity.com/dev/managegameservers</a></td>
      </tr>
      <tr>
      <td>Un server si chiude subito o non si vede nella lista dei server</td>
      <td>Porte uguali a quelle di un altro server acceso: cambiale nella scheda <strong>Sessione → Porte</strong> (e inoltrale sul router)</td>
      </tr>
      <tr>
      <td><code>... usano la stessa cartella home</code></td>
      <td>Ogni server vuole una cartella home propria, anche tra ETS2 e ATS</td>
      </tr>
      <tr>
      <td>Webhook con risposta 401</td>
      <td>Secret diverso tra GitHub e app, oppure Content type non <code>application/json</code></td>
      </tr>
      <tr>
      <td>Webhook in timeout</td>
      <td>Porta del webhook (8787 / 8788) non raggiungibile: firewall di Windows o port forwarding del router</td>
      </tr>
      <tr>
      <td><code>la porta 8787 è già in uso</code></td>
      <td>Un altro programma usa la porta: cambiala nell&#39;app <strong>e</strong> nel Payload URL su GitHub</td>
      </tr>
      <tr>
      <td>Il Client resta su <em>in attesa di export_server_packages</em></td>
      <td>Il gioco non ha ancora esportato i file, oppure la <strong>Cartella documenti</strong> punta alla cartella sbagliata</td>
      </tr>
      <tr>
      <td>Il push fallisce con errore di autenticazione</td>
      <td>Accedi di nuovo nella finestra di Git Credential Manager con un account che può scrivere nella repository</td>
      </tr>
      <tr>
      <td><code>Aggiornamento con SteamCMD non riuscito: ERROR! ... (Disk write failure)</code></td>
      <td>Spazio su disco insufficiente o cartella dell&#39;installazione non scrivibile. I server ripartono comunque con i file di prima</td>
      </tr>
      <tr>
      <td><em>Salva impostazioni</em> o <em>Esci</em> non rispondono</td>
      <td>È in corso un aggiornamento (dei pacchetti o del server con SteamCMD): aspetta che finisca</td>
      </tr>
      </tbody></table>
      <p>I file dell&#39;app (impostazioni, log, storico dei server) sono in <code>%APPDATA%\ETS2 Package Sync\</code>. Webhook secret e token sono salvati cifrati e leggibili solo dal tuo utente Windows.</p>
    </>
  );
}
