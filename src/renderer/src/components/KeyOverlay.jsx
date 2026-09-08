import React, { useState, useRef } from 'react';
import { Crosshair, Move, MousePointer, Zap, Code, ArrowUp, RotateCw, ZoomIn } from 'lucide-react';

export default function KeyOverlay({
  scheme,
  isEditorOpen,
  selectedControlId,
  onSelectControl,
  onUpdateControlPosition,
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
          return (
            <React.Fragment key={ctrl.id}>
              {/* Pan Reticle / Toggle Key Indicator */}
              <div
                className={`overlay-pan ${isSelected ? 'selected' : ''} ${isEditorOpen ? 'draggable' : ''}`}
                style={{
                  left: `${ctrl.x}%`,
                  top: `${ctrl.y}%`,
                  transform: `translate(-50%, -50%) scale(${scale / 100})`,
                }}
                onMouseDown={(e) => handleMouseDown(e, ctrl)}
              >
                <div className="pan-pill">
                  <span className="sens-label">X {(ctrl.sensitivity || 1.0).toFixed(2)}</span>
                  <div className={`pan-key ${isKeyActive(ctrl.keyStartStop) ? 'active' : ''}`}>
                    {ctrl.keyStartStop || 'Ctrl'}
                  </div>
                  <span className="sens-label">{(ctrl.sensitivityRatioY || 1.0).toFixed(2)} Y</span>
                </div>
                {isEditorOpen && <span className="ctrl-tag">Aim & Pan</span>}
              </div>

              {/* Fire Button (LButton) if enabled */}
              {ctrl.isShootOnClickEnabled && (
                <div
                  className="overlay-lbutton"
                  style={{
                    left: `${ctrl.lButtonX || 80}%`,
                    top: `${ctrl.lButtonY || 70}%`,
                    transform: `translate(-50%, -50%) scale(${scale / 100})`,
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
