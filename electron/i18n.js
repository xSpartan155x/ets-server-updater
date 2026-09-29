// Translations of the main process: tray, notifications, dialogs, status and error messages.
// The log file stays in English: errors carry a key and are translated only when shown to the user.
// No Electron dependency, so the engines can still be tested with plain Node.

const STRINGS = {
  en: {
    'mode.client': 'Client',
    'mode.server': 'Server',

    'status.starting': 'Starting',
    'status.notConfigured': 'Not configured',
    'status.watching': 'Watching',
    'status.watchingWaiting': 'Watching - waiting for export_server_packages',
    'status.syncing': 'Syncing...',
    'status.cloning': 'Cloning repository...',
    'status.pushing': 'Pushing...',
    'status.idle': 'Idle',
    'status.downloading': 'Downloading {sha}...',
    'status.installing': 'Installing {sha}...',
    'status.startingGame': 'Starting {game}...',
    'status.restartingGame': 'Restarting {game}...',
    'status.stoppingGame': 'Stopping {game}...',
    'status.checkingGithub': 'Checking GitHub...',
    'status.error': 'Error: {message}',
    'status.steamChecking': 'Checking Steam for a server update...',
    'status.steamcmdDownload': 'Downloading SteamCMD...',
    'status.steamcmdSetup': 'Setting up SteamCMD (first use, about a minute)...',
    'status.steam.preparing': 'Updating the {game} server: preparing...',
    'status.steam.downloading': 'Updating the {game} server: downloading...',
    'status.steamDownloadingSize': 'Updating the {game} server: downloading {size}...',
    'status.steam.verifying': 'Updating the {game} server: verifying the files...',
    'status.steam.committing': 'Updating the {game} server: installing the files...',

    'tray.status': 'Status: {status}',
    'tray.lastPush': 'Last push: {value}',
    'tray.lastUpdate': 'Last update: {value}',
    'tray.gameRunning': '{game}: running',
    'tray.gameStopped': '{game}: stopped',
    'tray.webhook': 'Webhook: port {port} {path}',
    'tray.polling': 'GitHub check every {minutes} min (last: {value})',
    'tray.never': 'never',
    'tray.openDashboard': 'Open Dashboard',
    'tray.settings': 'Settings',
    'tray.logs': 'Logs',
    'tray.exit': 'Exit',
    'tray.restartToUpdate': 'Restart to update ({version})',
    'tray.updateAvailable': 'Update available: {version}',
    'tray.checkUpdates': 'Check for updates',
    'tray.serverBuild': 'Server build: {build}',
    'tray.serverBuildNew': 'Server build: {build} ({latest} available)',

    'action.push': 'Push Now',
    'action.openRepo': 'Open Repository',
    'action.update': 'Update Now',
    'action.start': 'Start {game}',
    'action.stop': 'Stop {game}',
    'action.restart': 'Restart {game}',
    'action.steamCheck': 'Check for a server update',
    'action.steamUpdate': 'Update the {game} server (Steam)',

    'notify.cannotStart': 'Cannot start: {message}',
    'notify.busyUpdate': 'An operation is in progress: the app will update when you restart it after it has finished',
    'notify.busyQuit': 'An operation is in progress, try again when it has finished',
    'notify.pushed': 'Packages pushed: {value}',
    'notify.pushFailed': 'Push failed: {message}',
    'notify.gameUpdated': '{game} updated to commit {sha}',
    'notify.gameRestarted': '{game} restarted',
    'notify.updateFailed': 'Update failed: {message}',
    'notify.appUpdateAvailable': 'Update available: version {version}',
    'notify.appUpdateReady': 'Update {version} ready: restart the app to install it',
    'notify.serverUpdateAvailable': 'New {game} server build available: {build}',
    'notify.serverUpdated': '{game} server updated to build {build}',
    'notify.serverUpdateFailed': 'Update of the {game} server failed: {message}',

    'dialog.exportTitle': 'Export settings',
    'dialog.importTitle': 'Import settings',
    'dialog.secretsQuestion': 'Include the webhook secret and the GitHub token?',
    'dialog.secretsDetail': 'In the file they are stored in clear text: anyone with the file can read them. ' +
      'Include them only to move the configuration to another PC, and keep the file private.',
    'dialog.withoutSecrets': 'Without secrets',
    'dialog.includeSecrets': 'Include secrets',
    'dialog.cancel': 'Cancel',
    'dialog.filterSettings': 'Settings',
    'dialog.filterExe': 'Executable',
    'dialog.filterAll': 'All files',

    'field.documents': 'Game documents folder',
    'field.webhookSecret': 'Webhook secret',
    'field.siiPath': 'SII file path',
    'field.datPath': 'DAT file path',
    'field.serverExe': 'Server executable',

    'err.busyInstall': 'An operation is in progress. Try again when it has finished.',
    'err.busySave': 'An operation is in progress. Try again in a moment.',
    'err.writeFile': 'Cannot write the file: {message}',
    'err.fileTooBig': 'The file is too big to be a settings file.',
    'err.notJson': 'The file is not valid JSON.',
    'err.notSettings': 'This is not a settings file of ETS2 Package Sync.',
    'err.newerFormat': 'The file was made by a newer version ({version}): update the app first.',
    'err.chooseMode': 'Choose how this PC uses at least one game (Client or Server).',
    'err.samePort': 'The ETS2 and ATS servers cannot use the same webhook port ({port}).',
    'err.sameRepo': 'ETS2 and ATS use the same repository, branch and file names: change the branch or the file names of one game.',
    'err.number': '{key} must be a positive whole number.',
    'err.pollMinutes': 'Check GitHub every: at least 1 minute.',
    'err.hours': 'The hours must be a whole number (0 or more).',
    'err.cfgRead': 'Cannot read server_config.sii: {message}',
    'err.cfgWrite': 'Cannot write server_config.sii: {message}',
    'err.required': '{label} is required.',
    'err.repoUrl': 'Invalid GitHub repository URL "{url}" (expected https://github.com/USER/REPOSITORY)',
    'err.docsNotSet': '{game} documents folder not set',
    'err.docsNotFound': '{game} documents folder not found: {path}',
    'err.repoNotSet': 'GitHub repository URL not set',
    'err.gitMissing': 'Git for Windows not found: the Client mode needs it (download it from git-scm.com)',
    'err.gitFailed': 'git {command} failed: {detail}',
    'err.stillWriting': 'files are still being written, will retry',
    'err.pushRejected': 'push rejected 3 times: the branch keeps changing on GitHub',
    'err.secretNotSet': 'Webhook secret not set',
    'err.siiNotSet': 'SII file path not set',
    'err.datNotSet': 'DAT file path not set',
    'err.exeNotSet': 'Server executable path not set',
    'err.portInUse': 'port {port} is already in use',
    'err.githubApi': 'GitHub API {status} on {path}: {detail}',
    'err.githubApi404': 'GitHub API 404 on {path}: {detail} (check repository URL, branch, file names and the token for private repositories)',
    'err.notAFile': '{file} is not a file in commit {sha}',
    'err.emptyFile': '{file} is empty in commit {sha}',
    'err.mismatch': '{file}: downloaded content does not match the repository (size/hash)',
    'err.cannotStopGame': 'unable to stop {game}',
    'err.exeNotFound': '{game} executable not found: {path}',
    'err.cannotStartGame': 'cannot start {game}: {message}',
    'err.exitedAfterStart': '{game} exited right after start',
    'err.stagedCheck': 'verification of staged file {file} failed',
    'err.rolledBack': '{game} did not start with commit {sha}: previous files restored',
    'err.noLatestYml': 'The latest release has no update file (latest.yml).',
    'err.offline': 'GitHub is not reachable. Check the internet connection.',
    'err.rateLimit': 'GitHub refused the request (rate limit). Try again later.',
    'err.steamcmdDownload': 'Cannot download SteamCMD: {message}',
    'err.steamcmdRun': 'Cannot run SteamCMD: {message}',
    'err.steamcmdInfo': 'SteamCMD did not return the server build ({detail})',
    'err.steamcmdUpdate': 'Update with SteamCMD failed: {detail}',
    'err.installDirUnknown': 'Server folder unknown: set the server executable or the server folder',
  },

  it: {
    'mode.client': 'Client',
    'mode.server': 'Server',

    'status.starting': 'Avvio',
    'status.notConfigured': 'Non configurato',
    'status.watching': 'In ascolto',
    'status.watchingWaiting': 'In ascolto - in attesa di export_server_packages',
    'status.syncing': 'Sincronizzazione...',
    'status.cloning': 'Clonazione della repository...',
    'status.pushing': 'Push in corso...',
    'status.idle': 'In attesa',
    'status.downloading': 'Download di {sha}...',
    'status.installing': 'Installazione di {sha}...',
    'status.startingGame': 'Avvio di {game}...',
    'status.restartingGame': 'Riavvio di {game}...',
    'status.stoppingGame': 'Arresto di {game}...',
    'status.checkingGithub': 'Controllo di GitHub...',
    'status.error': 'Errore: {message}',
    'status.steamChecking': 'Controllo aggiornamenti del server su Steam...',
    'status.steamcmdDownload': 'Download di SteamCMD...',
    'status.steamcmdSetup': 'Preparazione di SteamCMD (primo utilizzo, circa un minuto)...',
    'status.steam.preparing': 'Aggiornamento del server {game}: preparazione...',
    'status.steam.downloading': 'Aggiornamento del server {game}: download...',
    'status.steamDownloadingSize': 'Aggiornamento del server {game}: download di {size}...',
    'status.steam.verifying': 'Aggiornamento del server {game}: verifica dei file...',
    'status.steam.committing': 'Aggiornamento del server {game}: installazione dei file...',

    'tray.status': 'Stato: {status}',
    'tray.lastPush': 'Ultimo push: {value}',
    'tray.lastUpdate': 'Ultimo aggiornamento: {value}',
    'tray.gameRunning': '{game}: in esecuzione',
    'tray.gameStopped': '{game}: fermo',
    'tray.webhook': 'Webhook: porta {port} {path}',
    'tray.polling': 'Controllo di GitHub ogni {minutes} min (ultimo: {value})',
    'tray.never': 'mai',
    'tray.openDashboard': 'Apri Dashboard',
    'tray.settings': 'Impostazioni',
    'tray.logs': 'Log',
    'tray.exit': 'Esci',
    'tray.restartToUpdate': 'Riavvia per aggiornare ({version})',
    'tray.updateAvailable': 'Aggiornamento disponibile: {version}',
    'tray.checkUpdates': 'Controlla aggiornamenti',
    'tray.serverBuild': 'Build del server: {build}',
    'tray.serverBuildNew': 'Build del server: {build} (disponibile {latest})',

    'action.push': 'Push ora',
    'action.openRepo': 'Apri repository',
    'action.update': 'Aggiorna ora',
    'action.start': 'Avvia {game}',
    'action.stop': 'Ferma {game}',
    'action.restart': 'Riavvia {game}',
    'action.steamCheck': 'Controlla aggiornamenti del server',
    'action.steamUpdate': 'Aggiorna il server {game} (Steam)',

    'notify.cannotStart': 'Impossibile avviare: {message}',
    'notify.busyUpdate': "Un'operazione è in corso: l'app si aggiornerà quando la riavvii dopo che è terminata",
    'notify.busyQuit': "Un'operazione è in corso, riprova quando è terminata",
    'notify.pushed': 'Pacchetti inviati: {value}',
    'notify.pushFailed': 'Push non riuscito: {message}',
    'notify.gameUpdated': '{game} aggiornato al commit {sha}',
    'notify.gameRestarted': '{game} riavviato',
    'notify.updateFailed': 'Aggiornamento non riuscito: {message}',
    'notify.appUpdateAvailable': 'Aggiornamento disponibile: versione {version}',
    'notify.appUpdateReady': "Aggiornamento {version} pronto: riavvia l'app per installarlo",
    'notify.serverUpdateAvailable': 'Nuova build del server {game} disponibile: {build}',
    'notify.serverUpdated': 'Server {game} aggiornato alla build {build}',
    'notify.serverUpdateFailed': 'Aggiornamento del server {game} non riuscito: {message}',

    'dialog.exportTitle': 'Esporta impostazioni',
    'dialog.importTitle': 'Importa impostazioni',
    'dialog.secretsQuestion': 'Includere il webhook secret e il token GitHub?',
    'dialog.secretsDetail': 'Nel file vengono salvati in chiaro: chiunque abbia il file può leggerli. ' +
      'Includili solo per spostare la configurazione su un altro PC e non condividere il file.',
    'dialog.withoutSecrets': 'Senza secret',
    'dialog.includeSecrets': 'Includi secret',
    'dialog.cancel': 'Annulla',
    'dialog.filterSettings': 'Impostazioni',
    'dialog.filterExe': 'Eseguibile',
    'dialog.filterAll': 'Tutti i file',

    'field.documents': 'Cartella documenti del gioco',
    'field.webhookSecret': 'Webhook secret',
    'field.siiPath': 'Percorso del file SII',
    'field.datPath': 'Percorso del file DAT',
    'field.serverExe': 'Eseguibile del server',

    'err.busyInstall': "Un'operazione è in corso. Riprova quando è terminata.",
    'err.busySave': "Un'operazione è in corso. Riprova tra poco.",
    'err.writeFile': 'Impossibile scrivere il file: {message}',
    'err.fileTooBig': 'Il file è troppo grande per essere un file di impostazioni.',
    'err.notJson': 'Il file non è un JSON valido.',
    'err.notSettings': 'Questo non è un file di impostazioni di ETS2 Package Sync.',
    'err.newerFormat': "Il file è stato creato da una versione più recente ({version}): aggiorna prima l'app.",
    'err.chooseMode': 'Scegli come questo PC usa almeno un gioco (Client o Server).',
    'err.samePort': 'I server di ETS2 e ATS non possono usare la stessa porta del webhook ({port}).',
    'err.sameRepo': 'ETS2 e ATS usano la stessa repository, lo stesso branch e gli stessi nomi di file: cambia il branch o i nomi dei file di uno dei due giochi.',
    'err.number': '{key} deve essere un numero intero positivo.',
    'err.pollMinutes': 'Controlla GitHub ogni: almeno 1 minuto.',
    'err.hours': 'Le ore devono essere un numero intero (0 o più).',
    'err.cfgRead': 'Impossibile leggere server_config.sii: {message}',
    'err.cfgWrite': 'Impossibile scrivere server_config.sii: {message}',
    'err.required': '{label} è obbligatorio.',
    'err.repoUrl': 'URL della repository GitHub non valido "{url}" (atteso https://github.com/UTENTE/REPOSITORY)',
    'err.docsNotSet': 'Cartella documenti di {game} non impostata',
    'err.docsNotFound': 'Cartella documenti di {game} non trovata: {path}',
    'err.repoNotSet': 'URL della repository GitHub non impostato',
    'err.gitMissing': 'Git for Windows non trovato: serve alla modalità Client (scaricalo da git-scm.com)',
    'err.gitFailed': 'git {command} non riuscito: {detail}',
    'err.stillWriting': 'i file sono ancora in scrittura, nuovo tentativo tra poco',
    'err.pushRejected': 'push rifiutato 3 volte: il branch continua a cambiare su GitHub',
    'err.secretNotSet': 'Webhook secret non impostato',
    'err.siiNotSet': 'Percorso del file SII non impostato',
    'err.datNotSet': 'Percorso del file DAT non impostato',
    'err.exeNotSet': "Percorso dell'eseguibile del server non impostato",
    'err.portInUse': 'la porta {port} è già in uso',
    'err.githubApi': 'GitHub API {status} su {path}: {detail}',
    'err.githubApi404': 'GitHub API 404 su {path}: {detail} (controlla URL della repository, branch, nomi dei file e il token per le repository private)',
    'err.notAFile': '{file} non è un file nel commit {sha}',
    'err.emptyFile': '{file} è vuoto nel commit {sha}',
    'err.mismatch': '{file}: il contenuto scaricato non corrisponde alla repository (dimensione/hash)',
    'err.cannotStopGame': 'impossibile fermare {game}',
    'err.exeNotFound': 'Eseguibile di {game} non trovato: {path}',
    'err.cannotStartGame': 'impossibile avviare {game}: {message}',
    'err.exitedAfterStart': "{game} si è chiuso subito dopo l'avvio",
    'err.stagedCheck': 'verifica del file temporaneo {file} non riuscita',
    'err.rolledBack': '{game} non è partito con il commit {sha}: ripristinati i file precedenti',
    'err.noLatestYml': "L'ultima release non contiene il file di aggiornamento (latest.yml).",
    'err.offline': 'GitHub non è raggiungibile. Controlla la connessione a internet.',
    'err.rateLimit': 'GitHub ha rifiutato la richiesta (limite di richieste). Riprova più tardi.',
    'err.steamcmdDownload': 'Impossibile scaricare SteamCMD: {message}',
    'err.steamcmdRun': 'Impossibile avviare SteamCMD: {message}',
    'err.steamcmdInfo': 'SteamCMD non ha restituito la build del server ({detail})',
    'err.steamcmdUpdate': 'Aggiornamento con SteamCMD non riuscito: {detail}',
    'err.installDirUnknown': "Cartella del server sconosciuta: imposta l'eseguibile o la cartella del server",
  },
};

const LANGUAGES = Object.keys(STRINGS);
let current = 'en';

function translate(lang, key, params = {}) {
  const text = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

/** Text in the language of the UI. */
const t = (key, params) => translate(current, key, params);

/** 'system' | 'en' | 'it' -> supported language; systemLocales: e.g. ['it-IT', 'en-US']. */
function resolveLanguage(preference, systemLocales = []) {
  if (LANGUAGES.includes(preference)) return preference;
  for (const locale of systemLocales) {
    const lang = String(locale || '').toLowerCase().split(/[-_]/)[0];
    if (LANGUAGES.includes(lang)) return lang;
  }
  return 'en';
}

function setLanguage(lang) {
  current = LANGUAGES.includes(lang) ? lang : 'en';
}

const getLanguage = () => current;

/** Error whose message is English (for the log) and that is shown translated with errorText(). */
class LocalizedError extends Error {
  constructor(key, params = {}) {
    super(translate('en', key, params));
    this.key = key;
    this.params = params;
  }
}

/** Message of an error in the language of the UI (errors of Git, Node... stay as they are). */
function errorText(err) {
  if (!err) return '';
  if (err.key) return t(err.key, err.params);
  return String(err.message || err);
}

module.exports = { LANGUAGES, t, resolveLanguage, setLanguage, getLanguage, LocalizedError, errorText };
