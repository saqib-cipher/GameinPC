import React, { useState, useRef } from 'react';
import { 
  X, 
  HelpCircle, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Save, 
  Crosshair, 
  Move, 
  MousePointer, 
  Zap, 
  Code, 
  ArrowUp, 
  RotateCw, 
  ZoomIn, 
  Smartphone, 
  Eye, 
  Navigation,
  Sliders,
  SlidersHorizontal,
  ChevronDown,
  Camera,
  Upload,
  Copy,
  FolderOpen,
  Share2,
  Mouse,
  Settings,
  Minus
} from 'lucide-react';

const PALETTE_TOOLS = [
  { type: 'Tap', label: 'Tap spot', icon: MousePointer, desc: 'Single tap action' },
  { type: 'TapRepeat', label: 'Repeated tap', icon: Zap, desc: 'Rapid auto-fire tap' },
  { type: 'Dpad', label: 'D-pad', icon: Move, desc: 'WASD 8-way joystick' },
  { type: 'Pan', label: 'Aim, pan and shoot', icon: Crosshair, desc: 'FPS mouse look & fire' },
  { type: 'FreeLook', label: 'Free look', icon: Eye, desc: 'Look around (Alt key)' },
  { type: 'Script', label: 'Script', icon: Code, desc: 'Macro multi-step actions' },
  { type: 'Swipe', label: 'Swipe', icon: ArrowUp, desc: 'Directional swipe gesture' },
  { type: 'Zoom', label: 'Zoom', icon: ZoomIn, desc: 'Pinch zoom in/out' },
  { type: 'Tilt', label: 'Tilt', icon: Smartphone, desc: 'Gyro / tilt simulation' },
  { type: 'MobaDpad', label: 'MOBA D-Pad', icon: Navigation, desc: 'Right click to move' },
  { type: 'MobaSkill', label: 'MOBA Skill pad', icon: Crosshair, desc: 'Directional skill cast' },
  { type: 'Rotate', label: 'Rotate', icon: RotateCw, desc: 'Wheel rotation' },
  { type: 'EdgeScroll', label: 'Edge scroll', icon: SlidersHorizontal, desc: 'Scroll at screen edges' },
  { type: 'Scroll', label: 'Scroll', icon: Sliders, desc: 'Scroll swipe' },
  { type: 'MouseWheel', label: 'Mouse wheel', icon: Mouse, desc: 'Mouse wheel actions' },
];

export default function ControlsEditor({
  isOpen,
  onClose,
  schemes = [],
  activeSchemeId,
  onSelectScheme,
  onCloneScheme,
  onDeleteScheme,
  onImportCfg,
  onExportCfg,
  onNewScheme,
  scheme,
  selectedControlId,
  onSelectControl,
  onAddControl,
  onUpdateControl,
  onDeleteControl,
  onSaveScheme,
  onResetScheme,
  opacity,
  onChangeOpacity,
  scale,
  onChangeScale,
  snapshotUrl,
  isCapturingSnapshot,
  onCaptureSnapshot,
  onClearSnapshot,
  onUploadSnapshot,
  onOpenPanSettings,
}) {
  const [isRecordingKey, setIsRecordingKey] = useState(false);
  const [recordingField, setRecordingField] = useState('key'); // 'key' | 'key_alt1' | 'keyStartStop' | 'keySuspend'
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const selectedControl = scheme?.gameControls?.find(c => c.id === selectedControlId);

  const handleKeyCapture = (e) => {
    if (!isRecordingKey || !selectedControl) return;
    e.preventDefault();
    e.stopPropagation();

    let keyName = e.key;
    if (e.code === 'Space') keyName = 'Space';
    if (e.key === 'Control') keyName = 'Ctrl';
    if (e.key === 'Shift') keyName = 'Shift';
    if (e.key === 'Alt') keyName = 'Alt';
    if (e.key === 'Escape') {
      setIsRecordingKey(false);
      return;
    }

    onUpdateControl(selectedControl.id, { [recordingField]: keyName });
    setIsRecordingKey(false);
  };

  const handleMouseDownCapture = (e) => {
    if (!isRecordingKey || !selectedControl) return;
    e.preventDefault();
    e.stopPropagation();

    let btnName = 'MouseLButton';
    if (e.button === 1) btnName = 'MouseMButton';
    if (e.button === 2) btnName = 'MouseRButton';
    if (e.button === 3) btnName = 'MouseXButton1';
    if (e.button === 4) btnName = 'MouseXButton2';

    onUpdateControl(selectedControl.id, { [recordingField]: btnName });
    setIsRecordingKey(false);
  };

  const handleCreateFromPalette = (tool) => {
    let newCtrl = {
      id: 'ctrl_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      type: tool.type,
      x: 50,
      y: 50,
      showOnOverlay: true,
      guidanceCategory: 'General',
    };

    switch (tool.type) {
      case 'Tap':
        newCtrl.key = 'F';
        break;
      case 'TapRepeat':
        newCtrl.key = 'V';
        newCtrl.count = 10;
        newCtrl.delay = 50;
        break;
      case 'Dpad':
        newCtrl.keyUp = 'W';
        newCtrl.keyDown = 'S';
        newCtrl.keyLeft = 'A';
        newCtrl.keyRight = 'D';
        newCtrl.xRadius = 3.5;
        newCtrl.speed = 150;
        break;
      case 'Pan':
        newCtrl.keyStartStop = 'Ctrl';
        newCtrl.keySuspend = 'X';
        newCtrl.keyAction = 'MouseLButton';
        newCtrl.lButtonX = 84.94;
        newCtrl.lButtonY = 73.44;
        newCtrl.mouseSensitivityX = 1.60;
        newCtrl.mouseSensitivityY = 1.60;
        newCtrl.sensitivity = 1.60;
        newCtrl.sensitivityRatioY = 1.60;
        newCtrl.tweaks = '948816450';
        newCtrl.mouseAcceleration = false;
        newCtrl.isLookAroundEnabled = true;
        newCtrl.isShootOnClickEnabled = true;
        newCtrl.isCrosshairEnabled = true;
        newCtrl.crosshairSize = 1;
        newCtrl.crosshairColor = '#FFFFFF';
        newCtrl.crosshairOpacity = 100;
        break;
      case 'FreeLook':
        newCtrl.key = 'Alt';
        newCtrl.xRadius = 5.0;
        break;
      case 'Script':
        newCtrl.key = 'Q';
        newCtrl.commands = ['tap 50 50', 'wait 0.5', 'tap 80 80'];
        break;
      case 'Swipe':
        newCtrl.key = 'Z';
        newCtrl.direction = 'Up';
        newCtrl.distance = 15;
        newCtrl.duration = 100;
        break;
      case 'Zoom':
        newCtrl.keyIn = '=';
        newCtrl.keyOut = '-';
        break;
      case 'Tilt':
        newCtrl.keyUp = 'Up';
        newCtrl.keyDown = 'Down';
        newCtrl.keyLeft = 'Left';
        newCtrl.keyRight = 'Right';
        break;
      default:
        newCtrl.key = 'E';
        break;
    }

    onAddControl(newCtrl);
    onSelectControl(newCtrl.id);
  };

  return (
    <aside className="controls-editor-panel glass-panel" tabIndex={0} onKeyDown={handleKeyCapture} onMouseDown={handleMouseDownCapture}>
      {/* Editor Header (Matching Screenshot 2) */}
      <div className="editor-header">
        <div className="editor-title-row">
          <span className="editor-title">Controls editor</span>
          <div className="editor-header-actions">
            <button className="btn-icon-small" title="Help Guide">
              <HelpCircle size={15} />
            </button>
            <button className="btn-icon-small" onClick={onClose} title="Close Editor">
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Control Scheme Selector Section (Matching Screenshot 2) */}
      <div className="editor-scheme-section">
        <div className="scheme-section-header">
          <span className="section-label">Control scheme</span>
          <div className="scheme-header-icons">
            <button className="btn-icon-scheme" onClick={onCloneScheme} title="Clone scheme">
              <Copy size={13} />
            </button>
            <button className="btn-icon-scheme" onClick={onExportCfg} title="Export .cfg">
              <Share2 size={13} />
            </button>
            <button className="btn-icon-scheme" onClick={onImportCfg} title="Import .cfg">
              <FolderOpen size={13} />
            </button>
            <button className="btn-icon-scheme" onClick={onDeleteScheme} title="Delete scheme">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="scheme-dropdown-row">
          <select 
            value={activeSchemeId || ''} 
            onChange={(e) => {
              if (e.target.value === '__new__') {
                if (onNewScheme) onNewScheme();
              } else if (onSelectScheme) {
                onSelectScheme(e.target.value);
              }
            }}
            className="scheme-picker-select"
          >
            {schemes.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.gameControls?.length || 0})</option>
            ))}
            <option value="__new__">+ Create new profile</option>
          </select>
        </div>
      </div>

      {/* Editor Body */}
      <div className="editor-content">
        {/* Selected Control Inspector (if one is selected) */}
        {selectedControl ? (
          <div className="editor-section inspector-box">
            <div className="section-title-row">
              <span className="section-title">Edit Control: {selectedControl.type}</span>
              <button 
                className="btn-icon-danger-small" 
                onClick={() => onDeleteControl(selectedControl.id)}
                title="Delete this control"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Key Recording Badge */}
            <div className="property-row">
              <label>Assigned Key</label>
              <button 
                className={`key-record-btn ${isRecordingKey && recordingField === 'key' ? 'recording' : ''}`}
                onClick={() => { setIsRecordingKey(true); setRecordingField('key'); }}
              >
                {isRecordingKey && recordingField === 'key' ? 'Press any Key...' : (selectedControl.key || 'Click to bind')}
              </button>
            </div>

            {/* Coordinates X, Y */}
            <div className="coords-row">
              <div className="coord-field">
                <label>X (%)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="100" 
                  value={(selectedControl.x || 50).toFixed(2)} 
                  onChange={(e) => onUpdateControl(selectedControl.id, { x: parseFloat(e.target.value) || 0 })} 
                />
              </div>
              <div className="coord-field">
                <label>Y (%)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="100" 
                  value={(selectedControl.y || 50).toFixed(2)} 
                  onChange={(e) => onUpdateControl(selectedControl.id, { y: parseFloat(e.target.value) || 0 })} 
                />
              </div>
            </div>

            {/* Pan Aim Properties Quick Editor & Advanced Settings Launcher */}
            {selectedControl.type === 'Pan' && (
              <div className="type-props-group">
                <button 
                  className="btn btn-primary btn-full btn-advanced-pan" 
                  onClick={() => onOpenPanSettings && onOpenPanSettings(selectedControl)}
                >
                  <Settings size={15} /> Open Aim &amp; Sensitivity Settings
                </button>

                <div className="pan-quick-sens-grid">
                  <div className="pan-sens-field">
                    <label>Sensitivity X</label>
                    <div className="sens-mini-stepper">
                      <button 
                        className="stepper-sub-btn" 
                        onClick={() => {
                          const cur = selectedControl.mouseSensitivityX || selectedControl.sensitivity || 1.60;
                          const newVal = Math.max(0.05, parseFloat((cur - 0.05).toFixed(2)));
                          onUpdateControl(selectedControl.id, { mouseSensitivityX: newVal, sensitivity: newVal });
                        }}
                      >
                        <Minus size={11} />
                      </button>
                      <input 
                        type="number" 
                        step="0.05"
                        value={(selectedControl.mouseSensitivityX || selectedControl.sensitivity || 1.60).toFixed(2)}
                        onChange={(e) => {
                          const newVal = parseFloat(e.target.value) || 1.60;
                          onUpdateControl(selectedControl.id, { mouseSensitivityX: newVal, sensitivity: newVal });
                        }}
                      />
                      <button 
                        className="stepper-sub-btn" 
                        onClick={() => {
                          const cur = selectedControl.mouseSensitivityX || selectedControl.sensitivity || 1.60;
                          const newVal = parseFloat((cur + 0.05).toFixed(2));
                          onUpdateControl(selectedControl.id, { mouseSensitivityX: newVal, sensitivity: newVal });
                        }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="pan-sens-field">
                    <label>Sensitivity Y</label>
                    <div className="sens-mini-stepper">
                      <button 
                        className="stepper-sub-btn" 
                        onClick={() => {
                          const cur = selectedControl.mouseSensitivityY || selectedControl.sensitivityRatioY || 1.60;
                          const newVal = Math.max(0.05, parseFloat((cur - 0.05).toFixed(2)));
                          onUpdateControl(selectedControl.id, { mouseSensitivityY: newVal, sensitivityRatioY: newVal });
                        }}
                      >
                        <Minus size={11} />
                      </button>
                      <input 
                        type="number" 
                        step="0.05"
                        value={(selectedControl.mouseSensitivityY || selectedControl.sensitivityRatioY || 1.60).toFixed(2)}
                        onChange={(e) => {
                          const newVal = parseFloat(e.target.value) || 1.60;
                          onUpdateControl(selectedControl.id, { mouseSensitivityY: newVal, sensitivityRatioY: newVal });
                        }}
                      />
                      <button 
                        className="stepper-sub-btn" 
                        onClick={() => {
                          const cur = selectedControl.mouseSensitivityY || selectedControl.sensitivityRatioY || 1.60;
                          const newVal = parseFloat((cur + 0.05).toFixed(2));
                          onUpdateControl(selectedControl.id, { mouseSensitivityY: newVal, sensitivityRatioY: newVal });
                        }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Look-around Area Quick Selector */}
                <div className="property-row">
                  <label>Look-around Area</label>
                  <select
                    className="pan-select"
                    value={selectedControl.areaPreset || 'right_45'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'right_45') {
                        onUpdateControl(selectedControl.id, { areaPreset: 'right_45', areaLeft: 52.0, areaRight: 98.0, areaTop: 10.0, areaBottom: 90.0 });
                      } else if (val === 'right_half') {
                        onUpdateControl(selectedControl.id, { areaPreset: 'right_half', areaLeft: 50.0, areaRight: 100.0, areaTop: 0.0, areaBottom: 100.0 });
                      } else if (val === 'right_upper') {
                        onUpdateControl(selectedControl.id, { areaPreset: 'right_upper', areaLeft: 52.0, areaRight: 98.0, areaTop: 5.0, areaBottom: 65.0 });
                      } else if (val === 'fullscreen') {
                        onUpdateControl(selectedControl.id, { areaPreset: 'fullscreen', areaLeft: 5.0, areaRight: 95.0, areaTop: 5.0, areaBottom: 95.0 });
                      } else {
                        onUpdateControl(selectedControl.id, { areaPreset: 'custom' });
                      }
                    }}
                  >
                    <option value="right_45">Right 45% (Default BlueStacks)</option>
                    <option value="right_half">Right Half (50% - 100%)</option>
                    <option value="right_upper">Right Upper (5% - 65%)</option>
                    <option value="fullscreen">Full Screen (5% - 95%)</option>
                    <option value="custom">Custom Area (Drag handles)</option>
                  </select>
                </div>

                <div className="property-row">
                  <label>Start/Stop Key</label>
                  <button 
                    className={`key-record-btn ${isRecordingKey && recordingField === 'keyStartStop' ? 'recording' : ''}`}
                    onClick={() => { setIsRecordingKey(true); setRecordingField('keyStartStop'); }}
                  >
                    {isRecordingKey && recordingField === 'keyStartStop' ? 'Press key...' : (selectedControl.keyStartStop || 'Ctrl')}
                  </button>
                </div>
              </div>
            )}

            {selectedControl.type === 'Dpad' && (
              <div className="type-props-group">
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Joystick Radius</span>
                    <span className="slider-value">{(selectedControl.xRadius || 3.5).toFixed(1)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1.5" 
                    max="10.0" 
                    step="0.1" 
                    value={selectedControl.xRadius || 3.5} 
                    onChange={(e) => onUpdateControl(selectedControl.id, { xRadius: parseFloat(e.target.value) })} 
                  />
                </div>
              </div>
            )}

            {selectedControl.type === 'TapRepeat' && (
              <div className="type-props-group">
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Taps Per Second</span>
                    <span className="slider-value">{selectedControl.count || 10}</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="30" 
                    step="1" 
                    value={selectedControl.count || 10} 
                    onChange={(e) => onUpdateControl(selectedControl.id, { count: parseInt(e.target.value, 10) })} 
                  />
                </div>
              </div>
            )}

            {selectedControl.type === 'Script' && (
              <div className="type-props-group">
                <label>Macro Commands</label>
                <textarea
                  rows="4"
                  className="macro-textarea"
                  value={(selectedControl.commands || []).join('\n')}
                  onChange={(e) => onUpdateControl(selectedControl.id, { commands: e.target.value.split('\n') })}
                  placeholder="tap 50 50&#10;wait 0.5&#10;tap 80 80"
                />
              </div>
            )}

            <button className="btn btn-secondary btn-full btn-sm" onClick={() => onSelectControl(null)}>
              Done Editing
            </button>
          </div>
        ) : (
          /* Add Controls Palette Grid (Matching Screenshot 2) */
          <div className="editor-section palette-box">
            <div className="section-title">Add controls</div>
            <p className="palette-instruction">
              Drag and drop an action on your game screen to assign a key to it. Click on &quot;?&quot; to learn more about how to use the controls editor.
            </p>

            <div className="palette-grid-msi">
              {PALETTE_TOOLS.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <button 
                    key={tool.type} 
                    className="palette-card-msi"
                    onClick={() => handleCreateFromPalette(tool)}
                    title={tool.desc}
                  >
                    <div className="palette-circle-msi">
                      <IconComponent size={20} />
                    </div>
                    <span className="palette-label-msi">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Adjustment Sliders */}
        <div className="editor-section adjustments-box">
          <div className="section-subtitle">Display Settings</div>
          
          <div className="slider-group">
            <div className="slider-label-row">
              <span>Opacity</span>
              <span className="slider-value">{opacity}%</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={opacity} 
              onChange={(e) => onChangeOpacity(parseInt(e.target.value, 10))} 
            />
          </div>

          <div className="slider-group">
            <div className="slider-label-row">
              <span>Size</span>
              <span className="slider-value">{scale}%</span>
            </div>
            <input 
              type="range" 
              min="50" 
              max="150" 
              value={scale} 
              onChange={(e) => onChangeScale(parseInt(e.target.value, 10))} 
            />
          </div>
        </div>

        {/* Screen Snapshot Background Manager */}
        <div className="editor-section snapshot-manager-box">
          <div className="section-subtitle">Screen Snapshot HUD</div>
          
          <div className="snapshot-btn-row">
            <button 
              className={`btn btn-primary btn-sm ${isCapturingSnapshot ? 'btn-loading' : ''}`}
              onClick={onCaptureSnapshot}
              disabled={isCapturingSnapshot}
              title="Take live screenshot of mobile screen to place buttons accurately"
            >
              <Camera size={14} className={isCapturingSnapshot ? 'spin-anim' : ''} />
              <span>{isCapturingSnapshot ? 'Capturing...' : (snapshotUrl ? 'Refresh Snapshot' : 'Take Screen Snapshot')}</span>
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => onUploadSnapshot(ev.target.result);
                  reader.readAsDataURL(file);
                }
              }}
            />
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => fileInputRef.current?.click()}
              title="Upload existing game screenshot from PC"
            >
              <Upload size={13} />
            </button>

            {snapshotUrl && (
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={onClearSnapshot}
                title="Clear background image"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editor Footer Actions (Matching Screenshot 2) */}
      <div className="editor-footer">
        <div className="footer-title">Current configuration actions</div>
        <div className="footer-btn-row">
          <button className="btn btn-danger-outline btn-half" onClick={onResetScheme}>
            <RotateCcw size={14} /> Reset
          </button>
          <button className="btn btn-danger-filled btn-half" onClick={onSaveScheme}>
            <Save size={14} /> Save
          </button>
        </div>
      </div>
    </aside>
  );
}
