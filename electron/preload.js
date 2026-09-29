// Safe bridge between the React UI and the main process.
const { contextBridge, ipcRenderer } = require('electron');

const subscribe = (channel) => (callback) => {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('get-state'),
  // imported: ids of the games whose servers come from an imported settings file
  saveRole: (game, role, values) => ipcRenderer.invoke('save-role', game, role, values),
  saveSettings: (values, autostart, imported) => ipcRenderer.invoke('save-settings', values, autostart, imported),
  // role: 'client' | 'server'; server: id of a server for the actions of one server
  runAction: (game, role, id, server) => ipcRenderer.invoke('run-action', game, role, id, server),
  chooseDestination: (game, id) => ipcRenderer.invoke('choose-destination', game, id),
  servers: {
    plan: (game, name) => ipcRenderer.invoke('server-plan', game, name),
    create: (game, form) => ipcRenderer.invoke('server-create', game, form),
    save: (game, id, values) => ipcRenderer.invoke('server-save', game, id, values),
    remove: (game, id, removeFiles) => ipcRenderer.invoke('server-delete', game, id, removeFiles),
    // what: 'home' | 'config' | 'console' of a server, 'install' for the installation of the game
    open: (game, id, what) => ipcRenderer.invoke('open-path', game, id, what),
  },
  browse: (kind, current) => ipcRenderer.invoke('browse', kind, current),
  openLogFile: () => ipcRenderer.invoke('open-log-file'),
  serverConfig: {
    read: (game, id) => ipcRenderer.invoke('server-config-read', game, id),
    write: (game, id, values, moderators, restart) => ipcRenderer.invoke('server-config-write', game, id, values, moderators, restart),
    create: (game, id) => ipcRenderer.invoke('server-config-create', game, id),
  },
  steamProfiles: (ids) => ipcRenderer.invoke('steam-profiles', ids),
  steamResolve: (input) => ipcRenderer.invoke('steam-resolve', input),
  publicIp: () => ipcRenderer.invoke('public-ip'),
  checkGit: () => ipcRenderer.invoke('check-git'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  exportSettings: (values) => ipcRenderer.invoke('export-settings', values),
  importSettings: () => ipcRenderer.invoke('import-settings'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  setLanguage: (language) => ipcRenderer.invoke('set-language', language),
  onState: subscribe('state'),
  onLog: subscribe('log'),
  onConsole: subscribe('console'),
  onUpdate: subscribe('update'),
  onChooseDestination: subscribe('choose-destination'),
  update: {
    state: () => ipcRenderer.invoke('update-state'),
    check: () => ipcRenderer.invoke('update-check'),
    download: () => ipcRenderer.invoke('update-download'),
    install: () => ipcRenderer.invoke('update-install'),
  },
  onNavigate: subscribe('navigate'),
});
