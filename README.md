# ETS2 Package Sync

Sincronizza automaticamente `server_packages.sii` e `server_packages.dat` dei server dedicati di **Euro Truck Simulator 2** (ETS2) e **American Truck Simulator** (ATS) tramite GitHub.

Un'unica applicazione Windows (Electron + React + Tailwind) che vive nel tray. Nelle impostazioni si sceglie, **per ogni gioco**, cosa deve fare quel PC:

```text
[PC Client]                           [GitHub]                         [PC Server]
ETS2 Package Sync     --git push-->   repository  <--polling o-->    ETS2 Package Sync
                                                   webhook push
modalità Client                                                       modalità Server
Documenti\<gioco> -> clone                                            download -> stop -> backup
temporaneo -> push                                                    -> sostituzione -> start
```

- **Client**: controlla la cartella documenti del gioco (`Documenti\Euro Truck Simulator 2` o `Documenti\American Truck Simulator`). Quando il gioco esporta `server_packages.sii` / `.dat` (comando `export_server_packages` nella console), clona la repository in una cartella temporanea, li copia se sono cambiati, fa commit e push e poi elimina il clone.
- **Server**: scopre i nuovi commit con un **controllo periodico** di GitHub (predefinito, nessuna porta da aprire) oppure con il **webhook** di GitHub (immediato, serve una porta aperta), scarica i file del commit, li verifica e li installa riavviando il server dedicato. Tiene anche aggiornato il server dedicato con **SteamCMD** (integrato, scaricato in automatico) quando esce una nuova build del gioco.

ETS2 e ATS possono funzionare **insieme sullo stesso PC**: ogni gioco ha modalità, repository, metodo di aggiornamento (con il webhook, porta propria) e stato separati. Si può anche usare un solo gioco e lasciare l'altro senza modalità.

Nessun file di configurazione da modificare a mano: tutto si imposta dalla finestra dell'app, in italiano o in inglese.

> 📘 Nell'app, la pagina **Guida** contiene la guida passo passo con immagini: repository, Client, Server, rete, webhook e token.

## Installazione

Eseguire `ETS2PackageSync-Setup-<versione>.exe` (dalla pagina delle [release](https://github.com/xSpartan155x/ets-server-updater/releases)) su ogni PC, client e server. Il setup:

- installa l'app per l'utente corrente (cartella modificabile);
- crea il collegamento sul desktop e nel menu Start;
- avvia l'app al termine.

L'installer non è firmato digitalmente: Windows SmartScreen può mostrare *"Windows ha protetto il PC"* → **Ulteriori informazioni** → **Esegui comunque**.

Per disinstallare: *Impostazioni di Windows → App → ETS2 Package Sync*.

## Primo avvio

Al primo avvio si apre la finestra su **Impostazioni**:

1. **Generale**: lingua (*Automatica* segue Windows, oppure *English* / *Italiano*: si applica subito) e, opzionale, **Avvia con Windows** (all'accesso parte ridotta nel tray).
2. Scegliere il gioco dal menu in alto a sinistra (clic sul nome del gioco: **Euro Truck Simulator 2** o **American Truck Simulator**) e la sua modalità: *Client* o *Server* (un secondo clic sulla modalità scelta la toglie e il gioco resta non configurato).
3. Per usare anche l'altro gioco, sceglierlo dal menu e ripetere: le modifiche di entrambi restano nel modulo fino al salvataggio.
4. **Salva impostazioni**: i giochi configurati partono subito e si apre la pagina **Server**.
5. In **Server** configurare i server: con il Client *Server a cui inviare* (una repository GitHub per server); con il Server *Installazione e opzioni* e poi *Nuovo server*.

Chiudendo la finestra l'app resta nel tray. Clic sull'icona → dashboard. Tasto destro → menu (con due giochi, un sottomenu per ciascuno):

| Client | Server |
|---|---|
| Stato, ultimo push | Stato, server in esecuzione/fermo, ultimo aggiornamento, intervallo e ultimo controllo di GitHub o porta webhook |
| **Push ora**, **Apri repository** | **Aggiorna ora**, **Avvia / Ferma / Riavvia** il server |
| Apri Dashboard, Impostazioni, Log, Esci | Apri Dashboard, Impostazioni, Log, Esci |

Il colore del pallino sull'icona indica lo stato (con due giochi, il peggiore dei due): verde = ok, blu = operazione in corso, rosso = errore, grigio = non configurato.

In basso a sinistra nella finestra si sceglie il tema: **chiaro**, **sistema** (segue Windows) o **scuro**. Sotto, un riquadro mostra lo stato del gioco scelto; il menu dei giochi mostra lo stato di entrambi.

La finestra ha queste pagine:

Dashboard, Server e Impostazioni mostrano il gioco scelto nel menu in alto a sinistra (l'ultimo scelto viene ricordato):

- **Dashboard**: stato, dettagli e pulsanti delle azioni del gioco.
- **Server**: tutto ciò che riguarda i server, per entrambe le modalità. Client: **Server a cui inviare**. Server: **Installazione e opzioni** (installazione e SteamCMD, controllo periodico o webhook, token, regole comuni), **Tutti i server** (un riquadro per server e, in fondo, l'installazione condivisa con SteamCMD), una voce per ogni server e **Nuovo server**. La pagina di un server ha Avvia / Ferma / Riavvia / Scarica pacchetti e tre schede: **Console** (log in tempo reale), **Sessione** (`server_config.sii`) e **Server e repository** (nome, cartella home, argomenti, repository, eliminazione).
- **Impostazioni**: generale (lingua, avvio con Windows), ruoli del gioco (Client / Server) e cartella documenti del Client. Tutto ciò che riguarda i server è nella pagina **Server**.
- **Log**: log in tempo reale (le righe iniziano con `[ETS2]` o `[ATS]`), con filtri e il pulsante *Apri file di log*. Il log è sempre in inglese.
- **Guida**: guida passo passo alla configurazione, in italiano e in inglese, con immagini per il tema chiaro e scuro.

### Copiare le impostazioni su un altro PC

In **Impostazioni** i pulsanti **Esporta** e **Importa** salvano e caricano le impostazioni di tutti i giochi in un file `.json`:

- all'export l'app chiede se includere webhook secret e token GitHub, che nel file sono **in chiaro** (nell'app invece sono cifrati);
- l'import compila il modulo **senza salvare**: controllare i percorsi per il nuovo PC e poi *Salva impostazioni*. Vengono accettati solo campi conosciuti con valori validi; se il file non ha i secret, restano quelli del PC;
- i file esportati dalle versioni 2.1 e precedenti (un solo gioco) vengono importati come impostazioni di ETS2;
- tema, lingua e *Avvia con Windows* non vengono copiati.

### Dove vengono salvati i dati

In `%APPDATA%\ETS2 Package Sync\`:

| File | Contenuto |
|---|---|
| `settings.json` | impostazioni, con un blocco per gioco in `games`. Webhook secret e GitHub token sono **cifrati** (Electron safeStorage / Windows DPAPI): solo lo stesso utente Windows può leggerli. Il file delle versioni precedenti viene convertito da solo (le impostazioni diventano quelle di ETS2) |
| `ets2sync.log` | log (rotazione automatica a 1 MB) |
| `server_state.json` / `server_state_ats.json` | commit già processati, ultimo aggiornamento e ultima build Steam vista del server ETS2 / ATS (solo Server) |
| `steamcmd\` | SteamCMD, scaricato al primo uso dalla modalità Server (circa 150 MB) |

## Modalità Client

Prerequisiti:

1. **Git for Windows** installato. Se manca, l'app mostra il popup *Git non rilevato* con il link per scaricarlo; dopo l'installazione *Ricontrolla* avvia la modalità Client senza riavviare l'app (Git viene cercato anche in `Program Files\Git`, quindi il PATH non serve).
2. Accesso in scrittura alla repository GitHub. Al primo push compare la finestra di accesso di Git Credential Manager; le credenziali restano salvate in Windows e l'app non contiene token.

Non serve clonare nulla a mano: l'app lavora su un clone temporaneo.

Impostazioni (per gioco):

| Campo | Descrizione |
|---|---|
| URL della repository, Branch (scheda *Repository GitHub*) | La repository dove pushare i file. Ogni gioco deve avere la sua repository o almeno un branch diverso |
| Cartella documenti del gioco | La cartella dove il gioco scrive i file esportati (quella con `profiles`, `config.cfg`, `game.log.txt`...). Precompilata con `Documenti\Euro Truck Simulator 2` o `Documenti\American Truck Simulator`, modificabile |
| *Opzioni avanzate*: messaggio di commit, attesa dopo l'ultima modifica | |

Uso: nel gioco aprire la console e digitare `export_server_packages`. Il resto è automatico:

```text
Documenti\<gioco>\server_packages.sii/.dat
        │
        ▼
git clone (pulito, solo il branch)  →  %TEMP%\ets2-package-sync\<ets2|ats>\repo-<n>
        │ confronto: i file sono diversi da quelli su GitHub?
        ▼ sì
copia  →  git commit  →  git push  →  cartella temporanea eliminata
```

Funzionamento:

- a **ogni** sincronizzazione la repository viene clonata da zero in una cartella temporanea del gioco ed eliminata subito dopo: nessuno stato locale e nessun conflitto con modifiche vecchie;
- della cartella del gioco vengono considerati **solo** i due file dei pacchetti: `game.log.txt`, profili e il resto vengono ignorati;
- finché il gioco non ha mai esportato i file, lo stato è *"In ascolto - in attesa di export_server_packages"* (non è un errore);
- le modifiche vengono raggruppate: si procede solo quando i file hanno smesso di cambiare;
- se i file sono uguali a quelli su GitHub non viene fatto nessun commit. Un nuovo export identico al precedente non fa nemmeno il clone;
- i file vengono salvati byte per byte, anche se Git è configurato con `core.autocrlf=true` (default di Git for Windows);
- se qualcun altro ha pushato nel frattempo, il push viene rifiutato: l'app riclona e riprova (fino a 3 volte), senza perdere i commit degli altri;
- se la repository è vuota, il branch viene creato al primo push;
- **Push ora** riclona e controlla subito. All'avvio viene fatto lo stesso controllo, per le modifiche fatte mentre l'app era chiusa.

## Modalità Server

Impostazioni (per gioco):

| Campo | Descrizione |
|---|---|
| Eseguibile del server | Di solito `...\bin\win_x64\eurotrucks2_server.exe` (ETS2) o `...\bin\win_x64\amtrucks_server.exe` (ATS) |
| server_packages.sii / .dat usati dal server | I file letti dal server dedicato |
| Nuovi pacchetti da GitHub | **Controllo periodico** (predefinito) o **Webhook**. Le configurazioni create prima della 4.1 restano sul webhook |
| Controlla GitHub ogni (minuti) | Solo controllo periodico: default 5, minimo 1. Senza token GitHub accetta 60 richieste all'ora per IP |
| Porta | Solo webhook: default 8787 per ETS2, 8788 per ATS. Due server con il webhook non possono usare la stessa porta |
| Webhook secret | Solo webhook, obbligatorio. **Genera** ne crea uno casuale |
| Token GitHub | Solo per repository **private**: fine-grained token con permesso *Contents: Read-only* su quella repository |
| *Opzioni avanzate*: cartella di lavoro, argomenti, cartella dei backup, backup da conservare, timeout di arresto, controllo all'avvio, file di log del server, indirizzo di ascolto (solo webhook) | |

**Controllo all'avvio**: il server deve restare attivo per quei secondi dopo l'avvio, altrimenti l'aggiornamento viene annullato (0 = disattivato).

### Aggiornamento del server dedicato (SteamCMD)

Quando SCS aggiorna il gioco serve anche la nuova build del server dedicato. Il PC Server la installa da solo (opzioni in **Server → Installazione e opzioni**; build e pulsanti in fondo a **Server → Tutti i server**):

| Campo | Descrizione |
|---|---|
| Aggiorna il server automaticamente | Attivo (default): con una nuova build ferma il server, lo aggiorna e lo riavvia. Disattivo: solo una notifica |
| Controlla Steam ogni (ore) | Default 2; 0 = solo con i pulsanti della pagina Server |
| Cartella del server | Dove SteamCMD installa i file. Vuota = la cartella che contiene `bin\win_x64` dell'eseguibile |

- SteamCMD viene scaricato da Valve al primo uso in `%APPDATA%\ETS2 Package Sync\steamcmd\` e usato in modo anonimo (i server dedicati sono gratuiti): App ID `1948160` per ETS2, `2239530` per ATS.
- La build installata viene letta dal manifest di Steam (`steamapps\appmanifest_<id>.acf`), l'ultima con `app_info_print`. Se il server è stato installato con il client Steam o a mano e la build risulta *Sconosciuta*, basta un clic su **Aggiorna installazione**; lo stesso pulsante installa anche il server da zero nella cartella dell'eseguibile.
- Un aggiornamento alla volta: SteamCMD è condiviso tra ETS2 e ATS, e l'aggiornamento del server entra nella stessa coda degli aggiornamenti dei pacchetti.
- Se SteamCMD fallisce il server riparte con i file di prima. Un controllo automatico non riuscito (es. internet assente) finisce solo nel log e viene riprovato al controllo successivo.
- SteamCMD scrive l'avanzamento solo alla fine; l'app legge il suo log (`steamcmd\logs\content_log.txt`) per mostrare la fase: preparazione, download con la dimensione, verifica, installazione.

Per il `server_logon_token` di Steam l'App ID è `227300` per ETS2 e `270880` per ATS.

### Pagina Server

Con la modalità Server, nella barra laterale **Server** si apre a tendina: **Tutti i server** (stato, repository e commit di ogni server; in fondo l'installazione condivisa con build, **Controlla**, **Aggiorna installazione** e fase dell'aggiornamento in corso), una voce per ogni server e **Nuovo server**. La pagina di un server ha in alto **Avvia**/**Ferma**, **Riavvia** e **Scarica pacchetti** (anche nel menu del tray) e le schede **Console**, **Sessione** e **Server e repository**.

La pagina **Console** mostra in tempo reale il log del server dedicato (`server.log.txt`, di default accanto al file `.sii`; modificabile nelle *Opzioni avanzate*). Il log viene riletto da capo a ogni avvio del server. Filtro testo e *Nascondi warning* nascondono le righe che non interessano (es. i `Missing default icon`).

### Configurazione del server (server_config.sii)

In **Server → Configurazione** si modifica il `server_config.sii` del server dedicato: sessione (nome, descrizione, messaggio di benvenuto, password, giocatori massimi 1-8), token di login di Steam (App ID `227300` ETS2, `270880` ATS), opzioni di gioco, veicoli AI, porte e moderatori.

- Il file è quello accanto a `server_packages.sii` (percorso modificabile nelle *Opzioni avanzate* del server). Se manca, si crea in gioco con `export_server_config` nella console.
- Vengono riscritti solo i valori: indentazione, commenti, fine riga e chiavi sconosciute restano uguali. La versione precedente finisce in `server_config.sii.bak`, la scrittura è atomica.
- Moderatori: nel file restano gli Steam ID, nell'app si vedono nome e avatar di Steam (letti dal profilo pubblico `steamcommunity.com/profiles/<id>?xml=1`, senza chiave API, con cache in `steam_profiles.json`). Per aggiungerne uno basta lo Steam ID o il link del profilo, anche `steamcommunity.com/id/<nome>`.
- I valori vengono controllati prima di salvare (lunghezza dei testi, 1-8 giocatori, porte 0-65535, token alfanumerico, Steam ID numerici).
- Il server legge il file all'avvio: **Salva e riavvia il server** applica subito le modifiche.

### Controllo periodico

Ogni *N* minuti (e 10 secondi dopo l'avvio) l'app chiede a GitHub l'ultimo commit del branch con una sola richiesta. Se non è ancora stato processato lo installa con gli stessi passi del webhook (sotto, dal punto 5). Se GitHub non è raggiungibile lo stato passa in errore senza notifiche e il controllo successivo riprova; un commit che non si riesce a installare viene notificato una volta sola.

### Rete (solo webhook)

GitHub deve raggiungere il PC da internet sulla porta del webhook di ogni server:

1. Aprire le porte nel firewall di Windows (prompt da amministratore; con un solo gioco basta la sua porta):

   ```bat
   netsh advfirewall firewall add rule name="ETS2 Package Webhook" dir=in action=allow protocol=TCP localport=8787,8788
   ```

2. Sul router, fare il port forwarding delle porte TCP (8787 e/o 8788) verso l'IP LAN del PC (mostrato nell'app).
3. Nell'app, **Rileva IP pubblico** compila il Payload URL con l'IP pubblico. La richiesta a `api.ipify.org` parte solo cliccando il pulsante. In alternativa usare un nome DNS.

Verifica: `http://IP_PUBBLICO:8787/health` (ATS: `:8788/health`) deve rispondere `OK`.

### Cosa succede a ogni push (webhook)

1. Verifica della firma `X-Hub-Signature-256` con il secret del gioco (401 se non valida).
2. Si considerano solo gli eventi `push` sul branch configurato.
3. Il commit viene messo in coda e il webhook risponde subito `202`, così GitHub non va in timeout.
4. I commit già processati o già in coda vengono ignorati (anche le redelivery di GitHub).
5. In background: download dei due file **a quel preciso commit** tramite GitHub API, con controllo di dimensione e hash git rispetto alla repository.
6. Se i file sono identici a quelli installati, il server **non** viene riavviato.
7. I nuovi file vengono scritti e verificati **prima** di fermare il server, per ridurre al minimo il downtime.
8. Stop del server, backup dei vecchi file in `backups\<data>_<commit>`, sostituzione.
9. Avvio del server e controllo che resti attivo.

In caso di errore:

- download o verifica falliti: il server non viene toccato;
- errore durante la sostituzione: ripristino del backup e riavvio del server;
- il server si chiude subito con i nuovi file: ripristino del backup e riavvio con i file precedenti. Quel commit non viene riprovato automaticamente (si può forzare con **Aggiorna ora**).

**Esci** e **Salva impostazioni** sono bloccati mentre un aggiornamento (dei pacchetti o del server) è in corso.

## Configurare il webhook su GitHub

Nella repository di ogni gioco: **Settings → Webhooks → Add webhook**

```text
Payload URL:   http://IP_PUBBLICO:8787/github-webhook   (ATS: porta 8788; copiabile dall'app)
Content type:  application/json
Secret:        <lo stesso Webhook secret del gioco nell'app>
```

- **Which events would you like to trigger this webhook?** → *Just the push event*
- **Active** selezionato → **Add webhook**

GitHub invia subito un evento `ping`: in **Recent Deliveries** deve comparire con risposta `200 pong`.

> Il webhook viaggia in HTTP: il contenuto non è cifrato, ma è autenticato dalla firma HMAC e i file vengono sempre scaricati da GitHub, mai presi dal payload. Per HTTPS si può mettere davanti un reverse proxy (es. Caddy) o un tunnel.

La repository dei pacchetti deve contenere anche questo `.gitattributes`, per evitare che git converta i fine riga:

```text
server_packages.sii -text
server_packages.dat binary
```

## Aggiornamenti

Nella barra laterale, sopra il tema, c'è il riquadro della versione: controllo delle nuove versioni (automatico all'avvio e ogni 6 ore, oppure con il pulsante), download con avanzamento e **Riavvia per aggiornare**. Le stesse azioni sono nel menu del tray. Gli aggiornamenti arrivano dalle [release su GitHub](https://github.com/xSpartan155x/ets-server-updater/releases) tramite `electron-updater`:

- solo l'app installata con il setup si aggiorna da sola; la versione portable mostra la nuova versione e apre la pagina della release;
- l'installazione è bloccata mentre un server si sta aggiornando;
- un aggiornamento scaricato e non installato viene installato all'uscita dall'app.

### Pubblicare una nuova versione

La release viene creata da GitHub Actions ([.github/workflows/release.yml](.github/workflows/release.yml)) a ogni push di un tag `v*`:

1. Cambiare `version` in `package.json` (es. `2.2.0`) e fare commit.
2. Creare e pushare il tag con lo stesso numero:

   ```bat
   git tag v2.2.0
   git push origin main --tags
   ```

3. Il workflow compila su Windows e pubblica la release `v2.2.0` con `ETS2PackageSync-Setup-<versione>.exe`, il suo `.blockmap`, `latest.yml` (i tre file dell'aggiornamento automatico) e lo zip portable. Non serve nessun token: usa il `GITHUB_TOKEN` di Actions.

Il tag deve corrispondere alla `version` di `package.json`. In locale, `npm run dist` crea gli stessi file in `release\` senza pubblicarli.

## Sviluppo

Requisiti: Node.js 20+.

```bat
npm install
npm run dev      REM Vite dev server + Electron con hot reload della UI
npm run start    REM build della UI ed esecuzione di Electron
npm run dist     REM crea in release\ il setup, il file di update (latest.yml) e lo zip portable
```

`npm run dev` / `npm run start` usano una cartella dati separata (`%APPDATA%\ETS2 Package Sync (dev)`), con impostazioni proprie: possono girare insieme all'app installata. In modalità Server, se anche l'app installata è in modalità Server, usare porte webhook diverse.

> Se Electron parte come Node (`app` undefined), la variabile d'ambiente `ELECTRON_RUN_AS_NODE` è impostata (succede nei terminali avviati da alcuni tool, es. VS Code). Rimuoverla prima di `npm run dev`.

### Traduzioni

- Interfaccia: `src/locales/en.js` e `src/locales/it.js` (`{nome}` è un parametro; `<b>` e `<code>` sono ammessi nei testi usati con `<Trans>`).
- Tray, notifiche, dialoghi, stati ed errori: `electron/i18n.js`. Gli errori portano una chiave e vengono tradotti solo quando sono mostrati: il file di log resta in inglese.
- Guida: `src/pages/guide/GuideIt.jsx` e `GuideEn.jsx`.

### Struttura

```text
electron/
  main.js            avvio, tray, finestra, IPC; un motore per ogni gioco in uso
  preload.js         bridge sicuro verso la UI (window.api)
  games.js           giochi gestiti (ETS2, ATS): cartelle, eseguibili, porte, icone
  settings.js        impostazioni per gioco, migrazione dal formato a un gioco, cifratura dei secret
  i18n.js            testi del processo principale (inglese e italiano)
  logger.js          log su file + feed live per la UI
  engine.js          base comune e utility
  client-engine.js   modalità Client (watch + git)
  server-engine.js   modalità Server (webhook + aggiornamento dei pacchetti e del server dedicato)
  steamcmd.js        SteamCMD: download al primo uso, build installata e su Steam, app_update
  server-config.js   lettura e scrittura di server_config.sii (solo i valori)
  steam-profiles.js  nomi e avatar Steam dei moderatori, link del profilo -> Steam ID
  git.js             ricerca di Git for Windows (PATH e cartelle d'installazione)
src/                 UI React + Tailwind (Dashboard, Server, Impostazioni, Log, Guida)
  locales/           testi dell'interfaccia
  assets/guide/      screenshot della guida: <nome>.png (tema chiaro) e <nome>-dark.png (tema scuro)
resources/           icona dell'app (ETS2 + ATS, .ico/.png), icone dei giochi (ets2.png, ats.png/.ico) e del tray
index.html, vite.config.js, package.json (config electron-builder in "build")
```
