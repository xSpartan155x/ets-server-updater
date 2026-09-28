# ETS2 Package Sync

Sincronizza automaticamente `server_packages.sii` e `server_packages.dat` di un server dedicato ETS2 tramite GitHub.

Un'unica applicazione Windows (Electron + React + Tailwind) che vive nel tray. Nelle impostazioni si sceglie cosa deve fare quel PC:

```text
[PC Client]                           [GitHub]                         [PC Server ETS2]
ETS2 Package Sync     --git push-->   repository  --webhook push-->   ETS2 Package Sync
modalità Client                                                       modalità Server
Documenti\ETS2 -> clone                                               download -> stop -> backup
temporaneo -> push                                                    -> sostituzione -> start
```

- **Client**: controlla la cartella documenti di ETS2 (`Documenti\Euro Truck Simulator 2`). Quando il gioco esporta `server_packages.sii` / `.dat` (comando `export_server_packages` nella console), clona la repository in una cartella temporanea, li copia se sono cambiati, fa commit e push e poi elimina il clone.
- **Server**: riceve il webhook di GitHub, scarica i file del commit, li verifica e li installa riavviando ETS2. Non fa polling.

Nessun file di configurazione da modificare a mano: tutto si imposta dalla finestra dell'app.

## Installazione

Eseguire `ETS2PackageSync-Setup-<versione>.exe` (cartella `release/` dopo la build) su ogni PC, client e server. Il setup:

- installa l'app per l'utente corrente (cartella modificabile);
- crea il collegamento sul desktop e nel menu Start;
- avvia l'app al termine.

L'installer non è firmato digitalmente: Windows SmartScreen può mostrare *"Windows ha protetto il PC"* → **Ulteriori informazioni** → **Esegui comunque**.

Per disinstallare: *Impostazioni di Windows → App → ETS2 Package Sync*.

## Primo avvio

Al primo avvio si apre la finestra su **Settings**:

1. **Mode of this PC**: scegliere *Client* o *Server*.
2. Compilare **GitHub repository** (URL, branch, nomi dei file nella repository) e la sezione della modalità scelta.
3. Opzionale: **Start with Windows** (all'accesso parte ridotta nel tray).
4. **Save settings**: la modalità parte subito.

Chiudendo la finestra l'app resta nel tray. Clic sull'icona → dashboard. Tasto destro → menu:

| Client | Server |
|---|---|
| Status, Last push | Status, ETS2 running/stopped, Last update, porta webhook |
| **Push Now**, **Open Repository** | **Update Now**, **Start / Stop / Restart ETS2** |
| Open Dashboard, Settings, Logs, Exit | Open Dashboard, Settings, Logs, Exit |

Il colore del pallino sull'icona indica lo stato: verde = ok, blu = operazione in corso, rosso = errore, grigio = non configurato.

In basso a sinistra nella finestra si sceglie il tema: **chiaro**, **sistema** (segue Windows) o **scuro**.

La finestra ha tre pagine:

- **Dashboard**: stato, dettagli e pulsanti delle azioni.
- **Settings**: tutte le impostazioni.
- **Logs**: log in tempo reale, con filtri e il pulsante *Open log file*.

### Dove vengono salvati i dati

In `%APPDATA%\ETS2 Package Sync\`:

| File | Contenuto |
|---|---|
| `settings.json` | impostazioni. Webhook secret e GitHub token sono **cifrati** (Electron safeStorage / Windows DPAPI): solo lo stesso utente Windows può leggerli |
| `ets2sync.log` | log (rotazione automatica a 1 MB) |
| `server_state.json` | commit già processati e ultimo aggiornamento (solo Server) |

## Modalità Client

Prerequisiti:

1. **Git for Windows** installato.
2. Accesso in scrittura alla repository GitHub. Al primo push compare la finestra di accesso di Git Credential Manager; le credenziali restano salvate in Windows e l'app non contiene token.

Non serve clonare nulla a mano: l'app lavora su un clone temporaneo.

Impostazioni:

| Campo | Descrizione |
|---|---|
| Repository URL, Branch (scheda *GitHub repository*) | La repository dove pushare i file |
| ETS2 documents folder | La cartella dove il gioco scrive i file esportati (quella con `profiles`, `config.cfg`, `game.log.txt`...). Precompilata con `Documenti\Euro Truck Simulator 2`, modificabile |
| *Advanced*: messaggio di commit, attesa dopo l'ultima modifica | |

Uso: in ETS2 aprire la console e digitare `export_server_packages`. Il resto è automatico:

```text
Documenti\Euro Truck Simulator 2\server_packages.sii/.dat
        │
        ▼
git clone (pulito, solo il branch)  →  %TEMP%\ets2-package-sync\repo-<n>
        │ confronto: i file sono diversi da quelli su GitHub?
        ▼ sì
copia  →  git commit  →  git push  →  cartella temporanea eliminata
```

Funzionamento:

- a **ogni** sincronizzazione la repository viene clonata da zero in `%TEMP%\ets2-package-sync` ed eliminata subito dopo: nessuno stato locale e nessun conflitto con modifiche vecchie;
- della cartella di ETS2 vengono considerati **solo** i due file dei pacchetti: `game.log.txt`, profili e il resto vengono ignorati;
- finché il gioco non ha mai esportato i file, lo stato è *"Watching - waiting for export_server_packages"* (non è un errore);
- le modifiche vengono raggruppate: si procede solo quando i file hanno smesso di cambiare;
- se i file sono uguali a quelli su GitHub non viene fatto nessun commit. Un nuovo export identico al precedente non fa nemmeno il clone;
- i file vengono salvati byte per byte, anche se Git è configurato con `core.autocrlf=true` (default di Git for Windows);
- se qualcun altro ha pushato nel frattempo, il push viene rifiutato: l'app riclona e riprova (fino a 3 volte), senza perdere i commit degli altri;
- se la repository è vuota, il branch viene creato al primo push;
- **Push Now** riclona e controlla subito. All'avvio viene fatto lo stesso controllo, per le modifiche fatte mentre l'app era chiusa.

## Modalità Server

Impostazioni:

| Campo | Descrizione |
|---|---|
| ETS2 server executable | Di solito `...\bin\win_x64\eurotrucks2_server.exe` |
| server_packages.sii / .dat | I file letti dal server ETS2 |
| Port | Porta del webhook (default 8787) |
| Webhook secret | Obbligatorio. **Generate** ne crea uno casuale |
| GitHub token | Solo per repository **private**: fine-grained token con permesso *Contents: Read-only* su quella repository |
| *Advanced*: working directory, argomenti, cartella backup, backup da conservare, timeout di stop, startup check, file di log del server, indirizzo di ascolto | |

**Startup check**: ETS2 deve restare attivo per quei secondi dopo l'avvio, altrimenti l'aggiornamento viene annullato (0 = disattivato).

### Console

La pagina **Console** (solo modalità Server) mostra in tempo reale il log del server ETS2 (`server.log.txt`, di default accanto al file `.sii`; modificabile in *Advanced*) e ha i pulsanti **Start**, **Stop** e **Restart**, disponibili anche nel menu del tray. Il log viene riletto da capo a ogni avvio del server. Filtro testo e *Hide warnings* nascondono le righe che non interessano (es. i `Missing default icon`).

### Rete

GitHub deve raggiungere il PC da internet:

1. Aprire la porta nel firewall di Windows (prompt da amministratore):

   ```bat
   netsh advfirewall firewall add rule name="ETS2 Package Webhook" dir=in action=allow protocol=TCP localport=8787
   ```

2. Sul router, fare il port forwarding della porta TCP 8787 verso l'IP LAN del PC (mostrato nell'app).
3. Nell'app, **Detect public IP** compila il Payload URL con l'IP pubblico. La richiesta a `api.ipify.org` parte solo cliccando il pulsante. In alternativa usare un nome DNS.

Verifica: `http://IP_PUBBLICO:8787/health` deve rispondere `OK`.

### Cosa succede a ogni push

1. Verifica della firma `X-Hub-Signature-256` con il secret (401 se non valida).
2. Si considerano solo gli eventi `push` sul branch configurato.
3. Il commit viene messo in coda e il webhook risponde subito `202`, così GitHub non va in timeout.
4. I commit già processati o già in coda vengono ignorati (anche le redelivery di GitHub).
5. In background: download dei due file **a quel preciso commit** tramite GitHub API, con controllo di dimensione e hash git rispetto alla repository.
6. Se i file sono identici a quelli installati, ETS2 **non** viene riavviato.
7. I nuovi file vengono scritti e verificati **prima** di fermare ETS2, per ridurre al minimo il downtime.
8. Stop di ETS2, backup dei vecchi file in `backups\<data>_<commit>`, sostituzione.
9. Avvio di ETS2 e controllo che resti attivo.

In caso di errore:

- download o verifica falliti: ETS2 non viene toccato;
- errore durante la sostituzione: ripristino del backup e riavvio di ETS2;
- ETS2 si chiude subito con i nuovi file: ripristino del backup e riavvio con i file precedenti. Quel commit non viene riprovato automaticamente (si può forzare con **Update Now**).

**Exit** e **Save settings** sono bloccati mentre un aggiornamento è in corso.

## Configurare il webhook su GitHub

Nella repository: **Settings → Webhooks → Add webhook**

```text
Payload URL:   http://IP_PUBBLICO:8787/github-webhook   (copiabile dall'app)
Content type:  application/json
Secret:        <lo stesso Webhook secret dell'app>
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

## Sviluppo

Requisiti: Node.js 20+.

```bat
npm install
npm run dev      REM Vite dev server + Electron con hot reload della UI
npm run start    REM build della UI ed esecuzione di Electron
npm run dist     REM crea release\ETS2PackageSync-Setup-<versione>.exe
```

Per una nuova versione basta cambiare `version` in `package.json`.

> Se Electron parte come Node (`app` undefined), la variabile d'ambiente `ELECTRON_RUN_AS_NODE` è impostata (succede nei terminali avviati da alcuni tool). Rimuoverla prima di `npm run dev`.

### Struttura

```text
electron/
  main.js            avvio, tray, finestra, IPC
  preload.js         bridge sicuro verso la UI (window.api)
  settings.js        impostazioni + cifratura dei secret
  logger.js          log su file + feed live per la UI
  engine.js          base comune e utility
  client-engine.js   modalità Client (watch + git)
  server-engine.js   modalità Server (webhook + aggiornamento ETS2)
src/                 UI React + Tailwind (Dashboard, Settings, Logs)
resources/           icona dell'app (.ico/.png) e icone del tray
index.html, vite.config.js, package.json (config electron-builder in "build")
```
