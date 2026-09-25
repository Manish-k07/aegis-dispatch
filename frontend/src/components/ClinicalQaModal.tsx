import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, FileText, Award, X, Clock, Pill } from 'lucide-react';

interface ClinicalQaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClinicalQaModal: React.FC<ClinicalQaModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '780px',
          width: '92%',
          background: 'rgba(11, 16, 28, 0.98)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '18px',
          padding: '26px 30px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '17px', color: '#f8fafc', letterSpacing: '0.5px' }}>
                  Automated Clinical QA/QI & Protocol Governance
                </strong>
                <span style={{ fontSize: '10px', background: '#10b981', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  AHA / ATLS AUDIT PASSED
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                Post-Mission Clinical Audit & Supervisor Quality Assurance Scorecard
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'rgba(255, 255, 255, 0.06)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Quality Scorecard Banner */}
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.12), rgba(6, 95, 70, 0.2))',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '14px',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '22px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '38px', fontWeight: 900, color: '#34d399', letterSpacing: '1px' }}>
              98.4%
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                Overall Operational & Clinical Compliance Score
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
                Paramedic Crew: Arun Kumar (Lead ALS) & Meena R (EMT-P) · Unit KA-01-AE-1001
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid #10b981' }}>
            <Award size={16} className="text-emerald" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#6ee7b7' }}>TIER 1 GOLD STANDARD</span>
          </div>
        </div>

        {/* Audited Metric Items with Generous Whitespace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Clinical Protocol Compliance Audit Checklist:
          </div>

          {/* Metric 1 */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={18} className="text-emerald" />
              <div>
                <strong style={{ fontSize: '13px', color: '#f8fafc' }}>Time-to-First-ECG Acquisition Benchmark</strong>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>AHA Standard: &lt;10.0 mins · Achieved: <strong>6.4 mins from scene arrival</strong></div>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '6px' }}>
              MET (+100%)
            </span>
          </div>

          {/* Metric 2 */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={18} className="text-emerald" />
              <div>
                <strong style={{ fontSize: '13px', color: '#f8fafc' }}>Weight-Adjusted Medication Safety Cross-Check</strong>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Aspirin 325mg chewable + Fentanyl 50mcg IV within therapeutic index for 72kg adult</div>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '6px' }}>
              VERIFIED
            </span>
          </div>

          {/* Metric 3 */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={18} className="text-emerald" />
              <div>
                <strong style={{ fontSize: '13px', color: '#f8fafc' }}>Hospital Handover Digital Signature & Telemetry</strong>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>ePCR locked with SHA-256 tamper-evident digital token · Receiving MD: Dr. S. Rao</div>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '6px' }}>
              SIGNED & SEALED
            </span>
          </div>
        </div>

        {/* Action footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '16px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Audit Record #QA-2026-0812 · Encrypted in immutable compliance audit trail.
          </span>
          <button
            onClick={onClose}
            className="btn btn-sm btn-primary"
            style={{ padding: '8px 18px' }}
          >
            Acknowledge & Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
};
