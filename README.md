# ETS2 Package Sync

Sincronizza automaticamente `server_packages.sii` e `server_packages.dat` dei server dedicati di **Euro Truck Simulator 2** (ETS2) e **American Truck Simulator** (ATS) tramite GitHub.

Un'unica applicazione Windows (Electron + React + Tailwind) che vive nel tray. Nelle impostazioni si sceglie, **per ogni gioco**, cosa deve fare quel PC:

```text
[PC Client]                           [GitHub]                         [PC Server]
ETS2 Package Sync     --git push-->   repository  --webhook push-->   ETS2 Package Sync
modalità Client                                                       modalità Server
Documenti\<gioco> -> clone                                            download -> stop -> backup
temporaneo -> push                                                    -> sostituzione -> start
```

- **Client**: controlla la cartella documenti del gioco (`Documenti\Euro Truck Simulator 2` o `Documenti\American Truck Simulator`). Quando il gioco esporta `server_packages.sii` / `.dat` (comando `export_server_packages` nella console), clona la repository in una cartella temporanea, li copia se sono cambiati, fa commit e push e poi elimina il clone.
- **Server**: riceve il webhook di GitHub, scarica i file del commit, li verifica e li installa riavviando il server dedicato. Non fa polling.

ETS2 e ATS possono funzionare **insieme sullo stesso PC**: ogni gioco ha modalità, repository, webhook (porta propria) e stato separati. Si può anche usare un solo gioco e lasciare l'altro senza modalità.

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
3. Compilare **Repository GitHub** (URL, branch, nomi dei file nella repository) e la sezione della modalità scelta.
4. Per usare anche l'altro gioco, sceglierlo dal menu e ripetere: le modifiche di entrambi restano nel modulo fino al salvataggio.
5. **Salva impostazioni**: i giochi configurati partono subito.

Chiudendo la finestra l'app resta nel tray. Clic sull'icona → dashboard. Tasto destro → menu (con due giochi, un sottomenu per ciascuno):

| Client | Server |
|---|---|
| Stato, ultimo push | Stato, server in esecuzione/fermo, ultimo aggiornamento, porta webhook |
| **Push ora**, **Apri repository** | **Aggiorna ora**, **Avvia / Ferma / Riavvia** il server |
| Apri Dashboard, Impostazioni, Log, Esci | Apri Dashboard, Impostazioni, Log, Esci |

Il colore del pallino sull'icona indica lo stato (con due giochi, il peggiore dei due): verde = ok, blu = operazione in corso, rosso = errore, grigio = non configurato.

In basso a sinistra nella finestra si sceglie il tema: **chiaro**, **sistema** (segue Windows) o **scuro**. Sotto, un riquadro mostra lo stato del gioco scelto; il menu dei giochi mostra lo stato di entrambi.

La finestra ha queste pagine:

Dashboard, Console e Impostazioni mostrano il gioco scelto nel menu in alto a sinistra (l'ultimo scelto viene ricordato):

- **Dashboard**: stato, dettagli e pulsanti delle azioni del gioco.
- **Console** (solo se il gioco è in modalità Server): log del server dedicato in tempo reale e pulsanti Avvia / Ferma / Riavvia.
- **Impostazioni**: generale (lingua, avvio con Windows) e le impostazioni del gioco.
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
| `server_state.json` / `server_state_ats.json` | commit già processati e ultimo aggiornamento del server ETS2 / ATS (solo Server) |

## Modalità Client

Prerequisiti:

1. **Git for Windows** installato.
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
| Porta | Porta del webhook: default 8787 per ETS2, 8788 per ATS. Due server non possono usare la stessa porta |
| Webhook secret | Obbligatorio. **Genera** ne crea uno casuale |
| Token GitHub | Solo per repository **private**: fine-grained token con permesso *Contents: Read-only* su quella repository |
| *Opzioni avanzate*: cartella di lavoro, argomenti, cartella dei backup, backup da conservare, timeout di arresto, controllo all'avvio, file di log del server, indirizzo di ascolto | |

**Controllo all'avvio**: il server deve restare attivo per quei secondi dopo l'avvio, altrimenti l'aggiornamento viene annullato (0 = disattivato).

Per il `server_logon_token` di Steam l'App ID è `227300` per ETS2 e `270880` per ATS.

### Console

La pagina **Console** (solo modalità Server) mostra in tempo reale il log del server dedicato (`server.log.txt`, di default accanto al file `.sii`; modificabile nelle *Opzioni avanzate*) e ha i pulsanti **Avvia**, **Ferma** e **Riavvia**, disponibili anche nel menu del tray. Il log viene riletto da capo a ogni avvio del server. Filtro testo e *Nascondi warning* nascondono le righe che non interessano (es. i `Missing default icon`).

### Rete

GitHub deve raggiungere il PC da internet sulla porta del webhook di ogni server:

1. Aprire le porte nel firewall di Windows (prompt da amministratore; con un solo gioco basta la sua porta):

   ```bat
   netsh advfirewall firewall add rule name="ETS2 Package Webhook" dir=in action=allow protocol=TCP localport=8787,8788
   ```

2. Sul router, fare il port forwarding delle porte TCP (8787 e/o 8788) verso l'IP LAN del PC (mostrato nell'app).
3. Nell'app, **Rileva IP pubblico** compila il Payload URL con l'IP pubblico. La richiesta a `api.ipify.org` parte solo cliccando il pulsante. In alternativa usare un nome DNS.

Verifica: `http://IP_PUBBLICO:8787/health` (ATS: `:8788/health`) deve rispondere `OK`.

### Cosa succede a ogni push

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

**Esci** e **Salva impostazioni** sono bloccati mentre un aggiornamento è in corso.

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
  server-engine.js   modalità Server (webhook + aggiornamento del server dedicato)
src/                 UI React + Tailwind (Dashboard, Console, Impostazioni, Log, Guida)
  locales/           testi dell'interfaccia
  assets/guide/      screenshot della guida: <nome>.png (tema chiaro) e <nome>-dark.png (tema scuro)
resources/           icona dell'app (ETS2 + ATS, .ico/.png), icone dei giochi (ets2.png, ats.png/.ico) e del tray
index.html, vite.config.js, package.json (config electron-builder in "build")
```
