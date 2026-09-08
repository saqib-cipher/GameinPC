import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Square,
  Wifi, 
  Smartphone, 
  Crosshair, 
  Zap, 
  Sliders, 
  Download, 
  Activity,
  MousePointer,
  Camera,
  RefreshCw,
  Eye,
  Layers
} from 'lucide-react';
import KeyOverlay from './KeyOverlay';

export default function ScreenMirror({
  isMirrorRunning,
  selectedDevice,
  deviceDetails,
  onStartMirror,
  onOpenWirelessModal,
  onOpenEditor,
  onImportCfg,
  scheme,
  isEditorOpen,
  selectedControlId,
  onSelectControl,
  onUpdateControlPosition,
  opacity,
  scale,
  showOverlay,
  isShootingMode,
  onToggleShootingMode,
  settings,
  snapshotUrl,
  isCapturingSnapshot,
  onCaptureSnapshot,
  onClearSnapshot,
  onUploadSnapshot,
}) {
  const viewportRef = useRef(null);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [fpsCount, setFpsCount] = useState(60);

  // 1. Keyboard & Mouse Input Listener for Keymapper
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (isEditorOpen) return; // Don't trigger game actions while editing in inspector

      setActiveKeys(prev => new Set(prev).add(e.key.toLowerCase()));

      if (window.electronAPI) {
        const result = await window.electronAPI.sendKeyDown({ key: e.key, code: e.code });
        if (result && result.shootingModeChanged) {
          onToggleShootingMode(result.isShootingMode);
          if (result.isShootingMode && viewportRef.current) {
            viewportRef.current.requestPointerLock?.();
          } else {
            if (document.exitPointerLock) document.exitPointerLock();
          }
        }
      }
    };

    const handleKeyUp = async (e) => {
      if (isEditorOpen) return;

      setActiveKeys(prev => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });

      if (window.electronAPI) {
        await window.electronAPI.sendKeyUp({ key: e.key, code: e.code });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isEditorOpen, onToggleShootingMode]);

  // 2. Pointer Lock & Mouse Look
  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === viewportRef.current;
      onToggleShootingMode(isLocked);
    };

    const handleMouseMove = (e) => {
      if (document.pointerLockElement === viewportRef.current && isShootingMode) {
        if (window.electronAPI) {
          window.electronAPI.sendMouseMove({
            movementX: e.movementX,
            movementY: e.movementY,
          });
        }
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isShootingMode, onToggleShootingMode]);

  const handleToggleAimMode = () => {
    if (!isShootingMode && viewportRef.current) {
      viewportRef.current.requestPointerLock?.();
    } else {
      if (document.exitPointerLock) document.exitPointerLock();
    }
  };

  const handleMouseDown = async (e) => {
    if (isEditorOpen) return;
    if (window.electronAPI) {
      await window.electronAPI.sendMouseDown({ button: e.button });
    }
  };

  const handleMouseUp = async (e) => {
    if (isEditorOpen) return;
    if (window.electronAPI) {
      await window.electronAPI.sendMouseUp({ button: e.button });
    }
  };

  // FPS Counter
  useEffect(() => {
    const interval = setInterval(() => {
      setFpsCount(isMirrorRunning ? (settings?.maxFps || 120) : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [isMirrorRunning, settings]);

  const hasResolution = deviceDetails?.resolution?.width && deviceDetails?.resolution?.height;
  const aspectRatio = hasResolution 
    ? `${deviceDetails.resolution.width} / ${deviceDetails.resolution.height}` 
    : '20 / 9';

  return (
    <div className="mirror-workspace">
      <div 
        ref={viewportRef}
        className={`mirror-viewport ${isEditorOpen || snapshotUrl ? 'editing-snapshot' : ''} ${isMirrorRunning ? 'running' : 'standby'} ${isShootingMode ? 'locked-aim' : 'free-cursor'}`}
        style={{ aspectRatio }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* SNAPSHOT / KEYMAPPER CANVAS LAYER */}
        {snapshotUrl ? (
          <div className="snapshot-background-layer">
            <img 
              src={snapshotUrl} 
              className="viewport-snapshot-img" 
              alt="In-Game Mobile Screen Snapshot" 
            />
            
            {/* Snapshot HUD Badge */}
            <div className="snapshot-badge">
              <div className="badge-dot pulse" />
              <span>📸 In-Game Screen Layout &bull; {selectedDevice?.model || 'Mobile'}</span>
              <button 
                className="btn-snapshot-refresh" 
                onClick={onCaptureSnapshot} 
                disabled={isCapturingSnapshot}
                title="Capture fresh screenshot of your game"
              >
                <RefreshCw size={12} className={isCapturingSnapshot ? 'spin-anim' : ''} />
                <span>{isCapturingSnapshot ? 'Capturing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        ) : isEditorOpen ? (
          /* Empty Snapshot Guide when Editor is open without snapshot */
          <div className="empty-snapshot-guide">
            <div className="guide-card glass-panel anim-glow">
              <Camera size={36} color="var(--md-sys-color-primary)" />
              <h3>In-Game Screen Snapshot</h3>
              <p>Capture your real-time mobile screen so you can place WASD, shoot, aim, and ability keys directly on top of your in-game buttons!</p>
              <div className="guide-actions">
                <button 
                  className={`btn btn-primary btn-md ${isCapturingSnapshot ? 'btn-loading' : ''}`}
                  onClick={onCaptureSnapshot}
                  disabled={isCapturingSnapshot || !selectedDevice}
                >
                  <Camera size={16} />
                  <span>{isCapturingSnapshot ? 'Capturing Mobile Screen...' : '📸 Take Screen Snapshot'}</span>
                </button>
                <button className="btn btn-secondary btn-md" onClick={onImportCfg}>
                  <Download size={16} /> Import .cfg
                </button>
              </div>
            </div>
          </div>
        ) : isMirrorRunning ? (
          /* Standby status when Native Scrcpy Direct3D 11 mirror window is active */
          <div className="native-mirror-active-card glass-panel anim-glow">
            <div className="mirror-live-badge">
              <span className="live-dot" /> LIVE 120 FPS NATIVE MIRROR WINDOW RUNNING
            </div>
            <h2>{selectedDevice?.model || 'Android Mobile'}</h2>
            <p className="mirror-desc">
              Direct3D 11 ultra-low latency game stream is running in the native game window with full mouse clicks, audio, and high refresh rate.
            </p>
            <div className="native-mirror-actions">
              <button className="btn btn-primary btn-md" onClick={onOpenEditor}>
                <Camera size={16} /> Edit Controls & Take Snapshot
              </button>
              <button className="btn btn-danger btn-md" onClick={onStartMirror}>
                <Square size={16} /> Stop Mirror
              </button>
            </div>
          </div>
        ) : (
          /* Standby Dashboard */
          <div className="standby-dashboard">
            <div className="standby-card glass-panel anim-glow">
              <div className="standby-header">
                <div className="device-avatar">
                  {selectedDevice?.isWireless ? (
                    <Wifi size={32} color="var(--md-sys-color-primary)" />
                  ) : (
                    <Smartphone size={32} color="var(--md-sys-color-primary)" />
                  )}
                </div>
                <div className="device-title-col">
                  <h2>{selectedDevice ? selectedDevice.model : 'Ready to Connect Mobile'}</h2>
                  <span className="device-meta">
                    {selectedDevice 
                      ? `${selectedDevice.serial} &bull; ${selectedDevice.connectionType} &bull; Android ${deviceDetails?.androidVersion || '12+'}`
                      : 'Connect phone via USB Debugging or Wireless Debugging'}
                  </span>
                </div>
              </div>

              {selectedDevice ? (
                <div className="device-specs-grid">
                  <div className="spec-tile">
                    <span className="spec-label">Screen Resolution</span>
                    <span className="spec-value">
                      {deviceDetails?.resolution ? `${deviceDetails.resolution.width}x${deviceDetails.resolution.height}` : '1080x2400'}
                    </span>
                  </div>
                  <div className="spec-tile">
                    <span className="spec-label">Battery Level</span>
                    <span className="spec-value">{deviceDetails?.batteryLevel || 100}%</span>
                  </div>
                  <div className="spec-tile">
                    <span className="spec-label">Active Scheme</span>
                    <span className="spec-value">{scheme?.name || 'Free Fire Max'}</span>
                  </div>
                  <div className="spec-tile">
                    <span className="spec-label">Rendering Mode</span>
                    <span className="spec-value text-primary">Native Direct3D 11 120 FPS</span>
                  </div>
                </div>
              ) : (
                <div className="connect-guide-box">
                  <p>1. Enable <b>Developer Options</b> & <b>USB / Wireless Debugging</b> on your Android phone.</p>
                  <p>2. Connect via USB cable OR click <b>Wireless Debugging</b> to pair wirelessly.</p>
                </div>
              )}

              <div className="standby-actions-row">
                {selectedDevice ? (
                  <button className="btn btn-primary btn-lg" onClick={onStartMirror}>
                    <Play size={18} /> Start Screen Mirror
                  </button>
                ) : (
                  <button className="btn btn-primary btn-lg" onClick={onOpenWirelessModal}>
                    <Wifi size={18} /> Pair Wireless Device
                  </button>
                )}
                <button className="btn btn-secondary" onClick={onOpenEditor}>
                  <Camera size={16} /> Edit Controls & Snapshot
                </button>
                <button className="btn btn-secondary" onClick={onImportCfg}>
                  <Download size={16} /> Import .cfg
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visual Key Overlay Layer (Directly over the in-game screen snapshot) */}
        {showOverlay && (
          <KeyOverlay
            scheme={scheme}
            isEditorOpen={isEditorOpen}
            selectedControlId={selectedControlId}
            onSelectControl={onSelectControl}
            onUpdateControlPosition={onUpdateControlPosition}
            opacity={opacity}
            scale={scale}
            activeKeys={activeKeys}
          />
        )}

        {/* Performance & Aim Mode Control HUD (Bottom-Left) */}
        <div className="perf-hud">
          <div className="perf-pill">
            <Activity size={12} color="var(--md-sys-color-primary)" />
            <span className="perf-value">FPS: {fpsCount}</span>
          </div>
          <div className="perf-pill">
            <Zap size={12} color="var(--md-sys-color-success)" />
            <span className="perf-value">Direct3D 11</span>
          </div>
          <button 
            className={`perf-pill btn-hud-aim ${isShootingMode ? 'aim-active' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleToggleAimMode(); }}
            title="Click or press Ctrl to toggle shooting mode"
          >
            {isShootingMode ? <Crosshair size={12} color="#00E5FF" /> : <MousePointer size={12} color="#FFFFFF" />}
            <span>{isShootingMode ? '🎯 AIM LOCKED (Press Ctrl to unlock)' : '🖱️ CURSOR VISIBLE (Press Ctrl to Lock Aim)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
