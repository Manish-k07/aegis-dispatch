import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Lock,
  X,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Eye,
  Server,
  Activity,
  HeartPulse
} from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'privacy' | 'terms' | 'security';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'security'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content modal-legal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '880px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Scale size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Aegis Dispatch Pro • Legal & Compliance Center
              </h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Regulatory Compliance, Patient Health Privacy (HIPAA/GDPR), and Operating Terms
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 24px',
            background: 'rgba(15, 23, 42, 0.4)',
            borderBottom: '1px solid var(--border-soft)'
          }}
        >
          <button
            onClick={() => setActiveTab('privacy')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer',
              border: activeTab === 'privacy' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              background: activeTab === 'privacy' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              color: activeTab === 'privacy' ? '#38bdf8' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Eye size={15} />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer',
              border: activeTab === 'terms' ? '1px solid rgba(129, 140, 248, 0.4)' : '1px solid transparent',
              background: activeTab === 'terms' ? 'rgba(129, 140, 248, 0.12)' : 'transparent',
              color: activeTab === 'terms' ? '#818cf8' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={15} />
            <span>Terms & Conditions</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer',
              border: activeTab === 'security' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid transparent',
              background: activeTab === 'security' ? 'rgba(52, 211, 153, 0.12)' : 'transparent',
              color: activeTab === 'security' ? '#34d399' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Lock size={15} />
            <span>Security & Compliance</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            fontSize: '0.85rem',
            lineHeight: 1.65,
            color: 'var(--text-main)'
          }}
        >
          {activeTab === 'privacy' && (
            <div className="legal-section">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  padding: '10px 14px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(56, 189, 248, 0.2)'
                }}
              >
                <HeartPulse size={16} color="#38bdf8" />
                <span style={{ fontSize: '0.8rem', color: '#93c5fd' }}>
                  HIPAA, HITECH, NDHM & GDPR Medical Data Governance Framework Active
                </span>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                1. Scope of Emergency Health Telemetry & Protected Health Information (PHI)
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                Aegis Dispatch CAD ("System") is committed to maintaining the highest level of privacy and confidentiality
                for patient health records, emergency callers, paramedic crews, and healthcare providers. All Protected
                Health Information (PHI) collected during 911/112 emergency calls—including symptoms, patient vitals
                (heart rate, blood pressure, SpO2, respiratory rates), medical priority dispatch codes, and incident
                addresses—is classified as Restricted Medical Data.
              </p>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                2. Real-Time Geolocation & Fleet Telemetry Logging
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                Fleet ambulances stream continuous GPS coordinates, speed, heading, and ignition telemetry via secure
                WebSocket gateway (`/ws/live`). This location data is utilized exclusively for optimal dynamic routing,
                automated candidate dispatch scoring, and ETA calculation. Real-time driver telemetry is retained strictly
                for operational emergency coordination and post-incident compliance audits.
              </p>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                3. Live Patient Vitals Transmission & Cryptographic Protection
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                When paramedics transmit live vitals from Mobile Data Terminals (MDT) to receiving Hospital Emergency
                Departments (ED), the data streams across TLS 1.3 encrypted WebSocket channels. Telemetry payload data is
                transiently routed to authorized ED trauma staff and is protected at rest within isolated H2/PostgreSQL
                databases using AES-256 standard encryption.
              </p>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                4. Voice Transcriptions, Audio Logging, and AI Copilot Safeguards
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                Voice-activated status updates and AI clinical triage suggestions are processed locally within the
                deployment boundary. Voice audio transcripts are stripped of direct personal identifiers before clinical
                categorization. No audio or patient vitals are shared with or sold to advertising networks, commercial
                insurers, or unauthorized third parties.
              </p>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                5. Data Subject Rights & Incident Record Archival
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Emergency incident records are subject to statutory retention guidelines (typically 3 to 7 years in
                accordance with national EMS regulations). Authorized medical examiners and data subjects may request
                certified audit log extracts or record redactions in accordance with applicable healthcare privacy laws.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="legal-section">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  padding: '10px 14px',
                  background: 'rgba(129, 140, 248, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(129, 140, 248, 0.2)'
                }}
              >
                <Scale size={16} color="#818cf8" />
                <span style={{ fontSize: '0.8rem', color: '#c7d2fe' }}>
                  CAD Operational Guidelines, SLAs, and Public Safety Disclaimer
                </span>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                1. Authorization & Certified Operator Roles
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                Access to Aegis Dispatch CAD is restricted to credentialed emergency dispatchers, sworn public safety
                personnel, certified emergency medical technicians (EMTs/paramedics), and authorized hospital triage
                directors. Users must never share terminal sessions or bypass role-based access control (RBAC) boundaries.
              </p>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                2. Automated Dispatch & AI Decision Support Disclaimer
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                The automated dispatch algorithm and AI clinical triage suggestions are designed as assistive decision-support
                tools. <strong>The final dispatch confirmation, vehicle allocation, and clinical intervention authority
                remains with the human dispatcher or supervising medical director.</strong> Operators must maintain active
                situational awareness and exercise human override whenever field conditions warrant.
              </p>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                3. Smart Traffic Light Preemption & Transit Protocols
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                Emergency vehicle routing and smart traffic light preemption status indicators represent real-time
                estimations based on municipal OSRM open routing data. Drivers must obey actual emergency right-of-way
                protocols, visual traffic signals, and roadway safety conditions regardless of HUD route guidance.
              </p>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                4. System Uptime & Fail-Safe Fallback Dispatches
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                Aegis Dispatch Pro targets 99.99% mission-critical uptime. In the event of network disruption or gateway
                timeout, dispatchers are instructed to transition immediately to terrestrial two-way radio dispatch
                protocols (VHF/UHF/P25) and execute manual telephone handoffs.
              </p>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                5. Limitation of Liability
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>
                To the maximum extent permitted by emergency communications statutes, software providers and system
                administrators are not liable for direct, indirect, or consequential damages resulting from third-party
                telecom outages, GPS satellite drift, or emergency routing misdirection outside the direct control of the
                CAD platform.
              </p>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="legal-section">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  padding: '10px 14px',
                  background: 'rgba(52, 211, 153, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(52, 211, 153, 0.2)'
                }}
              >
                <ShieldCheck size={16} color="#34d399" />
                <span style={{ fontSize: '0.8rem', color: '#6ee7b7' }}>
                  Enterprise Security Hardening & Zero-Trust Defense in Depth
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid var(--border-soft)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <CheckCircle2 size={16} color="#34d399" />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>HTTP Security Headers</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Enforced X-Content-Type-Options: nosniff, X-Frame-Options: DENY, X-XSS-Protection, and strict Content-Security-Policy.
                  </p>
                </div>

                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid var(--border-soft)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <CheckCircle2 size={16} color="#34d399" />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>CORS Origin Isolation</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Configurable allowed origins with credential protection, preventing cross-site state manipulation.
                  </p>
                </div>

                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid var(--border-soft)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <CheckCircle2 size={16} color="#34d399" />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Immutable Audit Trails</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Every call creation, dispatch change, vitals broadcast, and database reset is timestamped and recorded.
                  </p>
                </div>

                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid var(--border-soft)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <CheckCircle2 size={16} color="#34d399" />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Input Coordinate Bounds</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Rigorous latitude/longitude boundary checking and payload length sanitization prevents memory exploits.
                  </p>
                </div>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                Vulnerability Disclosure Policy
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Security researchers and authorized auditors can report vulnerabilities responsibly to{' '}
                <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                  security@aegisdispatch.internal
                </code>{' '}
                or via private advisory on our official repository.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderTop: '1px solid var(--border-soft)',
            background: 'rgba(15, 23, 42, 0.6)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Server size={14} />
            <span>Version: Aegis CAD Pro v2.5 • Released 2026</span>
          </div>
          <button className="btn-calm-primary" onClick={onClose}>
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
