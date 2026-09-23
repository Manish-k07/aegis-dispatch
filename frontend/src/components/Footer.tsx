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
  ExternalLink
} from 'lucide-react';

interface FooterProps {
  isConnected: boolean;
  onOpenLegal: (tab: 'privacy' | 'terms' | 'security') => void;
  onOpenSaveModal: () => void;
  onOpenAuditLogs: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  isConnected,
  onOpenLegal,
  onOpenSaveModal,
  onOpenAuditLogs,
}) => {
  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 20px',
        background: 'rgba(12, 17, 26, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border-soft)',
        fontSize: '0.74rem',
        color: 'var(--text-muted)',
        zIndex: 40,
        position: 'relative'
      }}
    >
      {/* Left: System Status & Security Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#34d399' : '#f87171',
              boxShadow: isConnected ? '0 0 8px rgba(52, 211, 153, 0.6)' : '0 0 8px rgba(248, 113, 113, 0.6)',
              display: 'inline-block'
            }}
          />
          <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>
            Aegis CAD Engine: {isConnected ? 'NOMINAL' : 'RECONNECTING'}
          </span>
        </div>

        <span style={{ color: 'var(--border-soft)' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Lock size={12} color="#34d399" />
          <span>TLS 1.3 / WSS • HIPAA Encrypted</span>
        </div>

        <span style={{ color: 'var(--border-soft)' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <HeartPulse size={12} color="#38bdf8" />
          <span>Real-time PHI Telemetry Protected</span>
        </div>
      </div>

      {/* Center: Legal & Compliance Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={() => onOpenLegal('privacy')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <FileText size={12} />
          <span>Privacy Policy</span>
        </button>

        <span style={{ color: 'var(--border-soft)' }}>•</span>

        <button
          onClick={() => onOpenLegal('terms')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#818cf8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <Scale size={12} />
          <span>Terms & Conditions</span>
        </button>

        <span style={{ color: 'var(--border-soft)' }}>•</span>

        <button
          onClick={() => onOpenLegal('security')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#34d399')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ShieldCheck size={12} />
          <span>Security Posture</span>
        </button>

        <span style={{ color: 'var(--border-soft)' }}>•</span>

        <button
          onClick={onOpenAuditLogs}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <span>Audit Log</span>
        </button>
      </div>

      {/* Right: Version & Fast Backup Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onOpenSaveModal}
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '5px',
            padding: '2px 8px',
            color: '#38bdf8',
            cursor: 'pointer',
            fontSize: '0.72rem',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Server size={11} />
          <span>Server Backups</span>
        </button>

        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
          v2.5 Pro (Build 2026.09)
        </span>
      </div>
    </footer>
  );
};
