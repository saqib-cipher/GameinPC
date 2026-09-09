const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigService {
  constructor() {
    this.userDataPath = this.resolveUserDataPath();
    this.schemesFilePath = path.join(this.userDataPath, 'gameinpc_schemes.json');
    this.settingsFilePath = path.join(this.userDataPath, 'gameinpc_settings.json');
    this.ensureDirectoryExists(this.userDataPath);
  }

  resolveUserDataPath() {
    if (app && app.getPath) {
      try {
        return app.getPath('userData');
      } catch (e) {
        // In testing or pre-ready
      }
    }
    const homeDir = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : '/var/local');
    return path.join(homeDir, 'GameinPC');
  }

  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
      } catch (err) {
        console.error('Failed to create userData dir:', err);
      }
    }
  }

  // Load all schemes (from user storage or bundled defaults)
  loadSchemes() {
    try {
      if (fs.existsSync(this.schemesFilePath)) {
        const raw = fs.readFileSync(this.schemesFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Error reading user schemes, falling back to defaults:', err);
    }

    // Default: load from com.dts.freefiremax.cfg in workspace
    const defaults = this.getDefaultSchemes();
    this.saveSchemes(defaults);
    return defaults;
  }

  saveSchemes(schemes) {
    try {
      this.ensureDirectoryExists(this.userDataPath);
      fs.writeFileSync(this.schemesFilePath, JSON.stringify(schemes, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error saving schemes:', err);
      return false;
    }
  }

  // Parse a BlueStacks / MSI .cfg file (or JSON file)
  parseCfgFile(filePath) {
    try {
      const rawContent = fs.readFileSync(filePath, 'utf8');
      return this.parseCfgString(rawContent, path.basename(filePath));
    } catch (err) {
      console.error(`Error reading .cfg file from ${filePath}:`, err);
      throw err;
    }
  }

  parseCfgString(content, fallbackName = 'Imported Scheme') {
    const data = JSON.parse(content);
    const schemes = [];

    if (data.ControlSchemes && Array.isArray(data.ControlSchemes)) {
      for (const cs of data.ControlSchemes) {
        schemes.push(this.normalizeControlScheme(cs));
      }
    } else if (Array.isArray(data)) {
      for (const item of data) {
        schemes.push(this.normalizeControlScheme(item));
      }
    } else if (data.GameControls) {
      schemes.push(this.normalizeControlScheme(data));
    } else {
      throw new Error('Unrecognized keymap configuration format');
    }

    return schemes;
  }

  // Normalize Bluestacks control scheme to standard GameinPC Scheme format
  normalizeControlScheme(rawScheme) {
    const id = rawScheme.Id || 'scheme_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const name = rawScheme.Name || 'Custom Scheme';
    const controls = [];

    if (Array.isArray(rawScheme.GameControls)) {
      for (const gc of rawScheme.GameControls) {
        const type = gc.Type || (gc['$type'] ? gc['$type'].split(',')[0].trim() : 'Tap');

        const control = {
          id: 'ctrl_' + Math.random().toString(36).substring(2, 9),
          type: type,
          x: typeof gc.X === 'number' ? gc.X : 50,
          y: typeof gc.Y === 'number' ? gc.Y : 50,
          showOnOverlay: gc.ShowOnOverlay !== false,
          guidanceCategory: gc.GuidanceCategory || 'General',
          guidance: gc.Guidance || {},
        };

        switch (type) {
          case 'Pan':
            control.keyStartStop = gc.KeyStartStop || 'Ctrl';
            control.keyStartStop_alt1 = gc.KeyStartStop_alt1 || '';
            control.keySuspend = gc.KeySuspend || 'X';
            control.keyAction = gc.KeyAction || 'MouseLButton';
            control.lButtonX = typeof gc.LButtonX === 'number' ? gc.LButtonX : 84.94;
            control.lButtonY = typeof gc.LButtonY === 'number' ? gc.LButtonY : 73.44;
            control.mouseSensitivityX = typeof gc.MouseSensitivityX === 'number' ? gc.MouseSensitivityX : (typeof gc.Sensitivity === 'number' ? gc.Sensitivity : 1.60);
            control.mouseSensitivityY = typeof gc.MouseSensitivityY === 'number' ? gc.MouseSensitivityY : (typeof gc.SensitivityRatioY === 'number' ? gc.SensitivityRatioY : 1.60);
            control.sensitivity = control.mouseSensitivityX;
            control.sensitivityRatioY = control.mouseSensitivityY;
            control.sensScale = typeof gc.SensScale === 'number' ? gc.SensScale : (typeof gc.sensScale === 'number' ? gc.sensScale : 1.0);
            control.mouseAcceleration = !!gc.MouseAcceleration;
            control.isLookAroundEnabled = gc.IsLookAroundEnabled !== false;
            control.isShootOnClickEnabled = gc.IsShootOnClickEnabled !== false;
            control.isCrosshairEnabled = gc.IsCrosshairEnabled !== false;
            control.crosshairX = typeof gc.CrosshairX === 'number' ? gc.CrosshairX : 50;
            control.crosshairY = typeof gc.CrosshairY === 'number' ? gc.CrosshairY : 50;
            control.crosshairType = gc.CrosshairType || 'Cross';
            control.crosshairSize = gc.CrosshairSize || 1.0;
            control.crosshairOpacity = gc.CrosshairOpacity || 100;
            control.crosshairColor = gc.CrosshairColor || '#FFFFFF';
            control.tweaks = gc.Tweaks !== undefined ? gc.Tweaks.toString() : '948816450';
            control.lookAroundX = gc.LookAroundX !== undefined ? gc.LookAroundX : -1;
            control.lookAroundY = gc.LookAroundY !== undefined ? gc.LookAroundY : -1;
            control.keyLookAround = gc.KeyLookAround || 'Alt';
            // Look-around Area (Default right 45% side)
            control.areaLeft = typeof gc.AreaLeft === 'number' ? gc.AreaLeft : (typeof gc.areaLeft === 'number' ? gc.areaLeft : 52.0);
            control.areaRight = typeof gc.AreaRight === 'number' ? gc.AreaRight : (typeof gc.areaRight === 'number' ? gc.areaRight : 98.0);
            control.areaTop = typeof gc.AreaTop === 'number' ? gc.AreaTop : (typeof gc.areaTop === 'number' ? gc.areaTop : 10.0);
            control.areaBottom = typeof gc.AreaBottom === 'number' ? gc.AreaBottom : (typeof gc.areaBottom === 'number' ? gc.areaBottom : 90.0);
            control.areaPreset = gc.AreaPreset || gc.areaPreset || 'right_45';
            break;

          case 'Dpad':
            control.keyUp = gc.KeyUp || 'W';
            control.keyDown = gc.KeyDown || 'S';
            control.keyLeft = gc.KeyLeft || 'A';
            control.keyRight = gc.KeyRight || 'D';
            control.xRadius = typeof gc.XRadius === 'number' ? gc.XRadius : 3.5;
            control.speed = typeof gc.Speed === 'number' ? gc.Speed : 150;
            control.activationTime = gc.ActivationTime || 50;
            control.deadzoneRadius = gc.DeadzoneRadius || 0;
            control.gamepadStick = gc.GamepadStick || 'LeftStick';
            break;

          case 'Tap':
            control.key = gc.Key || '';
            control.key_alt1 = gc.Key_alt1 || '';
            break;

          case 'TapRepeat':
            control.key = gc.Key || '';
            control.count = gc.Count || 10;
            control.delay = gc.Delay || 50;
            break;

          case 'Script':
            control.key = gc.Key || '';
            control.key_alt1 = gc.Key_alt1 || '';
            control.commands = Array.isArray(gc.Commands) ? gc.Commands : [];
            break;

          case 'FreeLook':
            control.key = gc.Key || 'Alt';
            control.xRadius = gc.XRadius || 5.0;
            control.speed = gc.Speed || 100;
            break;

          case 'Swipe':
            control.key = gc.Key || '';
            control.direction = gc.Direction || 'Up'; // Up, Down, Left, Right
            control.distance = gc.Distance || 15;
            control.duration = gc.Duration || 100;
            break;

          case 'Zoom':
            control.keyIn = gc.KeyIn || '=';
            control.keyOut = gc.KeyOut || '-';
            control.mode = gc.Mode || 'Pinch';
            break;

          case 'Tilt':
            control.keyUp = gc.KeyUp || 'Up';
            control.keyDown = gc.KeyDown || 'Down';
            control.keyLeft = gc.KeyLeft || 'Left';
            control.keyRight = gc.KeyRight || 'Right';
            control.maxAngle = gc.MaxAngle || 20;
            break;

          case 'MobaSkill':
            control.key = gc.Key || '';
            control.cancelKey = gc.CancelKey || 'Space';
            control.radius = gc.Radius || 10;
            break;

          default:
            control.key = gc.Key || '';
            break;
        }

        controls.push(control);
      }
    }

    return {
      id,
      name,
      selected: rawScheme.Selected || false,
      keyboardLayout: rawScheme.KeyboardLayout || 'United States',
      gameControls: controls,
    };
  }

  // Export scheme to standard BlueStacks/MSI .cfg format
  exportToCfgFormat(scheme) {
    const gameControls = scheme.gameControls.map(c => {
      const base = {
        '$type': `${c.type}, Bluestacks`,
        Type: c.type,
        Tweaks: c.tweaks || 0,
        Exclusive: false,
        ExclusiveDelay: 200,
        XExpr: '',
        YExpr: '',
        XOverlayOffset: '',
        YOverlayOffset: '',
        StartCondition: '',
        EnableCondition: '',
        ShowOnOverlay: c.showOnOverlay !== false,
        X: parseFloat(c.x.toFixed(2)),
        Y: parseFloat(c.y.toFixed(2)),
        GuidanceCategory: c.guidanceCategory || '',
        Guidance: c.guidance || {},
      };

      if (c.type === 'Pan') {
        return {
          ...base,
          LookAroundX: -1.0,
          LookAroundY: -1.0,
          LButtonX: parseFloat((c.lButtonX || 84.94).toFixed(2)),
          LButtonY: parseFloat((c.lButtonY || 73.44).toFixed(2)),
          Sensitivity: c.mouseSensitivityX || c.sensitivity || 1.60,
          SensitivityRatioY: c.mouseSensitivityY || c.sensitivityRatioY || 1.60,
          MouseSensitivityX: c.mouseSensitivityX || c.sensitivity || 1.60,
          MouseSensitivityY: c.mouseSensitivityY || c.sensitivityRatioY || 1.60,
          SensScale: c.sensScale || 1.0,
          GamepadSensitivity: 777.0,
          IsLookAroundEnabled: c.isLookAroundEnabled !== false,
          IsShootOnClickEnabled: c.isShootOnClickEnabled !== false,
          MouseAcceleration: !!c.mouseAcceleration,
          KeyStartStop: c.keyStartStop || 'Ctrl',
          KeyStartStop_alt1: c.keyStartStop_alt1 || 'GamepadRightThumb',
          KeySuspend: c.keySuspend || 'X',
          KeySuspend_alt1: '',
          KeyLookAround: '',
          KeyLookAround_alt1: '',
          KeyAction: c.keyAction || 'MouseLButton',
          GamepadStick: 'RightStick',
          IsCrosshairEnabled: c.isCrosshairEnabled !== false,
          CrosshairX: c.crosshairX || 50.05,
          CrosshairY: c.crosshairY || 50.05,
          CrosshairType: c.crosshairType || 'Cross',
          CrosshairSize: c.crosshairSize || 1.0,
          CrosshairOpacity: c.crosshairOpacity || 100.0,
          CrosshairColor: c.crosshairColor || '#FFFFFF',
          AreaLeft: c.areaLeft !== undefined ? c.areaLeft : 52.0,
          AreaRight: c.areaRight !== undefined ? c.areaRight : 98.0,
          AreaTop: c.areaTop !== undefined ? c.areaTop : 10.0,
          AreaBottom: c.areaBottom !== undefined ? c.areaBottom : 90.0,
          AreaPreset: c.areaPreset || 'right_45',
          Left: 250.0,
          Right: 250.0,
          Top: 1000.0,
          Bottom: 1000.0,
          ActivationTimeMs: 40,
          Speed: 10.0,
        };
      }

      if (c.type === 'Dpad') {
        return {
          ...base,
          KeyUp: c.keyUp || 'W',
          KeyUp_alt1: '',
          KeyDown: c.keyDown || 'S',
          KeyDown_alt1: '',
          KeyLeft: c.keyLeft || 'A',
          KeyLeft_alt1: '',
          KeyRight: c.keyRight || 'D',
          KeyRight_alt1: '',
          KeySpeedModifier1: '',
          KeySpeedModifier1_alt1: '',
          KeySpeedModifier2: '',
          KeySpeedModifier2_alt1: '',
          GamepadStick: c.gamepadStick || 'LeftStick',
          XRadius: parseFloat((c.xRadius || 3.5).toFixed(2)),
          XRadius1: 0.0,
          XRadius2: 0.0,
          DeadzoneRadius: c.deadzoneRadius || 0.0,
          Speed: c.speed || 150.0,
          ActivationSpeed: 0.0,
          ActivationTime: c.activationTime || 50,
          DpadExpiryTime: 0,
          AnalogType: 0,
          DpadTitle: '',
        };
      }

      if (c.type === 'Tap') {
        return {
          ...base,
          Key: c.key || '',
          Key_alt1: c.key_alt1 || '',
        };
      }

      if (c.type === 'Script') {
        return {
          ...base,
          Key: c.key || '',
          Key_alt1: c.key_alt1 || '',
          Commands: c.commands || [],
        };
      }

      if (c.type === 'TapRepeat') {
        return {
          ...base,
          Key: c.key || '',
          Count: c.count || 10,
          Delay: c.delay || 50,
        };
      }

      return {
        ...base,
        Key: c.key || '',
      };
    });

    return {
      MetaData: {
        ParserVersion: '17',
        UpdateVersion: '2',
        UpdateArticleKey: '',
        CloudUpdateTimeUTC: new Date().toISOString().replace('T', ' ').substring(0, 19),
      },
      ControlSchemes: [
        {
          Name: scheme.name,
          BuiltIn: false,
          Selected: true,
          IsBookMarked: false,
          IsCategoryVisible: true,
          KeyboardLayout: scheme.keyboardLayout || 'United States',
          GameControls: gameControls,
          Images: [],
        }
      ]
    };
  }

  exportToCfgFile(filePath, scheme) {
    const data = this.exportToCfgFormat(scheme);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
    return true;
  }

  getDefaultSchemes() {
    // Try to load workspace com.dts.freefiremax.cfg
    const workspaceCfgPath = path.resolve(__dirname, '../../../com.dts.freefiremax.cfg');
    if (fs.existsSync(workspaceCfgPath)) {
      try {
        const schemes = this.parseCfgFile(workspaceCfgPath);
        if (schemes && schemes.length > 0) {
          schemes[0].selected = true;
          // Add other presets
          schemes.push(this.getPubgPreset());
          schemes.push(this.getCodmPreset());
          schemes.push(this.getGenshinPreset());
          return schemes;
        }
      } catch (err) {
        console.error('Error parsing default cfg:', err);
      }
    }

    return [
      this.getFreeFirePreset(),
      this.getPubgPreset(),
      this.getCodmPreset(),
      this.getGenshinPreset()
    ];
  }

  getFreeFirePreset() {
    return {
      id: 'scheme_freefire_default',
      name: 'Free Fire Max (Pro FPS)',
      selected: true,
      keyboardLayout: 'United States',
      gameControls: [
        {
          id: 'pan_1',
          type: 'Pan',
          x: 51.18,
          y: 57.43,
          lButtonX: 84.94,
          lButtonY: 73.44,
          keyStartStop: 'Ctrl',
          keySuspend: 'X',
          keyAction: 'MouseLButton',
          sensitivity: 1.3,
          sensitivityRatioY: 1.23,
          isLookAroundEnabled: true,
          isShootOnClickEnabled: true,
          isCrosshairEnabled: true,
          crosshairX: 50.05,
          crosshairY: 50.05,
          crosshairSize: 1.0,
          crosshairColor: '#00E5FF',
          showOnOverlay: true,
          guidanceCategory: 'Combat',
          guidance: { KeyAction: 'Fire weapon', KeyStartStop: 'Toggle shooting mode' },
        },
        {
          id: 'dpad_1',
          type: 'Dpad',
          x: 16.69,
          y: 75.45,
          keyUp: 'W',
          keyDown: 'S',
          keyLeft: 'A',
          keyRight: 'D',
          xRadius: 3.2,
          speed: 150,
          showOnOverlay: true,
          guidanceCategory: 'Movement',
        },
        { id: 'tap_scope', type: 'Tap', x: 96.7, y: 57.29, key: 'MouseRButton', showOnOverlay: true, guidanceCategory: 'Combat', guidance: { Key: 'Aim / Scope' } },
        { id: 'tap_jump', type: 'Tap', x: 96.78, y: 67.52, key: 'Space', showOnOverlay: true, guidanceCategory: 'Movement', guidance: { Key: 'Jump' } },
        { id: 'tap_crouch', type: 'Tap', x: 96.69, y: 76.74, key: 'C', showOnOverlay: true, guidanceCategory: 'Movement', guidance: { Key: 'Crouch' } },
        { id: 'tap_prone', type: 'Tap', x: 97.45, y: 86.07, key: 'Z', showOnOverlay: true, guidanceCategory: 'Movement', guidance: { Key: 'Prone' } },
        { id: 'tap_reload', type: 'Tap', x: 90.27, y: 9.22, key: 'R', showOnOverlay: true, guidanceCategory: 'Combat', guidance: { Key: 'Reload' } },
        { id: 'tap_wpn1', type: 'Tap', x: 84.28, y: 20.05, key: '1', showOnOverlay: true, guidanceCategory: 'Combat', guidance: { Key: 'Primary Weapon' } },
        { id: 'tap_wpn2', type: 'Tap', x: 90.84, y: 20.34, key: '2', showOnOverlay: true, guidanceCategory: 'Combat', guidance: { Key: 'Secondary Weapon' } },
        { id: 'tap_wpn3', type: 'Tap', x: 96.83, y: 20.76, key: '3', showOnOverlay: true, guidanceCategory: 'Combat', guidance: { Key: 'Melee / Pistol' } },
        { id: 'tap_loot_f', type: 'Tap', x: 71.57, y: 49.38, key: 'F', showOnOverlay: true, guidanceCategory: 'General', guidance: { Key: 'Pick up 1' } },
        { id: 'tap_loot_g', type: 'Tap', x: 96.94, y: 37.1, key: 'G', showOnOverlay: true, guidanceCategory: 'General', guidance: { Key: 'Pick up 2' } },
        { id: 'tap_loot_h', type: 'Tap', x: 89.91, y: 37.27, key: 'H', showOnOverlay: true, guidanceCategory: 'General', guidance: { Key: 'Pick up 3' } },
        { id: 'tap_sprint', type: 'Tap', x: 16.14, y: 42.77, key: 'Shift', showOnOverlay: true, guidanceCategory: 'Movement', guidance: { Key: 'Sprint' } },
        { id: 'tap_bag', type: 'Tap', x: 3.13, y: 48.63, key: 'Tab', showOnOverlay: true, guidanceCategory: 'General', guidance: { Key: 'Backpack' } },
        { id: 'tap_map', type: 'Tap', x: 7.21, y: 13.52, key: 'M', showOnOverlay: true, guidanceCategory: 'General', guidance: { Key: 'Map' } },
        { id: 'tap_heal', type: 'Tap', x: 3.11, y: 56.18, key: '4', showOnOverlay: true, guidanceCategory: 'Combat', guidance: { Key: 'Medkit' } },
        { id: 'tap_skill', type: 'Tap', x: 97.63, y: 95.36, key: 'E', showOnOverlay: true, guidanceCategory: 'Combat', guidance: { Key: 'Active Skill' } },
      ]
    };
  }

  getPubgPreset() {
    return {
      id: 'scheme_pubg_bgmi',
      name: 'BGMI / PUBG Mobile',
      selected: false,
      keyboardLayout: 'United States',
      gameControls: [
        {
          id: 'pubg_pan',
          type: 'Pan',
          x: 65.0,
          y: 50.0,
          lButtonX: 15.0,
          lButtonY: 28.0,
          keyStartStop: 'Ctrl',
          keySuspend: 'X',
          keyAction: 'MouseLButton',
          sensitivity: 1.4,
          sensitivityRatioY: 1.1,
          isLookAroundEnabled: true,
          isShootOnClickEnabled: true,
          isCrosshairEnabled: true,
          crosshairX: 50.0,
          crosshairY: 50.0,
          showOnOverlay: true,
        },
        {
          id: 'pubg_dpad',
          type: 'Dpad',
          x: 18.0,
          y: 72.0,
          keyUp: 'W',
          keyDown: 'S',
          keyLeft: 'A',
          keyRight: 'D',
          xRadius: 4.0,
          speed: 160,
          showOnOverlay: true,
        },
        { id: 'pubg_scope', type: 'Tap', x: 92.0, y: 55.0, key: 'MouseRButton', showOnOverlay: true },
        { id: 'pubg_jump', type: 'Tap', x: 94.0, y: 68.0, key: 'Space', showOnOverlay: true },
        { id: 'pubg_crouch', type: 'Tap', x: 86.0, y: 76.0, key: 'C', showOnOverlay: true },
        { id: 'pubg_prone', type: 'Tap', x: 94.0, y: 86.0, key: 'Z', showOnOverlay: true },
        { id: 'pubg_reload', type: 'Tap', x: 78.0, y: 82.0, key: 'R', showOnOverlay: true },
        { id: 'pubg_wpn1', type: 'Tap', x: 45.0, y: 90.0, key: '1', showOnOverlay: true },
        { id: 'pubg_wpn2', type: 'Tap', x: 55.0, y: 90.0, key: '2', showOnOverlay: true },
        { id: 'pubg_wpn3', type: 'Tap', x: 65.0, y: 90.0, key: '3', showOnOverlay: true },
        { id: 'pubg_loot_f', type: 'Tap', x: 70.0, y: 38.0, key: 'F', showOnOverlay: true },
        { id: 'pubg_loot_g', type: 'Tap', x: 70.0, y: 46.0, key: 'G', showOnOverlay: true },
        { id: 'pubg_sprint', type: 'Tap', x: 22.0, y: 48.0, key: 'Shift', showOnOverlay: true },
        { id: 'pubg_bag', type: 'Tap', x: 5.0, y: 88.0, key: 'Tab', showOnOverlay: true },
        { id: 'pubg_map', type: 'Tap', x: 92.0, y: 12.0, key: 'M', showOnOverlay: true },
        { id: 'pubg_freelook', type: 'FreeLook', x: 80.0, y: 32.0, key: 'Alt', showOnOverlay: true },
      ]
    };
  }

  getCodmPreset() {
    return {
      id: 'scheme_codm',
      name: 'Call of Duty: Mobile',
      selected: false,
      keyboardLayout: 'United States',
      gameControls: [
        {
          id: 'codm_pan',
          type: 'Pan',
          x: 65.0,
          y: 50.0,
          lButtonX: 85.0,
          lButtonY: 65.0,
          keyStartStop: 'Ctrl',
          keySuspend: 'X',
          keyAction: 'MouseLButton',
          sensitivity: 1.2,
          sensitivityRatioY: 1.0,
          isLookAroundEnabled: true,
          isShootOnClickEnabled: true,
          showOnOverlay: true,
        },
        {
          id: 'codm_dpad',
          type: 'Dpad',
          x: 15.0,
          y: 75.0,
          keyUp: 'W',
          keyDown: 'S',
          keyLeft: 'A',
          keyRight: 'D',
          xRadius: 3.8,
          speed: 150,
          showOnOverlay: true,
        },
        { id: 'codm_scope', type: 'Tap', x: 92.0, y: 55.0, key: 'MouseRButton', showOnOverlay: true },
        { id: 'codm_jump', type: 'Tap', x: 94.0, y: 70.0, key: 'Space', showOnOverlay: true },
        { id: 'codm_slide', type: 'Tap', x: 86.0, y: 85.0, key: 'C', showOnOverlay: true },
        { id: 'codm_reload', type: 'Tap', x: 75.0, y: 88.0, key: 'R', showOnOverlay: true },
        { id: 'codm_opskill', type: 'Tap', x: 65.0, y: 85.0, key: 'E', showOnOverlay: true },
        { id: 'codm_grenade', type: 'Tap', x: 55.0, y: 88.0, key: 'G', showOnOverlay: true },
      ]
    };
  }

  getGenshinPreset() {
    return {
      id: 'scheme_genshin',
      name: 'Genshin Impact',
      selected: false,
      keyboardLayout: 'United States',
      gameControls: [
        {
          id: 'genshin_pan',
          type: 'Pan',
          x: 60.0,
          y: 50.0,
          lButtonX: 90.0,
          lButtonY: 78.0,
          keyStartStop: 'Ctrl',
          keySuspend: 'X',
          keyAction: 'MouseLButton',
          sensitivity: 1.5,
          sensitivityRatioY: 1.0,
          showOnOverlay: true,
        },
        {
          id: 'genshin_dpad',
          type: 'Dpad',
          x: 18.0,
          y: 75.0,
          keyUp: 'W',
          keyDown: 'S',
          keyLeft: 'A',
          keyRight: 'D',
          xRadius: 3.5,
          speed: 150,
          showOnOverlay: true,
        },
        { id: 'genshin_dash', type: 'Tap', x: 92.0, y: 90.0, key: 'MouseRButton', showOnOverlay: true },
        { id: 'genshin_jump', type: 'Tap', x: 95.0, y: 65.0, key: 'Space', showOnOverlay: true },
        { id: 'genshin_skill', type: 'Tap', x: 80.0, y: 80.0, key: 'E', showOnOverlay: true },
        { id: 'genshin_burst', type: 'Tap', x: 80.0, y: 62.0, key: 'Q', showOnOverlay: true },
        { id: 'genshin_c1', type: 'Tap', x: 95.0, y: 22.0, key: '1', showOnOverlay: true },
        { id: 'genshin_c2', type: 'Tap', x: 95.0, y: 32.0, key: '2', showOnOverlay: true },
        { id: 'genshin_c3', type: 'Tap', x: 95.0, y: 42.0, key: '3', showOnOverlay: true },
        { id: 'genshin_c4', type: 'Tap', x: 95.0, y: 52.0, key: '4', showOnOverlay: true },
      ]
    };
  }

  // Load and save mirror settings
  loadSettings() {
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        return JSON.parse(fs.readFileSync(this.settingsFilePath, 'utf8'));
      }
    } catch (e) {
      console.warn('Error reading settings:', e);
    }

    return {
      bitrate: 8, // Mbps
      maxFps: 60, // 30, 60, 90, 120
      maxSize: 0, // 0 = native (1080p/2k)
      stayAwake: true,
      turnScreenOff: false,
      renderDriver: 'direct3d11',
      audioMirror: true, // Enable PC game audio forwarding by default
      lowLatencyMode: true,
      showFpsOverlay: true,
      keyOverlayOpacity: 85,
      keyOverlayScale: 100,
      customCrosshair: true,
      crosshairColor: '#00E5FF',
    };
  }

  saveSettings(settings) {
    try {
      this.ensureDirectoryExists(this.userDataPath);
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error('Error saving settings:', e);
      return false;
    }
  }
}

module.exports = new ConfigService();
