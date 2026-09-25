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
  GraduationCap
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
  onOpenSaveModal: () => void;
  onAutoAssignNext: () => void;
  onOpenLegal?: (tab?: 'privacy' | 'terms' | 'security') => void;
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

        {/* Calm Segmented Role Controller */}
        <nav className="role-switcher-bar" aria-label="Console Interface Switcher">
          <button
            className={`role-tab-btn ${currentRole === 'DISPATCHER' ? 'active-cad' : ''}`}
            onClick={() => onSelectRole('DISPATCHER')}
            title="Central Dispatch CAD Command"
          >
            <Radio size={13} className="tab-icon" />
            <span>Central CAD</span>
          </button>
          <button
            className={`role-tab-btn ${currentRole === 'DRIVER' ? 'active-driver' : ''}`}
            onClick={() => onSelectRole('DRIVER')}
            title="Mobile Data Terminal (Paramedic / Driver)"
          >
            <User size={13} className="tab-icon" />
            <span>Driver MDT</span>
          </button>
          <button
            className={`role-tab-btn ${currentRole === 'HOSPITAL' ? 'active-hosp' : ''}`}
            onClick={() => onSelectRole('HOSPITAL')}
            title="Hospital Emergency Department Triage"
          >
            <Activity size={13} className="tab-icon" />
            <span>Hospital ED</span>
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
        {/* Contextual Auto-Dispatch Next Button */}
        {pendingCount > 0 && currentRole === 'DISPATCHER' && (
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
        {currentRole === 'DISPATCHER' && (
          <button
            className="btn-calm-primary"
            onClick={onOpenNewEmergency}
            title="Intake New Emergency Incident"
          >
            <PlusCircle size={14} />
            <span>+ New Call</span>
          </button>
        )}

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

        {/* IEEE Final Year Research Paper Proposal */}
        <a
          href="/research_proposal.html"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-calm-secondary"
          style={{
            textDecoration: 'none',
            color: '#38bdf8',
            borderColor: 'rgba(56, 189, 248, 0.35)',
            background: 'rgba(56, 189, 248, 0.08)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="IEEE Final Year Research Paper Proposal & Architecture (Opens in new tab)"
        >
          <GraduationCap size={14} className="text-sky" />
          <span>Research Paper ↗</span>
        </a>

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
