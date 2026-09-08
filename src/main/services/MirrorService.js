const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class MirrorService {
  constructor() {
    this.scrcpyPath = this.resolveScrcpyPath();
    this.activeProcess = null;
    this.currentSerial = null;
    this.isRunning = false;
    this.onStatusChange = null;
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

  startMirror(serial, settings = {}) {
    if (this.isRunning && this.activeProcess) {
      this.stopMirror();
    }

    this.currentSerial = serial;
    const args = ['--serial', serial];

    // Video options
    const bitrate = settings.bitrate || 8;
    args.push(`--video-bit-rate=${bitrate}M`);

    if (settings.maxFps) {
      args.push(`--max-fps=${settings.maxFps}`);
    }

    if (settings.maxSize && settings.maxSize > 0) {
      args.push(`--max-size=${settings.maxSize}`);
    }

    if (settings.stayAwake !== false) {
      args.push('--stay-awake');
    }

    if (settings.turnScreenOff) {
      args.push('--turn-screen-off');
    }

    if (settings.audioMirror === false) {
      args.push('--no-audio');
    }

    // Low latency & performance tweaks
    if (settings.lowLatencyMode !== false) {
      args.push('--video-buffer=0');
      args.push('--audio-buffer=20');
    }

    // Window settings
    args.push('--window-title=GameinPC - Mirror View');

    console.log(`Starting scrcpy: ${this.scrcpyPath} ${args.join(' ')}`);

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

      return { success: true, message: 'Screen mirror started successfully' };
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
