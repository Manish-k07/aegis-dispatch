import React, { useState, useEffect } from 'react';
import { Radio, ShieldAlert, CheckCircle2, AlertTriangle, Navigation, Zap, X, MapPin } from 'lucide-react';
import { StatusChip } from './common/StatusChip';
import { API_BASE } from '../config';

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

  // Fetch real backend V2X corridor data when HUD opens
  useEffect(() => {
    if (!isOpen) return;
    const fetchCorridor = async () => {
      try {
        const res = await fetch(`${API_BASE}/v2x/corridor`);
        if (res.ok) {
          const data = await res.json();
          if (data.corridorActive !== undefined) {
            setPreemptionActive(data.corridorActive);
          }
          if (Array.isArray(data.activeIntersections) && data.activeIntersections.length > 0) {
            setSignals(data.activeIntersections.map((sig: any) => ({
              id: sig.id,
              name: sig.name,
              state: sig.state,
              distanceM: sig.distanceM || (sig.id === 'SIG-101' ? 180 : sig.id === 'SIG-102' ? 460 : 920),
              countdownS: sig.countdownS || 25,
            })));
          }
        }
      } catch (err) {
        // Fallback to local default signals
      }
    };
    fetchCorridor();
  }, [isOpen]);

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
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.01em' }}>
                V2X Traffic Preemption Grid
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Unit: <strong style={{ color: '#38bdf8' }}>{ambulanceRegistration}</strong></span>
                <span>•</span>
                <span>Protocol: <strong>DSRC / C-V2X (IEEE 1609)</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Master Preemption Status Banner */}
        <div
          style={{
            background: preemptionActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${preemptionActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Zap size={22} color={preemptionActive ? '#10b981' : '#ef4444'} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: preemptionActive ? '#10b981' : '#ef4444' }}>
                {preemptionActive ? 'EMERGENCY CORRIDOR ACTIVE' : 'CORRIDOR INACTIVE'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Transmitting priority beacon 5.9 GHz to civil municipal traffic controllers
              </div>
            </div>
          </div>
          <button
            onClick={() => setPreemptionActive(!preemptionActive)}
            style={{
              background: preemptionActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${preemptionActive ? '#ef4444' : '#10b981'}`,
              color: preemptionActive ? '#ef4444' : '#10b981',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {preemptionActive ? 'Override / Standby' : 'Engage Preemption'}
          </button>
        </div>

        {/* Intersections list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
            Approaching Managed Intersections
          </div>
          {signals.map((sig) => {
            const isGreen = sig.state === 'GREEN_PREEMPTED';
            const isPending = sig.state === 'GREEN_REQUESTED';
            return (
              <div
                key={sig.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: isGreen ? '#10b981' : isPending ? '#38bdf8' : '#eab308',
                      boxShadow: isGreen ? '0 0 10px #10b981' : isPending ? '0 0 8px #38bdf8' : 'none',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                      {sig.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={10} /> {sig.distanceM}m away • Node ID: {sig.id}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <StatusChip
                    tone={isGreen ? 'success' : isPending ? 'info' : 'neutral'}
                    label={isGreen ? `GREEN WAVE (${sig.countdownS}s)` : isPending ? 'HOLDING RED' : 'QUEUED'}
                    size="small"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '11px', color: '#64748b' }}>
          <div>GPS telemetry sync: <strong>100 ms</strong> • Low Latency Mode</div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#f8fafc',
              padding: '6px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Close HUD
          </button>
        </div>
      </div>
    </div>
  );
};
