import React, { useState } from 'react';
import { 
  Gamepad2, 
  Keyboard, 
  Smartphone, 
  Wifi, 
  RefreshCw, 
  Download, 
  Upload, 
  Copy, 
  Trash2, 
  Plus, 
  Settings, 
  Maximize2, 
  Minimize2, 
  X, 
  Eye, 
  EyeOff, 
  Sliders, 
  PowerOff,
  Play,
  Square,
  MonitorOff,
  HelpCircle
} from 'lucide-react';

export default function TopBar({
  devices,
  selectedDevice,
  onSelectDevice,
  onRefreshDevices,
  inputMode, // 'keyboard' | 'gamepad'
  onChangeInputMode,
  schemes,
  activeSchemeId,
  onSelectScheme,
  onImportCfg,
  onExportCfg,
  onCloneScheme,
  onDeleteScheme,
  onNewScheme,
  isMirrorRunning,
  onToggleMirror,
  isScreenOff,
  onToggleScreenOff,
  showOverlay,
  onToggleOverlay,
  isEditorOpen,
  onToggleEditor,
  onOpenWirelessModal,
  onOpenSettingsModal,
  onToggleFullscreen,
  onMinimize,
  onMaximize,
  onClose,
}) {
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isSchemeMenuOpen, setIsSchemeMenuOpen] = useState(false);

  const activeScheme = schemes.find(s => s.id === activeSchemeId) || schemes[0];

  return (
    <header className="topbar">
      {/* App Branding & Window Drag Handle */}
      <div className="topbar-left">
        <div className="app-brand">
          <div className="brand-logo">
            <Gamepad2 size={20} color="var(--md-sys-color-primary)" />
          </div>
          <span className="brand-name">Game<span className="brand-highlight">in</span>PC</span>
          <span className="version-pill">v1.0 Pro</span>
        </div>

        {/* Device Selector */}
        <div className="device-selector-container">
          <button 
            className={`btn-device-selector ${selectedDevice ? 'active' : ''}`}
            onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
            title="Select Target Android Device"
          >
            {selectedDevice?.isWireless ? <Wifi size={15} color="var(--md-sys-color-primary)" /> : <Smartphone size={15} />}
            <span className="device-name">
              {selectedDevice ? `${selectedDevice.model} (${selectedDevice.connectionType})` : 'No Device Connected'}
            </span>
            <span className={`status-dot ${selectedDevice ? 'connected' : 'disconnected'}`} />
          </button>

          {isDeviceMenuOpen && (
            <div className="dropdown-menu glass-panel">
              <div className="dropdown-header">
                <span>Connected Devices ({devices.length})</span>
                <button className="btn-icon-small" onClick={(e) => { e.stopPropagation(); onRefreshDevices(); }} title="Refresh Devices">
                  <RefreshCw size={13} />
                </button>
              </div>
              <div className="dropdown-list">
                {devices.length === 0 ? (
                  <div className="dropdown-empty">
                    <span>No USB / Wireless devices found.</span>
                    <button className="btn btn-primary btn-sm" onClick={() => { setIsDeviceMenuOpen(false); onOpenWirelessModal(); }}>
                      <Wifi size={13} /> Pair Wireless Device
                    </button>
                  </div>
                ) : (
                  devices.map(dev => (
                    <div 
                      key={dev.serial} 
                      className={`dropdown-item ${selectedDevice?.serial === dev.serial ? 'selected' : ''}`}
                      onClick={() => { onSelectDevice(dev); setIsDeviceMenuOpen(false); }}
                    >
                      {dev.isWireless ? <Wifi size={15} color="var(--md-sys-color-primary)" /> : <Smartphone size={15} />}
                      <div className="device-info-col">
                        <span className="item-title">{dev.model}</span>
                        <span className="item-subtitle">{dev.serial} &bull; {dev.state}</span>
                      </div>
                      <span className={`badge ${dev.state === 'device' ? 'badge-success' : 'badge-warning'}`}>
                        {dev.state}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="dropdown-footer">
                <button className="btn btn-secondary btn-full" onClick={() => { setIsDeviceMenuOpen(false); onOpenWirelessModal(); }}>
                  <Wifi size={14} /> Wireless Debugging Manager
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs (Matching Screenshot) */}
      <div className="topbar-center">
        <div className="mode-tabs">
          <button 
            className={`mode-tab ${inputMode === 'keyboard' ? 'active' : ''}`}
            onClick={() => onChangeInputMode('keyboard')}
          >
            <Keyboard size={16} />
            <span>Keyboard and mouse</span>
          </button>
          <button 
            className={`mode-tab ${inputMode === 'gamepad' ? 'active' : ''}`}
            onClick={() => onChangeInputMode('gamepad')}
          >
            <Gamepad2 size={16} />
            <span>Gamepad</span>
          </button>
        </div>
      </div>

      {/* Control Scheme, Actions & Window Controls */}
      <div className="topbar-right">
        {/* Scheme Selector & Actions (Matching Screenshot icons) */}
        <div className="scheme-bar">
          <div className="scheme-label">Control scheme:</div>
          <div className="scheme-select-wrapper">
            <select 
              value={activeSchemeId || ''} 
              onChange={(e) => onSelectScheme(e.target.value)}
              className="scheme-select"
            >
              {schemes.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.gameControls?.length || 0})</option>
              ))}
            </select>
          </div>

          <div className="scheme-actions">
            <button className="btn-icon" onClick={onImportCfg} title="Import Keymap (.cfg / JSON)">
              <Download size={16} />
            </button>
            <button className="btn-icon" onClick={onExportCfg} title="Export Keymap (.cfg)">
              <Upload size={16} />
            </button>
            <button className="btn-icon" onClick={onCloneScheme} title="Clone Scheme">
              <Copy size={16} />
            </button>
            <button className="btn-icon" onClick={onNewScheme} title="New Scheme">
              <Plus size={16} />
            </button>
            {schemes.length > 1 && (
              <button className="btn-icon btn-icon-danger" onClick={onDeleteScheme} title="Delete Scheme">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          {/* Mirror Start / Stop */}
          <button 
            className={`btn ${isMirrorRunning ? 'btn-danger' : 'btn-primary'}`}
            onClick={onToggleMirror}
            title={isMirrorRunning ? 'Stop Screen Mirror' : 'Start Screen Mirror'}
          >
            {isMirrorRunning ? <Square size={14} /> : <Play size={14} />}
            <span>{isMirrorRunning ? 'Stop Mirror' : 'Mirror Screen'}</span>
          </button>

          {/* Turn phone screen off toggle */}
          <button 
            className={`btn-icon ${isScreenOff ? 'active-glow' : ''}`}
            onClick={onToggleScreenOff}
            title="Turn Off Mobile Screen (Saves Battery & Heat)"
          >
            <MonitorOff size={16} />
          </button>

          {/* Key Overlay Visibility Toggle */}
          <button 
            className={`btn-icon ${showOverlay ? 'active-glow' : ''}`}
            onClick={onToggleOverlay}
            title="Toggle Key Overlay (F1)"
          >
            {showOverlay ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          {/* Controls Editor Side Panel Toggle */}
          <button 
            className={`btn-icon ${isEditorOpen ? 'active-glow' : ''}`}
            onClick={onToggleEditor}
            title="Open Controls Editor"
          >
            <Sliders size={16} />
          </button>

          {/* Settings */}
          <button className="btn-icon" onClick={onOpenSettingsModal} title="Settings">
            <Settings size={16} />
          </button>
        </div>

        {/* Window Controls */}
        <div className="window-controls">
          <button className="win-btn" onClick={onMinimize} title="Minimize">
            <Minimize2 size={13} />
          </button>
          <button className="win-btn" onClick={onToggleFullscreen} title="Toggle Fullscreen">
            <Maximize2 size={13} />
          </button>
          <button className="win-btn win-btn-close" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
