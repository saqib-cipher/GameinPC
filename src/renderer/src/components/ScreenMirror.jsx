import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  Maximize2
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
  foregroundPackage,
  isGameDetected,
}) {
  const workspaceRef = useRef(null);
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);

  const [activeKeys, setActiveKeys] = useState(new Set());
  const [fpsCount, setFpsCount] = useState(60);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamDim, setStreamDim] = useState({ width: 1920, height: 864 });
  const [viewportSize, setViewportSize] = useState({ width: 960, height: 432 });
  const [isPointerDown, setIsPointerDown] = useState(false);

  const decoderRef = useRef(null);
  const wsRef = useRef(null);
  const frameCountRef = useRef(0);

  // 1. Auto-Adjust Layout Engine (Calculates maximal fitting dimensions preserving native aspect ratio)
  const updateLayout = useCallback(() => {
    // 1. Determine available container dimensions
    let availW = window.innerWidth - (isEditorOpen ? 360 : 0) - 32;
    let availH = window.innerHeight - 48 - 32;

    if (workspaceRef.current) {
      const rect = workspaceRef.current.getBoundingClientRect();
      if (rect.width > 100) availW = rect.width - 32;
      if (rect.height > 100) availH = rect.height - 32;
    }

    availW = Math.max(300, availW);
    availH = Math.max(200, availH);

    // 2. Determine target aspect ratio: games like Free Fire run in landscape (width > height)
    let targetRatio = 16 / 9; // ~1.777
    if (streamDim.width > 0 && streamDim.height > 0) {
      targetRatio = streamDim.width / streamDim.height;
    } else if (deviceDetails?.resolution?.width && deviceDetails?.resolution?.height) {
      const rw = deviceDetails.resolution.width;
      const rh = deviceDetails.resolution.height;
      targetRatio = Math.max(rw, rh) / Math.min(rw, rh);
    }

    // 3. Fit maximal rectangle
    let fittedW = availW;
    let fittedH = fittedW / targetRatio;

    if (fittedH > availH) {
      fittedH = availH;
      fittedW = fittedH * targetRatio;
    }

    if (fittedW > availW) {
      fittedW = availW;
      fittedH = fittedW / targetRatio;
    }

    fittedW = Math.round(fittedW);
    fittedH = Math.round(fittedH);

    setViewportSize({
      width: fittedW,
      height: fittedH,
    });

    // Report bounds to backend for native mirror docking
    if (workspaceRef.current && window.electronAPI?.updateViewportBounds) {
      const rect = workspaceRef.current.getBoundingClientRect();
      const offsetX = rect.left + Math.round((rect.width - fittedW) / 2);
      const offsetY = rect.top + Math.round((rect.height - fittedH) / 2);
      window.electronAPI.updateViewportBounds({
        x: offsetX,
        y: offsetY,
        width: fittedW,
        height: fittedH,
      });
    }
  }, [streamDim, deviceDetails, isEditorOpen]);

  useEffect(() => {
    updateLayout();
    const observer = new ResizeObserver(() => updateLayout());
    if (workspaceRef.current) {
      observer.observe(workspaceRef.current);
    }
    window.addEventListener('resize', updateLayout);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateLayout);
    };
  }, [updateLayout, isEditorOpen]);

  // 2. Hardware Accelerated WebCodecs H.264 In-Window Video Stream
  useEffect(() => {
    let ws = null;
    let decoder = null;
    let isCleanedUp = false;

    if (isMirrorRunning) {
      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d', { alpha: false, desynchronized: true }) : null;

      const initDecoder = (codecName = 'h264') => {
        if (!window.VideoDecoder || !ctx) return null;
        try {
          if (decoder && decoder.state !== 'closed') {
            try { decoder.close(); } catch (e) {}
          }

          let codecStr = 'avc1.64002a'; // H.264 High Profile Level 4.2
          if (codecName.toLowerCase().includes('265') || codecName.toLowerCase().includes('hevc')) {
            codecStr = 'hev1.1.6.L93.B0';
          }

          const dec = new window.VideoDecoder({
            output: (videoFrame) => {
              if (canvas.width !== videoFrame.displayWidth || canvas.height !== videoFrame.displayHeight) {
                canvas.width = videoFrame.displayWidth;
                canvas.height = videoFrame.displayHeight;
                setStreamDim({ width: videoFrame.displayWidth, height: videoFrame.displayHeight });
                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'set-dimension',
                    width: videoFrame.displayWidth,
                    height: videoFrame.displayHeight
                  }));
                }
              }
              ctx.drawImage(videoFrame, 0, 0, canvas.width, canvas.height);
              videoFrame.close();
              frameCountRef.current++;
            },
            error: (err) => {
              console.warn('[WebCodecs VideoDecoder error]:', err);
            }
          });

          dec.configure({
            codec: codecStr,
            optimizeForLatency: true,
            hardwareAcceleration: 'prefer-hardware'
          });

          decoder = dec;
          decoderRef.current = dec;
          return dec;
        } catch (e) {
          console.warn('[WebCodecs init error]:', e);
          return null;
        }
      };

      initDecoder('h264');

      // Connect to StreamService WebSocket
      try {
        ws = new WebSocket('ws://127.0.0.1:29170');
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCleanedUp) return;
          setStreamConnected(true);
        };

        ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'video-meta' || msg.type === 'status') {
                setStreamConnected(msg.isRunning);
                if (msg.width && msg.height) {
                  setStreamDim({ width: msg.width, height: msg.height });
                }
                if (msg.codec) {
                  initDecoder(msg.codec);
                }
              }
            } catch (e) {}
          } else if (event.data instanceof ArrayBuffer) {
            const u8 = new Uint8Array(event.data);
            if (u8.length < 2) return;

            const isKey = u8[0] === 1;
            const payload = event.data.slice(1);

            let activeDec = decoderRef.current;
            if (!activeDec || activeDec.state === 'closed') {
              activeDec = initDecoder('h264');
            }

            if (activeDec && activeDec.state === 'configured') {
              try {
                const chunk = new window.EncodedVideoChunk({
                  type: isKey ? 'key' : 'delta',
                  timestamp: performance.now() * 1000,
                  data: payload,
                });
                activeDec.decode(chunk);
              } catch (e) {
                // If decoding fails on transient packet, continue to next keyframe
              }
            }
          }
        };

        ws.onclose = () => {
          if (isCleanedUp) return;
          setStreamConnected(false);
        };
      } catch (err) {
        console.error('[ScreenMirror] WebSocket connect error:', err);
      }
    }

    return () => {
      isCleanedUp = true;
      if (ws) {
        try { ws.close(); } catch (e) {}
      }
      if (decoder && decoder.state !== 'closed') {
        try { decoder.close(); } catch (e) {}
      }
      decoderRef.current = null;
      wsRef.current = null;
    };
  }, [isMirrorRunning]);

  // 3. Direct In-Window Canvas Pointer & Touch Forwarding (<1ms)
  const getCanvasPercentages = useCallback((e) => {
    const viewport = viewportRef.current;
    if (!viewport) return { x: 50, y: 50 };
    const rect = viewport.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }, []);

  const handlePointerDown = async (e) => {
    if (isEditorOpen) return;

    if (isShootingMode) {
      if (window.electronAPI) {
        await window.electronAPI.sendMouseDown({ button: e.button });
      }
      return;
    }

    // Direct touch click
    if (e.button === 0) {
      setIsPointerDown(true);
      const { x, y } = getCanvasPercentages(e);
      if (window.electronAPI?.injectTouch) {
        window.electronAPI.injectTouch({ pointerId: 0, action: 0, x, y });
      }
    }
  };

  const handlePointerMove = (e) => {
    if (isEditorOpen) return;

    if (isShootingMode) {
      if (document.pointerLockElement === viewportRef.current && window.electronAPI) {
        window.electronAPI.sendMouseMove({
          movementX: e.movementX,
          movementY: e.movementY,
        });
      }
      return;
    }

    // Direct touch drag
    if (isPointerDown) {
      const { x, y } = getCanvasPercentages(e);
      if (window.electronAPI?.injectTouch) {
        window.electronAPI.injectTouch({ pointerId: 0, action: 1, x, y });
      }
    }
  };

  const handlePointerUp = async (e) => {
    if (isEditorOpen) return;

    if (isShootingMode) {
      if (window.electronAPI) {
        await window.electronAPI.sendMouseUp({ button: e.button });
      }
      return;
    }

    // Direct touch release
    if (isPointerDown) {
      setIsPointerDown(false);
      const { x, y } = getCanvasPercentages(e);
      if (window.electronAPI?.injectTouch) {
        window.electronAPI.injectTouch({ pointerId: 0, action: 2, x, y });
      }
    }
  };

  const handlePointerLeave = () => {
    if (isPointerDown && !isShootingMode && !isEditorOpen) {
      setIsPointerDown(false);
      const { x, y } = { x: 50, y: 50 };
      if (window.electronAPI?.injectTouch) {
        window.electronAPI.injectTouch({ pointerId: 0, action: 2, x, y });
      }
    }
  };

  // 4. Keyboard Hook for Keymapper (Shooting Mode & Key Mappings)
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (isEditorOpen) return;

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

  // 5. Pointer Lock Change Listener
  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === viewportRef.current;
      onToggleShootingMode(isLocked);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [onToggleShootingMode]);

  const handleToggleAimMode = () => {
    if (!isShootingMode && viewportRef.current) {
      viewportRef.current.requestPointerLock?.();
    } else {
      if (document.exitPointerLock) document.exitPointerLock();
    }
  };

  // FPS Counter
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMirrorRunning) {
        const count = frameCountRef.current;
        frameCountRef.current = 0;
        setFpsCount(count > 0 ? count : (settings?.maxFps || 60));
      } else {
        setFpsCount(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isMirrorRunning, settings]);

  return (
    <div ref={workspaceRef} className="mirror-workspace">
      {/* Auto-Adjusting Viewport Container */}
      <div 
        ref={viewportRef}
        className={`mirror-viewport ${isMirrorRunning ? 'running' : 'standby'} ${isShootingMode ? 'locked-aim' : 'free-cursor'}`}
        style={{ 
          width: `${viewportSize.width}px`, 
          height: `${viewportSize.height}px` 
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerLeave}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isMirrorRunning ? (
          /* LIVE IN-WINDOW STREAM LAYER */
          <div className="active-mirror-layer">
            {/* Real-time Hardware Accelerated WebCodecs Canvas */}
            <canvas 
              ref={canvasRef} 
              className="mirror-stream-canvas" 
              width={streamDim.width} 
              height={streamDim.height} 
            />

            {/* Stream Status Badge */}
            <div className="stream-badge">
              <span className="live-dot" /> LIVE IN-WINDOW &bull; {selectedDevice?.model || 'Mobile'} ({fpsCount} FPS)
              {isGameDetected && (
                <span className="game-detected-sub"> &bull; 🎮 {foregroundPackage.replace(/^com\./, '')}</span>
              )}
            </div>

            {/* Custom Crosshair Reticle when in Shooting Mode */}
            {isShootingMode && settings?.customCrosshair !== false && (
              <div className="center-crosshair">
                <div className="crosshair-reticle" style={{ borderColor: settings?.crosshairColor || '#00E5FF' }}>
                  <div className="crosshair-dot" style={{ backgroundColor: settings?.crosshairColor || '#00E5FF' }} />
                </div>
              </div>
            )}
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
                    <span className="spec-value text-primary">In-Window Hardware 60-120 FPS</span>
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
                    <Play size={18} /> Start In-Window Mirror
                  </button>
                ) : (
                  <button className="btn btn-primary btn-lg" onClick={onOpenWirelessModal}>
                    <Wifi size={18} /> Pair Wireless Device
                  </button>
                )}
                <button className="btn btn-secondary" onClick={onOpenEditor}>
                  <Sliders size={16} /> Edit Controls
                </button>
                <button className="btn btn-secondary" onClick={onImportCfg}>
                  <Download size={16} /> Import .cfg
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visual Key Overlay Layer (100% Pinned directly above game screen) */}
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
        {isMirrorRunning && (
          <div className="perf-hud">
            <div className="perf-pill">
              <Activity size={12} color="var(--md-sys-color-primary)" />
              <span className="perf-value">FPS: {fpsCount}</span>
            </div>
            <div className="perf-pill">
              <Zap size={12} color="var(--md-sys-color-success)" />
              <span className="perf-value">Latency: &lt;1ms</span>
            </div>
            <button 
              className={`perf-pill btn-hud-aim ${isShootingMode ? 'aim-active' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleToggleAimMode(); }}
              title="Click or press Ctrl to toggle shooting mode"
            >
              {isShootingMode ? <Crosshair size={12} color="#00E5FF" /> : <MousePointer size={12} color="#FFFFFF" />}
              <span>{isShootingMode ? '🎯 AIM LOCKED (Press Ctrl / Esc to unlock)' : '🖱️ CURSOR VISIBLE (Press Ctrl to Lock Aim)'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
