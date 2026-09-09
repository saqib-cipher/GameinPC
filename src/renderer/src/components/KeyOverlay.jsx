import React, { useState, useRef } from 'react';
import { Crosshair, Move, MousePointer, Zap, Code, ArrowUp, RotateCw, ZoomIn, Settings } from 'lucide-react';

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

  const handleAreaMouseDown = (e, ctrl, handleType = 'box') => {
    if (!isEditorOpen) return;
    e.stopPropagation();
    onSelectControl(ctrl.id);

    const rect = containerRef.current.getBoundingClientRect();
    setDraggingId(`area_${handleType}_${ctrl.id}`);
    setDragOffset({
      mouseX: e.clientX - rect.left,
      mouseY: e.clientY - rect.top,
      initialLeft: ctrl.areaLeft !== undefined ? ctrl.areaLeft : 52.0,
      initialRight: ctrl.areaRight !== undefined ? ctrl.areaRight : 98.0,
      initialTop: ctrl.areaTop !== undefined ? ctrl.areaTop : 10.0,
      initialBottom: ctrl.areaBottom !== undefined ? ctrl.areaBottom : 90.0,
    });
  };

  const handleMouseMove = (e) => {
    if (!draggingId || !isEditorOpen) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Handle Area Bounding Box / Resize Handles Dragging
    if (draggingId.startsWith('area_')) {
      const parts = draggingId.split('_'); // ['area', handleType, ...ctrlIdParts]
      const handleType = parts[1];
      const ctrlId = parts.slice(2).join('_');
      
      const currentMouseX = e.clientX - rect.left;
      const currentMouseY = e.clientY - rect.top;

      const deltaPercentX = ((currentMouseX - dragOffset.mouseX) / rect.width) * 100;
      const deltaPercentY = ((currentMouseY - dragOffset.mouseY) / rect.height) * 100;

      let newLeft = dragOffset.initialLeft;
      let newRight = dragOffset.initialRight;
      let newTop = dragOffset.initialTop;
      let newBottom = dragOffset.initialBottom;

      if (handleType === 'box') {
        const areaWidth = newRight - newLeft;
        const areaHeight = newBottom - newTop;

        newLeft = Math.max(0, Math.min(100 - areaWidth, dragOffset.initialLeft + deltaPercentX));
        newRight = newLeft + areaWidth;
        newTop = Math.max(0, Math.min(100 - areaHeight, dragOffset.initialTop + deltaPercentY));
        newBottom = newTop + areaHeight;
      } else if (handleType === 'tl') {
        newLeft = Math.max(0, Math.min(newRight - 5, dragOffset.initialLeft + deltaPercentX));
        newTop = Math.max(0, Math.min(newBottom - 5, dragOffset.initialTop + deltaPercentY));
      } else if (handleType === 'tr') {
        newRight = Math.max(newLeft + 5, Math.min(100, dragOffset.initialRight + deltaPercentX));
        newTop = Math.max(0, Math.min(newBottom - 5, dragOffset.initialTop + deltaPercentY));
      } else if (handleType === 'bl') {
        newLeft = Math.max(0, Math.min(newRight - 5, dragOffset.initialLeft + deltaPercentX));
        newBottom = Math.max(newTop + 5, Math.min(100, dragOffset.initialBottom + deltaPercentY));
      } else if (handleType === 'br') {
        newRight = Math.max(newLeft + 5, Math.min(100, dragOffset.initialRight + deltaPercentX));
        newBottom = Math.max(newTop + 5, Math.min(100, dragOffset.initialBottom + deltaPercentY));
      } else if (handleType === 'l') {
        newLeft = Math.max(0, Math.min(newRight - 5, dragOffset.initialLeft + deltaPercentX));
      } else if (handleType === 'r') {
        newRight = Math.max(newLeft + 5, Math.min(100, dragOffset.initialRight + deltaPercentX));
      }

      if (onUpdateControl) {
        onUpdateControl(ctrlId, {
          areaLeft: parseFloat(newLeft.toFixed(1)),
          areaRight: parseFloat(newRight.toFixed(1)),
          areaTop: parseFloat(newTop.toFixed(1)),
          areaBottom: parseFloat(newBottom.toFixed(1)),
          areaPreset: 'custom',
        });
      }
      return;
    }

    // Handle Fire button dragging
    if (draggingId.startsWith('fire_')) {
      const parentId = draggingId.replace('fire_', '');
      const currentX = e.clientX - rect.left - dragOffset.x;
      const currentY = e.clientY - rect.top - dragOffset.y;
      let percentX = Math.max(1, Math.min(99, (currentX / rect.width) * 100));
      let percentY = Math.max(1, Math.min(99, (currentY / rect.height) * 100));

      if (onUpdateControl) {
        onUpdateControl(parentId, { lButtonX: percentX, lButtonY: percentY });
      }
      return;
    }

    // Handle Normal Control node dragging
    const currentX = e.clientX - rect.left - dragOffset.x;
    const currentY = e.clientY - rect.top - dragOffset.y;
    let percentX = Math.max(1, Math.min(99, (currentX / rect.width) * 100));
    let percentY = Math.max(1, Math.min(99, (currentY / rect.height) * 100));

    onUpdateControlPosition(draggingId, percentX, percentY);
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

          const aLeft = ctrl.areaLeft !== undefined ? ctrl.areaLeft : 52.0;
          const aRight = ctrl.areaRight !== undefined ? ctrl.areaRight : 98.0;
          const aTop = ctrl.areaTop !== undefined ? ctrl.areaTop : 10.0;
          const aBottom = ctrl.areaBottom !== undefined ? ctrl.areaBottom : 90.0;

          const handleStepX = (e, delta) => {
            e.stopPropagation();
            const newVal = Math.max(0.05, Math.min(20.0, parseFloat((sensX + delta).toFixed(2))));
            if (onUpdateControl) {
              onUpdateControl(ctrl.id, { mouseSensitivityX: newVal, sensitivity: newVal });
            }
          };

          const handleStepY = (e, delta) => {
            e.stopPropagation();
            const newVal = Math.max(0.05, Math.min(20.0, parseFloat((sensY + delta).toFixed(2))));
            if (onUpdateControl) {
              onUpdateControl(ctrl.id, { mouseSensitivityY: newVal, sensitivityRatioY: newVal });
            }
          };

          return (
            <React.Fragment key={ctrl.id}>
              {/* Look-around Area (Aim Camera Zone) Bounded Box in Editor Mode */}
              {isEditorOpen && (
                <div
                  className={`lookaround-area-box ${isSelected ? 'active-zone' : ''}`}
                  style={{
                    left: `${aLeft}%`,
                    top: `${aTop}%`,
                    width: `${Math.max(5, aRight - aLeft)}%`,
                    height: `${Math.max(5, aBottom - aTop)}%`,
                  }}
                  onMouseDown={(e) => handleAreaMouseDown(e, ctrl, 'box')}
                >
                  <div className="area-header-badge">
                    <Crosshair size={11} />
                    <span>Look-around Area ({Math.round(aRight - aLeft)}% width)</span>
                  </div>

                  {/* Corner & Border Resize Handles */}
                  <div className="area-resize-handle handle-tl" onMouseDown={(e) => handleAreaMouseDown(e, ctrl, 'tl')} title="Resize top-left" />
                  <div className="area-resize-handle handle-tr" onMouseDown={(e) => handleAreaMouseDown(e, ctrl, 'tr')} title="Resize top-right" />
                  <div className="area-resize-handle handle-bl" onMouseDown={(e) => handleAreaMouseDown(e, ctrl, 'bl')} title="Resize bottom-left" />
                  <div className="area-resize-handle handle-br" onMouseDown={(e) => handleAreaMouseDown(e, ctrl, 'br')} title="Resize bottom-right" />
                  <div className="area-resize-handle handle-l" onMouseDown={(e) => handleAreaMouseDown(e, ctrl, 'l')} title="Resize left border" />
                  <div className="area-resize-handle handle-r" onMouseDown={(e) => handleAreaMouseDown(e, ctrl, 'r')} title="Resize right border" />
                </div>
              )}

              {/* Pan Reticle / Toggle Key Indicator */}
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

                  {/* Central Key Button (Red Ring matching MSI App Player) */}
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
                      title="Aim, Pan & Sensitivity Settings"
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
