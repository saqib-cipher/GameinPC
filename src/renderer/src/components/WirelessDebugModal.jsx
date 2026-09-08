import React, { useState } from 'react';
import { Wifi, X, Smartphone, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Terminal, Unplug } from 'lucide-react';

export default function WirelessDebugModal({
  isOpen,
  onClose,
  selectedDevice,
  onDeviceConnected,
}) {
  const [activeTab, setActiveTab] = useState('pair'); // 'pair' | 'connect' | 'switch'
  
  // Pair state
  const [pairIp, setPairIp] = useState('192.168.1.');
  const [pairPort, setPairPort] = useState('');
  const [pairCode, setPairCode] = useState('');
  
  // Connect state
  const [connectIp, setConnectIp] = useState('192.168.1.');
  const [connectPort, setConnectPort] = useState('5555');

  // Status & logs
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState('info'); // 'info' | 'success' | 'error'

  if (!isOpen) return null;

  const handlePair = async () => {
    if (!pairIp || !pairPort || !pairCode) {
      setStatusType('error');
      setStatusMessage('Please enter IP Address, Port, and 6-digit Pairing Code');
      return;
    }

    setIsLoading(true);
    setStatusType('info');
    setStatusMessage(`Pairing with ${pairIp}:${pairPort}...`);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.pairWireless({
          ip: pairIp,
          port: pairPort,
          code: pairCode,
        });

        if (result.success) {
          setStatusType('success');
          setStatusMessage(result.message || 'Device paired successfully! Connecting...');
          
          // Next, connect to the device's main wireless debugging port
          await window.electronAPI.connectWireless({ ip: pairIp, port: pairPort });
          if (onDeviceConnected) onDeviceConnected();
        } else {
          setStatusType('error');
          setStatusMessage(result.message || 'Failed to pair with device. Check IP/Port/Code.');
        }
      }
    } catch (err) {
      setStatusType('error');
      setStatusMessage(err.message || 'Error executing pair command');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectConnect = async () => {
    if (!connectIp) {
      setStatusType('error');
      setStatusMessage('Please enter device IP Address');
      return;
    }

    setIsLoading(true);
    setStatusType('info');
    setStatusMessage(`Connecting to ${connectIp}:${connectPort}...`);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.connectWireless({
          ip: connectIp,
          port: connectPort || 5555,
        });

        if (result.success) {
          setStatusType('success');
          setStatusMessage(`Connected to ${connectIp}:${connectPort} successfully!`);
          if (onDeviceConnected) onDeviceConnected();
        } else {
          setStatusType('error');
          setStatusMessage(result.message || 'Could not connect. Ensure Wireless Debugging or TCP/IP is enabled on phone.');
        }
      }
    } catch (err) {
      setStatusType('error');
      setStatusMessage(err.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsbToWifiSwitch = async () => {
    if (!selectedDevice || selectedDevice.isWireless) {
      setStatusType('error');
      setStatusMessage('Please select a USB connected device first to switch it to WiFi mode.');
      return;
    }

    setIsLoading(true);
    setStatusType('info');
    setStatusMessage(`Enabling TCP/IP 5555 on ${selectedDevice.model}...`);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.enableTcpip({
          serial: selectedDevice.serial,
          port: 5555,
        });

        if (result.success) {
          setStatusType('success');
          setStatusMessage(result.message || 'Switched to wireless mode! You can now unplug the USB cable.');
          if (onDeviceConnected) onDeviceConnected();
        } else {
          setStatusType('error');
          setStatusMessage(result.message || 'Failed to switch to WiFi mode.');
        }
      }
    } catch (err) {
      setStatusType('error');
      setStatusMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog glass-panel">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-circle">
              <Wifi size={20} color="var(--md-sys-color-primary)" />
            </div>
            <div>
              <h3>Wireless Debugging Manager</h3>
              <p className="modal-subtitle">Control and mirror Android device over high-speed Wi-Fi with zero cables</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="modal-nav-tabs">
          <button 
            className={`modal-tab ${activeTab === 'pair' ? 'active' : ''}`}
            onClick={() => setActiveTab('pair')}
          >
            <span>Android 11+ Pairing</span>
          </button>
          <button 
            className={`modal-tab ${activeTab === 'connect' ? 'active' : ''}`}
            onClick={() => setActiveTab('connect')}
          >
            <span>Direct IP Connect</span>
          </button>
          <button 
            className={`modal-tab ${activeTab === 'switch' ? 'active' : ''}`}
            onClick={() => setActiveTab('switch')}
          >
            <span>1-Click USB to WiFi</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {activeTab === 'pair' && (
            <div className="tab-content">
              <div className="guide-callout">
                <p>On your phone: Open <b>Settings &rarr; Developer options &rarr; Wireless debugging &rarr; Pair device with pairing code</b>.</p>
              </div>

              <div className="form-group-row">
                <div className="form-field flex-2">
                  <label>Phone IP Address</label>
                  <input 
                    type="text" 
                    placeholder="192.168.1.100" 
                    value={pairIp} 
                    onChange={(e) => setPairIp(e.target.value)} 
                  />
                </div>
                <div className="form-field flex-1">
                  <label>Pairing Port</label>
                  <input 
                    type="text" 
                    placeholder="37841" 
                    value={pairPort} 
                    onChange={(e) => setPairPort(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-field">
                <label>6-Digit Pairing Code</label>
                <input 
                  type="text" 
                  placeholder="849201" 
                  className="code-input"
                  maxLength={6}
                  value={pairCode} 
                  onChange={(e) => setPairCode(e.target.value)} 
                />
              </div>

              <button className="btn btn-primary btn-full btn-lg" onClick={handlePair} disabled={isLoading}>
                {isLoading ? <RefreshCw size={16} className="spin" /> : <Wifi size={16} />}
                <span>{isLoading ? 'Pairing Device...' : 'Pair & Connect Wireless Device'}</span>
              </button>
            </div>
          )}

          {activeTab === 'connect' && (
            <div className="tab-content">
              <div className="guide-callout">
                <p>Connect directly to a phone that already has Wireless Debugging or TCP/IP port 5555 active on your local Wi-Fi network.</p>
              </div>

              <div className="form-group-row">
                <div className="form-field flex-2">
                  <label>Phone IP Address</label>
                  <input 
                    type="text" 
                    placeholder="192.168.1.100" 
                    value={connectIp} 
                    onChange={(e) => setConnectIp(e.target.value)} 
                  />
                </div>
                <div className="form-field flex-1">
                  <label>Port (Default 5555)</label>
                  <input 
                    type="text" 
                    placeholder="5555" 
                    value={connectPort} 
                    onChange={(e) => setConnectPort(e.target.value)} 
                  />
                </div>
              </div>

              <button className="btn btn-primary btn-full btn-lg" onClick={handleDirectConnect} disabled={isLoading}>
                {isLoading ? <RefreshCw size={16} className="spin" /> : <ArrowRight size={16} />}
                <span>{isLoading ? 'Connecting...' : 'Connect to Wireless Device'}</span>
              </button>
            </div>
          )}

          {activeTab === 'switch' && (
            <div className="tab-content">
              <div className="guide-callout">
                <p>Have your phone plugged in via USB right now? Click the button below to automatically switch to Wireless mode and unplug your cable!</p>
              </div>

              <div className="device-switch-card">
                <div className="switch-icon-row">
                  <Smartphone size={24} color="var(--md-sys-color-primary)" />
                  <ArrowRight size={20} color="var(--md-sys-color-on-surface-variant)" />
                  <Wifi size={24} color="var(--md-sys-color-success)" />
                </div>
                <p className="switch-label">
                  Target Device: <b>{selectedDevice ? selectedDevice.model : 'No USB Device Selected'}</b>
                </p>
              </div>

              <button 
                className="btn btn-primary btn-full btn-lg" 
                onClick={handleUsbToWifiSwitch} 
                disabled={isLoading || !selectedDevice || selectedDevice.isWireless}
              >
                {isLoading ? <RefreshCw size={16} className="spin" /> : <Unplug size={16} />}
                <span>{isLoading ? 'Switching to Wireless...' : 'Enable WiFi Mode & Unplug Cable'}</span>
              </button>
            </div>
          )}

          {/* Status Message Display */}
          {statusMessage && (
            <div className={`status-banner status-${statusType}`}>
              {statusType === 'success' ? (
                <CheckCircle2 size={16} color="var(--md-sys-color-success)" />
              ) : statusType === 'error' ? (
                <AlertCircle size={16} color="var(--md-sys-color-tertiary)" />
              ) : (
                <Terminal size={16} color="var(--md-sys-color-primary)" />
              )}
              <span className="status-text">{statusMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
