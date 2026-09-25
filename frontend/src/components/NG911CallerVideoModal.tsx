import React, { useState, useEffect } from 'react';
import {
  Video,
  X,
  Radio,
  Volume2,
  VolumeX,
  Activity,
  Layers,
  MapPin,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Compass,
  AlertTriangle
} from 'lucide-react';
import { Emergency } from '../types';

interface NG911CallerVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  emergency?: Emergency | null;
}

export const NG911CallerVideoModal: React.FC<NG911CallerVideoModalProps> = ({
  isOpen,
  onClose,
  emergency,
}) => {
  const [cprMetronomeActive, setCprMetronomeActive] = useState(false);
  const [cprCount, setCprCount] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(1);

  // 110 BPM CPR compression cadence metronome
  useEffect(() => {
    let interval: any = null;
    if (cprMetronomeActive) {
      interval = setInterval(() => {
        setCprCount((prev) => (prev + 1) % 31); // 30:2 CPR cycle
      }, 545); // ~110 BPM (60000ms / 110 = 545ms)
    } else {
      setCprCount(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cprMetronomeActive]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '840px',
          width: '94%',
          background: 'rgba(11, 16, 28, 0.98)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '18px',
          padding: '24px 28px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Header with generous breathing room */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Video size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '16px', color: '#f8fafc', letterSpacing: '0.5px' }}>
                  NG911 Multi-Modal Telemetry & Live Caller Video
                </strong>
                <span style={{ fontSize: '10px', background: '#dc2626', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, letterSpacing: '0.8px' }}>
                  LIVE WEBRTC
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Encrypted Emergency Stream · Incident #{emergency ? emergency.id.slice(-6) : 'DEMO-911'} ({emergency?.type || 'ACCIDENT'})
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

        {/* Video stream container and telemetry layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '20px' }}>
          {/* Left Column: Simulated WebRTC Video Screen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                position: 'relative',
                background: '#040711',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                aspectRatio: '16 / 10',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)',
              }}
            >
              {/* Simulated Scene Canvas / Video Canvas */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 70%, #020617 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transform: `scale(${cameraZoom})`,
                  transition: 'transform 0.3s ease',
                }}
              >
                {/* Visual HUD Reticle Overlay */}
                <div style={{ position: 'absolute', inset: '16px', border: '1px dashed rgba(56, 189, 248, 0.3)', pointerEvents: 'none', borderRadius: '8px' }}>
                  <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '10px', color: '#38bdf8', fontFamily: 'monospace' }}>
                    CAM 01 · 1080p 60FPS · WEBRTC SECURE
                  </div>
                  <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'crit-pulse 1s infinite' }} />
                    <span style={{ fontSize: '10px', color: '#f87171', fontWeight: 800 }}>REC</span>
                  </div>
                </div>

                {/* AI Scene Analysis bounding boxes */}
                <div style={{ position: 'absolute', top: '35%', left: '30%', width: '140px', height: '100px', border: '2px solid #ef4444', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)' }}>
                  <div style={{ background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '2px 4px', display: 'inline-block' }}>
                    ACTIVE HEMORRHAGE RISK 88%
                  </div>
                </div>

                <div style={{ textAlign: 'center', color: '#94a3b8', zIndex: 10 }}>
                  <Activity size={36} className="text-sky animate-pulse" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Caller Smartphone Feed Active</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>GoodSAM / AML High-Bandwidth Telemetry</div>
                </div>
              </div>

              {/* Bottom control bar over video */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  right: '10px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  zIndex: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setIsAudioMuted(!isAudioMuted)}
                    style={{ background: 'none', border: 'none', color: isAudioMuted ? '#f87171' : '#38bdf8', cursor: 'pointer' }}
                  >
                    {isAudioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                  <span style={{ fontSize: '11px', color: '#cbd5e1' }}>2-Way Caller Audio</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setCameraZoom(cameraZoom === 1 ? 1.25 : 1)}
                    style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#f8fafc', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ZOOM {cameraZoom}x
                  </button>
                </div>
              </div>
            </div>

            {/* CPR Audio-Visual Metronome (110 BPM) */}
            <div
              style={{
                background: cprMetronomeActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${cprMetronomeActive ? '#ef4444' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <strong style={{ fontSize: '12px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>CPR COMPRESSION CADENCE METRONOME</span>
                  {cprMetronomeActive && (
                    <span style={{ fontSize: '10px', background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      110 BPM
                    </span>
                  )}
                </strong>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {cprMetronomeActive ? `Compacting: Step ${cprCount}/30 (Cycle 30:2 Breaths)` : 'Voice-guided CPR cadence for untrained bystanders'}
                </div>
              </div>

              <button
                onClick={() => setCprMetronomeActive(!cprMetronomeActive)}
                style={{
                  background: cprMetronomeActive ? '#dc2626' : 'rgba(56, 189, 248, 0.15)',
                  color: cprMetronomeActive ? '#ffffff' : '#38bdf8',
                  border: `1px solid ${cprMetronomeActive ? '#ef4444' : 'rgba(56, 189, 248, 0.35)'}`,
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                {cprMetronomeActive ? 'STOP METRONOME' : 'START 110 BPM CADENCE'}
              </button>
            </div>
          </div>

          {/* Right Column: Advanced Telemetry & Indoor Z-Axis */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Exact Z-Axis & Indoor Elevation Card */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#38bdf8' }}>
                <Layers size={16} />
                <strong style={{ fontSize: '12px', color: '#f8fafc', letterSpacing: '0.5px' }}>
                  AML / ELS INDOOR Z-AXIS ELEVATION
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8' }}>FLOOR 4</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Apt 402 · Tower B</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.5' }}>
                Barometric altimetry: 924.3m ASL (±1.1m error margin · 94% indoor confidence).
                Ground responder notified to bring high-rise gear and stair-chair.
              </div>
            </div>

            {/* AI Visual Triage Analysis */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
                AI Visual Telemetry Assessment
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#94a3b8' }}>Arterial Hemorrhage Scan</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>HIGH RISK (Recommend Tourniquet)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#94a3b8' }}>Airway Patency</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>PARTIALLY COMPROMISED</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#94a3b8' }}>Lund-Browder Burn Area</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>&lt; 5% TBSA (Local First Aid)</span>
                </div>
              </div>
            </div>

            {/* Pre-Arrival Instructions Broadcasted to Caller */}
            <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '14px' }}>
              <strong style={{ fontSize: '11px', color: '#38bdf8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Live Instructions Sent to Caller Phone:
              </strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                <li>Keep patient flat on back on firm floor.</li>
                <li>Apply firm continuous direct pressure to right leg.</li>
                <li>Unlock building lobby door for incoming ALS Crew.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
