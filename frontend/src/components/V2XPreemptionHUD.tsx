import React, { useState, useEffect } from 'react';
import { Radio, ShieldAlert, CheckCircle2, AlertTriangle, Navigation, Zap, X, MapPin } from 'lucide-react';

interface V2XPreemptionHUDProps {
  isOpen: boolean;
  onClose: () => void;
  ambulanceRegistration?: string;
}

export const V2XPreemptionHUD: React.FC<V2XPreemptionHUDProps> = ({
  isOpen,
  onClose,
  ambulanceRegistration = 'KA-01-AE-1001',
}) => {
  const [signals, setSignals] = useState([
    { id: 'SIG-101', name: 'Brigade Rd & Residency Rd Junction', state: 'GREEN_PREEMPTED', distanceM: 180, countdownS: 24 },
    { id: 'SIG-102', name: 'Richmond Circle Flyover Approach', state: 'GREEN_REQUESTED', distanceM: 460, countdownS: 45 },
    { id: 'SIG-103', name: 'Koramangala 80ft Intermediate Light', state: 'STANDBY', distanceM: 920, countdownS: 90 },
  ]);

  const [preemptionActive, setPreemptionActive] = useState(true);

  // Simulated countdown tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSignals((prev) =>
        prev.map((s) => ({
          ...s,
          countdownS: s.countdownS > 1 ? s.countdownS - 1 : 45,
          distanceM: Math.max(20, s.distanceM - 6),
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
          width: '92%',
          background: 'rgba(11, 16, 28, 0.98)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '18px',
          padding: '24px 28px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Navigation size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '16px', color: '#f8fafc', letterSpacing: '0.5px' }}>
                  V2X Emergency Vehicle Preemption (EVP) HUD
                </strong>
                <span style={{ fontSize: '10px', background: '#10b981', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, letterSpacing: '0.8px' }}>
                  NTCIP 1202 ACTIVE
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Municipal Traffic Management Center Link · Preempting Signals for {ambulanceRegistration}
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

        {/* Green Wave Corridor Status Card */}
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.12), rgba(6, 95, 70, 0.2))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} className="text-emerald" />
              <strong style={{ fontSize: '13px', color: '#34d399', letterSpacing: '0.5px' }}>
                DYNAMIC GREEN WAVE CORRIDOR ENGAGED
              </strong>
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '3px' }}>
              Holding green phase along primary response path. Cross-street traffic held on all-red.
              Estimated trip time reduction: <strong>-38% (-4.4 mins)</strong>.
            </div>
          </div>

          <button
            onClick={() => setPreemptionActive(!preemptionActive)}
            style={{
              background: preemptionActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${preemptionActive ? '#ef4444' : '#10b981'}`,
              color: preemptionActive ? '#fca5a5' : '#6ee7b7',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {preemptionActive ? 'DISENGAGE EVP' : 'ENGAGE EVP'}
          </button>
        </div>

        {/* Upcoming Preempted Signals List with Generous Whitespace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Next 3 Intersections on Flight Path:
          </div>

          {signals.map((sig, idx) => (
            <div
              key={sig.id}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', width: '20px' }}>
                  0{idx + 1}
                </span>
                <div>
                  <strong style={{ fontSize: '13px', color: '#f8fafc' }}>{sig.name}</strong>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    Distance: <strong>{sig.distanceM}m</strong> · Protocol: NTCIP 1202 / SCATS
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: sig.state === 'GREEN_PREEMPTED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: sig.state === 'GREEN_PREEMPTED' ? '#34d399' : '#fbbf24',
                    border: `1px solid ${sig.state === 'GREEN_PREEMPTED' ? '#10b981' : '#f59e0b'}`,
                  }}
                >
                  {sig.state === 'GREEN_PREEMPTED' ? '● GREEN PREEMPTED' : '◷ REQUESTING...'}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', width: '48px', textAlign: 'right' }}>
                  {sig.countdownS}s
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
          🔒 Signals automatically release to municipal timing cycle 10 seconds post ambulance GPS intersection clearance.
        </div>
      </div>
    </div>
  );
};
