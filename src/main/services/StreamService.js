const { spawn } = require('child_process');
const net = require('net');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const adbService = require('./AdbService');

class StreamService {
  constructor() {
    this.wss = null;
    this.wsPort = 27183;
    this.connectedClients = new Set();
    this.activeDevice = null;
    this.serverProcess = null;
    this.videoSocket = null;
    this.controlSocket = null;
    this.isRunning = false;
    this.forwardPort = 27184;

    this.initWebSocketServer();
  }

  initWebSocketServer() {
    try {
      this.wss = new WebSocket.Server({ port: this.wsPort });
      console.log(`[StreamService] WebSocket server listening on ws://127.0.0.1:${this.wsPort}`);

      this.wss.on('connection', (ws) => {
        this.connectedClients.add(ws);
        console.log(`[StreamService] Client connected (${this.connectedClients.size} active)`);

        ws.on('message', (message) => {
          this.handleClientMessage(message);
        });

        ws.on('close', () => {
          this.connectedClients.delete(ws);
        });

        // Send current status
        ws.send(JSON.stringify({ type: 'status', isRunning: this.isRunning, device: this.activeDevice?.serial }));
      });
    } catch (err) {
      console.error('[StreamService] WebSocket init error:', err);
    }
  }

  handleClientMessage(raw) {
    try {
      const data = JSON.parse(raw);
      if (data.type === 'touch') {
        this.injectTouch(data.pointerId, data.action, data.x, data.y);
      }
    } catch (e) {
      // Ignore binary / malformed
    }
  }

  // Inject binary touch event into scrcpy control socket if connected
  injectTouch(pointerId, action, xPercent, yPercent) {
    if (!this.controlSocket || this.controlSocket.destroyed) {
      // Fallback to ADB touch
      if (this.activeDevice && action === 0) {
        const width = this.deviceWidth || 1080;
        const height = this.deviceHeight || 2400;
        const px = Math.round((xPercent / 100) * width);
        const py = Math.round((yPercent / 100) * height);
        adbService.tap(this.activeDevice.serial, px, py).catch(() => {});
      }
      return;
    }

    try {
      // Scrcpy control message: TYPE_INJECT_TOUCH_EVENT (2)
      // struct {
      //   uint8_t type = 2;
      //   uint8_t action; // 0=DOWN, 1=UP, 2=MOVE
      //   uint64_t pointer_id;
      //   uint32_t x, y;
      //   uint16_t width, height;
      //   uint16_t pressure;
      //   uint32_t action_button;
      //   uint32_t buttons;
      // }
      const width = this.deviceWidth || 1080;
      const height = this.deviceHeight || 2400;
      const px = Math.round((xPercent / 100) * width);
      const py = Math.round((yPercent / 100) * height);

      const buf = Buffer.alloc(32);
      buf.writeUInt8(2, 0); // type: INJECT_TOUCH_EVENT

      let scrcpyAction = 0; // DOWN
      if (action === 1) scrcpyAction = 2; // MOVE
      if (action === 2) scrcpyAction = 1; // UP
      buf.writeUInt8(scrcpyAction, 1);

      buf.writeBigUInt64BE(BigInt(pointerId || 0), 2);
      buf.writeUInt32BE(px, 10);
      buf.writeUInt32BE(py, 14);
      buf.writeUInt16BE(width, 18);
      buf.writeUInt16BE(height, 20);
      buf.writeUInt16BE(action === 2 ? 0 : 0xffff, 22); // pressure
      buf.writeUInt32BE(1, 24); // action_button (primary)
      buf.writeUInt32BE(1, 28); // buttons

      this.controlSocket.write(buf);
    } catch (err) {
      console.warn('[StreamService] Error writing touch to control socket:', err);
    }
  }

  async startStream(serial, settings = {}) {
    if (this.isRunning) {
      await this.stopStream();
    }

    this.activeDevice = { serial };
    console.log(`[StreamService] Starting in-window stream for device ${serial}...`);

    try {
      const adb = adbService.resolveAdbPath();
      const serverJarLocal = path.resolve(__dirname, '../../../bin/scrcpy-server');
      const serverJarDevice = '/data/local/tmp/scrcpy-server.jar';

      // 1. Get device screen resolution
      const details = await adbService.getDeviceDetails(serial);
      if (details?.resolution) {
        this.deviceWidth = details.resolution.width;
        this.deviceHeight = details.resolution.height;
      } else {
        this.deviceWidth = 1080;
        this.deviceHeight = 2400;
      }

      // 2. Push scrcpy-server.jar if needed
      await adbService.runAdbCommand(['-s', serial, 'push', serverJarLocal, serverJarDevice]);

      // 3. Setup ADB forward tunnel
      const tunnelPort = this.forwardPort;
      await adbService.runAdbCommand(['-s', serial, 'forward', `tcp:${tunnelPort}`, 'localabstract:scrcpy']);

      // 4. Launch scrcpy-server on Android device
      const bitrate = (settings.bitrate || 8) * 1000000;
      const maxFps = settings.maxFps || 60;
      const maxSize = settings.maxSize || 0;

      const serverArgs = [
        '-s', serial,
        'shell',
        `CLASSPATH=${serverJarDevice}`,
        'app_process',
        '/',
        'com.genymobile.scrcpy.Server',
        '4.1',
        'tunnel_forward=true',
        `video_bit_rate=${bitrate}`,
        `max_fps=${maxFps}`,
        `max_size=${maxSize}`,
        'audio=false',
        'control=true',
        'cleanup=true',
        'send_device_meta=true',
        'send_frame_meta=false',
        'send_dummy_byte=true',
      ];

      console.log(`[StreamService] Launching scrcpy-server on device: ${serverArgs.join(' ')}`);
      this.serverProcess = spawn(adb, serverArgs, { windowsHide: true });

      this.serverProcess.stdout.on('data', (d) => {
        console.log(`[scrcpy-server stdout]: ${d.toString().trim()}`);
      });

      this.serverProcess.stderr.on('data', (d) => {
        console.warn(`[scrcpy-server stderr]: ${d.toString().trim()}`);
      });

      // 5. Connect to the video & control sockets
      await new Promise(r => setTimeout(r, 800));

      const videoSock = new net.Socket();
      this.videoSocket = videoSock;

      videoSock.connect(tunnelPort, '127.0.0.1', () => {
        console.log(`[StreamService] Connected to device video stream on port ${tunnelPort}`);
        this.isRunning = true;
        this.broadcastStatus(true);
      });

      let headerParsed = false;
      let headerBuffer = Buffer.alloc(0);

      videoSock.on('data', (chunk) => {
        if (!headerParsed) {
          headerBuffer = Buffer.concat([headerBuffer, chunk]);
          // Scrcpy 4.1 header: 1 dummy byte + 64 bytes device name + 4 bytes codec + 4 bytes width + 4 bytes height
          if (headerBuffer.length >= 69) {
            headerParsed = true;
            const dummy = headerBuffer.slice(0, 1);
            const devName = headerBuffer.slice(1, 65).toString().replace(/\0/g, '');
            const codec = headerBuffer.slice(65, 69).toString();
            console.log(`[StreamService] Stream initialized: ${devName}, Codec: ${codec}`);

            // Remaining data is H.264 video NAL stream
            const videoData = headerBuffer.slice(69);
            if (videoData.length > 0) {
              this.broadcastBinary(videoData);
            }
            headerBuffer = null;
          }
        } else {
          // Broadcast raw H.264 video NAL units to WebCodecs in renderer
          this.broadcastBinary(chunk);
        }
      });

      videoSock.on('close', () => {
        console.log('[StreamService] Video stream socket closed');
        this.isRunning = false;
        this.broadcastStatus(false);
      });

      videoSock.on('error', (err) => {
        console.error('[StreamService] Video socket error:', err);
      });

      // Connect second socket for touch control
      setTimeout(() => {
        const ctrlSock = new net.Socket();
        this.controlSocket = ctrlSock;
        ctrlSock.connect(tunnelPort, '127.0.0.1', () => {
          console.log('[StreamService] Control socket connected successfully');
        });
        ctrlSock.on('error', (e) => console.warn('[StreamService] Control socket note:', e.message));
      }, 500);

      return { success: true, message: 'In-window stream started' };
    } catch (err) {
      console.error('[StreamService] Error starting stream:', err);
      this.isRunning = false;
      return { success: false, message: err.message };
    }
  }

  stopStream() {
    this.isRunning = false;
    if (this.videoSocket) {
      try { this.videoSocket.destroy(); } catch (e) {}
      this.videoSocket = null;
    }
    if (this.controlSocket) {
      try { this.controlSocket.destroy(); } catch (e) {}
      this.controlSocket = null;
    }
    if (this.serverProcess) {
      try { this.serverProcess.kill(); } catch (e) {}
      this.serverProcess = null;
    }
    if (this.activeDevice) {
      adbService.runAdbCommand(['-s', this.activeDevice.serial, 'forward', '--remove', `tcp:${this.forwardPort}`]).catch(() => {});
    }
    this.activeDevice = null;
    this.broadcastStatus(false);
    return { success: true };
  }

  broadcastBinary(chunk) {
    for (const client of this.connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(chunk, { binary: true });
      }
    }
  }

  broadcastStatus(isRunning) {
    const msg = JSON.stringify({ type: 'status', isRunning, device: this.activeDevice?.serial });
    for (const client of this.connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }
}

module.exports = new StreamService();
