import React from 'react';
import {
  ShieldCheck,
  Lock,
  Radio,
  FileText,
  Server,
  HeartPulse,
  Scale,
  Sparkles,
  ExternalLink,
  Activity
} from 'lucide-react';

interface FooterProps {
  isConnected: boolean;
  isVirtualMode?: boolean;
  onOpenLegal: (tab: 'privacy' | 'terms' | 'security') => void;
  onOpenSaveModal: () => void;
  onOpenAuditLogs: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  isConnected,
  isVirtualMode = false,
  onOpenLegal,
  onOpenSaveModal,
  onOpenAuditLogs,
}) => {
  return (
    <footer className="footer-modern-bar">
      {/* 1. Left Cluster: Real-Time Engine & Encryption Telemetry */}
      <div className="footer-zone footer-zone-left">
        <div className="telemetry-beacon-item">
          <span
            className="pulse-indicator"
            style={{
              backgroundColor: isConnected ? '#34d399' : '#f87171',
              boxShadow: isConnected
                ? '0 0 10px rgba(52, 211, 153, 0.7)'
                : '0 0 10px rgba(248, 113, 113, 0.7)',
            }}
          />
          <span className="telemetry-engine-text">
            Aegis CAD Engine: <strong style={{ color: isConnected ? '#34d399' : '#f87171' }}>
              {isConnected ? (isVirtualMode ? 'ACTIVE (Virtual Cloud Gateway)' : 'NOMINAL') : 'RECONNECTING'}
            </strong>
          </span>
        </div>

        <span className="footer-separator">|</span>

        <div className="telemetry-security-badge" title="Protected Health Information Encrypted in Transit">
          <Lock size={12} color="#34d399" />
          <span>TLS 1.3 / WSS • HIPAA / DPDP Encrypted</span>
        </div>

        <span className="footer-separator">|</span>

        <div className="telemetry-health-badge" title="Sub-second GPS & clinical telemetry streaming active">
          <HeartPulse size={12} color="#38bdf8" />
          <span>Live PHI Telemetry Bridge</span>
        </div>
      </div>

      {/* 2. Center Cluster: Regulatory Compliance, Security Posture & Audit Trail */}
      <div className="footer-zone footer-zone-center">
        <button
          className="footer-nav-link"
          onClick={() => onOpenLegal('privacy')}
          title="Review HIPAA / GDPR / DPDP Healthcare Data Protection Policy"
        >
          <FileText size={12} />
          <span>Privacy Policy</span>
        </button>

        <span className="footer-dot">•</span>

        <button
          className="footer-nav-link"
          onClick={() => onOpenLegal('terms')}
          title="Terms of Medical Service & CAD SLAs"
        >
          <Scale size={12} />
          <span>Terms of Service</span>
        </button>

        <span className="footer-dot">•</span>

        <button
          className="footer-nav-link"
          onClick={() => onOpenLegal('security')}
          title="Cryptographic verification and role-based access posture"
        >
          <ShieldCheck size={12} />
          <span>Security Posture</span>
        </button>

        <span className="footer-dot">•</span>

        <button
          className="footer-nav-link"
          onClick={onOpenAuditLogs}
          title="Immutable mission action logs & operator dispatch trail"
        >
          <Activity size={12} />
          <span>Audit Log</span>
        </button>
      </div>

      {/* 3. Right Cluster: Enterprise Snapshot & System Metadata */}
      <div className="footer-zone footer-zone-right">
        <button
          className="btn btn-xs btn-outline-sky"
          onClick={onOpenSaveModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            fontSize: '0.72rem',
          }}
          title="Export instant CAD state snapshot JSON for disaster recovery"
        >
          <Server size={11} />
          <span>Server Snapshot</span>
        </button>

        <span className="footer-version-tag">
          v2.5 Pro <span style={{ opacity: 0.6 }}>(Build 2026.09)</span>
        </span>
      </div>
    </footer>
  );
};
