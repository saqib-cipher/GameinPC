const { spawn } = require('child_process');
const net = require('net');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const adbService = require('./AdbService');

class StreamService {
  constructor() {
    this.wss = null;
    this.wsPort = 29170;
    this.reversePort = 29175;
    this.connectedClients = new Set();
    this.activeDevice = null;
    this.serverProcess = null;
    this.audioProcess = null;
    this.localTcpServer = null;
    this.videoSocket = null;
    this.controlSocket = null;
    this.isRunning = false;

    this.deviceWidth = 1280;
    this.deviceHeight = 720;
    this.codec = 'h264';
    this.configBuffer = null; // Cached SPS / PPS for instant client start
    this.onStatusChange = null;

    this.isScreenOff = false;
    this.isAudioEnabled = true;

    this.initWebSocketServer();
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

  initWebSocketServer() {
    try {
      this.wss = new WebSocket.Server({ port: this.wsPort });
      this.wss.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[StreamService] WebSocket port ${this.wsPort} already in use`);
        } else {
          console.error('[StreamService] WebSocket error:', err);
        }
      });
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

        // Send current status & video metadata
        ws.send(JSON.stringify({ 
          type: 'video-meta', 
          isRunning: this.isRunning, 
          device: this.activeDevice?.serial,
          width: this.deviceWidth,
          height: this.deviceHeight,
          codec: this.codec,
          isScreenOff: this.isScreenOff,
          isAudioEnabled: this.isAudioEnabled,
        }));

        // If we have cached SPS/PPS config header, send it immediately as keyframe
        if (this.configBuffer && ws.readyState === WebSocket.OPEN) {
          const packetHeader = Buffer.alloc(1);
          packetHeader.writeUInt8(1, 0); // 1 = keyframe / config
          const fullPacket = Buffer.concat([packetHeader, this.configBuffer]);
          ws.send(fullPacket, { binary: true });
        }
      });
    } catch (err) {
      console.error('[StreamService] WebSocket init error:', err);
    }
  }

  handleClientMessage(raw) {
    try {
      const data = JSON.parse(raw);
      if (data.type === 'touch') {
        this.injectTouch(data.pointerId || 0, data.action, data.x, data.y);
      } else if (data.type === 'set-dimension') {
        if (data.width > 0 && data.height > 0) {
          this.deviceWidth = data.width;
          this.deviceHeight = data.height;
        }
      }
    } catch (e) {
      // Ignore binary / malformed
    }
  }

  // High-speed binary touch injection directly into scrcpy control socket (<1ms)
  injectTouch(pointerId, action, xPercent, yPercent) {
    const width = this.deviceWidth || 1280;
    const height = this.deviceHeight || 720;
    const px = Math.max(0, Math.min(width, Math.round((xPercent / 100) * width)));
    const py = Math.max(0, Math.min(height, Math.round((yPercent / 100) * height)));

    if (!this.controlSocket || this.controlSocket.destroyed) {
      // Direct ADB fallback if socket is unavailable
      if (this.activeDevice && action === 0) {
        adbService.tap(this.activeDevice.serial, px, py).catch(() => {});
      }
      return;
    }

    try {
      // Scrcpy 4.1 INJECT_TOUCH_EVENT message (32 bytes):
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
      buf.writeUInt32BE(action === 2 ? 0 : 1, 28); // buttons

      this.controlSocket.write(buf);
    } catch (err) {
      console.warn('[StreamService] Touch socket error:', err);
    }
  }

  // Control Mobile Screen Power Mode (0 = OFF, 2 = NORMAL)
  setScreenPowerMode(isOff = true) {
    this.isScreenOff = isOff;
    console.log(`[StreamService] Changing mobile screen power mode: ${isOff ? 'OFF' : 'NORMAL'}`);

    if (this.controlSocket && !this.controlSocket.destroyed) {
      try {
        const buf = Buffer.alloc(2);
        buf.writeUInt8(10, 0); // CONTROL_MSG_TYPE_SET_SCREEN_POWER_MODE = 10
        buf.writeUInt8(isOff ? 0 : 2, 1); // 0 = OFF, 2 = NORMAL
        this.controlSocket.write(buf);
      } catch (e) {
        console.warn('[StreamService] Failed to send screen power socket message:', e);
      }
    }

    // Also apply ADB stay-awake power setting
    if (this.activeDevice?.serial) {
      adbService.setScreenPowerMode(this.activeDevice.serial, isOff).catch(() => {});
    }

    this.broadcastStatus(this.isRunning);
    return { success: true, isScreenOff: this.isScreenOff };
  }

  // Start Real-time Game Audio Forwarding from Android to PC Speakers / Headset
  startAudioForwarding(serial) {
    this.stopAudioForwarding();

    const scrcpy = this.resolveScrcpyPath();
    const binDir = path.dirname(scrcpy);
    const audioArgs = [
      '-s', serial,
      '--no-video',
      '--no-control',
      '--audio-codec=opus',
      '--audio-buffer=20',
      '--audio-output-buffer=10',
      '--window-title=GameinPC-AudioForwarder'
    ];

    console.log(`[StreamService] Starting native game audio forwarding: ${scrcpy} ${audioArgs.join(' ')}`);

    try {
      this.audioProcess = spawn(scrcpy, audioArgs, {
        cwd: binDir,
        windowsHide: true,
        env: {
          ...process.env,
          PATH: `${binDir};${process.env.PATH}`,
          ADB: path.join(binDir, 'adb.exe')
        }
      });

      this.audioProcess.stdout.on('data', d => {
        const line = d.toString().trim();
        if (line) console.log(`[scrcpy-audio]: ${line}`);
      });

      this.audioProcess.stderr.on('data', d => {
        const line = d.toString().trim();
        if (line && !line.includes('10013')) console.warn(`[scrcpy-audio note]: ${line}`);
      });

      this.audioProcess.on('close', code => {
        console.log(`[StreamService] Audio forwarder exited with code ${code}`);
        this.audioProcess = null;
      });

      this.isAudioEnabled = true;
      return true;
    } catch (err) {
      console.error('[StreamService] Failed to start audio forwarder:', err);
      this.audioProcess = null;
      return false;
    }
  }

  stopAudioForwarding() {
    if (this.audioProcess) {
      try {
        this.audioProcess.kill();
      } catch (e) {}
      this.audioProcess = null;
    }
  }

  setAudioEnabled(enabled = true) {
    this.isAudioEnabled = enabled;
    if (enabled) {
      if (this.isRunning && this.activeDevice?.serial && !this.audioProcess) {
        this.startAudioForwarding(this.activeDevice.serial);
      }
    } else {
      this.stopAudioForwarding();
    }
    this.broadcastStatus(this.isRunning);
    return { success: true, isAudioEnabled: this.isAudioEnabled };
  }

  async startStream(serial, settings = {}) {
    if (this.isRunning) {
      await this.stopStream();
    }

    this.activeDevice = { serial };
    this.isScreenOff = !!settings.turnScreenOff;
    this.isAudioEnabled = settings.audioMirror !== false; // Audio enabled by default

    console.log(`[StreamService] Starting unified in-window stream for device ${serial} (Audio=${this.isAudioEnabled}, ScreenOff=${this.isScreenOff})...`);

    try {
      const adb = adbService.resolveAdbPath();
      let serverJarLocal = path.resolve(__dirname, '../../../bin/scrcpy-server');
      if (process.resourcesPath) {
        const packagedJar = path.join(process.resourcesPath, 'bin', 'scrcpy-server');
        if (fs.existsSync(packagedJar)) serverJarLocal = packagedJar;
      }
      const serverJarDevice = '/data/local/tmp/scrcpy-server.jar';

      // 1. Get device screen resolution
      const details = await adbService.getDeviceDetails(serial);
      if (details?.resolution) {
        this.deviceWidth = details.resolution.width;
        this.deviceHeight = details.resolution.height;
      }

      // 2. Push scrcpy-server.jar
      await adbService.runAdbCommand(['-s', serial, 'push', serverJarLocal, serverJarDevice]);

      // 3. Setup local reverse TCP server
      await new Promise((resolve, reject) => {
        this.localTcpServer = net.createServer();
        this.localTcpServer.listen(this.reversePort, '127.0.0.1', async (err) => {
          if (err) return reject(err);
          console.log(`[StreamService] Reverse TCP server listening on port ${this.reversePort}`);
          await adbService.runAdbCommand(['-s', serial, 'reverse', 'localabstract:scrcpy', `tcp:${this.reversePort}`]);
          resolve();
        });
      });

      let metaReceived = false;
      let incomingBuffer = Buffer.alloc(0);

      this.localTcpServer.on('connection', (socket) => {
        if (!this.videoSocket) {
          this.videoSocket = socket;
          console.log('[StreamService] Video socket connected from scrcpy-server!');
          this.isRunning = true;
          this.broadcastStatus(true);
          if (this.onStatusChange) this.onStatusChange(true);

          socket.on('data', (chunk) => {
            incomingBuffer = Buffer.concat([incomingBuffer, chunk]);

            // 16-byte metadata header: 4 bytes codec + 4 bytes flags/w + 4 bytes height + 4 bytes width
            if (!metaReceived) {
              if (incomingBuffer.length >= 16) {
                metaReceived = true;
                this.codec = incomingBuffer.slice(0, 4).toString('ascii').replace(/\0/g, '').trim() || 'h264';
                const h = incomingBuffer.readUInt32BE(8);
                const w = incomingBuffer.readUInt32BE(12);
                if (w > 0 && h > 0) {
                  this.deviceWidth = w;
                  this.deviceHeight = h;
                }
                console.log(`[StreamService] Stream Meta parsed: Codec="${this.codec}", Dimensions=${this.deviceWidth}x${this.deviceHeight}`);
                incomingBuffer = incomingBuffer.slice(16);
                this.broadcastMeta();
              } else {
                return;
              }
            }

            // Packet parsing: [8-byte PTS] [4-byte Size] [Payload]
            while (incomingBuffer.length >= 12) {
              const ptsHigh = incomingBuffer.readUInt32BE(0);
              const isConfig = (ptsHigh & 0x80000000) !== 0;
              const isKeyFrame = (ptsHigh & 0x40000000) !== 0;
              const frameSize = incomingBuffer.readUInt32BE(8);

              if (incomingBuffer.length < 12 + frameSize) {
                break; // Incomplete frame, wait for next socket chunk
              }

              const framePayload = incomingBuffer.slice(12, 12 + frameSize);
              incomingBuffer = incomingBuffer.slice(12 + frameSize);

              if (isConfig || framePayload.includes(Buffer.from([0, 0, 0, 1, 0x67]))) {
                this.configBuffer = framePayload;
              }

              const isKey = isKeyFrame || Boolean(this.configBuffer && framePayload.includes(Buffer.from([0, 0, 0, 1, 0x65])));

              // If keyframe and configBuffer exists, prepend SPS/PPS for instant WebCodecs rendering
              const payloadToSend = (isKey && this.configBuffer && !framePayload.includes(Buffer.from([0, 0, 0, 1, 0x67])))
                ? Buffer.concat([this.configBuffer, framePayload])
                : framePayload;

              const packetHeader = Buffer.alloc(1);
              packetHeader.writeUInt8(isKey ? 1 : 0, 0);
              const fullPacket = Buffer.concat([packetHeader, payloadToSend]);

              this.broadcastBinary(fullPacket);
            }
          });

          socket.on('close', () => {
            console.log('[StreamService] Video socket closed');
            this.videoSocket = null;
            this.isRunning = false;
            this.broadcastStatus(false);
            if (this.onStatusChange) this.onStatusChange(false);
          });

          socket.on('error', (err) => {
            console.warn('[StreamService] Video socket error:', err.message);
          });
        } else if (!this.controlSocket) {
          this.controlSocket = socket;
          console.log('[StreamService] Control socket connected - sub-millisecond touch active!');

          // If turnScreenOff was requested on startup, turn mobile screen off now
          if (this.isScreenOff) {
            setTimeout(() => {
              this.setScreenPowerMode(true);
            }, 300);
          }

          socket.on('close', () => {
            this.controlSocket = null;
          });
          socket.on('error', (e) => console.warn('[StreamService] Control socket note:', e.message));
        }
      });

      // 4. Launch scrcpy-server with send_frame_meta=true & stay_awake=true
      const bitrate = (settings.bitrate || 16) * 1000000;
      const maxFps = settings.maxFps || 120;
      const maxSize = settings.maxSize || 1920;

      const serverArgs = [
        '-s', serial,
        'shell',
        `CLASSPATH=${serverJarDevice}`,
        'app_process',
        '/',
        'com.genymobile.scrcpy.Server',
        '4.1',
        `video_bit_rate=${bitrate}`,
        `max_fps=${maxFps}`,
        `max_size=${maxSize}`,
        'audio=false', // Video stream socket handles video; dedicated background scrcpy process handles crystal-clear PC audio
        'control=true',
        'cleanup=true',
        'stay_awake=true',
        'send_device_meta=false',
        'send_frame_meta=true',
        'send_dummy_byte=false',
        'raw_stream=false'
      ];

      console.log(`[StreamService] Spawning scrcpy-server: ${serverArgs.join(' ')}`);
      this.serverProcess = spawn(adb, serverArgs, { windowsHide: true });

      this.serverProcess.stdout.on('data', (d) => {
        console.log(`[scrcpy-server]: ${d.toString().trim()}`);
      });

      this.serverProcess.stderr.on('data', (d) => {
        console.warn(`[scrcpy-server err]: ${d.toString().trim()}`);
      });

      // 5. Start real-time game audio forwarding to PC speakers / headset
      if (this.isAudioEnabled) {
        this.startAudioForwarding(serial);
      }

      return { success: true, message: 'Unified in-window stream started successfully' };
    } catch (err) {
      console.error('[StreamService] Error starting stream:', err);
      this.isRunning = false;
      if (this.onStatusChange) this.onStatusChange(false);
      return { success: false, message: err.message };
    }
  }

  stopStream() {
    this.isRunning = false;
    this.configBuffer = null;

    // Turn screen back ON when stream stops
    if (this.isScreenOff) {
      this.setScreenPowerMode(false);
      this.isScreenOff = false;
    }

    this.stopAudioForwarding();

    if (this.videoSocket) {
      try { this.videoSocket.destroy(); } catch (e) {}
      this.videoSocket = null;
    }
    if (this.controlSocket) {
      try { this.controlSocket.destroy(); } catch (e) {}
      this.controlSocket = null;
    }
    if (this.localTcpServer) {
      try { this.localTcpServer.close(); } catch (e) {}
      this.localTcpServer = null;
    }
    if (this.serverProcess) {
      try { this.serverProcess.kill(); } catch (e) {}
      this.serverProcess = null;
    }
    if (this.activeDevice) {
      adbService.runAdbCommand(['-s', this.activeDevice.serial, 'reverse', '--remove', 'localabstract:scrcpy']).catch(() => {});
    }
    this.activeDevice = null;
    this.broadcastStatus(false);
    if (this.onStatusChange) this.onStatusChange(false);
    return { success: true };
  }

  broadcastBinary(chunk) {
    for (const client of this.connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(chunk, { binary: true });
      }
    }
  }

  broadcastMeta() {
    const msg = JSON.stringify({ 
      type: 'video-meta', 
      isRunning: this.isRunning, 
      device: this.activeDevice?.serial,
      width: this.deviceWidth,
      height: this.deviceHeight,
      codec: this.codec,
      isScreenOff: this.isScreenOff,
      isAudioEnabled: this.isAudioEnabled,
    });
    for (const client of this.connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }

  broadcastStatus(isRunning) {
    const msg = JSON.stringify({ 
      type: 'status', 
      isRunning, 
      device: this.activeDevice?.serial,
      width: this.deviceWidth,
      height: this.deviceHeight,
      codec: this.codec,
      isScreenOff: this.isScreenOff,
      isAudioEnabled: this.isAudioEnabled,
    });
    for (const client of this.connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }
}

module.exports = new StreamService();
