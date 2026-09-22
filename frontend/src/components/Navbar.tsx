import React, { useState, useEffect } from 'react';
import {
  Shield,
  PlusCircle,
  RotateCcw,
  Radio,
  Volume2,
  VolumeX,
  Search,
  Clock,
  Cpu,
  Bot,
  Wrench,
  TrendingUp,
  CloudRain,
  User,
  Zap,
  Save,
  Activity,
  HardDrive
} from 'lucide-react';
import { DashboardData, UserRole } from '../types';

interface NavbarProps {
  data: DashboardData;
  isConnected: boolean;
  isAudioEnabled: boolean;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onToggleAudio: () => void;
  onOpenNewEmergency: () => void;
  onResetData: () => void;
  onOpenAICopilot: () => void;
  onOpenMaintenance: () => void;
  onOpenPredictive: () => void;
  onOpenSaveModal: () => void;
  onAutoAssignNext: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  data,
  isConnected,
  isAudioEnabled,
  currentRole,
  onSelectRole,
  searchQuery = '',
  onSearchChange,
  onToggleAudio,
  onOpenNewEmergency,
  onResetData,
  onOpenAICopilot,
  onOpenMaintenance,
  onOpenPredictive,
  onOpenSaveModal,
  onAutoAssignNext,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setCurrentTime(timeStr);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = data.emergencies.filter(
    (e) => e.status === 'PENDING_DISPATCH' || e.status === 'CREATED'
  ).length;

  const availableAmbulances = data.ambulances.filter(
    (a) => a.status === 'AVAILABLE'
  ).length;

  const activeDispatches = data.dispatches.filter(
    (d) => !['COMPLETED', 'CANCELLED'].includes(d.status)
  ).length;

  return (
    <header className="navbar">
      {/* Brand & Console Role Segmented Control */}
      <div className="navbar-brand">
        <div className="brand-logo">
          <Shield className="logo-icon" size={20} />
        </div>
        <div className="brand-text-block">
          <div className="brand-title">
            <span className="brand-primary">AEGIS</span>
            <span className="brand-secondary">DISPATCH</span>
            <span className="brand-version">PRO v2.5</span>
          </div>
          <div className="brand-subtitle">Tier-1 Tactical Emergency Command</div>
        </div>

        {/* Polished Segmented Role Switcher */}
        <div className="segmented-role-control" title="Switch Active Console Interface">
          <button
            className={`segmented-role-btn ${currentRole === 'DISPATCHER' ? 'active' : ''}`}
            onClick={() => onSelectRole('DISPATCHER')}
          >
            <Radio size={12} className={currentRole === 'DISPATCHER' ? 'text-sky' : 'text-muted'} />
            <span>Central CAD</span>
          </button>
          <button
            className={`segmented-role-btn ${currentRole === 'DRIVER' ? 'active' : ''}`}
            onClick={() => onSelectRole('DRIVER')}
          >
            <User size={12} className={currentRole === 'DRIVER' ? 'text-amber' : 'text-muted'} />
            <span>Driver MDT</span>
          </button>
          <button
            className={`segmented-role-btn ${currentRole === 'HOSPITAL' ? 'active' : ''}`}
            onClick={() => onSelectRole('HOSPITAL')}
          >
            <Activity size={12} className={currentRole === 'HOSPITAL' ? 'text-emerald' : 'text-muted'} />
            <span>Hospital ED</span>
          </button>
        </div>
      </div>

      {/* Center Operational Telemetry */}
      <div className="navbar-center-telemetry">
        {/* Real-time 24h Military Mission Clock */}
        <div className="ops-clock" title="Operational Mission Time (24H Local Zulu)">
          <Clock size={12} className="text-sky" />
          <span className="clock-label">OPS:</span>
          <span className="clock-time">{currentTime || '00:00:00'}</span>
        </div>

        {/* Live Weather Integration Badge */}
        <div className="weather-nav-badge" title="Bengaluru Metro Live Weather: 27°C Monsoon / Wet Roads (0.85x speed multiplier)">
          <CloudRain size={12} className="text-sky" />
          <span className="weather-val">27°C MONSOON · ROAD: WET</span>
        </div>

        {/* Global Tactical Search */}
        {onSearchChange && currentRole === 'DISPATCHER' && (
          <div className="nav-search">
            <Search size={13} className="nav-search-icon" />
            <input
              type="text"
              placeholder="Search incident, unit, road... (/)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        {/* Central CAD Stat Badges */}
        {currentRole === 'DISPATCHER' && (
          <div className="navbar-stats">
            <div className={`stat-badge ${pendingCount > 0 ? 'alert' : ''}`}>
              <span className="stat-label">Pending</span>
              <span className="stat-value">{pendingCount}</span>
            </div>
            <div className="stat-badge">
              <span className="stat-label">Fleet</span>
              <span className="stat-value text-emerald">{availableAmbulances}/{data.ambulances.length}</span>
            </div>
            <div className="stat-badge">
              <span className="stat-label">Missions</span>
              <span className="stat-value text-amber">{activeDispatches}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions Toolbar */}
      <div className="navbar-actions">
        {/* Quick Auto-Dispatch Next Button */}
        {pendingCount > 0 && currentRole === 'DISPATCHER' && (
          <button
            className="btn btn-xs btn-primary btn-quick-auto"
            onClick={onAutoAssignNext}
            title="Auto-dispatch nearest ambulance and hospital to highest priority incident"
          >
            <Zap size={13} />
            <span>⚡ Auto-Dispatch</span>
          </button>
        )}

        {/* Save to File Action Button */}
        <button
          className="btn btn-save-nav"
          onClick={onOpenSaveModal}
          title="Save all CAD incidents, dispatches, fleet telemetry and audit logs to persistent disk file"
        >
          <Save size={14} className="text-sky" />
          <span>Save to File</span>
          <span className="save-indicator-dot"></span>
        </button>

        {/* AI Copilot Launcher */}
        <button
          className="btn btn-outline btn-copilot-nav"
          onClick={onOpenAICopilot}
          title="Open Aegis AI Dispatch Assistant"
        >
          <Bot size={14} className="text-indigo" />
          <span>AI Copilot</span>
        </button>

        {/* Fleet Maintenance Diagnostics Trigger */}
        <button
          className="btn btn-outline btn-icon-only"
          onClick={onOpenMaintenance}
          title="Fleet Diagnostics & Vehicle Telemetry"
        >
          <Wrench size={14} className="text-amber" />
        </button>

        {/* Predictive Surge Allocator Trigger */}
        <button
          className="btn btn-outline btn-icon-only"
          onClick={onOpenPredictive}
          title="Predictive Demand Surge & Resource Pre-Positioning"
        >
          <TrendingUp size={14} className="text-sky" />
        </button>

        {/* Live Feed Status Pill */}
        <div className={`connection-pill ${isConnected ? 'connected' : 'disconnected'}`}>
          <Radio size={12} className={isConnected ? 'pulse-icon' : ''} />
          <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>

        {/* Audio Alert Tones Toggle */}
        <button
          className={`btn btn-outline audio-toggle-btn ${isAudioEnabled ? 'audio-on' : 'audio-off'}`}
          onClick={onToggleAudio}
          title={isAudioEnabled ? 'EMS Alert Tones: Active' : 'EMS Alert Tones: Muted'}
        >
          {isAudioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span>{isAudioEnabled ? 'AUDIO' : 'MUTED'}</span>
        </button>

        {currentRole === 'DISPATCHER' && (
          <button className="btn btn-primary" onClick={onOpenNewEmergency}>
            <PlusCircle size={14} />
            <span>+ Incident</span>
          </button>
        )}

        <button className="btn btn-outline" onClick={onResetData} title="Reset demo seed data & fleet ready">
          <RotateCcw size={14} />
        </button>
      </div>
    </header>
  );
};
