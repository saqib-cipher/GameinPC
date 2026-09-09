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
  ChevronDown
} from 'lucide-react';

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

  const updateSensX = (val) => {
    const num = Math.max(0.1, Math.min(20.0, parseFloat(val) || 1.60));
    onUpdatePanControl({ mouseSensitivityX: num, sensitivity: num });
  };

  const updateSensY = (val) => {
    const num = Math.max(0.1, Math.min(20.0, parseFloat(val) || 1.60));
    onUpdatePanControl({ mouseSensitivityY: num, sensitivityRatioY: num });
  };

  return (
    <div className="pan-modal-overlay" onClick={onClose} onKeyDown={handleKeyCapture} tabIndex={0}>
      <div className="pan-modal-drawer glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header (Matching Screenshot 3) */}
        <div className="pan-modal-header">
          <span className="pan-modal-title">Aim, pan and shoot settings</span>
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

          {/* 2. Properties (Coordinates, Sensitivity X/Y, Tweaks, Mouse Acceleration) */}
          <div className="pan-section">
            <div className="pan-section-heading">Properties</div>

            <div className="pan-prop-row">
              <label>X</label>
              <input 
                type="number" 
                step="0.01" 
                className="pan-input"
                value={(panControl.x || 50).toFixed(2)} 
                onChange={(e) => onUpdatePanControl({ x: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="pan-prop-row">
              <label>Y</label>
              <input 
                type="number" 
                step="0.01" 
                className="pan-input"
                value={(panControl.y || 50).toFixed(2)} 
                onChange={(e) => onUpdatePanControl({ y: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="pan-prop-row">
              <label>Mouse sensitivity X</label>
              <div className="pan-stepper-input">
                <button className="stepper-btn" onClick={() => updateSensX(sensX - 0.05)}><Minus size={12} /></button>
                <input 
                  type="number" 
                  step="0.05" 
                  min="0.1" 
                  max="20.0" 
                  className="pan-input-stepper"
                  value={sensX.toFixed(2)} 
                  onChange={(e) => updateSensX(e.target.value)}
                />
                <button className="stepper-btn" onClick={() => updateSensX(sensX + 0.05)}><Plus size={12} /></button>
              </div>
            </div>

            <div className="pan-prop-row">
              <label>Mouse sensitivity Y</label>
              <div className="pan-stepper-input">
                <button className="stepper-btn" onClick={() => updateSensY(sensY - 0.05)}><Minus size={12} /></button>
                <input 
                  type="number" 
                  step="0.05" 
                  min="0.1" 
                  max="20.0" 
                  className="pan-input-stepper"
                  value={sensY.toFixed(2)} 
                  onChange={(e) => updateSensY(e.target.value)}
                />
                <button className="stepper-btn" onClick={() => updateSensY(sensY + 0.05)}><Plus size={12} /></button>
              </div>
            </div>

            <div className="pan-prop-row">
              <label>Tweaks</label>
              <input 
                type="text" 
                className="pan-input"
                value={panControl.tweaks !== undefined ? panControl.tweaks : '948816450'} 
                onChange={(e) => onUpdatePanControl({ tweaks: e.target.value })}
                placeholder="16450 or 948816450"
              />
            </div>

            <div className="pan-prop-row">
              <label>Mouse acceleration</label>
              <select 
                className="pan-select"
                value={panControl.mouseAcceleration ? 'TRUE' : 'FALSE'}
                onChange={(e) => onUpdatePanControl({ mouseAcceleration: e.target.value === 'TRUE' })}
              >
                <option value="FALSE">FALSE</option>
                <option value="TRUE">TRUE</option>
              </select>
            </div>
          </div>

          {/* 3. Crosshair Section */}
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
                  <label>Opacity (Changes appear in shooting mode)</label>
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
                      value={panControl.crosshairColor || '#FFFFFF'} 
                      onChange={(e) => onUpdatePanControl({ crosshairColor: e.target.value })}
                    />
                    <input 
                      type="text" 
                      className="pan-input pan-input-color-hex"
                      value={panControl.crosshairColor || '#FFFFFF'} 
                      onChange={(e) => onUpdatePanControl({ crosshairColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Fire with left click Section */}
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
                  <span className="pan-guide-text">Place the fire icon in the fire weapon control on the screen</span>
                </div>

                <div className="pan-prop-row">
                  <label>Action position X</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="pan-input"
                    value={(panControl.lButtonX !== undefined ? panControl.lButtonX : 84.94).toFixed(2)} 
                    onChange={(e) => onUpdatePanControl({ lButtonX: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="pan-prop-row">
                  <label>Action position Y</label>
                  <input 
                    type="number" 
                    step="0.01" 
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

          {/* 5. Look around mode (Free Look) */}
          <div className="pan-section">
            <div className="pan-section-header-toggle">
              <span className="pan-section-heading">Look around mode</span>
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
                  <span className="pan-guide-text">Place the eye icon on the look around control if available</span>
                </div>

                <div className="pan-prop-row">
                  <label>Free look position X</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="pan-input"
                    value={panControl.lookAroundX !== undefined ? panControl.lookAroundX : -1} 
                    onChange={(e) => onUpdatePanControl({ lookAroundX: parseFloat(e.target.value) || -1 })}
                  />
                </div>

                <div className="pan-prop-row">
                  <label>Free look position Y</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="pan-input"
                    value={panControl.lookAroundY !== undefined ? panControl.lookAroundY : -1} 
                    onChange={(e) => onUpdatePanControl({ lookAroundY: parseFloat(e.target.value) || -1 })}
                  />
                </div>

                <div className="pan-prop-row">
                  <label>Free look</label>
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

          {/* 6. Show keys on-screen toggle */}
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

        {/* Footer (Matching Screenshot 3) */}
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
