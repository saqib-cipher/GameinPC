import React, { useState } from 'react';
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
  Compass, 
  Navigation,
  Sliders,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const PALETTE_TOOLS = [
  { type: 'Tap', label: 'Tap spot', icon: MousePointer, desc: 'Single tap action' },
  { type: 'TapRepeat', label: 'Repeated tap', icon: Zap, desc: 'Rapid auto-fire tap' },
  { type: 'Dpad', label: 'D-pad', icon: Move, desc: 'WASD 8-way joystick' },
  { type: 'Pan', label: 'Aim, pan and shoot', icon: Crosshair, desc: 'FPS mouse look & fire' },
  { type: 'FreeLook', label: 'Free look', icon: Compass, desc: 'Look around (Alt key)' },
  { type: 'Script', label: 'Script', icon: Code, desc: 'Macro multi-step actions' },
  { type: 'Swipe', label: 'Swipe', icon: ArrowUp, desc: 'Directional swipe gesture' },
  { type: 'Zoom', label: 'Zoom', icon: ZoomIn, desc: 'Pinch zoom in/out' },
  { type: 'Tilt', label: 'Tilt', icon: Smartphone, desc: 'Gyro / tilt simulation' },
  { type: 'MobaDpad', label: 'MOBA D-Pad', icon: Navigation, desc: 'Right click to move' },
  { type: 'MobaSkill', label: 'MOBA Skill pad', icon: Crosshair, desc: 'Directional skill cast' },
  { type: 'Rotate', label: 'Rotate', icon: RotateCw, desc: 'Wheel rotation' },
];

export default function ControlsEditor({
  isOpen,
  onClose,
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
}) {
  const [activeTab, setActiveTab] = useState('palette'); // 'palette' | 'inspector'
  const [isRecordingKey, setIsRecordingKey] = useState(false);
  const [recordingField, setRecordingField] = useState('key'); // 'key' | 'key_alt1' | 'keyStartStop' | 'keySuspend'

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
        newCtrl.lButtonX = 85;
        newCtrl.lButtonY = 70;
        newCtrl.sensitivity = 1.3;
        newCtrl.sensitivityRatioY = 1.2;
        newCtrl.isLookAroundEnabled = true;
        newCtrl.isShootOnClickEnabled = true;
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
      default:
        newCtrl.key = 'E';
        break;
    }

    onAddControl(newCtrl);
    onSelectControl(newCtrl.id);
  };

  return (
    <aside className="controls-editor-panel glass-panel" tabIndex={0} onKeyDown={handleKeyCapture} onMouseDown={handleMouseDownCapture}>
      {/* Editor Header (Matching Screenshot) */}
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

      {/* Editor Body */}
      <div className="editor-content">
        {/* Global Adjustment Sliders (Matching Screenshot) */}
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

            {/* Secondary / Gamepad Key */}
            <div className="property-row">
              <label>Alt / Gamepad Key</label>
              <button 
                className={`key-record-btn ${isRecordingKey && recordingField === 'key_alt1' ? 'recording' : ''}`}
                onClick={() => { setIsRecordingKey(true); setRecordingField('key_alt1'); }}
              >
                {isRecordingKey && recordingField === 'key_alt1' ? 'Press key...' : (selectedControl.key_alt1 || 'None')}
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
                  value={selectedControl.x.toFixed(2)} 
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
                  value={selectedControl.y.toFixed(2)} 
                  onChange={(e) => onUpdateControl(selectedControl.id, { y: parseFloat(e.target.value) || 0 })} 
                />
              </div>
            </div>

            {/* Type-Specific Properties */}
            {selectedControl.type === 'Pan' && (
              <div className="type-props-group">
                <div className="property-row">
                  <label>Toggle Shooting Mode</label>
                  <button 
                    className={`key-record-btn ${isRecordingKey && recordingField === 'keyStartStop' ? 'recording' : ''}`}
                    onClick={() => { setIsRecordingKey(true); setRecordingField('keyStartStop'); }}
                  >
                    {isRecordingKey && recordingField === 'keyStartStop' ? 'Press key...' : (selectedControl.keyStartStop || 'Ctrl')}
                  </button>
                </div>

                <div className="property-row">
                  <label>Suspend Key</label>
                  <button 
                    className={`key-record-btn ${isRecordingKey && recordingField === 'keySuspend' ? 'recording' : ''}`}
                    onClick={() => { setIsRecordingKey(true); setRecordingField('keySuspend'); }}
                  >
                    {isRecordingKey && recordingField === 'keySuspend' ? 'Press key...' : (selectedControl.keySuspend || 'X')}
                  </button>
                </div>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Mouse Sensitivity X</span>
                    <span className="slider-value">{(selectedControl.sensitivity || 1.0).toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.2" 
                    max="5.0" 
                    step="0.05"
                    value={selectedControl.sensitivity || 1.0} 
                    onChange={(e) => onUpdateControl(selectedControl.id, { sensitivity: parseFloat(e.target.value) })} 
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Sensitivity Y Ratio</span>
                    <span className="slider-value">{(selectedControl.sensitivityRatioY || 1.0).toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.2" 
                    max="3.0" 
                    step="0.05"
                    value={selectedControl.sensitivityRatioY || 1.0} 
                    onChange={(e) => onUpdateControl(selectedControl.id, { sensitivityRatioY: parseFloat(e.target.value) })} 
                  />
                </div>

                <div className="coords-row">
                  <div className="coord-field">
                    <label>Fire Button X (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={(selectedControl.lButtonX || 80).toFixed(2)} 
                      onChange={(e) => onUpdateControl(selectedControl.id, { lButtonX: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="coord-field">
                    <label>Fire Button Y (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={(selectedControl.lButtonY || 70).toFixed(2)} 
                      onChange={(e) => onUpdateControl(selectedControl.id, { lButtonY: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>
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
                <span className="helper-text">Commands: tap X Y, wait seconds, swipe X1 Y1 X2 Y2 ms</span>
              </div>
            )}

            <button className="btn btn-secondary btn-full btn-sm" onClick={() => onSelectControl(null)}>
              Done Editing
            </button>
          </div>
        ) : (
          /* Add Controls Palette Grid (Matching Screenshot) */
          <div className="editor-section palette-box">
            <div className="section-title">Add controls</div>
            <p className="palette-instruction">
              Click or drag an action to add it to your game screen.
            </p>

            <div className="palette-grid">
              {PALETTE_TOOLS.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <button 
                    key={tool.type} 
                    className="palette-card"
                    onClick={() => handleCreateFromPalette(tool)}
                    title={tool.desc}
                  >
                    <div className="palette-icon-circle">
                      <IconComponent size={20} />
                    </div>
                    <span className="palette-label">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Editor Footer Actions (Matching Screenshot) */}
      <div className="editor-footer">
        <div className="footer-title">Current configuration actions</div>
        <div className="footer-btn-row">
          <button className="btn btn-danger btn-half" onClick={onResetScheme}>
            <RotateCcw size={14} /> Reset
          </button>
          <button className="btn btn-primary btn-half" onClick={onSaveScheme}>
            <Save size={14} /> Save
          </button>
        </div>
      </div>
    </aside>
  );
}
