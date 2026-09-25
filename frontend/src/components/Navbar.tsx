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
  Bot,
  Wrench,
  TrendingUp,
  CloudRain,
  User,
  Zap,
  Save,
  Activity,
  Command,
  Scale,
  Building2,
  Truck,
  AlertTriangle,
  Video,
  Plane,
  Award,
  ShieldAlert,
  Navigation,
  ChevronDown
} from 'lucide-react';
import { DashboardData, UserRole } from '../types';

interface NavbarProps {
  data: DashboardData;
  isConnected: boolean;
  isVirtualMode?: boolean;
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
  onOpenSaveModal?: () => void;
  onAutoAssignNext: () => void;
  onOpenLegal?: (tab?: 'privacy' | 'terms' | 'security') => void;
  isMciActive?: boolean;
  onToggleMci?: () => void;
  onOpenCapacityHud?: () => void;
  onOpenNG911Video?: () => void;
  onOpenV2X?: () => void;
  onOpenMciTriage?: () => void;
  onOpenClinicalQa?: () => void;
  onOpenDroneDispatch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  data,
  isConnected,
  isVirtualMode = false,
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
  onOpenLegal,
  isMciActive = false,
  onToggleMci,
  onOpenCapacityHud,
  onOpenNG911Video,
  onOpenV2X,
  onOpenMciTriage,
  onOpenClinicalQa,
  onOpenDroneDispatch,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isTacticalOpsOpen, setIsTacticalOpsOpen] = useState(false);

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
    <header className="navbar-modern">
      {/* 1. Left Section: Identity & Segmented Role Switcher */}
      <div className="nav-left-zone">
        <div className="brand-lockup">
          <div className="brand-logo-soft">
            <Shield className="logo-icon-soft" size={18} />
          </div>
          <div className="brand-meta">
            <div className="brand-heading">
              <span className="brand-name">AEGIS</span>
              <span className="brand-pill">CAD v2.5</span>
            </div>
            <span className="brand-subtext">Emergency Operations</span>
          </div>
        </div>

        {/* Prominent Primary Dashboard Console Switcher */}
        <nav className="role-switcher-bar" aria-label="Console Interface Switcher">
          <button
            className={`role-tab-btn ${currentRole === 'DISPATCHER' ? 'active-cad' : ''}`}
            onClick={() => onSelectRole('DISPATCHER')}
            title="Central Dispatch CAD Command Interface"
          >
            <Radio size={14} className="tab-icon" />
            <span>🚨 Central CAD</span>
          </button>
          <button
            className={`role-tab-btn ${currentRole === 'DRIVER' ? 'active-driver' : ''}`}
            onClick={() => onSelectRole('DRIVER')}
            title="Ambulance Driver Mobile Data Terminal (MDT) Dashboard"
          >
            <Truck size={14} className="tab-icon" />
            <span>🚑 Ambulance Dashboard</span>
          </button>
          <button
            className={`role-tab-btn ${currentRole === 'HOSPITAL' ? 'active-hosp' : ''}`}
            onClick={() => onSelectRole('HOSPITAL')}
            title="Hospital Emergency Department & Trauma Reception Dashboard"
          >
            <Building2 size={14} className="tab-icon" />
            <span>🏥 Hospital Dashboard</span>
          </button>
        </nav>
      </div>

      {/* 2. Center Section: Calm Search & Status Telemetry */}
      <div className="nav-center-zone">
        {onSearchChange && currentRole === 'DISPATCHER' && (
          <div className="calm-search-box">
            <Search size={14} className="search-icon-soft" />
            <input
              type="text"
              placeholder="Search incidents, units, facilities..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <span className="shortcut-hint">/</span>
          </div>
        )}

        {/* Unified Calm Status Strip */}
        <div className="calm-status-strip">
          <div className="status-chip chip-time" title="Operational Mission Clock">
            <Clock size={12} />
            <span>{currentTime || '00:00:00'}</span>
          </div>

          <div className="status-chip chip-weather" title="Bengaluru Metro: 27°C Monsoon / Wet Roads">
            <CloudRain size={12} />
            <span>27°C Monsoon</span>
          </div>

          {currentRole === 'DISPATCHER' && (
            <div className="cad-metrics-cluster">
              {pendingCount > 0 ? (
                <span className="metric-chip alert-rose" title="Pending Incidents Awaiting Unit">
                  {pendingCount} Pending
                </span>
              ) : (
                <span className="metric-chip calm-slate" title="All Incidents Assigned">
                  0 Pending
                </span>
              )}

              <span className="metric-chip calm-slate" title="Available Fleet">
                {availableAmbulances}/{data.ambulances.length} Units
              </span>

              {activeDispatches > 0 && (
                <span className="metric-chip calm-amber" title="Active Missions in Transit">
                  {activeDispatches} Active
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Right Section: Action Hierarchy & Grouped Utilities */}
      <div className="nav-right-zone">
        {currentRole === 'DISPATCHER' && (
          <>
            {/* Contextual Auto-Dispatch Next Button */}
            {pendingCount > 0 && (
              <button
                className="btn-calm-auto"
                onClick={onAutoAssignNext}
                title="Auto-dispatch nearest ambulance and hospital to highest priority incident"
              >
                <Zap size={13} />
                <span>⚡ Auto-Dispatch</span>
              </button>
            )}

            {/* Primary Intake Incident Button */}
            <button
              className="btn-calm-primary"
              onClick={onOpenNewEmergency}
              title="Intake New Emergency Incident"
            >
              <PlusCircle size={14} />
              <span>+ New Call</span>
            </button>

            {/* Consolidated Tactical Operations Suite Dropdown */}
            <div className="tactical-ops-wrapper" style={{ position: 'relative' }}>
              <button
                className={`btn-calm-secondary tactical-ops-trigger ${isTacticalOpsOpen ? 'active' : ''} ${isMciActive ? 'mci-alert' : ''}`}
                onClick={() => setIsTacticalOpsOpen(!isTacticalOpsOpen)}
                title="Open Advanced Tactical Operations Suite (NG911, V2X, MCI, Drone DFR, QA, ED Capacity)"
              >
                <Activity size={13} className={isMciActive ? 'text-red animate-pulse' : 'text-sky'} />
                <span>⚡ Tactical Ops</span>
                <ChevronDown size={12} className={`transition-transform ${isTacticalOpsOpen ? 'rotate-180' : ''}`} />
                {isMciActive && <span className="mci-dot-badge" />}
              </button>

              {isTacticalOpsOpen && (
                <div className="tactical-ops-menu" onClick={() => setIsTacticalOpsOpen(false)}>
                  <div className="tactical-menu-header">
                    <span>ADVANCED CAD SUBSYSTEMS</span>
                  </div>

                  {onOpenNG911Video && (
                    <button className="tactical-menu-item" onClick={onOpenNG911Video}>
                      <Video size={14} className="text-sky" />
                      <div className="menu-text">
                        <strong>NG911 Live Video</strong>
                        <small>Caller WebRTC feed & indoor altimetry</small>
                      </div>
                    </button>
                  )}

                  {onOpenV2X && (
                    <button className="tactical-menu-item" onClick={onOpenV2X}>
                      <Navigation size={14} className="text-emerald" />
                      <div className="menu-text">
                        <strong>V2X Green Wave Preemption</strong>
                        <small>Traffic signal priority corridor HUD</small>
                      </div>
                    </button>
                  )}

                  {onOpenMciTriage && (
                    <button className="tactical-menu-item" onClick={onOpenMciTriage}>
                      <ShieldAlert size={14} className="text-red" />
                      <div className="menu-text">
                        <strong>MCI START/SALT Triage</strong>
                        <small>Mass casualty matrix & load balancer</small>
                      </div>
                    </button>
                  )}

                  {onOpenDroneDispatch && (
                    <button className="tactical-menu-item" onClick={onOpenDroneDispatch}>
                      <Plane size={14} className="text-sky" />
                      <div className="menu-text">
                        <strong>Drone First Responder (DFR)</strong>
                        <small>Autonomous UAV AED/Narcan dispatch</small>
                      </div>
                    </button>
                  )}

                  {onOpenClinicalQa && (
                    <button className="tactical-menu-item" onClick={onOpenClinicalQa}>
                      <Award size={14} className="text-emerald" />
                      <div className="menu-text">
                        <strong>Clinical QA/QI Scorecard</strong>
                        <small>AHA / ACLS protocol compliance</small>
                      </div>
                    </button>
                  )}

                  <div className="tactical-menu-divider" />

                  {onOpenCapacityHud && (
                    <button className="tactical-menu-item" onClick={onOpenCapacityHud}>
                      <Building2 size={14} className="text-sky" />
                      <div className="menu-text">
                        <strong>Regional ED Capacity HUD</strong>
                        <small>Live trauma bay & diversion network</small>
                      </div>
                    </button>
                  )}

                  {onToggleMci && (
                    <button
                      className={`tactical-menu-item ${isMciActive ? 'mci-item-active' : ''}`}
                      onClick={onToggleMci}
                    >
                      <AlertTriangle size={14} className={isMciActive ? 'text-red animate-pulse' : 'text-amber'} />
                      <div className="menu-text">
                        <strong style={{ color: isMciActive ? '#fca5a5' : undefined }}>
                          {isMciActive ? 'Deactivate MCI Mode' : 'Declare Mass Casualty (MCI)'}
                        </strong>
                        <small>{isMciActive ? 'Stand down regional emergency protocol' : 'Engage mutual aid & diversion override'}</small>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* File Persistence Action */}
            <button
              className="btn-calm-secondary"
              onClick={onOpenSaveModal}
              title="Save CAD database, telemetry snapshots & CSV exports to disk"
            >
              <Save size={13} className="text-sky" />
              <span>Save</span>
              <span className="calm-green-dot" />
            </button>
          </>
        )}

        {currentRole === 'DRIVER' && (
          <div className="role-context-badge driver">
            <Truck size={14} className="text-amber" />
            <span>Paramedic MDT Navigation Terminal</span>
          </div>
        )}

        {currentRole === 'HOSPITAL' && (
          <div className="role-context-badge hospital">
            <Building2 size={14} className="text-emerald" />
            <span>Emergency Dept & Trauma Triage</span>
          </div>
        )}

        {/* Grouped Secondary Utilities Cluster */}
        <div className="utility-cluster">
          <button
            className="util-btn"
            onClick={onOpenAICopilot}
            title="Aegis AI Dispatch Assistant"
          >
            <Bot size={15} />
          </button>

          <button
            className="util-btn"
            onClick={onOpenMaintenance}
            title="Fleet Diagnostics & Telemetry"
          >
            <Wrench size={15} />
          </button>

          <button
            className="util-btn"
            onClick={onOpenPredictive}
            title="Predictive Resource Pre-Positioning"
          >
            <TrendingUp size={15} />
          </button>

          <button
            className={`util-btn ${!isAudioEnabled ? 'muted' : ''}`}
            onClick={onToggleAudio}
            title={isAudioEnabled ? 'Alert Chimes: Active' : 'Alert Chimes: Muted'}
          >
            {isAudioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <button
            className="util-btn"
            onClick={onResetData}
            title="Reset Simulation Demo Data"
          >
            <RotateCcw size={14} />
          </button>

          {onOpenLegal && (
            <button
              className="util-btn"
              onClick={() => onOpenLegal('privacy')}
              title="Privacy Policy, Terms of Service & Compliance"
            >
              <Scale size={15} />
            </button>
          )}
        </div>

        {/* Minimalist Live Connection Pill */}
        <div
          className={`calm-connection-badge ${isConnected ? 'online' : 'offline'}`}
          title={
            isConnected
              ? (isVirtualMode
                  ? 'Connected to Aegis Cloud Virtual Gateway (99.99% SLA • Real-time CAD Simulation)'
                  : 'Connected to Live WebSocket Gateway')
              : 'Reconnecting to Gateway...'
          }
        >
          <span className="connection-beacon" />
          <span className="connection-label">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>
    </header>
  );
};
