const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deskgridAPI', {
  isElectron: true,
  scanDesktop: () => ipcRenderer.invoke('deskgrid:scan-desktop'),
  getWallpaper: () => ipcRenderer.invoke('deskgrid:get-wallpaper'),
  getActiveLivelyVideo: () => ipcRenderer.invoke('deskgrid:get-active-lively-video'),
  wallpaperAction: (action) => ipcRenderer.invoke('deskgrid:wallpaper-action', action),
  openItem: (itemPath) => ipcRenderer.invoke('deskgrid:open-item', itemPath),
  showInFolder: (itemPath) => ipcRenderer.invoke('deskgrid:show-in-folder', itemPath),
  pickItems: (options) => ipcRenderer.invoke('deskgrid:pick-items', options),
  getIconForPath: (itemPath) => ipcRenderer.invoke('deskgrid:get-icon', itemPath),
  loadState: () => ipcRenderer.invoke('deskgrid:load-state'),
  saveState: (state) => ipcRenderer.invoke('deskgrid:save-state', state),
  setClickThrough: (ignore) => ipcRenderer.send('deskgrid:set-click-through', ignore),
  sendToDesktopBottom: () => ipcRenderer.send('deskgrid:send-to-bottom'),
  runSystemAction: (action) => ipcRenderer.invoke('deskgrid:system-action', action),
  getWorkArea: () => ipcRenderer.invoke('deskgrid:get-work-area'),
  setDesktopPinMode: (pinned) => ipcRenderer.invoke('deskgrid:set-pin-mode', pinned),
  minimizeOrHide: () => ipcRenderer.send('deskgrid:toggle-visibility'),
  quitApp: () => ipcRenderer.send('deskgrid:quit'),
  onWorkAreaChanged: (callback) => {
    const listener = (_event, rect) => callback(rect);
    ipcRenderer.on('deskgrid:work-area-changed', listener);
    return () => ipcRenderer.removeListener('deskgrid:work-area-changed', listener);
  },
  onTrayCommand: (callback) => {
    const listener = (_event, cmd) => callback(cmd);
    ipcRenderer.on('deskgrid:tray-command', listener);
    return () => ipcRenderer.removeListener('deskgrid:tray-command', listener);
  },
  onWallpaperChanged: (callback) => {
    const listener = (_event, dataUrl) => callback(dataUrl);
    ipcRenderer.on('deskgrid:wallpaper-changed', listener);
    return () => ipcRenderer.removeListener('deskgrid:wallpaper-changed', listener);
  },
});
