// Safe bridge between the React UI and the main process.
const { contextBridge, ipcRenderer } = require('electron');

const subscribe = (channel) => (callback) => {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('get-state'),
  saveSettings: (values, autostart) => ipcRenderer.invoke('save-settings', values, autostart),
  runAction: (game, id) => ipcRenderer.invoke('run-action', game, id),
  browse: (kind, current) => ipcRenderer.invoke('browse', kind, current),
  openLogFile: () => ipcRenderer.invoke('open-log-file'),
  openConsoleFile: (game) => ipcRenderer.invoke('open-console-file', game),
  publicIp: () => ipcRenderer.invoke('public-ip'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  exportSettings: (values) => ipcRenderer.invoke('export-settings', values),
  importSettings: () => ipcRenderer.invoke('import-settings'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  setLanguage: (language) => ipcRenderer.invoke('set-language', language),
  onState: subscribe('state'),
  onLog: subscribe('log'),
  onConsole: subscribe('console'),
  onUpdate: subscribe('update'),
  update: {
    state: () => ipcRenderer.invoke('update-state'),
    check: () => ipcRenderer.invoke('update-check'),
    download: () => ipcRenderer.invoke('update-download'),
    install: () => ipcRenderer.invoke('update-install'),
  },
  onNavigate: subscribe('navigate'),
});
