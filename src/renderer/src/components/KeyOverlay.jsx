import React, { useState, useRef } from 'react';
import { Crosshair, Move, MousePointer, Zap, Code, ArrowUp, RotateCw, ZoomIn } from 'lucide-react';

export default function KeyOverlay({
  scheme,
  isEditorOpen,
  selectedControlId,
  onSelectControl,
  onUpdateControlPosition,
  onUpdateControl,
  onOpenPanSettings,
  opacity = 85,
  scale = 100,
  activeKeys = new Set(),
}) {
  const containerRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  if (!scheme || !scheme.gameControls) return null;

  const handleMouseDown = (e, ctrl) => {
    if (!isEditorOpen) return;
    e.stopPropagation();
    onSelectControl(ctrl.id);

    const rect = containerRef.current.getBoundingClientRect();
    const ctrlPixelsX = (ctrl.x / 100) * rect.width;
    const ctrlPixelsY = (ctrl.y / 100) * rect.height;

    setDraggingId(ctrl.id);
    setDragOffset({
      x: e.clientX - (rect.left + ctrlPixelsX),
      y: e.clientY - (rect.top + ctrlPixelsY),
    });
  };

  const handleMouseMove = (e) => {
    if (!draggingId || !isEditorOpen) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left - dragOffset.x;
    const currentY = e.clientY - rect.top - dragOffset.y;

    let percentX = (currentX / rect.width) * 100;
    let percentY = (currentY / rect.height) * 100;

    // Clamp inside container
    percentX = Math.max(1, Math.min(99, percentX));
    percentY = Math.max(1, Math.min(99, percentY));

    if (draggingId.startsWith('fire_')) {
      const parentId = draggingId.replace('fire_', '');
      if (onUpdateControl) {
        onUpdateControl(parentId, { lButtonX: percentX, lButtonY: percentY });
      }
    } else {
      onUpdateControlPosition(draggingId, percentX, percentY);
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const formatKeyName = (key) => {
    if (!key) return '';
    if (key.toLowerCase() === 'mouselbutton') return 'Left click';
    if (key.toLowerCase() === 'mouserbutton') return 'Right click';
    if (key.toLowerCase() === 'mousembutton') return 'Middle click';
    if (key.toLowerCase() === 'mousexbutton1') return 'X button 1';
    if (key.toLowerCase() === 'mousexbutton2') return 'X button 2';
    return key;
  };

  const isKeyActive = (key) => {
    if (!key) return false;
    return activeKeys.has(key.toLowerCase());
  };

  return (
    <div 
      ref={containerRef}
      className={`key-overlay-container ${isEditorOpen ? 'editor-active' : ''}`}
      style={{ opacity: opacity / 100 }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {scheme.gameControls.map((ctrl) => {
        if (!ctrl.showOnOverlay && !isEditorOpen) return null;

        const isSelected = selectedControlId === ctrl.id;
        const isActive = isKeyActive(ctrl.key) || isKeyActive(ctrl.keyStartStop) || isKeyActive(ctrl.keyUp);

        // Render D-pad (WASD)
        if (ctrl.type === 'Dpad') {
          const radiusPercent = (ctrl.xRadius || 3.5) * 2;
          return (
            <div
              key={ctrl.id}
              className={`overlay-dpad ${isSelected ? 'selected' : ''} ${isEditorOpen ? 'draggable' : ''}`}
              style={{
                left: `${ctrl.x}%`,
                top: `${ctrl.y}%`,
                width: `${radiusPercent * 16}px`,
                height: `${radiusPercent * 16}px`,
                transform: `translate(-50%, -50%) scale(${scale / 100})`,
              }}
              onMouseDown={(e) => handleMouseDown(e, ctrl)}
            >
              <div className="dpad-circle">
                <div className={`dpad-key dpad-up ${isKeyActive(ctrl.keyUp) ? 'active' : ''}`}>{ctrl.keyUp || 'W'}</div>
                <div className="dpad-middle-row">
                  <div className={`dpad-key dpad-left ${isKeyActive(ctrl.keyLeft) ? 'active' : ''}`}>{ctrl.keyLeft || 'A'}</div>
                  <div className={`dpad-key dpad-down ${isKeyActive(ctrl.keyDown) ? 'active' : ''}`}>{ctrl.keyDown || 'S'}</div>
                  <div className={`dpad-key dpad-right ${isKeyActive(ctrl.keyRight) ? 'active' : ''}`}>{ctrl.keyRight || 'D'}</div>
                </div>
              </div>
              {isEditorOpen && <span className="ctrl-tag">D-pad</span>}
            </div>
          );
        }

        // Render Pan (Aim, Pan & Shoot)
        if (ctrl.type === 'Pan') {
          const sensX = typeof ctrl.mouseSensitivityX === 'number' 
            ? ctrl.mouseSensitivityX 
            : (typeof ctrl.sensitivity === 'number' ? ctrl.sensitivity : 1.60);

          const sensY = typeof ctrl.mouseSensitivityY === 'number' 
            ? ctrl.mouseSensitivityY 
            : (typeof ctrl.sensitivityRatioY === 'number' ? ctrl.sensitivityRatioY : 1.60);

          const handleStepX = (e, delta) => {
            e.stopPropagation();
            const newVal = Math.max(0.1, Math.min(20.0, parseFloat((sensX + delta).toFixed(2))));
            if (onUpdateControl) {
              onUpdateControl(ctrl.id, { mouseSensitivityX: newVal, sensitivity: newVal });
            }
          };

          const handleStepY = (e, delta) => {
            e.stopPropagation();
            const newVal = Math.max(0.1, Math.min(20.0, parseFloat((sensY + delta).toFixed(2))));
            if (onUpdateControl) {
              onUpdateControl(ctrl.id, { mouseSensitivityY: newVal, sensitivityRatioY: newVal });
            }
          };

          return (
            <React.Fragment key={ctrl.id}>
              {/* Pan Reticle / Toggle Key Indicator (Matching Screenshot 1 & 2) */}
              <div
                className={`overlay-pan ${isSelected ? 'selected' : ''} ${isEditorOpen ? 'draggable' : ''}`}
                style={{
                  left: `${ctrl.x}%`,
                  top: `${ctrl.y}%`,
                  transform: `translate(-50%, -50%) scale(${scale / 100})`,
                }}
                onMouseDown={(e) => handleMouseDown(e, ctrl)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onOpenPanSettings) onOpenPanSettings(ctrl);
                }}
              >
                <div className="pan-pill-advanced">
                  {/* X Sensitivity Stepper */}
                  <div className="sens-stepper-col">
                    <span className="sens-axis-label">X</span>
                    {isEditorOpen ? (
                      <div className="sens-mini-controls">
                        <button className="btn-sens-step" onClick={(e) => handleStepX(e, -0.05)} title="Decrease X sensitivity">&lt;</button>
                        <span className="sens-val-text">{sensX.toFixed(2)}</span>
                        <button className="btn-sens-step" onClick={(e) => handleStepX(e, 0.05)} title="Increase X sensitivity">&gt;</button>
                      </div>
                    ) : (
                      <span className="sens-val-text">{sensX.toFixed(2)}</span>
                    )}
                  </div>

                  {/* Central Key Button (Red Ring matching screenshot) */}
                  <div 
                    className={`pan-key-badge ${isKeyActive(ctrl.keyStartStop) ? 'active' : ''}`}
                    onClick={(e) => {
                      if (isEditorOpen && onOpenPanSettings) {
                        e.stopPropagation();
                        onOpenPanSettings(ctrl);
                      }
                    }}
                    title="Click or press Ctrl to toggle Aim mode (Settings in editor)"
                  >
                    <div className="pan-red-ring">
                      <span className="pan-key-text">{ctrl.keyStartStop || 'Ctrl'}</span>
                    </div>
                  </div>

                  {/* Y Sensitivity Stepper */}
                  <div className="sens-stepper-col">
                    {isEditorOpen ? (
                      <div className="sens-mini-controls">
                        <button className="btn-sens-step" onClick={(e) => handleStepY(e, -0.05)} title="Decrease Y sensitivity">&lt;</button>
                        <span className="sens-val-text">{sensY.toFixed(2)}</span>
                        <button className="btn-sens-step" onClick={(e) => handleStepY(e, 0.05)} title="Increase Y sensitivity">&gt;</button>
                      </div>
                    ) : (
                      <span className="sens-val-text">{sensY.toFixed(2)}</span>
                    )}
                    <span className="sens-axis-label">Y</span>
                  </div>

                  {/* Gear Settings Button in Editor */}
                  {isEditorOpen && (
                    <button 
                      className="btn-pan-gear" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenPanSettings) onOpenPanSettings(ctrl);
                      }}
                      title="Aim, Pan & Shoot Advanced Settings"
                    >
                      ⚙️
                    </button>
                  )}
                </div>
                {isEditorOpen && <span className="ctrl-tag">Aim &amp; Pan</span>}
              </div>

              {/* Fire Button (LButton) if enabled */}
              {ctrl.isShootOnClickEnabled && (
                <div
                  className={`overlay-lbutton ${isEditorOpen ? 'draggable' : ''}`}
                  style={{
                    left: `${ctrl.lButtonX !== undefined ? ctrl.lButtonX : 84.94}%`,
                    top: `${ctrl.lButtonY !== undefined ? ctrl.lButtonY : 73.44}%`,
                    transform: `translate(-50%, -50%) scale(${scale / 100})`,
                  }}
                  onMouseDown={(e) => {
                    if (isEditorOpen) {
                      e.stopPropagation();
                      // Drag fire button position
                      setDraggingId('fire_' + ctrl.id);
                      const rect = containerRef.current.getBoundingClientRect();
                      const curX = ((ctrl.lButtonX || 84.94) / 100) * rect.width;
                      const curY = ((ctrl.lButtonY || 73.44) / 100) * rect.height;
                      setDragOffset({
                        x: e.clientX - (rect.left + curX),
                        y: e.clientY - (rect.top + curY),
                      });
                    }
                  }}
                  title="Fire weapon / Left Click"
                >
                  <div className={`lbutton-circle ${isKeyActive('mouselbutton') ? 'active' : ''}`}>
                    <Crosshair size={18} color="var(--md-sys-color-primary)" />
                  </div>
                  <span className="lbutton-label">Fire (L-Click)</span>
                </div>
              )}
            </React.Fragment>
          );
        }

        // Render Tap Spot, TapRepeat, Script, FreeLook, Swipe
        return (
          <div
            key={ctrl.id}
            className={`overlay-key-badge ${ctrl.type.toLowerCase()} ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''} ${isEditorOpen ? 'draggable' : ''}`}
            style={{
              left: `${ctrl.x}%`,
              top: `${ctrl.y}%`,
              transform: `translate(-50%, -50%) scale(${scale / 100})`,
            }}
            onMouseDown={(e) => handleMouseDown(e, ctrl)}
          >
            <div className="key-pill">
              {ctrl.type === 'Script' && <Code size={11} className="badge-icon" />}
              {ctrl.type === 'TapRepeat' && <Zap size={11} className="badge-icon" />}
              <span className="key-text">{formatKeyName(ctrl.key) || '?'}</span>
            </div>
            {isEditorOpen && <span className="ctrl-type-label">{ctrl.type}</span>}
          </div>
        );
      })}
    </div>
  );
}
