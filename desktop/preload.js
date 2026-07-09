const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('kikoElectron', {
  // Platform info
  platform: process.platform,
  isElectron: true,

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Native notifications
  showNotification: (title, body, icon) =>
    ipcRenderer.send('show-notification', { title, body, icon }),

  // Open external URLs in browser
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // Listen for maximize/unmaximize events
  onMaximizeChange: (callback) => {
    ipcRenderer.on('maximize-change', (_, isMaximized) => callback(isMaximized));
  },

  // Screen/Window Capture Support (for WebRTC Screen Share picker)
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  selectScreenSource: (sourceId) => ipcRenderer.send('screen-source-selected', sourceId),

  // Force reload bypassing cache (for updating app)
  forceReload: () => ipcRenderer.send('force-reload'),
});
