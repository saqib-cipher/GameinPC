const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),

  // ADB APIs
  getDevices: () => ipcRenderer.invoke('adb:get-devices'),
  getDeviceDetails: (serial) => ipcRenderer.invoke('adb:get-device-details', serial),
  pairWireless: (data) => ipcRenderer.invoke('adb:pair-wireless', data),
  connectWireless: (data) => ipcRenderer.invoke('adb:connect-wireless', data),
  disconnectWireless: (data) => ipcRenderer.invoke('adb:disconnect-wireless', data),
  enableTcpip: (data) => ipcRenderer.invoke('adb:enable-tcpip', data),
  sendKey: (data) => ipcRenderer.invoke('adb:send-key', data),
  tap: (data) => ipcRenderer.invoke('adb:tap', data),
  swipe: (data) => ipcRenderer.invoke('adb:swipe', data),
  captureScreenshot: (serial) => ipcRenderer.invoke('adb:capture-screenshot', serial),
  getForegroundApp: (serial) => ipcRenderer.invoke('adb:get-foreground-app', serial),

  // Screen Mirroring
  startMirror: (data) => ipcRenderer.invoke('mirror:start', data),
  stopMirror: () => ipcRenderer.invoke('mirror:stop'),
  getMirrorStatus: () => ipcRenderer.invoke('mirror:get-status'),
  injectTouch: (data) => ipcRenderer.invoke('mirror:inject-touch', data),
  updateViewportBounds: (bounds) => ipcRenderer.invoke('mirror:update-bounds', bounds),
  onMirrorStatusChanged: (callback) => {
    ipcRenderer.on('mirror:status-changed', (event, isRunning) => callback(isRunning));
  },

  // Keymapping Schemes & Settings
  loadSchemes: () => ipcRenderer.invoke('config:load-schemes'),
  saveSchemes: (schemes) => ipcRenderer.invoke('config:save-schemes', schemes),
  loadSettings: () => ipcRenderer.invoke('config:load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('config:save-settings', settings),
  importCfgDialog: () => ipcRenderer.invoke('config:import-cfg-dialog'),
  exportCfgDialog: (scheme) => ipcRenderer.invoke('config:export-cfg-dialog', scheme),

  // Keymapper Real-time Input
  setActiveScheme: (scheme) => ipcRenderer.invoke('keymap:set-scheme', scheme),
  setActiveDevice: (device) => ipcRenderer.invoke('keymap:set-device', device),
  sendKeyDown: (data) => ipcRenderer.invoke('keymap:key-down', data),
  sendKeyUp: (data) => ipcRenderer.invoke('keymap:key-up', data),
  sendMouseDown: (data) => ipcRenderer.invoke('keymap:mouse-down', data),
  sendMouseUp: (data) => ipcRenderer.invoke('keymap:mouse-up', data),
  sendMouseMove: (data) => ipcRenderer.invoke('keymap:mouse-move', data),
});
