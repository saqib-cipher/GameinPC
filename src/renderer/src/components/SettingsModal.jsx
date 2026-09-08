import React, { useState } from 'react';
import { Settings, X, Save, Tv, Zap, MonitorOff, Crosshair, Volume2, Shield } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) {
  const [localSettings, setLocalSettings] = useState({ ...settings });

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog glass-panel settings-dialog">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-circle">
              <Settings size={20} color="var(--md-sys-color-primary)" />
            </div>
            <div>
              <h3>Mirror & Gaming Preferences</h3>
              <p className="modal-subtitle">Optimize video streaming, latency, power efficiency, and HUD aesthetics</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body settings-body">
          {/* Video & Performance Section */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Tv size={16} color="var(--md-sys-color-primary)" />
              <span>Video & Frame Rate</span>
            </div>

            <div className="form-group-row">
              <div className="form-field flex-1">
                <label>Max Frame Rate</label>
                <select 
                  value={localSettings.maxFps || 60} 
                  onChange={(e) => handleChange('maxFps', parseInt(e.target.value, 10))}
                >
                  <option value={30}>30 FPS (Power Saver)</option>
                  <option value={60}>60 FPS (Smooth Standard)</option>
                  <option value={90}>90 FPS (High Refresh)</option>
                  <option value={120}>120 FPS (Ultra Pro Gaming)</option>
                </select>
              </div>

              <div className="form-field flex-1">
                <label>Video Bitrate</label>
                <select 
                  value={localSettings.bitrate || 8} 
                  onChange={(e) => handleChange('bitrate', parseInt(e.target.value, 10))}
                >
                  <option value={4}>4 Mbps (Low Latency / WiFi)</option>
                  <option value={8}>8 Mbps (Balanced Recommended)</option>
                  <option value={16}>16 Mbps (Crisp Ultra HD)</option>
                  <option value={32}>32 Mbps (Near Lossless)</option>
                </select>
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-field flex-1">
                <label>Mirroring & Video Engine</label>
                <select 
                  value={localSettings.renderEngine || 'direct3d11'} 
                  onChange={(e) => handleChange('renderEngine', e.target.value)}
                >
                  <option value="direct3d11">⚡ Native Direct3D 11 (120 FPS Zero-Lag - Recommended)</option>
                  <option value="canvas">🖥️ In-Window Canvas Stream</option>
                </select>
              </div>

              <div className="form-field flex-1">
                <label>Hardware Acceleration</label>
                <select 
                  value={localSettings.renderDriver || 'direct3d11'} 
                  onChange={(e) => handleChange('renderDriver', e.target.value)}
                >
                  <option value="direct3d11">Direct3D 11 (Windows Native)</option>
                  <option value="opengl">OpenGL</option>
                  <option value="vulkan">Vulkan</option>
                </select>
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-field flex-1">
                <label>Resolution Cap</label>
                <select 
                  value={localSettings.maxSize || 0} 
                  onChange={(e) => handleChange('maxSize', parseInt(e.target.value, 10))}
                >
                  <option value={0}>Native Mobile Resolution (Best Quality)</option>
                  <option value={1080}>1080p Full HD</option>
                  <option value={1440}>1440p 2K QHD</option>
                  <option value={720}>720p HD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Device & Power Controls */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Zap size={16} color="var(--md-sys-color-warning)" />
              <span>Device & Battery Optimization</span>
            </div>

            <div className="checkbox-row">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={localSettings.turnScreenOff || false} 
                  onChange={(e) => handleChange('turnScreenOff', e.target.checked)} 
                />
                <div>
                  <span className="chk-title">Turn Off Phone Screen While Mirroring</span>
                  <span className="chk-desc">Completely powers off the physical phone screen during PC gameplay to eliminate battery drain and device heat.</span>
                </div>
              </label>
            </div>

            <div className="checkbox-row">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={localSettings.stayAwake !== false} 
                  onChange={(e) => handleChange('stayAwake', e.target.checked)} 
                />
                <div>
                  <span className="chk-title">Keep Mobile Device Awake</span>
                  <span className="chk-desc">Prevents Android screen from locking or going to sleep during active gameplay sessions.</span>
                </div>
              </label>
            </div>

            <div className="checkbox-row">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={localSettings.audioMirror || false} 
                  onChange={(e) => handleChange('audioMirror', e.target.checked)} 
                />
                <div>
                  <span className="chk-title">Mirror Audio to PC</span>
                  <span className="chk-desc">Forwards game sounds directly to your PC headset/speakers (Android 11+).</span>
                </div>
              </label>
            </div>
          </div>

          {/* Crosshair & HUD Customization */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Crosshair size={16} color="var(--md-sys-color-primary)" />
              <span>Crosshair & HUD</span>
            </div>

            <div className="form-group-row">
              <div className="form-field flex-1">
                <label>Shooting Mode Crosshair</label>
                <select 
                  value={localSettings.customCrosshair !== false ? 'enabled' : 'disabled'} 
                  onChange={(e) => handleChange('customCrosshair', e.target.value === 'enabled')}
                >
                  <option value="enabled">Custom Crosshair Reticle</option>
                  <option value="disabled">Hidden</option>
                </select>
              </div>

              <div className="form-field flex-1">
                <label>Crosshair Color</label>
                <input 
                  type="color" 
                  className="color-picker-input"
                  value={localSettings.crosshairColor || '#00E5FF'} 
                  onChange={(e) => handleChange('crosshairColor', e.target.value)} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={15} /> Save & Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
