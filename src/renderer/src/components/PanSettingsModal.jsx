import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Keyboard, 
  Gamepad2, 
  Crosshair, 
  Info, 
  Plus, 
  Minus, 
  Check, 
  Maximize, 
  Sliders, 
  Gauge, 
  Layers,
  Sparkles
} from 'lucide-react';

const AREA_PRESETS = [
  {
    id: 'right_45',
    name: 'Right 45% Side (MSI / BlueStacks Default)',
    desc: 'Best for Free Fire & BGMI. Prevents interference with joystick/movement.',
    left: 52.0,
    right: 98.0,
    top: 10.0,
    bottom: 90.0,
  },
  {
    id: 'right_half',
    name: 'Right Half (50% - 100%)',
    desc: 'Wider camera swipe area across entire right half of the screen.',
    left: 50.0,
    right: 100.0,
    top: 0.0,
    bottom: 100.0,
  },
  {
    id: 'right_upper',
    name: 'Right Upper Zone (5% - 65%)',
    desc: 'Leaves bottom-right clear for weapon slots & jump/crouch buttons.',
    left: 52.0,
    right: 98.0,
    top: 5.0,
    bottom: 65.0,
  },
  {
    id: 'fullscreen',
    name: 'Full Screen (5% - 95%)',
    desc: 'Full viewport look-around area for RPGs or open-world exploration.',
    left: 5.0,
    right: 95.0,
    top: 5.0,
    bottom: 95.0,
  },
  {
    id: 'custom',
    name: 'Custom Bounding Area',
    desc: 'Manual percentage coordinates or drag directly on-screen.',
    left: 52.0,
    right: 98.0,
    top: 10.0,
    bottom: 90.0,
  }
];

export default function PanSettingsModal({
  isOpen,
  onClose,
  panControl,
  onUpdatePanControl,
  onDeletePanControl,
}) {
  const [activeTab, setActiveTab] = useState('keyboard'); // 'keyboard' | 'gamepad'
  const [recordingField, setRecordingField] = useState(null); // 'keyStartStop' | 'keySuspend' | 'keyLookAround'

  if (!isOpen || !panControl) return null;

  const handleKeyCapture = (e) => {
    if (!recordingField) return;
    e.preventDefault();
    e.stopPropagation();

    let keyName = e.key;
    if (e.code === 'Space') keyName = 'Space';
    if (e.key === 'Control') keyName = 'CTRL';
    if (e.key === 'Shift') keyName = 'Shift';
    if (e.key === 'Alt') keyName = 'Alt';
    if (e.key === 'Escape') {
      setRecordingField(null);
      return;
    }

    onUpdatePanControl({ [recordingField]: keyName.toUpperCase() });
    setRecordingField(null);
  };

  const sensX = typeof panControl.mouseSensitivityX === 'number' 
    ? panControl.mouseSensitivityX 
    : (typeof panControl.sensitivity === 'number' ? panControl.sensitivity : 1.60);

  const sensY = typeof panControl.mouseSensitivityY === 'number' 
    ? panControl.mouseSensitivityY 
    : (typeof panControl.sensitivityRatioY === 'number' ? panControl.sensitivityRatioY : 1.60);

  const sensScale = typeof panControl.sensScale === 'number' ? panControl.sensScale : 1.0;

  const areaLeft = typeof panControl.areaLeft === 'number' ? panControl.areaLeft : 52.0;
  const areaRight = typeof panControl.areaRight === 'number' ? panControl.areaRight : 98.0;
  const areaTop = typeof panControl.areaTop === 'number' ? panControl.areaTop : 10.0;
  const areaBottom = typeof panControl.areaBottom === 'number' ? panControl.areaBottom : 90.0;
  const areaPreset = panControl.areaPreset || 'right_45';

  const updateSensX = (val) => {
    const num = Math.max(0.05, Math.min(20.0, parseFloat(Number(val).toFixed(2)) || 1.60));
    onUpdatePanControl({ mouseSensitivityX: num, sensitivity: num });
  };

  const updateSensY = (val) => {
    const num = Math.max(0.05, Math.min(20.0, parseFloat(Number(val).toFixed(2)) || 1.60));
    onUpdatePanControl({ mouseSensitivityY: num, sensitivityRatioY: num });
  };

  const handleApplyAreaPreset = (preset) => {
    if (preset.id === 'custom') {
      onUpdatePanControl({ areaPreset: 'custom' });
    } else {
      onUpdatePanControl({
        areaPreset: preset.id,
        areaLeft: preset.left,
        areaRight: preset.right,
        areaTop: preset.top,
        areaBottom: preset.bottom,
      });
    }
  };

  return (
    <div className="pan-modal-overlay" onClick={onClose} onKeyDown={handleKeyCapture} tabIndex={0}>
      <div className="pan-modal-drawer glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pan-modal-header">
          <div className="pan-modal-header-left">
            <Crosshair size={18} className="text-primary" />
            <span className="pan-modal-title">Aim, pan and shoot settings</span>
          </div>
          <button className="btn-icon-small" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Tabs: Keyboard and mouse | Gamepad */}
        <div className="pan-modal-tabs">
          <button 
            className={`pan-tab ${activeTab === 'keyboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('keyboard')}
          >
            <Keyboard size={14} />
            <span>Keyboard and mouse</span>
          </button>
          <button 
            className={`pan-tab ${activeTab === 'gamepad' ? 'active' : ''}`}
            onClick={() => setActiveTab('gamepad')}
          >
            <Gamepad2 size={14} />
            <span>Gamepad</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="pan-modal-body">
          {/* 1. Key bindings */}
          <div className="pan-section">
            <div className="pan-section-heading">Key bindings</div>
            
            <div className="pan-prop-row">
              <label>Start/Stop</label>
              <button 
                className={`pan-key-btn ${recordingField === 'keyStartStop' ? 'recording' : ''}`}
                onClick={() => setRecordingField('keyStartStop')}
              >
                {recordingField === 'keyStartStop' ? 'Press key...' : (panControl.keyStartStop || 'CTRL')}
              </button>
            </div>

            <div className="pan-prop-row">
              <label>Suspend</label>
              <button 
                className={`pan-key-btn ${recordingField === 'keySuspend' ? 'recording' : ''}`}
                onClick={() => setRecordingField('keySuspend')}
              >
                {recordingField === 'keySuspend' ? 'Press key...' : (panControl.keySuspend || 'X')}
              </button>
            </div>
          </div>

          {/* 2. LOOK-AROUND AREA / CAMERA AIM ZONE (Default Right 45% side) */}
          <div className="pan-section pan-area-section">
            <div className="pan-section-header-row">
              <span className="pan-section-heading">Look-around Area (Camera Zone)</span>
              <span className="pan-badge-accent">Default: Right 45%</span>
            </div>
            
            <div className="pan-guide-alert">
              <span className="pan-guide-icon">📐</span>
              <span className="pan-guide-text">
                Mouse aim swipe applies inside this bounded screen zone. Reaching borders executes an instantaneous recenter without interrupting camera rotation.
              </span>
            </div>

            {/* Area Presets */}
            <div className="pan-prop-row">
              <label>Area Preset</label>
              <select 
                className="pan-select"
                value={areaPreset}
                onChange={(e) => {
                  const p = AREA_PRESETS.find(item => item.id === e.target.value) || AREA_PRESETS[0];
                  handleApplyAreaPreset(p);
                }}
              >
                {AREA_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Custom Coordinate Bounds (Left %, Right %, Top %, Bottom %) */}
            <div className="pan-area-bounds-grid">
              <div className="area-bound-box">
                <span className="bound-label">Left X (%)</span>
                <input 
                  type="number" 
                  step="0.5" 
                  min="0" 
                  max="95" 
                  className="pan-input"
                  value={areaLeft.toFixed(1)} 
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(areaRight - 5, parseFloat(e.target.value) || 0));
                    onUpdatePanControl({ areaLeft: v, areaPreset: 'custom' });
                  }}
                />
              </div>

              <div className="area-bound-box">
                <span className="bound-label">Right X (%)</span>
                <input 
                  type="number" 
                  step="0.5" 
                  min="5" 
                  max="100" 
                  className="pan-input"
                  value={areaRight.toFixed(1)} 
                  onChange={(e) => {
                    const v = Math.max(areaLeft + 5, Math.min(100, parseFloat(e.target.value) || 100));
                    onUpdatePanControl({ areaRight: v, areaPreset: 'custom' });
                  }}
                />
              </div>

              <div className="area-bound-box">
                <span className="bound-label">Top Y (%)</span>
                <input 
                  type="number" 
                  step="0.5" 
                  min="0" 
                  max="95" 
                  className="pan-input"
                  value={areaTop.toFixed(1)} 
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(areaBottom - 5, parseFloat(e.target.value) || 0));
                    onUpdatePanControl({ areaTop: v, areaPreset: 'custom' });
                  }}
                />
              </div>

              <div className="area-bound-box">
                <span className="bound-label">Bottom Y (%)</span>
                <input 
                  type="number" 
                  step="0.5" 
                  min="5" 
                  max="100" 
                  className="pan-input"
                  value={areaBottom.toFixed(1)} 
                  onChange={(e) => {
                    const v = Math.max(areaTop + 5, Math.min(100, parseFloat(e.target.value) || 100));
                    onUpdatePanControl({ areaBottom: v, areaPreset: 'custom' });
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3. MOUSE SENSITIVITY & FEEL (Calibrated to MSI App Player & BlueStacks 5) */}
          <div className="pan-section">
            <div className="pan-section-heading">Mouse Sensitivity &amp; Engine</div>

            {/* Global Multiplier */}
            <div className="pan-prop-row">
              <label>Global Multiplier</label>
              <select 
                className="pan-select"
                value={sensScale.toFixed(2)}
                onChange={(e) => onUpdatePanControl({ sensScale: parseFloat(e.target.value) || 1.0 })}
              >
                <option value="0.50">0.50x (Ultra Slow / Precision)</option>
                <option value="0.75">0.75x (Slow)</option>
                <option value="1.00">1.00x (Standard MSI / BlueStacks 1:1)</option>
                <option value="1.25">1.25x (Fast)</option>
                <option value="1.50">1.50x (High Speed)</option>
                <option value="2.00">2.00x (Ultra Fast / High DPI)</option>
                <option value="3.00">3.00x (Extreme)</option>
              </select>
            </div>

            {/* Mouse Sensitivity X */}
            <div className="pan-prop-row">
              <label>Mouse sensitivity X</label>
              <div className="pan-stepper-input">
                <button className="stepper-btn" onClick={() => updateSensX(sensX - 0.05)}><Minus size={12} /></button>
                <input 
                  type="number" 
                  step="0.05" 
                  min="0.05" 
                  max="20.0" 
                  className="pan-input-stepper"
                  value={sensX.toFixed(2)} 
                  onChange={(e) => updateSensX(e.target.value)}
                />
                <button className="stepper-btn" onClick={() => updateSensX(sensX + 0.05)}><Plus size={12} /></button>
              </div>
            </div>

            {/* Mouse Sensitivity Y */}
            <div className="pan-prop-row">
              <label>Mouse sensitivity Y</label>
              <div className="pan-stepper-input">
                <button className="stepper-btn" onClick={() => updateSensY(sensY - 0.05)}><Minus size={12} /></button>
                <input 
                  type="number" 
                  step="0.05" 
                  min="0.05" 
                  max="20.0" 
                  className="pan-input-stepper"
                  value={sensY.toFixed(2)} 
                  onChange={(e) => updateSensY(e.target.value)}
                />
                <button className="stepper-btn" onClick={() => updateSensY(sensY + 0.05)}><Plus size={12} /></button>
              </div>
            </div>

            {/* Tweaks Profile */}
            <div className="pan-prop-row">
              <label>Tweaks Profile</label>
              <select 
                className="pan-select"
                value={panControl.tweaks !== undefined ? panControl.tweaks : '948816450'}
                onChange={(e) => onUpdatePanControl({ tweaks: e.target.value })}
              >
                <option value="948816450">948816450 (BlueStacks 5 Fast Continuous Swipe)</option>
                <option value="16450">16450 (MSI App Player Default)</option>
                <option value="2">2 (Standard Android Joystick)</option>
                <option value="0">0 (Raw Touch)</option>
              </select>
            </div>

            {/* Mouse acceleration */}
            <div className="pan-prop-row">
              <label>Mouse acceleration</label>
              <select 
                className="pan-select"
                value={panControl.mouseAcceleration ? 'TRUE' : 'FALSE'}
                onChange={(e) => onUpdatePanControl({ mouseAcceleration: e.target.value === 'TRUE' })}
              >
                <option value="FALSE">FALSE (1:1 Raw Linear Competitive)</option>
                <option value="TRUE">TRUE (Dynamic Acceleration Curve)</option>
              </select>
            </div>

            {/* Reticle Coordinates X / Y */}
            <div className="pan-prop-row">
              <label>Anchor Center X / Y (%)</label>
              <div className="pan-dual-input">
                <input 
                  type="number" 
                  step="0.1" 
                  className="pan-input"
                  value={(panControl.x || 50).toFixed(1)} 
                  onChange={(e) => onUpdatePanControl({ x: parseFloat(e.target.value) || 0 })}
                  title="Anchor X %"
                />
                <input 
                  type="number" 
                  step="0.1" 
                  className="pan-input"
                  value={(panControl.y || 50).toFixed(1)} 
                  onChange={(e) => onUpdatePanControl({ y: parseFloat(e.target.value) || 0 })}
                  title="Anchor Y %"
                />
              </div>
            </div>
          </div>

          {/* 4. Crosshair Section */}
          <div className="pan-section">
            <div className="pan-section-header-toggle">
              <span className="pan-section-heading">Crosshair</span>
              <label className="pan-switch">
                <input 
                  type="checkbox" 
                  checked={panControl.isCrosshairEnabled !== false}
                  onChange={(e) => onUpdatePanControl({ isCrosshairEnabled: e.target.checked })}
                />
                <span className="pan-switch-slider" />
              </label>
            </div>

            {panControl.isCrosshairEnabled !== false && (
              <div className="pan-subprops">
                <div className="pan-prop-row">
                  <label>Type</label>
                  <select 
                    className="pan-select"
                    value={panControl.crosshairType || 'Cross'}
                    onChange={(e) => onUpdatePanControl({ crosshairType: e.target.value })}
                  >
                    <option value="Cross">Cross</option>
                    <option value="Dot">Dot</option>
                    <option value="Circle">Circle</option>
                    <option value="Classic">Classic</option>
                  </select>
                </div>

                <div className="pan-prop-row">
                  <label>Size</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0.5" 
                    max="5.0"
                    className="pan-input"
                    value={panControl.crosshairSize || 1} 
                    onChange={(e) => onUpdatePanControl({ crosshairSize: parseFloat(e.target.value) || 1 })}
                  />
                </div>

                <div className="pan-prop-row">
                  <label>Opacity (%)</label>
                  <input 
                    type="number" 
                    step="5" 
                    min="10" 
                    max="100" 
                    className="pan-input"
                    value={panControl.crosshairOpacity || 100} 
                    onChange={(e) => onUpdatePanControl({ crosshairOpacity: parseInt(e.target.value, 10) || 100 })}
                  />
                </div>

                <div className="pan-prop-row">
                  <label>Color</label>
                  <div className="pan-color-picker-row">
                    <input 
                      type="color" 
                      className="pan-color-box"
                      value={panControl.crosshairColor || '#00E5FF'} 
                      onChange={(e) => onUpdatePanControl({ crosshairColor: e.target.value })}
                    />
                    <input 
                      type="text" 
                      className="pan-input pan-input-color-hex"
                      value={panControl.crosshairColor || '#00E5FF'} 
                      onChange={(e) => onUpdatePanControl({ crosshairColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Fire with left click Section */}
          <div className="pan-section">
            <div className="pan-section-header-toggle">
              <span className="pan-section-heading">Fire with left click</span>
              <label className="pan-switch">
                <input 
                  type="checkbox" 
                  checked={panControl.isShootOnClickEnabled !== false}
                  onChange={(e) => onUpdatePanControl({ isShootOnClickEnabled: e.target.checked })}
                />
                <span className="pan-switch-slider" />
              </label>
            </div>

            {panControl.isShootOnClickEnabled !== false && (
              <div className="pan-subprops">
                <div className="pan-guide-alert">
                  <span className="pan-guide-icon">🎯</span>
                  <span className="pan-guide-text">Place the fire icon on your in-game fire weapon button</span>
                </div>

                <div className="pan-prop-row">
                  <label>Fire position X (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="pan-input"
                    value={(panControl.lButtonX !== undefined ? panControl.lButtonX : 84.94).toFixed(2)} 
                    onChange={(e) => onUpdatePanControl({ lButtonX: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="pan-prop-row">
                  <label>Fire position Y (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="pan-input"
                    value={(panControl.lButtonY !== undefined ? panControl.lButtonY : 73.44).toFixed(2)} 
                    onChange={(e) => onUpdatePanControl({ lButtonY: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="pan-prop-row">
                  <label>Action</label>
                  <div className="pan-readonly-tag">LEFT CLICK</div>
                </div>
              </div>
            )}
          </div>

          {/* 6. Look around mode (Free Look) */}
          <div className="pan-section">
            <div className="pan-section-header-toggle">
              <span className="pan-section-heading">Look around mode (Free Look)</span>
              <label className="pan-switch">
                <input 
                  type="checkbox" 
                  checked={panControl.isLookAroundEnabled !== false}
                  onChange={(e) => onUpdatePanControl({ isLookAroundEnabled: e.target.checked })}
                />
                <span className="pan-switch-slider" />
              </label>
            </div>

            {panControl.isLookAroundEnabled !== false && (
              <div className="pan-subprops">
                <div className="pan-guide-alert">
                  <span className="pan-guide-icon">👁️</span>
                  <span className="pan-guide-text">Place the eye icon on the in-game eye look control if available</span>
                </div>

                <div className="pan-prop-row">
                  <label>Free look position X (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="pan-input"
                    value={panControl.lookAroundX !== undefined ? panControl.lookAroundX : -1} 
                    onChange={(e) => onUpdatePanControl({ lookAroundX: parseFloat(e.target.value) || -1 })}
                  />
                </div>

                <div className="pan-prop-row">
                  <label>Free look position Y (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="pan-input"
                    value={panControl.lookAroundY !== undefined ? panControl.lookAroundY : -1} 
                    onChange={(e) => onUpdatePanControl({ lookAroundY: parseFloat(e.target.value) || -1 })}
                  />
                </div>

                <div className="pan-prop-row">
                  <label>Free look key</label>
                  <button 
                    className={`pan-key-btn ${recordingField === 'keyLookAround' ? 'recording' : ''}`}
                    onClick={() => setRecordingField('keyLookAround')}
                  >
                    {recordingField === 'keyLookAround' ? 'Press key...' : (panControl.keyLookAround || 'ALT')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 7. Show keys on-screen toggle */}
          <div className="pan-section pan-toggle-row-clean">
            <span className="pan-section-heading">Show keys on-screen</span>
            <label className="pan-switch">
              <input 
                type="checkbox" 
                checked={panControl.showOnOverlay !== false}
                onChange={(e) => onUpdatePanControl({ showOnOverlay: e.target.checked })}
              />
              <span className="pan-switch-slider" />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="pan-modal-footer">
          <div className="pan-footer-info">
            <Info size={14} color="#8892B0" />
            <span>Changes will be saved automatically</span>
          </div>
          <button 
            className="btn-icon-danger-small" 
            onClick={() => { onDeletePanControl(panControl.id); onClose(); }} 
            title="Delete Aim Control"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
