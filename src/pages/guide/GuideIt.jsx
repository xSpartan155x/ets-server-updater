import Shot from './Shot';

export default function GuideIt() {
  return (
    <>
      <p>Questa guida spiega passo per passo come configurare <strong>ETS2 Package Sync</strong> sul PC da cui esporti i pacchetti (<strong>Client</strong>) e sul PC che fa girare il server dedicato (<strong>Server</strong>).</p>
      <p>L&#39;app gestisce sia <strong>Euro Truck Simulator 2</strong> (ETS2) sia <strong>American Truck Simulator</strong> (ATS), anche insieme sullo stesso PC: ogni gioco ha modalità e repository propri. I passi sono gli stessi per i due giochi; dove cambia qualcosa è indicato.</p>
      <p>Alla fine, ogni volta che esporti i pacchetti dal gioco, il server dedicato si aggiornerà e si riavvierà da solo.</p>
      <pre><code>{`PC Client (giochi tu)        GitHub                  PC Server (server dedicato)
export_server_packages  -->  repository  <--controlla--  scarica i file, ferma ETS2,
l'app fa il push                          (o webhook)     sostituisce, riavvia ETS2`}</code></pre>
      <h2 id="indice">Indice</h2>
      <ol>
      <li><a href="#1-cosa-serve">Cosa serve</a></li>
      <li><a href="#2-creare-la-repository-su-github">Creare la repository su GitHub</a></li>
      <li><a href="#3-installare-lapp">Installare l&#39;app</a></li>
      <li><a href="#4-configurare-il-client">Configurare il Client</a></li>
      <li><a href="#5-configurare-il-server">Configurare il Server</a></li>
      <li><a href="#6-aprire-la-porta-del-webhook">Aprire la porta del webhook</a> (solo webhook)</li>
      <li><a href="#7-creare-il-webhook-su-github">Creare il webhook su GitHub</a> (solo webhook)</li>
      <li><a href="#8-token-per-repository-private">Token per repository private</a></li>
      <li><a href="#9-prova-completa">Prova completa</a></li>
      <li><a href="#10-pagina-server">Pagina Server: controllo, console e aggiornamenti</a></li>
      <li><a href="#11-aggiornare-lapp">Aggiornare l&#39;app</a></li>
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
      <td>ETS2 installato, <a href="https://git-scm.com/download/win">Git for Windows</a></td>
      </tr>
      <tr>
      <td>PC Server</td>
      <td>Il server dedicato di ETS2 già funzionante (con il suo <code>server_config.sii</code> e il <code>server_logon_token</code> di Steam). Solo se usi il webhook: la possibilità di aprire una porta sul router</td>
      </tr>
      </tbody></table>
      <blockquote>
      <p>Prima di usare l&#39;app, verifica che il server dedicato parta correttamente da solo (doppio clic su <code>eurotrucks2_server.exe</code> per ETS2 o <code>amtrucks_server.exe</code> per ATS). L&#39;app lo avvia e lo ferma, ma non può correggere una configurazione del gioco sbagliata.</p>
      </blockquote>
      <h2 id="2-creare-la-repository-su-github">2. Creare la repository su GitHub</h2>
      <p>La repository è il &quot;punto d&#39;incontro&quot; tra Client e Server: contiene solo i due file dei pacchetti.</p>
      <ol>
      <li><p>Su GitHub clicca <strong>+</strong> in alto a destra → <strong>New repository</strong>.</p>
      </li>
      <li><p><strong>Repository name</strong>: ad esempio <code>ets2-server-packages</code> (per ATS una seconda repository, es. <code>ats-server-packages</code>).</p>
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
      <p>Annota l&#39;indirizzo della repository (es. <code>https://github.com/tuo-utente/ets2-server-packages</code>) e il nome del branch (di solito <strong><code>main</code></strong>): servono sia sul Client che sul Server. Se usi entrambi i giochi, ripeti questi passi per la repository di ATS: ogni gioco deve avere la sua repository (o almeno un branch diverso).</p>
      <h2 id="3-installare-lapp">3. Installare l&#39;app</h2>
      <p>Su <strong>entrambi</strong> i PC:</p>
      <ol>
      <li>Esegui <code>ETS2PackageSync-Setup-&lt;versione&gt;.exe</code>.</li>
      <li>Se compare <em>&quot;Windows ha protetto il PC&quot;</em>: <strong>Ulteriori informazioni</strong> → <strong>Esegui comunque</strong> (l&#39;installer non è firmato digitalmente).</li>
      <li>Scegli la cartella e completa l&#39;installazione. L&#39;app si avvia da sola.</li>
      </ol>
      <p>Al primo avvio si apre la pagina <strong>Impostazioni</strong> con la modalità dei giochi ancora da scegliere:</p>
      <Shot name="primo-avvio" alt="Primo avvio: pagina Settings" />
      <blockquote>
      <p><strong>Hai già configurato l&#39;app su un altro PC?</strong> Lì apri <strong>Impostazioni → Esporta</strong> e salva il file; qui apri <strong>Impostazioni → Importa</strong> e scegli quel file. Il modulo viene compilato ma non salvato: controlla i percorsi (cartelle ed eseguibile possono essere diversi su questo PC) e clicca <strong>Salva impostazioni</strong>.</p>
      <p>All&#39;export l&#39;app chiede se includere webhook secret e token GitHub: nel file sono <strong>in chiaro</strong>, quindi includili solo per spostare la configurazione e non condividere il file. Senza secret, l&#39;import mantiene quelli già presenti su questo PC. Tema, lingua e <em>Avvia con Windows</em> non vengono copiati.</p>
      </blockquote>
      <p>Chiudendo la finestra l&#39;app <strong>non</strong> si chiude: resta nell&#39;area di notifica (tray), vicino all&#39;orologio. Clic sull&#39;icona per riaprirla, tasto destro per il menu rapido. Il pallino sull&#39;icona indica lo stato: verde ok, blu operazione in corso, rosso errore, grigio non configurato. Con due giochi in uso, il menu ha un sottomenu per ciascuno e il pallino mostra lo stato peggiore dei due.</p>
      <p>La lingua dell&#39;app si cambia in <strong>Impostazioni → Generale → Lingua</strong>: <strong>Automatica</strong> segue la lingua di Windows, <strong>English</strong> e <strong>Italiano</strong> la fissano. Si applica subito, senza salvare.</p>
      <hr />
      <h2 id="4-configurare-il-client">4. Configurare il Client</h2>
      <p>Il Client è il PC su cui giochi ed esporti i pacchetti.</p>
      <h3 id="41-git-for-windows">4.1 Git for Windows</h3>
      <p>Installa <a href="https://git-scm.com/download/win">Git for Windows</a> lasciando le opzioni predefinite. L&#39;app lo usa per fare il push: non devi clonare nulla a mano e non serve nessun token, le credenziali le gestisce Git.</p>
      <p>Se Git manca, quando scegli la modalità <strong>Client</strong> (e a ogni avvio) compare il popup <strong>Git non rilevato</strong>: <strong>Scarica Git for Windows</strong> apre la pagina di download; dopo l&#39;installazione clicca <strong>Ricontrolla</strong> e la modalità Client parte subito, senza riavviare l&#39;app.</p>
      <h3 id="42-modalità">4.2 Modalità</h3>
      <p>In alto a sinistra clicca sul nome del gioco e scegli <strong>Euro Truck Simulator 2</strong> o <strong>American Truck Simulator</strong>: Dashboard, Server e Impostazioni mostrano sempre il gioco scelto. Poi in <strong>Impostazioni</strong> scegli <strong>Client</strong>. In <strong>Generale</strong> attiva <strong>Avvia con Windows</strong> se vuoi che l&#39;app parta da sola all&#39;accesso (si avvia ridotta nel tray).</p>
      <Shot name="client-modalita" alt="Modalità Client" />
      <h3 id="43-repository">4.3 Repository</h3>
      <p>Nella scheda <strong>Repository GitHub</strong>:</p>
      <table>
      <thead>
      <tr>
      <th>Campo</th>
      <th>Valore</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>URL della repository</td>
      <td>l&#39;indirizzo della repository, es. <code>https://github.com/tuo-utente/ets2-server-packages</code></td>
      </tr>
      <tr>
      <td>Branch</td>
      <td><code>main</code> (o il branch della tua repository)</td>
      </tr>
      <tr>
      <td>File SII / DAT nella repository</td>
      <td>lascia <code>server_packages.sii</code> e <code>server_packages.dat</code></td>
      </tr>
      </tbody></table>
      <Shot name="repository" alt="Scheda GitHub repository" />
      <blockquote>
      <p>Il branch predefinito è <code>master</code>: le repository nuove di GitHub usano <code>main</code>, quindi controllalo.</p>
      </blockquote>
      <h3 id="44-cartella-del-gioco">4.4 Cartella del gioco</h3>
      <p>Nella scheda <strong>Client ETS2</strong>, <strong>Cartella documenti di ETS2</strong> è già compilata con <code>Documenti\Euro Truck Simulator 2</code> (per ATS <code>Documenti\American Truck Simulator</code>): è la cartella in cui il gioco scrive i file esportati (quella con <code>profiles</code>, <code>config.cfg</code>, <code>game.log.txt</code>). Cambiala solo se il gioco usa un&#39;altra cartella.</p>
      <p>In <em>Opzioni avanzate</em> puoi cambiare il messaggio dei commit e quanti secondi aspettare dopo l&#39;ultima modifica dei file prima del push.</p>
      <Shot name="client-impostazioni" alt="Scheda Client" />
      <h3 id="45-salvare">4.5 Salvare</h3>
      <p>Clicca <strong>Salva impostazioni</strong> in basso a destra. La Dashboard mostra lo stato <strong>In ascolto - in attesa di export_server_packages</strong>: è normale, l&#39;app è pronta e aspetta il primo export.</p>
      <Shot name="client-dashboard" alt="Dashboard del Client" />
      <p>Il riquadro <em>Percorso dei file</em> riassume il percorso dei file: cartella del gioco → clone temporaneo (cancellato dopo ogni push) → GitHub.</p>
      <h3 id="46-primo-push">4.6 Primo push</h3>
      <ol>
      <li>Avvia ETS2, apri la console (tasto <code>~</code>, se l&#39;hai abilitata) e scrivi <code>export_server_packages</code>.</li>
      <li>Dopo pochi secondi l&#39;app clona la repository, copia i file e fa il push.</li>
      <li><strong>Solo la prima volta</strong> si apre la finestra di accesso di GitHub (Git Credential Manager): accedi con l&#39;account che ha accesso in scrittura alla repository. Le credenziali restano salvate in Windows.</li>
      <li>Su GitHub, nella repository, compaiono <code>server_packages.sii</code> e <code>server_packages.dat</code>.</li>
      </ol>
      <p>Il pulsante <strong>Push ora</strong> rifà subito il controllo, <strong>Apri repository</strong> apre la repository nel browser.</p>
      <hr />
      <h2 id="5-configurare-il-server">5. Configurare il Server</h2>
      <p>Il Server è il PC dove gira il server dedicato di ETS2.</p>
      <h3 id="51-modalità-e-repository">5.1 Modalità e repository</h3>
      <p>Scegli il gioco in alto a sinistra e poi, in <strong>Impostazioni</strong>, <strong>Server</strong>. In <strong>Generale</strong>, se vuoi, attiva <strong>Avvia con Windows</strong> (consigliato su un server sempre acceso).</p>
      <Shot name="server-modalita" alt="Modalità Server" />
      <p>Compila la scheda <strong>Repository GitHub</strong> con <strong>gli stessi valori del Client</strong> (URL e branch).</p>
      <h3 id="52-server-dedicato">5.2 Server dedicato</h3>
      <p>Nella scheda <strong>Server dedicato ETS2</strong> (o <strong>Server dedicato ATS</strong>):</p>
      <table>
      <thead>
      <tr>
      <th>Campo</th>
      <th>Valore</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>Eseguibile del server ETS2 / ATS</td>
      <td><code>eurotrucks2_server.exe</code> (ATS: <code>amtrucks_server.exe</code>), di solito in <code>...\bin\win_x64\</code> della cartella del server</td>
      </tr>
      <tr>
      <td>server_packages.sii usato dal server</td>
      <td>il file <code>server_packages.sii</code> che il server legge, di solito in <code>Documenti\Euro Truck Simulator 2</code> (o <code>American Truck Simulator</code>) dell&#39;utente che avvia il server</td>
      </tr>
      <tr>
      <td>server_packages.dat usato dal server</td>
      <td>lo stesso per il <code>.dat</code></td>
      </tr>
      </tbody></table>
      <p>Usa <strong>Sfoglia</strong> per selezionarli senza sbagliare il percorso.</p>
      <Shot name="server-ets2" alt="Scheda ETS2 dedicated server" />
      <p><em>Opzioni avanzate</em> (di solito si possono lasciare vuote/predefinite):</p>
      <table>
      <thead>
      <tr>
      <th>Campo</th>
      <th>A cosa serve</th>
      </tr>
      </thead>
      <tbody><tr>
      <td>Cartella di lavoro</td>
      <td>cartella da cui avviare il server. Vuoto = cartella dell&#39;eseguibile</td>
      </tr>
      <tr>
      <td>Argomenti da riga di comando</td>
      <td>argomenti extra per l&#39;eseguibile del server</td>
      </tr>
      <tr>
      <td>Cartella dei backup</td>
      <td>dove salvare i file precedenti prima di ogni aggiornamento. Vuoto = <code>backups</code> accanto al <code>.sii</code></td>
      </tr>
      <tr>
      <td>Backup da conservare</td>
      <td>quanti backup conservare</td>
      </tr>
      <tr>
      <td>Timeout di arresto</td>
      <td>secondi di attesa per la chiusura di ETS2</td>
      </tr>
      <tr>
      <td>Controllo all&#39;avvio</td>
      <td>ETS2 deve restare acceso almeno questi secondi dopo l&#39;avvio, altrimenti l&#39;aggiornamento viene annullato e si torna ai file precedenti. 0 = disattivato</td>
      </tr>
      <tr>
      <td>File di log del server</td>
      <td>il log mostrato in <strong>Server → Console</strong>. Vuoto = <code>server.log.txt</code> accanto al <code>.sii</code></td>
      </tr>
      </tbody></table>
      <h3 id="53-nuovi-pacchetti">5.3 Controllo periodico o webhook</h3>
      <p>Nella scheda <strong>Nuovi pacchetti da GitHub</strong> scegli come il Server scopre che il Client ha inviato nuovi pacchetti:</p>
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
      <td>l&#39;app chiede a GitHub se c&#39;è un commit nuovo ogni tot minuti</td>
      <td>GitHub avvisa il Server appena arriva il push</td>
      </tr>
      <tr>
      <td>Tempo di aggiornamento</td>
      <td>al massimo l&#39;intervallo scelto (predefinito 5 minuti)</td>
      <td>pochi secondi</td>
      </tr>
      <tr>
      <td>Cosa serve</td>
      <td>niente: nessuna porta da aprire, nessun webhook su GitHub</td>
      <td>una porta aperta su firewall e router (sezione 6) e il webhook su GitHub (sezione 7)</td>
      </tr>
      </tbody></table>
      <Shot name="server-sync" alt="Scheda Nuovi pacchetti da GitHub" />
      <p><strong>Controllo periodico</strong> (consigliato se non puoi o non vuoi aprire porte sul router): imposta <strong>Controlla GitHub ogni</strong> in minuti (minimo 1). Senza token GitHub accetta 60 richieste all&#39;ora da uno stesso PC: per controllare più spesso di ogni 5 minuti, o con ETS2 e ATS insieme a intervalli brevi, imposta il <strong>Token GitHub</strong>. Le sezioni 6 e 7 non servono.</p>
      <p><strong>Webhook</strong>:</p>
      <ol>
      <li><strong>Porta</strong>: lascia quella proposta, <code>8787</code> per ETS2 e <code>8788</code> per ATS (ogni server deve usare una porta diversa; cambiala solo se è già usata da altro).</li>
      <li><strong>Webhook secret</strong>: clicca <strong>Genera</strong>. Poi clicca sull&#39;icona dell&#39;occhio e copia il valore: servirà su GitHub (sezione 7).</li>
      <li><strong>Payload URL</strong>: clicca <strong>Rileva IP pubblico</strong> per ottenere l&#39;indirizzo completo da incollare su GitHub, poi <strong>Copia</strong>.</li>
      </ol>
      <Shot name="server-webhook" alt="Campi del webhook" />
      <p>In entrambi i casi il <strong>Token GitHub</strong> serve solo se la repository è <strong>privata</strong> (vedi sezione 8).</p>
      <h3 id="54-salvare">5.4 Salvare</h3>
      <p>Clicca <strong>Salva impostazioni</strong>. La Dashboard mostra lo stato del server, il commit installato e, a seconda della scelta, l&#39;ora dell&#39;ultimo controllo di GitHub o il Payload URL del webhook. Per vedere l&#39;altro gioco, sceglilo dal menu in alto a sinistra.</p>
      <Shot name="server-dashboard" alt="Dashboard del Server" />
      <ul>
      <li><strong>Aggiorna ora</strong>: scarica subito l&#39;ultimo commit da GitHub e lo installa (utile anche per provare la configurazione).</li>
      <li>il riquadro <strong>Server ETS2</strong> (o <strong>Server ATS</strong>) apre la pagina <strong>Server</strong>, dove si avvia, ferma e riavvia il server dedicato (sezione 10).</li>
      </ul>
      <h3 id="55-ets2-e-ats-insieme">5.5 ETS2 e ATS sullo stesso PC</h3>
      <p>Per gestire entrambi i server dallo stesso PC, configura prima un gioco, poi scegli l&#39;altro dal menu in alto a sinistra e ripeti i passi 5.1-5.4. Le differenze:</p>
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
      <td>Cartella documenti</td>
      <td><code>Euro Truck Simulator 2</code></td>
      <td><code>American Truck Simulator</code></td>
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
      <p>Ogni gioco usa la sua repository e sceglie da solo tra controllo periodico e webhook; con il webhook ognuno ha il suo secret e il suo webhook su GitHub (la porta va aperta solo per i giochi che usano il webhook). Nella pagina <strong>Log</strong> le righe iniziano con <code>[ETS2]</code> o <code>[ATS]</code>; le notifiche riportano il nome del gioco.</p>
      <h3 id="56-aggiornamenti-del-server-steamcmd">5.6 Aggiornamenti del server dedicato (SteamCMD)</h3>
      <p>Quando SCS pubblica un aggiornamento del gioco, anche il server dedicato va aggiornato. Il PC Server lo fa da solo con <strong>SteamCMD</strong>, senza client Steam e senza account: i server dedicati di ETS2 e ATS si scaricano in modo anonimo.</p>
      <ul>
      <li>La prima volta l&#39;app scarica SteamCMD nella sua cartella dati (circa 150 MB, un minuto circa).</li>
      <li>Ogni 2 ore (<strong>Controlla Steam ogni</strong>) confronta la build installata con l&#39;ultima pubblicata su Steam.</li>
      <li>Se c&#39;è una build nuova e <strong>Aggiorna il server automaticamente</strong> è attivo, ferma il server, lo aggiorna e lo riavvia. Se è disattivato ricevi solo una notifica.</li>
      </ul>
      <p>Le opzioni sono in <strong>Server → Aggiornamenti</strong>, riquadro <strong>Aggiornamenti del server (SteamCMD)</strong>: l&#39;interruttore si applica subito, ore e cartella con <strong>Salva</strong>, senza riavviare il server. <strong>Cartella del server</strong> è la cartella dove SteamCMD installa i file: vuota = quella che contiene <code>bin\win_x64</code> dell&#39;eseguibile, che di solito è giusta.</p>
      <p>In <strong>Server → Aggiornamenti</strong> il riquadro <strong>Server dedicato (Steam)</strong> mostra la build installata e l&#39;ultima su Steam, con i pulsanti <strong>Controlla</strong> e <strong>Aggiorna server</strong>. Durante l&#39;aggiornamento compare la fase (preparazione, download con la dimensione, verifica, installazione).</p>
      <blockquote>
      <p>Se il server è stato installato con il client Steam o copiato a mano, la build installata può risultare <em>Sconosciuta</em>: clicca una volta <strong>Aggiorna server</strong> e da lì in poi gli aggiornamenti sono automatici. Con <strong>Aggiorna server</strong> puoi anche installare il server da zero: imposta prima il percorso dell&#39;eseguibile dove vuoi che venga installato.</p>
      </blockquote>
      <hr />
      <h2 id="6-aprire-la-porta-del-webhook">6. Aprire la porta del webhook</h2>
      <blockquote>
      <p>Solo se hai scelto il <strong>Webhook</strong> (sezione 5.3). Con il controllo periodico salta alla sezione 8.</p>
      </blockquote>
      <p>GitHub deve poter raggiungere il PC Server da internet sulla porta del webhook: 8787 per ETS2, 8788 per ATS.</p>
      <ol>
      <li><p><strong>Firewall di Windows</strong>: apri il <em>Prompt dei comandi</em> <strong>come amministratore</strong> e lancia:</p>
      <pre><code>{`netsh advfirewall firewall add rule name="ETS2 Package Webhook" dir=in action=allow protocol=TCP localport=8787,8788`}</code></pre>
      <p>La regola apre le porte di entrambi i giochi; se ne usi uno solo basta la sua.</p>
      </li>
      <li><p><strong>Router</strong>: nella pagina di configurazione del router crea un <em>port forwarding</em> (a volte chiamato &quot;virtual server&quot; o &quot;NAT&quot;):
      porta esterna <strong>8787</strong> TCP → IP LAN del PC Server (è scritto sotto il Payload URL nell&#39;app, es. <code>192.168.1.50</code>), porta interna <strong>8787</strong>. Per ATS aggiungi una regola uguale con la porta <strong>8788</strong>.</p>
      </li>
      <li><p><strong>Verifica</strong>: da un altro dispositivo <strong>fuori dalla tua rete</strong> (es. lo smartphone con la rete mobile) apri <code>http://IP_PUBBLICO:8787/health</code> (ATS: <code>:8788/health</code>). Deve comparire <code>OK</code>.</p>
      </li>
      </ol>
      <blockquote>
      <p>Se il tuo IP pubblico cambia spesso, usa un servizio DNS dinamico (es. DuckDNS, No-IP) e metti il nome al posto dell&#39;IP nel Payload URL.</p>
      </blockquote>
      <h2 id="7-creare-il-webhook-su-github">7. Creare il webhook su GitHub</h2>
      <p>Solo con il <strong>Webhook</strong>. Ogni gioco ha la sua repository e quindi il suo webhook: con ETS2 e ATS ripeti questi passi nella repository di ciascun gioco, con il Payload URL e il secret di quel gioco.</p>
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
      <p>Serve <strong>solo sul Server</strong> e <strong>solo se la repository è privata</strong> (oppure, con il controllo periodico, per controllare più spesso di ogni 5 minuti). Il Client non ne ha bisogno.</p>
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
      <li><p><strong>Generate token</strong>, copia il valore (<code>github_pat_...</code>, viene mostrato una sola volta) e incollalo nell&#39;app in <strong>Token GitHub</strong>, poi <strong>Salva impostazioni</strong>.</p>
      </li>
      </ol>
      <blockquote>
      <p>Con un token sbagliato, scaduto o senza accesso alla repository GitHub risponde <strong>404</strong> (non 401).</p>
      </blockquote>
      <hr />
      <h2 id="9-prova-completa">9. Prova completa</h2>
      <ol>
      <li>Sul <strong>Server</strong> clicca <strong>Aggiorna ora</strong>: nei <strong>Log</strong> deve comparire <code>[ETS2] Manual update: latest commit on main is ...</code> e poi l&#39;installazione (le righe del log sono sempre in inglese).</li>
      <li>Sul <strong>Client</strong> esegui <code>export_server_packages</code> in ETS2 (o <strong>Push ora</strong> dopo aver cambiato qualcosa).</li>
      <li>Sul <strong>Server</strong>, entro pochi secondi con il webhook (o al controllo successivo con il controllo periodico): arriva il nuovo commit, i file vengono scaricati e verificati, ETS2 viene fermato, i vecchi file finiscono in backup, i nuovi vengono installati ed ETS2 riparte.</li>
      </ol>
      <p>La pagina <strong>Log</strong> di ciascun PC mostra tutto quello che succede, con i filtri <em>Warning</em> ed <em>Errori</em> e il pulsante <strong>Apri file di log</strong> per lo storico completo.</p>
      <Shot name="logs" alt="Pagina Logs" />
      <p>Se i file del nuovo commit sono identici a quelli già installati, ETS2 <strong>non</strong> viene riavviato.</p>
      <h2 id="10-pagina-server">10. Pagina Server: controllo, console e aggiornamenti</h2>
      <p>Solo in modalità Server, la pagina <strong>Server</strong> raccoglie tutto quello che riguarda il server dedicato del gioco scelto in alto a sinistra (compare solo se quel gioco è in modalità Server):</p>
      <ul>
      <li>in alto i pulsanti <strong>Avvia</strong>, <strong>Ferma</strong> e <strong>Riavvia</strong> (anche dal menu del tray) e tre riquadri: stato del server, build installata e ultima build su Steam;</li>
      <li>nella barra laterale <strong>Server</strong> si apre a tendina: la sotto-voce <strong>Console</strong> mostra il log del server dedicato (<code>server.log.txt</code>) in tempo reale;</li>
      <li>la sotto-voce <strong>Aggiornamenti</strong> gli aggiornamenti del server tramite SteamCMD (sezione 5.6). Un pallino arancione sulla voce indica una build nuova o un aggiornamento in corso.</li>
      <li>la sotto-voce <strong>Configurazione</strong> modifica il <code>server_config.sii</code> del server: nome, descrizione, messaggio di benvenuto, password, giocatori massimi, token di login di Steam, opzioni di gioco (danni, traffico, nomi, limitatore...), veicoli AI, porte e moderatori. I moderatori si vedono con nome e avatar di Steam e si aggiungono incollando lo Steam ID o il link del profilo (anche <code>steamcommunity.com/id/nome</code>): nel file l&#39;app scrive sempre lo Steam ID. Vengono cambiati solo i valori: commenti e altre righe del file restano come sono, e la versione precedente viene salvata in <code>server_config.sii.bak</code>. Le modifiche valgono al prossimo avvio del server: <strong>Salva e riavvia il server</strong> le applica subito. Il file è quello accanto a <code>server_packages.sii</code> (percorso modificabile nelle <em>Opzioni avanzate</em> del server); se non esiste, crealo in gioco con il comando <code>export_server_config</code> nella console.</li>
      </ul>
      <p>Nella <strong>Console</strong>:</p>
      <ul>
      <li><strong>Filtra</strong> per cercare una parola, <strong>Nascondi warning</strong> per nascondere i warning (es. i tanti <code>Missing default icon</code>), <strong>Segui</strong> per seguire le nuove righe, <strong>Apri file</strong> per aprire il log.</li>
      </ul>
      <p>Gli errori sono in rosso, i warning in giallo, le righe <code>[MP]</code> (multiplayer) in azzurro. Il log viene riletto da capo a ogni avvio del server.</p>
      <Shot name="server-console" alt="Pagina Server, scheda Console" />
      <p>Se il server si chiude subito dopo l&#39;avvio, la risposta è quasi sempre nelle ultime righe della Console.</p>
      <h2 id="11-aggiornare-lapp">11. Aggiornare l&#39;app</h2>
      <p>In basso a sinistra, sopra la scelta del tema, c&#39;è il riquadro della <strong>versione</strong>. L&#39;app controlla da sola le nuove versioni all&#39;avvio e ogni 6 ore, e mostra una notifica quando ne trova una.</p>
      <ol>
      <li>Quando compare <strong>Versione X disponibile</strong> clicca <strong>Scarica</strong> (con <strong>Novità</strong> leggi le novità su GitHub).</li>
      <li>Finito il download clicca <strong>Riavvia per aggiornare</strong>: l&#39;app si chiude, si aggiorna e riparte da sola con le stesse impostazioni.</li>
      </ol>
      <p>Il pulsante con le frecce controlla subito. Le stesse voci sono nel menu del tray. Se non riavvii, l&#39;aggiornamento scaricato viene installato alla prossima uscita dall&#39;app (<strong>Esci</strong>).</p>
      <blockquote>
      <p>Sul PC Server l&#39;aggiornamento non viene installato mentre un server si sta aggiornando. Il server dedicato non viene fermato: riaggiornare l&#39;app non interrompe la partita.</p>
      </blockquote>
      <p>La versione <strong>portable</strong> (.zip) non si aggiorna da sola: <strong>Apri release</strong> apre la pagina da cui scaricarla.</p>
      <h2 id="12-problemi-comuni">12. Problemi comuni</h2>
      <table>
      <thead>
      <tr>
      <th>Messaggio</th>
      <th>Causa e soluzione</th>
      </tr>
      </thead>
      <tbody><tr>
      <td><code>GitHub API 404 su commits/master</code></td>
      <td>Il branch nelle impostazioni è sbagliato (spesso deve essere <code>main</code>), oppure la repository è privata e il token manca / è scaduto / non include quella repository. Controlla anche il Repository URL</td>
      </tr>
      <tr>
      <td><code>GitHub API 403 ... rate limit exceeded</code></td>
      <td>Con il controllo periodico senza token si superano le 60 richieste all&#39;ora di GitHub: aumenta <strong>Controlla GitHub ogni</strong> o imposta il <strong>Token GitHub</strong> (sezione 8). Il controllo riprende da solo quando il limite si azzera</td>
      </tr>
      <tr>
      <td><code>ETS2 si è chiuso subito dopo l&#39;avvio</code></td>
      <td>Il server dedicato si è chiuso da solo: guarda <strong>Server → Console</strong> per il motivo</td>
      </tr>
      <tr>
      <td><code>Steam log on failed - code ...</code> (in <strong>Server → Console</strong>)</td>
      <td>Problema del <code>server_logon_token</code> in <code>server_config.sii</code>: mancante, sbagliato, scaduto o già usato da un&#39;altra istanza del server. Generane uno nuovo su <a href="https://steamcommunity.com/dev/managegameservers">https://steamcommunity.com/dev/managegameservers</a> con App ID <code>227300</code> per ETS2 o <code>270880</code> per ATS</td>
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
      <td><code>I server di ETS2 e ATS non possono usare la stessa porta del webhook</code></td>
      <td>Dai a ciascun server la sua porta (8787 e 8788) e aggiorna il Payload URL su GitHub</td>
      </tr>
      <tr>
      <td><code>ETS2 e ATS usano la stessa repository, lo stesso branch e gli stessi nomi di file</code></td>
      <td>I due giochi si sovrascriverebbero i file: usa una repository o un branch diverso per ciascuno</td>
      </tr>
      <tr>
      <td>Il Client resta su <em>in attesa di export_server_packages</em></td>
      <td>Il gioco non ha ancora esportato i file, oppure la <strong>Cartella documenti</strong> del gioco punta alla cartella sbagliata</td>
      </tr>
      <tr>
      <td>Il push fallisce con errore di autenticazione</td>
      <td>Accedi di nuovo nella finestra di Git Credential Manager con un account che ha accesso in scrittura alla repository</td>
      </tr>
      <tr>
      <td><strong>Avvia con Windows</strong> non si attiva</td>
      <td>Funziona solo nell&#39;app installata. Se nella descrizione compare <em>Disattivato in Windows</em>, riattiva l&#39;app in <em>Gestione attività → App di avvio</em></td>
      </tr>
      <tr>
      <td><code>Aggiornamento con SteamCMD non riuscito: ERROR! ... (Disk write failure)</code></td>
      <td>Spazio su disco insufficiente o cartella del server non scrivibile. Il server riparte comunque con i file di prima</td>
      </tr>
      <tr>
      <td>Popup <strong>Git non rilevato</strong> anche dopo l&#39;installazione</td>
      <td>L&#39;installazione di Git non è finita o è in una cartella insolita: reinstalla Git for Windows con le opzioni predefinite e clicca <strong>Ricontrolla</strong></td>
      </tr>
      <tr>
      <td><em>Salva impostazioni</em> o <em>Esci</em> non rispondono</td>
      <td>È in corso un aggiornamento (dei pacchetti o del server con SteamCMD): aspetta che finisca</td>
      </tr>
      </tbody></table>
      <p>I file dell&#39;app (impostazioni, log, stato del server) sono in <code>%APPDATA%\ETS2 Package Sync\</code>. Webhook secret e token sono salvati cifrati e leggibili solo dal tuo utente Windows.</p>
    </>
  );
}
