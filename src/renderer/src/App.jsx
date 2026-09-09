import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import ScreenMirror from './components/ScreenMirror';
import ControlsEditor from './components/ControlsEditor';
import PanSettingsModal from './components/PanSettingsModal';
import WirelessDebugModal from './components/WirelessDebugModal';
import SettingsModal from './components/SettingsModal';
import './styles/theme.css';
import './styles/app.css';

export default function App() {
  // Device state
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceDetails, setDeviceDetails] = useState(null);

  // Input & Mode state
  const [inputMode, setInputMode] = useState('keyboard'); // 'keyboard' | 'gamepad'
  const [isShootingMode, setIsShootingMode] = useState(false);

  // Schemes & Keymapping state
  const [schemes, setSchemes] = useState([]);
  const [activeSchemeId, setActiveSchemeId] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedControlId, setSelectedControlId] = useState(null);
  const [panSettingsControl, setPanSettingsControl] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [opacity, setOpacity] = useState(85);
  const [scale, setScale] = useState(100);

  // Mirror & Stream state
  const [isMirrorRunning, setIsMirrorRunning] = useState(false);
  const [isScreenOff, setIsScreenOff] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Settings & Modals state
  const [settings, setSettings] = useState({
    bitrate: 8,
    maxFps: 60,
    maxSize: 0,
    stayAwake: true,
    turnScreenOff: false,
    renderDriver: 'direct3d11',
    audioMirror: true,
    lowLatencyMode: true,
    customCrosshair: true,
    crosshairColor: '#00E5FF',
  });
  const [isWirelessModalOpen, setIsWirelessModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [foregroundPackage, setForegroundPackage] = useState('');

  // 1. Initial Load: Schemes & Settings
  useEffect(() => {
    async function init() {
      if (window.electronAPI) {
        try {
          const loadedSchemes = await window.electronAPI.loadSchemes();
          if (loadedSchemes && loadedSchemes.length > 0) {
            setSchemes(loadedSchemes);
            const active = loadedSchemes.find(s => s.selected) || loadedSchemes[0];
            setActiveSchemeId(active.id);
            await window.electronAPI.setActiveScheme(active);
          }

          const loadedSettings = await window.electronAPI.loadSettings();
          if (loadedSettings) {
            setSettings(loadedSettings);
            if (loadedSettings.keyOverlayOpacity) setOpacity(loadedSettings.keyOverlayOpacity);
            if (loadedSettings.keyOverlayScale) setScale(loadedSettings.keyOverlayScale);
            if (loadedSettings.audioMirror !== undefined) setIsAudioEnabled(loadedSettings.audioMirror);
            if (loadedSettings.turnScreenOff !== undefined) setIsScreenOff(loadedSettings.turnScreenOff);
          }

          // Listen for mirror status changes
          window.electronAPI.onMirrorStatusChanged((running) => {
            setIsMirrorRunning(running);
          });
        } catch (err) {
          console.error('Initialization error:', err);
        }
      }
    }
    init();
  }, []);

  // 2. Poll for connected USB and Wireless devices
  const refreshDevices = async () => {
    if (window.electronAPI) {
      try {
        const devList = await window.electronAPI.getDevices();
        setDevices(devList || []);

        if (devList && devList.length > 0) {
          // Keep current selection if still available, or auto-select first
          const currentExists = selectedDevice && devList.find(d => d.serial === selectedDevice.serial);
          if (!currentExists) {
            const firstDev = devList[0];
            setSelectedDevice(firstDev);
            window.electronAPI.setActiveDevice(firstDev);
            loadDeviceDetails(firstDev.serial);
          }
        } else {
          setSelectedDevice(null);
          setDeviceDetails(null);
          setForegroundPackage('');
        }
      } catch (err) {
        console.error('Error polling devices:', err);
      }
    }
  };

  useEffect(() => {
    refreshDevices();
    const timer = setInterval(refreshDevices, 3000);
    return () => clearInterval(timer);
  }, [selectedDevice]);

  // 3. Auto-Detect Active Game by Package Name
  useEffect(() => {
    if (!selectedDevice || !window.electronAPI?.getForegroundApp) return;

    let isMounted = true;
    const checkForeground = async () => {
      try {
        const pkg = await window.electronAPI.getForegroundApp(selectedDevice.serial);
        if (isMounted && pkg && pkg !== foregroundPackage) {
          setForegroundPackage(pkg);

          // Find matching keymap scheme for this game
          const matched = schemes.find(s => {
            const sName = (s.name || '').toLowerCase();
            const sPkg = (s.packageName || '').toLowerCase();
            const p = pkg.toLowerCase();

            if (sPkg && p.includes(sPkg)) return true;
            if (p.includes('dts.freefire') || p.includes('freefire')) {
              return sName.includes('freefire') || sName.includes('free fire') || sName.includes('cipher');
            }
            if (p.includes('pubg') || p.includes('imobile') || p.includes('ig')) {
              return sName.includes('pubg') || sName.includes('bgmi');
            }
            if (p.includes('callofduty') || p.includes('activision')) {
              return sName.includes('cod') || sName.includes('call of duty');
            }
            return sPkg === p || sName.includes(p);
          });

          if (matched) {
            setActiveSchemeId(matched.id);
            if (window.electronAPI) {
              window.electronAPI.setActiveScheme(matched);
            }
          }
        }
      } catch (err) {
        // Ignore polling errors
      }
    };

    checkForeground();
    const interval = setInterval(checkForeground, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedDevice, foregroundPackage, schemes]);

  const loadDeviceDetails = async (serial) => {
    if (window.electronAPI && serial) {
      try {
        const details = await window.electronAPI.getDeviceDetails(serial);
        setDeviceDetails(details);
      } catch (err) {
        console.error('Error getting device details:', err);
      }
    }
  };

  const handleSelectDevice = (dev) => {
    setSelectedDevice(dev);
    if (window.electronAPI) {
      window.electronAPI.setActiveDevice(dev);
    }
    loadDeviceDetails(dev.serial);
  };

  // 4. Scheme Operations
  const activeScheme = schemes.find(s => s.id === activeSchemeId) || schemes[0];

  const handleSelectScheme = (schemeId) => {
    setActiveSchemeId(schemeId);
    const selected = schemes.find(s => s.id === schemeId);
    if (selected && window.electronAPI) {
      window.electronAPI.setActiveScheme(selected);
    }
  };

  const handleImportCfg = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.importCfgDialog();
      if (result.success && result.schemes && result.schemes.length > 0) {
        const updated = [...result.schemes, ...schemes];
        setSchemes(updated);
        setActiveSchemeId(result.schemes[0].id);
        window.electronAPI.saveSchemes(updated);
        window.electronAPI.setActiveScheme(result.schemes[0]);
      }
    }
  };

  const handleExportCfg = async () => {
    if (window.electronAPI && activeScheme) {
      await window.electronAPI.exportCfgDialog(activeScheme);
    }
  };

  const handleCloneScheme = () => {
    if (!activeScheme) return;
    const cloned = {
      ...activeScheme,
      id: 'scheme_' + Date.now().toString(36),
      name: `${activeScheme.name} (Copy)`,
      gameControls: JSON.parse(JSON.stringify(activeScheme.gameControls)),
    };
    const updated = [...schemes, cloned];
    setSchemes(updated);
    setActiveSchemeId(cloned.id);
    if (window.electronAPI) {
      window.electronAPI.saveSchemes(updated);
      window.electronAPI.setActiveScheme(cloned);
    }
  };

  const handleDeleteScheme = () => {
    if (schemes.length <= 1) return;
    const updated = schemes.filter(s => s.id !== activeSchemeId);
    setSchemes(updated);
    setActiveSchemeId(updated[0].id);
    if (window.electronAPI) {
      window.electronAPI.saveSchemes(updated);
      window.electronAPI.setActiveScheme(updated[0]);
    }
  };

  const handleNewScheme = () => {
    const newScheme = {
      id: 'scheme_' + Date.now().toString(36),
      name: `Custom Scheme ${schemes.length + 1}`,
      selected: true,
      keyboardLayout: 'United States',
      gameControls: [],
    };
    const updated = [...schemes, newScheme];
    setSchemes(updated);
    setActiveSchemeId(newScheme.id);
    setIsEditorOpen(true);
    if (window.electronAPI) {
      window.electronAPI.saveSchemes(updated);
      window.electronAPI.setActiveScheme(newScheme);
    }
  };

  // 4. Keymap Controls Editing
  const handleAddControl = (newCtrl) => {
    if (!activeScheme) return;
    const updatedScheme = {
      ...activeScheme,
      gameControls: [...activeScheme.gameControls, newCtrl],
    };
    const updatedSchemes = schemes.map(s => s.id === activeScheme.id ? updatedScheme : s);
    setSchemes(updatedSchemes);
    if (window.electronAPI) {
      window.electronAPI.setActiveScheme(updatedScheme);
    }
  };

  const handleUpdateControl = (ctrlId, fields) => {
    if (!activeScheme) return;
    const updatedControls = activeScheme.gameControls.map(c => 
      c.id === ctrlId ? { ...c, ...fields } : c
    );
    const updatedScheme = { ...activeScheme, gameControls: updatedControls };
    const updatedSchemes = schemes.map(s => s.id === activeScheme.id ? updatedScheme : s);
    setSchemes(updatedSchemes);
    if (window.electronAPI) {
      window.electronAPI.setActiveScheme(updatedScheme);
    }
  };

  const handleUpdateControlPosition = (ctrlId, x, y) => {
    handleUpdateControl(ctrlId, { x, y });
  };

  const handleDeleteControl = (ctrlId) => {
    if (!activeScheme) return;
    const updatedControls = activeScheme.gameControls.filter(c => c.id !== ctrlId);
    const updatedScheme = { ...activeScheme, gameControls: updatedControls };
    const updatedSchemes = schemes.map(s => s.id === activeScheme.id ? updatedScheme : s);
    setSchemes(updatedSchemes);
    setSelectedControlId(null);
    if (window.electronAPI) {
      window.electronAPI.setActiveScheme(updatedScheme);
    }
  };

  // Snapshot state for In-Game Screen Keymapping
  const [snapshotUrl, setSnapshotUrl] = useState(null);
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);

  const handleCaptureSnapshot = async () => {
    if (!selectedDevice || !window.electronAPI?.captureScreenshot) return;
    setIsCapturingSnapshot(true);
    try {
      const dataUrl = await window.electronAPI.captureScreenshot(selectedDevice.serial);
      if (dataUrl) {
        setSnapshotUrl(dataUrl);
      }
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  const handleToggleEditor = async () => {
    const nextState = !isEditorOpen;
    setIsEditorOpen(nextState);
    if (nextState && !snapshotUrl && selectedDevice) {
      handleCaptureSnapshot();
    }
  };

  const handleOpenEditor = async () => {
    setIsEditorOpen(true);
    if (!snapshotUrl && selectedDevice) {
      handleCaptureSnapshot();
    }
  };

  const handleSaveScheme = () => {
    if (window.electronAPI) {
      window.electronAPI.saveSchemes(schemes);
    }
  };

  const handleResetScheme = async () => {
    if (window.electronAPI) {
      const defaults = await window.electronAPI.loadSchemes();
      setSchemes(defaults);
      const active = defaults.find(s => s.id === activeSchemeId) || defaults[0];
      setActiveSchemeId(active.id);
      window.electronAPI.setActiveScheme(active);
    }
  };

  // 5. Mirror Execution
  const handleToggleMirror = async () => {
    if (!window.electronAPI) return;

    if (isMirrorRunning) {
      await window.electronAPI.stopMirror();
      setIsMirrorRunning(false);
    } else {
      if (!selectedDevice) {
        setIsWirelessModalOpen(true);
        return;
      }
      const res = await window.electronAPI.startMirror({
        serial: selectedDevice.serial,
        settings: {
          ...settings,
          turnScreenOff: isScreenOff,
          audioMirror: isAudioEnabled,
        }
      });
      if (res.success) {
        setIsMirrorRunning(true);
      }
    }
  };

  const handleToggleScreenOff = async () => {
    const next = !isScreenOff;
    setIsScreenOff(next);
    if (window.electronAPI?.setScreenOff) {
      await window.electronAPI.setScreenOff(next);
    }
  };

  const handleToggleAudio = async () => {
    const next = !isAudioEnabled;
    setIsAudioEnabled(next);
    if (window.electronAPI?.setAudioEnabled) {
      await window.electronAPI.setAudioEnabled(next);
    }
  };

  // 6. Settings Save
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    if (newSettings.turnScreenOff !== undefined) setIsScreenOff(newSettings.turnScreenOff);
    if (newSettings.audioMirror !== undefined) setIsAudioEnabled(newSettings.audioMirror);
    if (window.electronAPI) {
      window.electronAPI.saveSettings(newSettings);
      if (window.electronAPI.setScreenOff && isMirrorRunning) {
        window.electronAPI.setScreenOff(newSettings.turnScreenOff);
      }
      if (window.electronAPI.setAudioEnabled && isMirrorRunning) {
        window.electronAPI.setAudioEnabled(newSettings.audioMirror);
      }
    }
  };

  // Window Controls
  const handleMinimize = () => window.electronAPI?.minimizeWindow();
  const handleMaximize = () => window.electronAPI?.maximizeWindow();
  const handleClose = () => window.electronAPI?.closeWindow();
  const handleToggleFullscreen = () => window.electronAPI?.toggleFullscreen();

  const isGameDetected = Boolean(
    foregroundPackage && (
      foregroundPackage.includes('freefire') ||
      foregroundPackage.includes('dts') ||
      foregroundPackage.includes('pubg') ||
      foregroundPackage.includes('imobile') ||
      foregroundPackage.includes('callofduty') ||
      foregroundPackage.includes('activision') ||
      foregroundPackage.includes('shooter') ||
      schemes.some(s => s.packageName && s.packageName.toLowerCase() === foregroundPackage.toLowerCase())
    )
  );

  const shouldDisplayOverlay = Boolean(
    isEditorOpen || (
      isMirrorRunning && (
        (showOverlay && (isGameDetected || !foregroundPackage)) || isShootingMode
      )
    )
  );

  return (
    <div className="app-container">
      {/* Top Bar HUD */}
      <TopBar
        devices={devices}
        selectedDevice={selectedDevice}
        onSelectDevice={handleSelectDevice}
        onRefreshDevices={refreshDevices}
        inputMode={inputMode}
        onChangeInputMode={setInputMode}
        schemes={schemes}
        activeSchemeId={activeSchemeId}
        onSelectScheme={handleSelectScheme}
        onImportCfg={handleImportCfg}
        onExportCfg={handleExportCfg}
        onCloneScheme={handleCloneScheme}
        onDeleteScheme={handleDeleteScheme}
        onNewScheme={handleNewScheme}
        isMirrorRunning={isMirrorRunning}
        onToggleMirror={handleToggleMirror}
        isScreenOff={isScreenOff}
        onToggleScreenOff={handleToggleScreenOff}
        isAudioEnabled={isAudioEnabled}
        onToggleAudio={handleToggleAudio}
        showOverlay={showOverlay}
        onToggleOverlay={() => setShowOverlay(!showOverlay)}
        isEditorOpen={isEditorOpen}
        onToggleEditor={handleToggleEditor}
        onOpenWirelessModal={() => setIsWirelessModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onToggleFullscreen={handleToggleFullscreen}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
        foregroundPackage={foregroundPackage}
        isGameDetected={isGameDetected}
      />

      {/* Main Workspace Area */}
      <div className="main-content-layout">
        {/* Screen Mirror & Interactive Keymap Canvas */}
        <ScreenMirror
          isMirrorRunning={isMirrorRunning}
          selectedDevice={selectedDevice}
          deviceDetails={deviceDetails}
          onStartMirror={handleToggleMirror}
          onOpenWirelessModal={() => setIsWirelessModalOpen(true)}
          onOpenEditor={handleOpenEditor}
          onImportCfg={handleImportCfg}
          scheme={activeScheme}
          isEditorOpen={isEditorOpen}
          selectedControlId={selectedControlId}
          onSelectControl={setSelectedControlId}
          onUpdateControlPosition={handleUpdateControlPosition}
          onUpdateControl={handleUpdateControl}
          onOpenPanSettings={(ctrl) => setPanSettingsControl(ctrl)}
          opacity={opacity}
          scale={scale}
          showOverlay={shouldDisplayOverlay}
          isShootingMode={isShootingMode}
          onToggleShootingMode={setIsShootingMode}
          settings={settings}
          snapshotUrl={snapshotUrl}
          isCapturingSnapshot={isCapturingSnapshot}
          onCaptureSnapshot={handleCaptureSnapshot}
          onClearSnapshot={() => setSnapshotUrl(null)}
          onUploadSnapshot={(url) => setSnapshotUrl(url)}
          foregroundPackage={foregroundPackage}
          isGameDetected={isGameDetected}
        />

        {/* Controls Editor Sidebar (Matching Screenshot 2) */}
        <ControlsEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          schemes={schemes}
          activeSchemeId={activeSchemeId}
          onSelectScheme={handleSelectScheme}
          onCloneScheme={handleCloneScheme}
          onDeleteScheme={handleDeleteScheme}
          onImportCfg={handleImportCfg}
          onExportCfg={handleExportCfg}
          onNewScheme={handleNewScheme}
          scheme={activeScheme}
          selectedControlId={selectedControlId}
          onSelectControl={setSelectedControlId}
          onAddControl={handleAddControl}
          onUpdateControl={handleUpdateControl}
          onDeleteControl={handleDeleteControl}
          onSaveScheme={handleSaveScheme}
          onResetScheme={handleResetScheme}
          opacity={opacity}
          onChangeOpacity={setOpacity}
          scale={scale}
          onChangeScale={setScale}
          snapshotUrl={snapshotUrl}
          isCapturingSnapshot={isCapturingSnapshot}
          onCaptureSnapshot={handleCaptureSnapshot}
          onClearSnapshot={() => setSnapshotUrl(null)}
          onUploadSnapshot={(url) => setSnapshotUrl(url)}
          onOpenPanSettings={(ctrl) => setPanSettingsControl(ctrl)}
        />
      </div>

      {/* Advanced Aim, Pan & Shoot Settings Modal (Matching Screenshot 3) */}
      <PanSettingsModal
        isOpen={Boolean(panSettingsControl)}
        onClose={() => setPanSettingsControl(null)}
        panControl={panSettingsControl}
        onUpdatePanControl={(fields) => {
          if (panSettingsControl) {
            handleUpdateControl(panSettingsControl.id, fields);
            setPanSettingsControl(prev => ({ ...prev, ...fields }));
          }
        }}
        onDeletePanControl={(id) => {
          handleDeleteControl(id);
          setPanSettingsControl(null);
        }}
      />

      {/* Modals */}
      <WirelessDebugModal
        isOpen={isWirelessModalOpen}
        onClose={() => setIsWirelessModalOpen(false)}
        selectedDevice={selectedDevice}
        onDeviceConnected={() => {
          refreshDevices();
          setIsWirelessModalOpen(false);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
