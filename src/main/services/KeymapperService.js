const adbService = require('./AdbService');

class KeymapperService {
  constructor() {
    this.activeScheme = null;
    this.currentDevice = null;
    this.isShootingMode = false;
    this.isSuspended = false;
    
    // Virtual touch pointer allocations (0-9)
    // 0: Reserved for WASD D-pad
    // 1: Reserved for Shooting/Fire button (LButton)
    // 2: Reserved for Pan/Look-around
    // 3: Reserved for Free Look
    // 4-9: Reserved for dynamic Tap buttons / Macros
    this.activeTouches = new Map(); // key -> pointerId
    this.nextPointerId = 4;
    
    // WASD Movement state
    this.wasdKeys = { W: false, A: false, S: false, D: false };
    this.isWasdActive = false;

    // Pan state
    this.panCurrentX = 50;
    this.panCurrentY = 50;
    this.panCenter = { x: 50, y: 50 };
    this.panRadius = 15; // virtual screen percent for swipe reset

    // TapRepeat timers
    this.repeatIntervals = new Map();

    // Event listeners
    this.onStateChange = null;
    this.touchSender = null; // High-speed socket sender if connected
  }

  setScheme(scheme) {
    this.activeScheme = scheme;
    this.resetAllInputs();
  }

  setDevice(device) {
    this.currentDevice = device;
  }

  setTouchSender(sender) {
    this.touchSender = sender;
  }

  resetAllInputs() {
    this.activeTouches.clear();
    this.wasdKeys = { W: false, A: false, S: false, D: false };
    this.isWasdActive = false;
    this.repeatIntervals.forEach(timer => clearInterval(timer));
    this.repeatIntervals.clear();
  }

  // Inject touch event: action: 0 (DOWN), 1 (MOVE), 2 (UP)
  // x, y: 0.0 to 100.0 (percentage)
  sendTouchEvent(pointerId, action, xPercent, yPercent) {
    if (this.touchSender) {
      this.touchSender({ pointerId, action, x: xPercent, y: yPercent });
      return;
    }

    if (this.currentDevice && action === 0) {
      const width = this.currentDevice.resolution?.width || 1080;
      const height = this.currentDevice.resolution?.height || 2400;
      const px = Math.round((xPercent / 100) * width);
      const py = Math.round((yPercent / 100) * height);
      adbService.tap(this.currentDevice.serial, px, py).catch(() => {});
    }
  }

  // Handle Key Down event from renderer
  handleKeyDown(key, code) {
    if (!this.activeScheme) return { handled: false };

    const panControl = this.activeScheme.gameControls.find(c => c.type === 'Pan');
    const dpadControl = this.activeScheme.gameControls.find(c => c.type === 'Dpad');

    // 1. Toggle Shooting Mode (KeyStartStop e.g. "Ctrl")
    if (panControl && (this.matchKey(panControl.keyStartStop, key, code) || this.matchKey(panControl.keyStartStop_alt1, key, code))) {
      this.isShootingMode = !this.isShootingMode;
      if (this.isShootingMode) {
        this.initPanAnchor(panControl);
        this.sendTouchEvent(2, 0, this.panCurrentX, this.panCurrentY);
      } else {
        this.sendTouchEvent(2, 2, this.panCurrentX, this.panCurrentY);
      }
      return { handled: true, shootingModeChanged: true, isShootingMode: this.isShootingMode };
    }

    // 2. Suspend Shooting Mode (KeySuspend e.g. "X")
    if (panControl && this.matchKey(panControl.keySuspend, key, code)) {
      this.isSuspended = true;
      this.sendTouchEvent(2, 2, this.panCurrentX, this.panCurrentY);
      return { handled: true, shootingModeSuspended: true, isSuspended: true };
    }

    // 3. WASD D-pad movement keys
    if (dpadControl) {
      let isDpadKey = false;
      if (this.matchKey(dpadControl.keyUp, key, code)) { this.wasdKeys.W = true; isDpadKey = true; }
      if (this.matchKey(dpadControl.keyDown, key, code)) { this.wasdKeys.S = true; isDpadKey = true; }
      if (this.matchKey(dpadControl.keyLeft, key, code)) { this.wasdKeys.A = true; isDpadKey = true; }
      if (this.matchKey(dpadControl.keyRight, key, code)) { this.wasdKeys.D = true; isDpadKey = true; }

      if (isDpadKey) {
        this.updateWasdTouch(dpadControl);
        return { handled: true };
      }
    }

    // 4. Tap Spots & Script & TapRepeat
    for (const ctrl of this.activeScheme.gameControls) {
      if (this.matchKey(ctrl.key, key, code) || this.matchKey(ctrl.key_alt1, key, code)) {
        if (ctrl.type === 'Tap') {
          if (!this.activeTouches.has(ctrl.id)) {
            const pid = this.allocatePointerId(ctrl.id);
            this.activeTouches.set(ctrl.id, pid);
            this.sendTouchEvent(pid, 0, ctrl.x, ctrl.y);
          }
          return { handled: true, control: ctrl };
        }

        if (ctrl.type === 'TapRepeat') {
          if (!this.repeatIntervals.has(ctrl.id)) {
            const pid = this.allocatePointerId(ctrl.id);
            const delay = ctrl.delay || (1000 / (ctrl.count || 10));
            
            // Immediate first tap
            this.sendTouchEvent(pid, 0, ctrl.x, ctrl.y);
            setTimeout(() => this.sendTouchEvent(pid, 2, ctrl.x, ctrl.y), 20);

            const timer = setInterval(() => {
              this.sendTouchEvent(pid, 0, ctrl.x, ctrl.y);
              setTimeout(() => this.sendTouchEvent(pid, 2, ctrl.x, ctrl.y), 20);
            }, delay);

            this.repeatIntervals.set(ctrl.id, timer);
          }
          return { handled: true, control: ctrl };
        }

        if (ctrl.type === 'Script') {
          this.executeMacroScript(ctrl);
          return { handled: true, control: ctrl };
        }

        if (ctrl.type === 'Swipe') {
          this.executeSwipe(ctrl);
          return { handled: true, control: ctrl };
        }
      }
    }

    return { handled: false };
  }

  // Handle Key Up event
  handleKeyUp(key, code) {
    if (!this.activeScheme) return { handled: false };

    const panControl = this.activeScheme.gameControls.find(c => c.type === 'Pan');
    const dpadControl = this.activeScheme.gameControls.find(c => c.type === 'Dpad');

    // Suspend release
    if (panControl && this.matchKey(panControl.keySuspend, key, code)) {
      this.isSuspended = false;
      if (this.isShootingMode) {
        this.panCenter = { x: panControl.x, y: panControl.y };
        this.panCurrentX = panControl.x;
        this.panCurrentY = panControl.y;
        this.sendTouchEvent(2, 0, this.panCurrentX, this.panCurrentY);
      }
      return { handled: true, shootingModeSuspended: false, isSuspended: false };
    }

    // WASD release
    if (dpadControl) {
      let isDpadKey = false;
      if (this.matchKey(dpadControl.keyUp, key, code)) { this.wasdKeys.W = false; isDpadKey = true; }
      if (this.matchKey(dpadControl.keyDown, key, code)) { this.wasdKeys.S = false; isDpadKey = true; }
      if (this.matchKey(dpadControl.keyLeft, key, code)) { this.wasdKeys.A = false; isDpadKey = true; }
      if (this.matchKey(dpadControl.keyRight, key, code)) { this.wasdKeys.D = false; isDpadKey = true; }

      if (isDpadKey) {
        this.updateWasdTouch(dpadControl);
        return { handled: true };
      }
    }

    // Tap & TapRepeat release
    for (const ctrl of this.activeScheme.gameControls) {
      if (this.matchKey(ctrl.key, key, code) || this.matchKey(ctrl.key_alt1, key, code)) {
        if (ctrl.type === 'Tap') {
          if (this.activeTouches.has(ctrl.id)) {
            const pid = this.activeTouches.get(ctrl.id);
            this.sendTouchEvent(pid, 2, ctrl.x, ctrl.y);
            this.activeTouches.delete(ctrl.id);
          }
          return { handled: true };
        }

        if (ctrl.type === 'TapRepeat') {
          if (this.repeatIntervals.has(ctrl.id)) {
            clearInterval(this.repeatIntervals.get(ctrl.id));
            this.repeatIntervals.delete(ctrl.id);
          }
          return { handled: true };
        }
      }
    }

    return { handled: false };
  }

  // Handle Mouse Button Down
  handleMouseDown(button) { // 0: Left, 1: Middle, 2: Right, 3: Back (X1), 4: Forward (X2)
    if (!this.activeScheme) return;

    const panControl = this.activeScheme.gameControls.find(c => c.type === 'Pan');

    // Left click in shooting mode -> Fire button at (LButtonX, LButtonY)
    if (button === 0 && this.isShootingMode && !this.isSuspended && panControl && panControl.isShootOnClickEnabled) {
      this.sendTouchEvent(1, 0, panControl.lButtonX || 80, panControl.lButtonY || 70);
      return { handled: true };
    }

    // Check mouse button mappings (MouseLButton, MouseRButton, MouseMButton, MouseXButton1, MouseXButton2)
    const btnName = this.getMouseButtonName(button);
    return this.handleKeyDown(btnName, btnName);
  }

  // Handle Mouse Button Up
  handleMouseUp(button) {
    if (!this.activeScheme) return;

    const panControl = this.activeScheme.gameControls.find(c => c.type === 'Pan');

    if (button === 0 && this.isShootingMode && panControl && panControl.isShootOnClickEnabled) {
      this.sendTouchEvent(1, 2, panControl.lButtonX || 80, panControl.lButtonY || 70);
      return { handled: true };
    }

    const btnName = this.getMouseButtonName(button);
    return this.handleKeyUp(btnName, btnName);
  }

  initPanAnchor(panControl) {
    if (!panControl) return;

    // Look-around Area (Default right 45% side: Left 52%, Right 98%, Top 10%, Bottom 90%)
    const areaLeft = typeof panControl.areaLeft === 'number' ? Math.max(0, Math.min(95, panControl.areaLeft)) : 52.0;
    const areaRight = typeof panControl.areaRight === 'number' ? Math.max(areaLeft + 5, Math.min(100, panControl.areaRight)) : 98.0;
    const areaTop = typeof panControl.areaTop === 'number' ? Math.max(0, Math.min(95, panControl.areaTop)) : 10.0;
    const areaBottom = typeof panControl.areaBottom === 'number' ? Math.max(areaTop + 5, Math.min(100, panControl.areaBottom)) : 90.0;

    this.panBounds = { left: areaLeft, right: areaRight, top: areaTop, bottom: areaBottom };

    // Center anchor inside the Look-around Area
    const centerX = (areaLeft + areaRight) / 2;
    const centerY = (areaTop + areaBottom) / 2;

    this.panCenter = { x: centerX, y: centerY };
    this.panCurrentX = centerX;
    this.panCurrentY = centerY;
  }

  // Handle Mouse Move (calibrated to 100% match MSI App Player & BlueStacks 5 isotropic sensitivity)
  handleMouseMove(movementX, movementY) {
    if (!this.isShootingMode || this.isSuspended || !this.activeScheme) return;

    const panControl = this.activeScheme.gameControls.find(c => c.type === 'Pan');
    if (!panControl) return;

    if (!this.panBounds) {
      this.initPanAnchor(panControl);
    }

    // Global Sensitivity scale multiplier (default 1.0)
    const sensScale = typeof panControl.sensScale === 'number' ? panControl.sensScale : 1.0;
    
    // X & Y raw sensitivity from config (default 1.60)
    const rawSensX = (typeof panControl.mouseSensitivityX === 'number' 
      ? panControl.mouseSensitivityX 
      : (typeof panControl.sensitivity === 'number' ? panControl.sensitivity : 1.60)) * sensScale;

    const rawSensY = (typeof panControl.mouseSensitivityY === 'number' 
      ? panControl.mouseSensitivityY 
      : (typeof panControl.sensitivityRatioY === 'number' ? panControl.sensitivityRatioY : rawSensX)) * sensScale;

    // Isotropic base multiplier: ensures 1:1 camera rotation in 3D mobile shooters
    // Normalized to 1920x1080 reference frame
    const BASE_PIXEL_SCALE = 1.20;

    let accelFactor = 1.0;
    if (panControl.mouseAcceleration) {
      const mouseSpeed = Math.hypot(movementX, movementY);
      accelFactor = Math.min(2.5, 1.0 + Math.pow(mouseSpeed, 1.15) * 0.012);
    }

    // Convert mouse counts directly to screen percentage deltas
    // X: (movementX * sensX * scale / 1920) * 100 = movementX * sensX * 0.0625
    // Y: (movementY * sensY * scale / 1080) * 100 = movementY * sensY * 0.1111
    const deltaX = (movementX * rawSensX * BASE_PIXEL_SCALE / 19.2) * accelFactor;
    const deltaY = (movementY * rawSensY * BASE_PIXEL_SCALE / 10.8) * accelFactor;

    this.panCurrentX += deltaX;
    this.panCurrentY += deltaY;

    // Bounded Look-around Area check (default Right 45% side)
    const bounds = this.panBounds || { left: 52.0, right: 98.0, top: 10.0, bottom: 90.0 };
    const isOutOfBounds = 
      this.panCurrentX <= bounds.left || 
      this.panCurrentX >= bounds.right || 
      this.panCurrentY <= bounds.top || 
      this.panCurrentY >= bounds.bottom;

    if (isOutOfBounds) {
      // BlueStacks / MSI App Player Tweaks 948816450 / 16450 instantaneous micro-reset:
      // 1. Lift touch up at current boundary
      this.sendTouchEvent(2, 2, this.panCurrentX, this.panCurrentY);
      
      // 2. Teleport back to center anchor of the right look-around area
      this.panCurrentX = this.panCenter.x;
      this.panCurrentY = this.panCenter.y;
      
      // 3. Touch down at center anchor
      this.sendTouchEvent(2, 0, this.panCurrentX, this.panCurrentY);
      
      // 4. Apply current frame delta and resume dragging
      this.panCurrentX += deltaX;
      this.panCurrentY += deltaY;
      this.sendTouchEvent(2, 1, this.panCurrentX, this.panCurrentY);
    } else {
      // Continuous fluid camera sweep
      this.sendTouchEvent(2, 1, this.panCurrentX, this.panCurrentY);
    }
  }

  // Update WASD dynamic analog joystick
  updateWasdTouch(dpadControl) {
    let vx = 0;
    let vy = 0;

    if (this.wasdKeys.W) vy -= 1;
    if (this.wasdKeys.S) vy += 1;
    if (this.wasdKeys.A) vx -= 1;
    if (this.wasdKeys.D) vx += 1;

    const isMoving = vx !== 0 || vy !== 0;

    if (isMoving) {
      // Normalize diagonal vector
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;

      const radius = dpadControl.xRadius || 3.5;
      const targetX = dpadControl.x + (vx * radius);
      const targetY = dpadControl.y + (vy * radius);

      if (!this.isWasdActive) {
        // Start touch at center
        this.sendTouchEvent(0, 0, dpadControl.x, dpadControl.y);
        this.isWasdActive = true;
      }
      // Drag joystick to target offset
      this.sendTouchEvent(0, 1, targetX, targetY);
    } else {
      if (this.isWasdActive) {
        this.sendTouchEvent(0, 2, dpadControl.x, dpadControl.y);
        this.isWasdActive = false;
      }
    }
  }

  // Execute macro script sequences (e.g. tap x y, wait ms, swipe x1 y1 x2 y2 ms)
  async executeMacroScript(scriptControl) {
    if (!scriptControl.commands || !Array.isArray(scriptControl.commands)) return;

    const pid = 3; // Script pointer ID

    for (const cmdLine of scriptControl.commands) {
      const line = cmdLine.trim();
      if (!line) continue;

      const parts = line.split(/\s+/);
      const command = parts[0].toLowerCase();

      if (command === 'tap') {
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        if (!isNaN(x) && !isNaN(y)) {
          this.sendTouchEvent(pid, 0, x, y);
          await new Promise(r => setTimeout(r, 20));
          this.sendTouchEvent(pid, 2, x, y);
        }
      } else if (command === 'wait') {
        const duration = parseFloat(parts[1]) * 1000; // if in seconds
        await new Promise(r => setTimeout(r, duration || 50));
      } else if (command === 'swipe') {
        const x1 = parseFloat(parts[1]);
        const y1 = parseFloat(parts[2]);
        const x2 = parseFloat(parts[3]);
        const y2 = parseFloat(parts[4]);
        const duration = parseInt(parts[5], 10) || 100;
        await this.runSmoothSwipe(pid, x1, y1, x2, y2, duration);
      }
    }
  }

  // Execute swipe gesture
  async executeSwipe(swipeControl) {
    const pid = 3;
    const startX = swipeControl.x;
    const startY = swipeControl.y;
    let endX = startX;
    let endY = startY;
    const dist = swipeControl.distance || 15;

    switch (swipeControl.direction) {
      case 'Up': endY -= dist; break;
      case 'Down': endY += dist; break;
      case 'Left': endX -= dist; break;
      case 'Right': endX += dist; break;
    }

    await this.runSmoothSwipe(pid, startX, startY, endX, endY, swipeControl.duration || 100);
  }

  async runSmoothSwipe(pid, x1, y1, x2, y2, durationMs) {
    const steps = 6;
    const stepDelay = durationMs / steps;

    this.sendTouchEvent(pid, 0, x1, y1);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const curX = x1 + (x2 - x1) * t;
      const curY = y1 + (y2 - y1) * t;
      await new Promise(r => setTimeout(r, stepDelay));
      this.sendTouchEvent(pid, 1, curX, curY);
    }
    this.sendTouchEvent(pid, 2, x2, y2);
  }

  allocatePointerId(controlId) {
    const id = this.nextPointerId;
    this.nextPointerId = (this.nextPointerId + 1) % 10;
    if (this.nextPointerId < 4) this.nextPointerId = 4;
    return id;
  }

  getMouseButtonName(button) {
    switch (button) {
      case 0: return 'MouseLButton';
      case 1: return 'MouseMButton';
      case 2: return 'MouseRButton';
      case 3: return 'MouseXButton1';
      case 4: return 'MouseXButton2';
      default: return '';
    }
  }

  matchKey(binding, key, code) {
    if (!binding) return false;
    const b = binding.toLowerCase().trim();
    const k = (key || '').toLowerCase().trim();
    const c = (code || '').toLowerCase().trim();

    if (b === k || b === c) return true;

    // Special aliases
    if (b === 'ctrl' && (k === 'control' || c === 'controlleft' || c === 'controlright')) return true;
    if (b === 'shift' && (k === 'shift' || c === 'shiftleft' || c === 'shiftright')) return true;
    if (b === 'alt' && (k === 'alt' || c === 'altleft' || c === 'altright')) return true;
    if (b === 'space' && (k === ' ' || c === 'space')) return true;
    if (b === 'tab' && (k === 'tab' || c === 'tab')) return true;
    if (b === 'enter' && (k === 'enter' || c === 'enter')) return true;
    if (b === 'capslock' && (k === 'capslock' || c === 'capslock')) return true;

    // Mouse buttons
    if (b === 'mouselbutton' && k === 'mouselbutton') return true;
    if (b === 'mouserbutton' && k === 'mouserbutton') return true;
    if (b === 'mousembutton' && k === 'mousembutton') return true;
    if (b === 'mousexbutton1' && k === 'mousexbutton1') return true;
    if (b === 'mousexbutton2' && k === 'mousexbutton2') return true;

    return false;
  }
}

module.exports = new KeymapperService();
