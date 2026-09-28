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
  runAction: (id) => ipcRenderer.invoke('run-action', id),
  browse: (kind, current) => ipcRenderer.invoke('browse', kind, current),
  openLogFile: () => ipcRenderer.invoke('open-log-file'),
  openConsoleFile: () => ipcRenderer.invoke('open-console-file'),
  publicIp: () => ipcRenderer.invoke('public-ip'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  onState: subscribe('state'),
  onLog: subscribe('log'),
  onConsole: subscribe('console'),
  onNavigate: subscribe('navigate'),
});
