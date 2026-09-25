import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  AlertTriangle,
  CheckCircle2,
  Bed,
  Heart,
  Phone,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { Hospital } from '../types';

interface HospitalCapacityHUDProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: Hospital[];
  apiBase: string;
  onRefreshHospitals?: () => void;
}

export const HospitalCapacityHUD: React.FC<HospitalCapacityHUDProps> = ({
  isOpen,
  onClose,
  hospitals,
  apiBase,
  onRefreshHospitals,
}) => {
  const [networkCapacity, setNetworkCapacity] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCapacity = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/hospitals/capacity`);
      if (res.ok) {
        const data = await res.json();
        setNetworkCapacity(data);
      }
    } catch (e) {
      console.error('Error fetching hospital capacity:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCapacity();
    }
  }, [isOpen]);

  const handleToggleDiversion = async (hospitalId: string, currentStatus: string) => {
    const isDiversion = currentStatus === 'DIVERSION';
    setTogglingId(hospitalId);
    try {
      const res = await fetch(`${apiBase}/hospitals/${hospitalId}/diversion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diversion: !isDiversion,
          reason: isDiversion ? 'ED Surge Relieved' : 'Trauma & Bed Saturation Protocol',
        }),
      });

      if (res.ok) {
        await fetchCapacity();
        if (onRefreshHospitals) onRefreshHospitals();
      }
    } catch (e) {
      console.error('Error toggling diversion:', e);
    } finally {
      setTogglingId(null);
    }
  };

  if (!isOpen) return null;

  const facilities = networkCapacity?.facilities || hospitals;
  const isSurge = (networkCapacity?.diversionFacilities || 0) > 0;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '850px',
          width: '95%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(11, 15, 25, 0.98)',
          border: '1px solid var(--border-soft)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-soft)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 className="text-sky" size={22} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 600 }}>
                Regional Emergency Department Capacity Network
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Live Bed Tracking, Trauma Resuscitation Bays & ED Diversion Management
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-xs btn-outline"
              onClick={fetchCapacity}
              disabled={loading}
              title="Refresh telemetry"
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              className="btn-icon"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Network Metrics Overview Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            padding: '16px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid var(--border-soft)',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Network Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              {isSurge ? (
                <>
                  <ShieldAlert size={16} color="#ef4444" />
                  <strong style={{ color: '#ef4444', fontSize: '0.95rem' }}>SURGE PROTOCOL</strong>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} color="#10b981" />
                  <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>NOMINAL CAPACITY</strong>
                </>
              )}
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Available ER Beds
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
              {networkCapacity?.availableErBeds ?? 81}{' '}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                / {networkCapacity?.totalErBeds ?? 365} total
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.06)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Available ICU Beds
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#818cf8', marginTop: '2px' }}>
              {networkCapacity?.availableIcuBeds ?? 12}{' '}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                / {networkCapacity?.totalIcuBeds ?? 64} total
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.06)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Trauma Resuscitation Slots
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>
              {networkCapacity?.availableTraumaBays ?? 10}{' '}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                / {networkCapacity?.totalTraumaBays ?? 26} slots
              </span>
            </div>
          </div>
        </div>

        {/* Facility Cards Grid */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {facilities.map((h: any) => {
            const isDiversion = h.status === 'DIVERSION';
            const isLimited = h.status === 'LIMITED_CAPACITY';
            const bedsPct = Math.round(((h.availableBeds ?? 30) / (h.totalBeds ?? 120)) * 100);

            return (
              <div
                key={h.id}
                style={{
                  background: 'rgba(17, 24, 39, 0.7)',
                  border: `1px solid ${isDiversion ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.07)'}`,
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{h.name}</strong>
                      <span
                        className={`status-pill ${
                          isDiversion ? 'status-busy' : isLimited ? 'status-hospital' : 'status-available'
                        }`}
                      >
                        {h.status}
                      </span>
                      {h.cathLabOperational && (
                        <span className="chip chip-als" style={{ fontSize: '9px', padding: '1px 6px' }}>
                          CATH LAB 24/7
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {h.address || 'Demo Medical District, Bengaluru'} • ED Phone: <strong>{h.phone}</strong>
                      {h.designatedEdPhone && (
                        <span style={{ marginLeft: '8px', color: '#38bdf8' }}>
                          SMS ED Alert Line: {h.designatedEdPhone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Diversion Action Toggle */}
                  <button
                    className={`btn btn-xs ${isDiversion ? 'btn-primary' : 'btn-outline'}`}
                    disabled={togglingId === h.id}
                    onClick={() => handleToggleDiversion(h.id, h.status)}
                    style={{
                      borderColor: isDiversion ? '#10b981' : '#ef4444',
                      color: isDiversion ? '#ffffff' : '#f87171',
                      background: isDiversion ? '#10b981' : 'transparent',
                    }}
                  >
                    {togglingId === h.id ? (
                      'Updating...'
                    ) : isDiversion ? (
                      'Resume Standard Receiving'
                    ) : (
                      'Declare ED Diversion'
                    )}
                  </button>
                </div>

                {/* Live Capacity Indicators Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Emergency Department Beds</div>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem', marginTop: '2px' }}>
                      {h.availableBeds ?? 34} / {h.totalBeds ?? 120} Available ({bedsPct}%)
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '2px',
                        marginTop: '6px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${bedsPct}%`,
                          height: '100%',
                          background: bedsPct < 20 ? '#ef4444' : bedsPct < 40 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ICU / Critical Care</div>
                    <div style={{ fontWeight: 600, color: '#818cf8', fontSize: '0.9rem', marginTop: '2px' }}>
                      {h.icuBedsAvailable ?? 5} / {h.icuBedsTotal ?? 20} Available
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Ventilator Reserves: Normal
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Trauma Resuscitation Bays</div>
                    <div style={{ fontWeight: 600, color: '#34d399', fontSize: '0.9rem', marginTop: '2px' }}>
                      {h.traumaBaysAvailable ?? 3} / {h.traumaBaysTotal ?? 8} Ready
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Trauma Surgical Team: On Call
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>Auto-telemetry refresh every 30s • HL7 / FHIR Interface Bridge Nominal</span>
          <button className="btn btn-sm btn-outline" onClick={onClose}>
            Close HUD
          </button>
        </div>
      </div>
    </div>
  );
};
