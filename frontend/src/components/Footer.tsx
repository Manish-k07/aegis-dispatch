import React from 'react';
import {
  ShieldCheck,
  Lock,
  FileText,
  Server,
  HeartPulse,
  Scale,
  ExternalLink,
  ClipboardList
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
    <footer className="cad-footer-modern">
      {/* 1. Left Zone: Live Engine Status & Security Badges */}
      <div className="cad-footer-zone cad-footer-left">
        <div className="footer-status-badge">
          <span
            className="footer-status-dot"
            style={{
              backgroundColor: isConnected ? '#34d399' : '#f87171',
              boxShadow: isConnected
                ? '0 0 10px rgba(52, 211, 153, 0.7)'
                : '0 0 10px rgba(248, 113, 113, 0.7)',
            }}
          />
          <span className="footer-engine-title">
            CAD Engine: <strong>{isConnected ? (isVirtualMode ? 'ACTIVE (Virtual Gateway)' : 'NOMINAL') : 'RECONNECTING'}</strong>
          </span>
        </div>

        <span className="footer-divider">|</span>

        <div className="footer-meta-pill" title="Cryptographic Transport Layer Security 1.3 Active">
          <Lock size={12} className="text-emerald" />
          <span>TLS 1.3 / WSS · HIPAA Compliant</span>
        </div>

        <span className="footer-divider">|</span>

        <div className="footer-meta-pill" title="Patient Health Information Telemetry Protected">
          <HeartPulse size={12} className="text-sky" />
          <span>PHI Telemetry Shield Active</span>
        </div>
      </div>

      {/* 2. Center Zone: Compliance, Research, & Operations Controls */}
      <div className="cad-footer-zone cad-footer-center">
        <button
          className="footer-action-link"
          onClick={() => onOpenLegal('privacy')}
          title="Review HIPAA Patient Data Privacy Policy"
        >
          <FileText size={12} />
          <span>Privacy Policy</span>
        </button>

        <span className="footer-bullet">•</span>

        <button
          className="footer-action-link"
          onClick={() => onOpenLegal('terms')}
          title="Emergency Dispatch Service Terms of Use"
        >
          <Scale size={12} />
          <span>Terms & SLAs</span>
        </button>

        <span className="footer-bullet">•</span>

        <button
          className="footer-action-link"
          onClick={() => onOpenLegal('security')}
          title="View Cryptographic Security & Audit Posture"
        >
          <ShieldCheck size={12} />
          <span>Security Posture</span>
        </button>

        <span className="footer-bullet">•</span>

        <button
          className="footer-action-link"
          onClick={onOpenAuditLogs}
          title="Review Immutable CAD Dispatch Audit Logs"
        >
          <ClipboardList size={12} />
          <span>Audit Log</span>
        </button>

        <span className="footer-bullet">•</span>

        <a
          href="/research_proposal.html"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-research-chip"
          title="Open IEEE Final Year Research Paper Proposal in new tab"
        >
          <ExternalLink size={11} />
          <span>IEEE Research Dossier ↗</span>
        </a>
      </div>

      {/* 3. Right Zone: Backups & System Version */}
      <div className="cad-footer-zone cad-footer-right">
        <button
          className="footer-backup-btn"
          onClick={onOpenSaveModal}
          title="Backup CAD database state, telemetry snapshots and mission exports"
        >
          <Server size={11} />
          <span>Server Backups</span>
        </button>

        <span className="footer-version-tag">
          v2.5 Pro · Build 2026.09
        </span>
      </div>
    </footer>
  );
};
