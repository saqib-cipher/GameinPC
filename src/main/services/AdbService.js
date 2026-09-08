const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class AdbService {
  constructor() {
    this.adbPath = this.resolveAdbPath();
    this.currentDevice = null;
    this.devicePollInterval = null;
    this.listeners = new Set();
  }

  resolveAdbPath() {
    // 1. Check bundled bin/adb.exe
    const bundledPath = path.resolve(__dirname, '../../../bin/adb.exe');
    if (fs.existsSync(bundledPath)) {
      return bundledPath;
    }

    // 2. Check Android SDK default path
    const localAppData = process.env.LOCALAPPDATA || '';
    const sdkAdb = path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
    if (fs.existsSync(sdkAdb)) {
      return sdkAdb;
    }

    // 3. Fallback to system adb
    return 'adb';
  }

  runAdbCommand(args, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.adbPath, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error(`ADB command timed out: adb ${args.join(' ')}`));
      }, timeout);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          resolve(stdout.trim() || stderr.trim());
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  async getDevices() {
    try {
      const output = await this.runAdbCommand(['devices', '-l']);
      const lines = output.split('\n').filter(l => l.trim().length > 0);
      const devices = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('*')) continue;

        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const serial = parts[0];
          const state = parts[1]; // device, unauthorized, offline

          let model = 'Android Device';
          let product = '';
          let transportId = '';

          line.split(/\s+/).forEach(part => {
            if (part.startsWith('model:')) model = part.replace('model:', '').replace(/_/g, ' ');
            if (part.startsWith('product:')) product = part.replace('product:', '');
            if (part.startsWith('transport_id:')) transportId = part.replace('transport_id:', '');
          });

          const isWireless = serial.includes(':');

          devices.push({
            serial,
            state,
            model,
            product,
            transportId,
            isWireless,
            connectionType: isWireless ? 'Wi-Fi / Wireless' : 'USB',
          });
        }
      }

      return devices;
    } catch (err) {
      console.error('Error getting devices:', err);
      return [];
    }
  }

  async getDeviceDetails(serial) {
    try {
      const [model, manufacturer, androidVersion, sizeOut, densityOut, batteryOut] = await Promise.all([
        this.runAdbCommand(['-s', serial, 'shell', 'getprop', 'ro.product.model']).catch(() => 'Unknown Model'),
        this.runAdbCommand(['-s', serial, 'shell', 'getprop', 'ro.product.manufacturer']).catch(() => 'Android'),
        this.runAdbCommand(['-s', serial, 'shell', 'getprop', 'ro.build.version.release']).catch(() => 'Unknown'),
        this.runAdbCommand(['-s', serial, 'shell', 'wm', 'size']).catch(() => ''),
        this.runAdbCommand(['-s', serial, 'shell', 'wm', 'density']).catch(() => ''),
        this.runAdbCommand(['-s', serial, 'shell', 'dumpsys', 'battery']).catch(() => ''),
      ]);

      // Parse display size: "Physical size: 1080x2400" or "Override size: ..."
      let width = 1080;
      let height = 2400;
      const sizeMatch = sizeOut.match(/size:\s*(\d+)x(\d+)/i);
      if (sizeMatch) {
        width = parseInt(sizeMatch[1], 10);
        height = parseInt(sizeMatch[2], 10);
      }

      // Parse battery level
      let batteryLevel = 100;
      const battMatch = batteryOut.match(/level:\s*(\d+)/i);
      if (battMatch) {
        batteryLevel = parseInt(battMatch[1], 10);
      }

      return {
        serial,
        model: model.trim() || 'Android Device',
        manufacturer: manufacturer.trim() || 'Android',
        androidVersion: androidVersion.trim() || '12',
        resolution: { width, height },
        density: densityOut.trim(),
        batteryLevel,
      };
    } catch (err) {
      console.error(`Error getting details for ${serial}:`, err);
      return null;
    }
  }

  async pairWireless(ip, port, code) {
    if (!ip || !port || !code) {
      throw new Error('IP, Port, and Pairing Code are required');
    }
    const target = `${ip.trim()}:${port.toString().trim()}`;
    const output = await this.runAdbCommand(['pair', target, code.trim()]);
    if (output.toLowerCase().includes('successfully paired')) {
      return { success: true, message: `Successfully paired with ${target}` };
    }
    return {
      success: !output.toLowerCase().includes('failed') && !output.toLowerCase().includes('error'),
      message: output
    };
  }

  async connectWireless(ip, port = 5555) {
    if (!ip) throw new Error('IP is required');
    const target = `${ip.trim()}:${port.toString().trim()}`;
    const output = await this.runAdbCommand(['connect', target]);
    const success = output.toLowerCase().includes('connected to') || output.toLowerCase().includes('already connected');
    return { success, message: output };
  }

  async disconnectWireless(ip, port = 5555) {
    const target = `${ip.trim()}:${port.toString().trim()}`;
    const output = await this.runAdbCommand(['disconnect', target]);
    return { success: true, message: output };
  }

  async enableTcpipSwitch(serial, port = 5555) {
    try {
      // 1. Get phone's wlan IP
      const ipOutput = await this.runAdbCommand(['-s', serial, 'shell', 'ip', 'route']).catch(() => '');
      let phoneIp = '';
      const match = ipOutput.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
      if (match) {
        phoneIp = match[1];
      } else {
        const addrOutput = await this.runAdbCommand(['-s', serial, 'shell', 'ip', 'addr', 'show', 'wlan0']).catch(() => '');
        const addrMatch = addrOutput.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
        if (addrMatch) phoneIp = addrMatch[1];
      }

      // 2. Set tcpip mode
      await this.runAdbCommand(['-s', serial, 'tcpip', port.toString()]);
      await new Promise(r => setTimeout(r, 1000));

      // 3. Connect via wireless
      if (phoneIp) {
        const connectResult = await this.connectWireless(phoneIp, port);
        return {
          success: connectResult.success,
          phoneIp,
          port,
          message: `Switched ${serial} to wireless mode at ${phoneIp}:${port}`
        };
      }

      return {
        success: true,
        message: `Enabled TCP/IP on port ${port}. Please connect using phone's Wi-Fi IP address.`
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  // Fallback touch and key injection methods
  async tap(serial, x, y) {
    return this.runAdbCommand(['-s', serial, 'shell', 'input', 'tap', Math.round(x), Math.round(y)]);
  }

  async swipe(serial, x1, y1, x2, y2, durationMs = 100) {
    return this.runAdbCommand(['-s', serial, 'shell', 'input', 'swipe', Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2), durationMs]);
  }

  async sendKeyevent(serial, keycode) {
    return this.runAdbCommand(['-s', serial, 'shell', 'input', 'keyevent', keycode.toString()]);
  }

  async sendText(serial, text) {
    const escaped = text.replace(/ /g, '%s');
    return this.runAdbCommand(['-s', serial, 'shell', 'input', 'text', escaped]);
  }
}

module.exports = new AdbService();
