const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

class MirrorService {
  constructor() {
    this.scrcpyPath = this.resolveScrcpyPath();
    this.activeProcess = null;
    this.currentSerial = null;
    this.isRunning = false;
    this.onStatusChange = null;
    this.parentHwnd = null;
    this.currentBounds = { x: 16, y: 56, width: 960, height: 540 };
    this.dockScriptPath = path.resolve(__dirname, 'dock_window.ps1');
  }

  resolveScrcpyPath() {
    if (process.resourcesPath) {
      const packagedScrcpy = path.join(process.resourcesPath, 'bin', 'scrcpy.exe');
      if (fs.existsSync(packagedScrcpy)) return packagedScrcpy;
    }
    const bundled = path.resolve(__dirname, '../../../bin/scrcpy.exe');
    if (fs.existsSync(bundled)) {
      return bundled;
    }
    return 'scrcpy';
  }

  setParentHwnd(hwnd) {
    this.parentHwnd = hwnd;
  }

  updateViewportBounds(bounds) {
    this.currentBounds = bounds;
    if (this.isRunning && this.parentHwnd) {
      this.dockToParent();
    }
  }

  dockToParent() {
    if (!this.parentHwnd) return;

    const hwndStr = this.parentHwnd.toString();
    const { x, y, width, height } = this.currentBounds;

    const psArgs = [
      '-ExecutionPolicy', 'Bypass',
      '-File', this.dockScriptPath,
      '-ChildTitle', 'GameinPC - Mirror View',
      '-ParentHwnd', hwndStr,
      '-X', Math.round(x).toString(),
      '-Y', Math.round(y).toString(),
      '-Width', Math.round(width).toString(),
      '-Height', Math.round(height).toString(),
    ];

    execFile('powershell', psArgs, (err, stdout) => {
      if (err) {
        console.warn('[MirrorService] Dock error:', err.message);
      } else {
        const out = stdout.trim();
        if (out.includes('DOCKED_SUCCESS')) {
          console.log('[MirrorService] Native Scrcpy Direct3D 11 window successfully docked into GameinPC!');
        }
      }
    });
  }

  startMirror(serial, settings = {}) {
    if (this.isRunning && this.activeProcess) {
      this.stopMirror();
    }

    this.currentSerial = serial;
    const args = ['--serial', serial];

    // 1. Ultra-low latency Direct3D 11 rendering (120 FPS, 0 Lag)
    const bitrate = settings.bitrate || 16;
    args.push(`--video-bit-rate=${bitrate}M`);

    const maxFps = settings.maxFps || 120;
    args.push(`--max-fps=${maxFps}`);

    if (settings.maxSize && settings.maxSize > 0) {
      args.push(`--max-size=${settings.maxSize}`);
    }

    // 2. Zero-latency raw video flags
    args.push('--video-buffer=0');
    args.push('--audio-buffer=20');
    args.push('--render-driver=direct3d11');

    // 3. Normal native mouse and touch interactivity
    // Note: Do NOT disable mouse or keyboard so clicks, swipes, and taps work directly on the mirror window!
    
    // 4. Power & Device flags
    if (settings.stayAwake !== false) {
      args.push('--stay-awake');
    }

    if (settings.turnScreenOff) {
      args.push('--turn-screen-off');
    }

    if (settings.audioMirror === false) {
      args.push('--no-audio');
    }

    // 5. Window setup
    args.push('--window-title=GameinPC - Mirror View');

    console.log(`[MirrorService] Launching Scrcpy engine: ${this.scrcpyPath} ${args.join(' ')}`);

    try {
      const binDir = path.dirname(this.scrcpyPath);
      this.activeProcess = spawn(this.scrcpyPath, args, {
        cwd: binDir,
        windowsHide: false,
        env: {
          ...process.env,
          PATH: `${binDir};${process.env.PATH}`,
          ADB: path.join(binDir, 'adb.exe')
        }
      });

      this.isRunning = true;
      if (this.onStatusChange) this.onStatusChange(true);

      this.activeProcess.stdout.on('data', (data) => {
        console.log(`[scrcpy]: ${data.toString().trim()}`);
      });

      this.activeProcess.stderr.on('data', (data) => {
        console.warn(`[scrcpy stderr]: ${data.toString().trim()}`);
      });

      this.activeProcess.on('close', (code) => {
        console.log(`scrcpy closed with code ${code}`);
        this.isRunning = false;
        this.activeProcess = null;
        if (this.onStatusChange) this.onStatusChange(false);
      });

      this.activeProcess.on('error', (err) => {
        console.error('scrcpy process error:', err);
        this.isRunning = false;
        this.activeProcess = null;
        if (this.onStatusChange) this.onStatusChange(false);
      });

      return { success: true, message: 'Native Scrcpy mirror window started' };
    } catch (err) {
      console.error('Failed to launch scrcpy:', err);
      this.isRunning = false;
      return { success: false, message: err.message };
    }
  }

  stopMirror() {
    if (this.activeProcess) {
      try {
        this.activeProcess.kill();
      } catch (e) {
        console.error('Error killing scrcpy process:', e);
      }
      this.activeProcess = null;
    }
    this.isRunning = false;
    if (this.onStatusChange) this.onStatusChange(false);
    return { success: true };
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      serial: this.currentSerial,
    };
  }
}

module.exports = new MirrorService();
