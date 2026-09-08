const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const adbService = require('./services/AdbService');
const configService = require('./services/ConfigService');
const keymapperService = require('./services/KeymapperService');
const mirrorService = require('./services/MirrorService');
const streamService = require('./services/StreamService');

keymapperService.setTouchSender((touch) => {
  streamService.injectTouch(touch.pointerId, touch.action, touch.x, touch.y);
});

const userDataDir = path.join(process.env.LOCALAPPDATA || process.env.APPDATA || '.', 'GameinPC');
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}
app.setPath('userData', userDataDir);

let mainWindow = null;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1366, width),
    height: Math.min(840, height),
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0F1117',
    frame: false, // Custom Material 3 Expressive titlebar / borderless HUD
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    icon: path.join(__dirname, '../../bin/scrcpy.png'),
  });

  const distHtml = path.join(__dirname, '../../dist/renderer/index.html');
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(devUrl);
  } else if (fs.existsSync(distHtml)) {
    mainWindow.loadFile(distHtml);
  } else {
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadFile(distHtml);
    });
  }

  const hwndBuffer = mainWindow.getNativeWindowHandle();
  const parentHwnd = hwndBuffer.readBigInt64LE ? hwndBuffer.readBigInt64LE(0) : hwndBuffer.readInt32LE(0);
  mirrorService.setParentHwnd(parentHwnd);

  streamService.onStatusChange = (isRunning) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mirror:status-changed', isRunning);
    }
  };

  mirrorService.onStatusChange = (isRunning) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mirror:status-changed', isRunning);
    }
  };

  mainWindow.on('closed', () => {
    streamService.stopStream();
    mirrorService.stopMirror();
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  streamService.stopStream();
  mirrorService.stopMirror();
  if (process.platform !== 'darwin') app.quit();
});

// ================= IPC HANDLERS =================

// Window control handlers
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
    return mainWindow.isFullScreen();
  }
  return false;
});

// ADB Handlers
ipcMain.handle('adb:get-devices', async () => {
  return await adbService.getDevices();
});

ipcMain.handle('adb:get-device-details', async (event, serial) => {
  return await adbService.getDeviceDetails(serial);
});

ipcMain.handle('adb:pair-wireless', async (event, { ip, port, code }) => {
  return await adbService.pairWireless(ip, port, code);
});

ipcMain.handle('adb:connect-wireless', async (event, { ip, port }) => {
  return await adbService.connectWireless(ip, port);
});

ipcMain.handle('adb:disconnect-wireless', async (event, { ip, port }) => {
  return await adbService.disconnectWireless(ip, port);
});

ipcMain.handle('adb:enable-tcpip', async (event, { serial, port }) => {
  return await adbService.enableTcpipSwitch(serial, port);
});

ipcMain.handle('adb:send-key', async (event, { serial, keycode }) => {
  return await adbService.sendKeyevent(serial, keycode);
});

ipcMain.handle('adb:tap', async (event, { serial, x, y }) => {
  return await adbService.tap(serial, x, y);
});

ipcMain.handle('adb:swipe', async (event, { serial, x1, y1, x2, y2, duration }) => {
  return await adbService.swipe(serial, x1, y1, x2, y2, duration);
});

ipcMain.handle('adb:capture-screenshot', async (event, serial) => {
  return await adbService.captureScreenshot(serial);
});

// Screen Mirroring Handlers (Unified In-Window Stream Engine)
ipcMain.handle('mirror:start', async (event, { serial, settings }) => {
  const result = await streamService.startStream(serial, settings);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('mirror:status-changed', streamService.isRunning);
  }
  return result;
});

ipcMain.handle('mirror:stop', async () => {
  const result = streamService.stopStream();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('mirror:status-changed', false);
  }
  return result;
});

ipcMain.handle('mirror:get-status', async () => {
  return { 
    isRunning: streamService.isRunning, 
    serial: streamService.activeDevice?.serial 
  };
});

ipcMain.handle('mirror:inject-touch', async (event, { pointerId, action, x, y }) => {
  streamService.injectTouch(pointerId, action, x, y);
  return true;
});

ipcMain.handle('mirror:update-bounds', (event, bounds) => {
  mirrorService.updateViewportBounds(bounds);
  return true;
});

// Keymapping & Config Handlers
ipcMain.handle('config:load-schemes', async () => {
  return configService.loadSchemes();
});

ipcMain.handle('config:save-schemes', async (event, schemes) => {
  return configService.saveSchemes(schemes);
});

ipcMain.handle('config:load-settings', async () => {
  return configService.loadSettings();
});

ipcMain.handle('config:save-settings', async (event, settings) => {
  return configService.saveSettings(settings);
});

ipcMain.handle('config:import-cfg-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Keymapping Scheme (.cfg / JSON)',
    filters: [
      { name: 'Keymapping Configuration (*.cfg, *.json)', extensions: ['cfg', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const schemes = configService.parseCfgFile(filePath);
    return { success: true, schemes, filePath };
  }
  return { success: false, canceled: true };
});

ipcMain.handle('config:export-cfg-dialog', async (event, scheme) => {
  const defaultFilename = `${(scheme.name || 'keymap').replace(/[^a-zA-Z0-9_-]/g, '_')}.cfg`;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Keymapping Scheme (.cfg)',
    defaultPath: defaultFilename,
    filters: [
      { name: 'BlueStacks / MSI Config (*.cfg)', extensions: ['cfg'] },
      { name: 'JSON Profile (*.json)', extensions: ['json'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    configService.exportToCfgFile(result.filePath, scheme);
    return { success: true, filePath: result.filePath };
  }
  return { success: false, canceled: true };
});

// Keymapper Real-time Input Handlers
ipcMain.handle('keymap:set-scheme', async (event, scheme) => {
  keymapperService.setScheme(scheme);
  return true;
});

ipcMain.handle('keymap:set-device', async (event, device) => {
  keymapperService.setDevice(device);
  return true;
});

ipcMain.handle('keymap:key-down', async (event, { key, code }) => {
  return keymapperService.handleKeyDown(key, code);
});

ipcMain.handle('keymap:key-up', async (event, { key, code }) => {
  return keymapperService.handleKeyUp(key, code);
});

ipcMain.handle('keymap:mouse-down', async (event, { button }) => {
  return keymapperService.handleMouseDown(button);
});

ipcMain.handle('keymap:mouse-up', async (event, { button }) => {
  return keymapperService.handleMouseUp(button);
});

ipcMain.handle('keymap:mouse-move', async (event, { movementX, movementY }) => {
  return keymapperService.handleMouseMove(movementX, movementY);
});
