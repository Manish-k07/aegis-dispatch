import React, { useState, useEffect } from 'react';
import { Plane, Zap, X, ShieldAlert, CheckCircle2, Navigation, AlertTriangle } from 'lucide-react';
import { Emergency } from '../types';

interface DroneDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  emergency?: Emergency | null;
  onLaunchSuccess?: (droneId: string, payload: string) => void;
}

export const DroneDispatchModal: React.FC<DroneDispatchModalProps> = ({
  isOpen,
  onClose,
  emergency,
  onLaunchSuccess,
}) => {
  const [selectedPayload, setSelectedPayload] = useState<'AED' | 'NARCAN' | 'EPIPEN'>('AED');
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchedDrone, setLaunchedDrone] = useState<{ id: string; etaMinutes: number; battery: number } | null>(null);

  const handleLaunch = () => {
    setIsLaunching(true);
    setTimeout(() => {
      setIsLaunching(false);
      const droneInfo = {
        id: 'UAV-AERO-01',
        etaMinutes: 2.8,
        battery: 94,
      };
      setLaunchedDrone(droneInfo);
      if (onLaunchSuccess) {
        onLaunchSuccess(droneInfo.id, selectedPayload);
      }
    }, 1200);
  };

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
          padding: '26px 30px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Plane size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '17px', color: '#f8fafc', letterSpacing: '0.5px' }}>
                  Autonomous Drone First Responder (DFR) Launch
                </strong>
                <span style={{ fontSize: '10px', background: '#38bdf8', color: '#020617', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  AERO-RAPID
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                Sub-3-Minute Aerial Resuscitation Payload Deployment ahead of Ground ALS Crew
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

        {/* Launched state or Launch form */}
        {launchedDrone ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15), rgba(6, 95, 70, 0.25))',
                border: '1px solid #10b981',
                borderRadius: '14px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <CheckCircle2 size={36} className="text-emerald" style={{ margin: '0 auto 10px' }} />
              <strong style={{ fontSize: '16px', color: '#f8fafc', display: 'block', marginBottom: '4px' }}>
                DRONE {launchedDrone.id} AIRBORNE & EN ROUTE
              </strong>
              <div style={{ fontSize: '13px', color: '#6ee7b7' }}>
                Payload: <strong>{selectedPayload} Rapid Delivery</strong> · Battery: <strong>{launchedDrone.battery}%</strong>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc', marginTop: '12px' }}>
                Estimated Aerial Arrival: ~{launchedDrone.etaMinutes} mins
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                (Ground ALS Unit KA-01-AE-1001 ETA: 8.6 mins · Drone arrives <strong>5.8 minutes ahead</strong>)
              </div>
            </div>

            <button
              onClick={onClose}
              className="btn btn-sm btn-primary"
              style={{ padding: '10px 18px', width: '100%', fontWeight: 700 }}
            >
              Close & Monitor on Tactical Map
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Incident Destination info */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                Target Incident Coordinates:
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                {emergency?.address || 'Demo Junction, MG Road Metro Sector'}
              </div>
              <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>
                Acuity: <strong>{emergency?.priority || 'CRITICAL'}</strong> · Flight Distance: <strong>1.8 km Direct Line</strong>
              </div>
            </div>

            {/* Payload Selection Cards */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>
                Select Emergency Drone Payload:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedPayload('AED')}
                  style={{
                    background: selectedPayload === 'AED' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${selectedPayload === 'AED' ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '12px',
                    padding: '14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <Zap size={22} className={selectedPayload === 'AED' ? 'text-sky' : 'text-secondary'} style={{ margin: '0 auto 6px' }} />
                  <strong style={{ fontSize: '13px', display: 'block' }}>AED Defibrillator</strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Cardiac Arrest Protocol</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPayload('NARCAN')}
                  style={{
                    background: selectedPayload === 'NARCAN' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${selectedPayload === 'NARCAN' ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '12px',
                    padding: '14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <ShieldAlert size={22} className={selectedPayload === 'NARCAN' ? 'text-amber' : 'text-secondary'} style={{ margin: '0 auto 6px' }} />
                  <strong style={{ fontSize: '13px', display: 'block' }}>Naloxone (Narcan)</strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Opioid / Respiratory</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPayload('EPIPEN')}
                  style={{
                    background: selectedPayload === 'EPIPEN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${selectedPayload === 'EPIPEN' ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '12px',
                    padding: '14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <Navigation size={22} className={selectedPayload === 'EPIPEN' ? 'text-emerald' : 'text-secondary'} style={{ margin: '0 auto 6px' }} />
                  <strong style={{ fontSize: '13px', display: 'block' }}>EpiPen Auto-Injector</strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Anaphylaxis Shock</span>
                </button>
              </div>
            </div>

            {/* Launch Action */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-sm btn-outline"
                disabled={isLaunching}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLaunch}
                disabled={isLaunching}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 22px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
                }}
              >
                <Plane size={15} />
                <span>{isLaunching ? 'Authorizing Drone Launch...' : 'Confirm UAV Launch'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
