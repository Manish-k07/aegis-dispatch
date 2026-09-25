import React, { useState } from 'react';
import {
  Building2,
  Activity,
  Bed,
  Heart,
  Wind,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  X,
  Phone,
  ArrowRight,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { Hospital } from '../types';

interface HospitalCapacityHUDProps {
  hospitals: Hospital[];
  onClose: () => void;
  onUpdateHospitalCapacity: (hospitalId: string, capacity: Partial<Hospital>) => void;
}

export const HospitalCapacityHUD: React.FC<HospitalCapacityHUDProps> = ({
  hospitals,
  onClose,
  onUpdateHospitalCapacity,
}) => {
  const [filterDiversionOnly, setFilterDiversionOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate totals
  const totalGeneralBeds = hospitals.reduce((acc, h) => acc + (h.totalBeds ?? 120), 0);
  const availGeneralBeds = hospitals.reduce((acc, h) => acc + (h.availableBeds ?? 30), 0);
  const totalIcuBeds = hospitals.reduce((acc, h) => acc + (h.icuBedsTotal ?? 20), 0);
  const availIcuBeds = hospitals.reduce((acc, h) => acc + (h.icuBedsAvailable ?? 5), 0);
  const totalTraumaBays = hospitals.reduce((acc, h) => acc + (h.traumaBaysTotal ?? 8), 0);
  const availTraumaBays = hospitals.reduce((acc, h) => acc + (h.traumaBaysAvailable ?? 3), 0);
  const estVentilatorsAvail = Math.round(availIcuBeds * 0.9);
  const diversionCount = hospitals.filter((h) => h.status === 'DIVERSION').length;

  const filteredHospitals = hospitals.filter((h) => {
    if (filterDiversionOnly && h.status !== 'DIVERSION') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        h.name.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        (h.phone && h.phone.includes(q))
      );
    }
    return true;
  });

  const handleToggleDiversion = (h: Hospital) => {
    const nextStatus = h.status === 'DIVERSION' ? 'AVAILABLE' : 'DIVERSION';
    onUpdateHospitalCapacity(h.id, { status: nextStatus });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog hospital-capacity-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '960px', width: '95vw', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="brand-logo-soft" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <Building2 size={22} />
            </div>
            <div>
              <h2>Regional Hospital ED & Trauma Capacity Network</h2>
              <p className="modal-subtitle">
                Live telemetry tracking ICU bays, trauma resus slots, ventilator reserves, and EMS diversion routing.
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title="Close HUD">
            <X size={20} />
          </button>
        </div>

        {/* Network Metrics Overview */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
            }}
          >
            <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '12px', borderRadius: '8px' }}>
              <div className="flex items-center justify-between text-xs text-secondary mb-1">
                <span>ER GENERAL BEDS</span>
                <Bed size={14} className="text-sky" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
                {availGeneralBeds} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ {totalGeneralBeds}</span>
              </div>
              <span className="text-xs text-muted">
                {Math.round(((totalGeneralBeds - availGeneralBeds) / totalGeneralBeds) * 100)}% Occupancy
              </span>
            </div>

            <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '12px', borderRadius: '8px' }}>
              <div className="flex items-center justify-between text-xs text-secondary mb-1">
                <span>ICU / CCU BEDS</span>
                <Heart size={14} className="text-rose" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: availIcuBeds <= 3 ? '#fb7185' : '#f8fafc' }}>
                {availIcuBeds} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ {totalIcuBeds}</span>
              </div>
              <span className="text-xs text-muted">Immediate Critical Care</span>
            </div>

            <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '12px', borderRadius: '8px' }}>
              <div className="flex items-center justify-between text-xs text-secondary mb-1">
                <span>TRAUMA RESUS BAYS</span>
                <Activity size={14} className="text-amber" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
                {availTraumaBays} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ {totalTraumaBays}</span>
              </div>
              <span className="text-xs text-muted">Level 1 & 2 Trauma Ready</span>
            </div>

            <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '12px', borderRadius: '8px' }}>
              <div className="flex items-center justify-between text-xs text-secondary mb-1">
                <span>VENTILATORS READY</span>
                <Wind size={14} className="text-emerald" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>
                {estVentilatorsAvail} <span style={{ fontSize: '13px', color: '#94a3b8' }}>Est. Avail</span>
              </div>
              <span className="text-xs text-muted">Invasive & Non-invasive</span>
            </div>

            <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '12px', borderRadius: '8px' }}>
              <div className="flex items-center justify-between text-xs text-secondary mb-1">
                <span>ON DIVERSION</span>
                <AlertTriangle size={14} className={diversionCount > 0 ? 'text-amber' : 'text-muted'} />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: diversionCount > 0 ? '#f59e0b' : '#10b981' }}>
                {diversionCount} <span style={{ fontSize: '13px', color: '#94a3b8' }}>Facilities</span>
              </div>
              <span className="text-xs text-muted">EMS Reroute Enforced</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-3 mt-1" style={{ flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search facility name, address or ED hotline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#f8fafc',
                fontSize: '13px',
                flex: '1',
                minWidth: '220px',
              }}
            />

            <div className="flex items-center gap-2">
              <button
                className={`btn btn-sm ${filterDiversionOnly ? 'btn-danger' : 'btn-outline'}`}
                onClick={() => setFilterDiversionOnly(!filterDiversionOnly)}
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <AlertTriangle size={13} />
                <span>{filterDiversionOnly ? 'Showing Diversion Only' : 'Show Diversion Only'}</span>
              </button>
            </div>
          </div>

          {/* Hospitals Facility List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredHospitals.map((h) => {
              const isDiversion = h.status === 'DIVERSION';
              const icuAvail = h.icuBedsAvailable ?? 5;
              const traumaAvail = h.traumaBaysAvailable ?? 3;
              const generalAvail = h.availableBeds ?? 30;
              const ventAvail = Math.max(1, Math.round(icuAvail * 0.9));

              return (
                <div
                  key={h.id}
                  style={{
                    background: isDiversion ? 'rgba(239, 68, 68, 0.06)' : '#0b1329',
                    border: `1px solid ${isDiversion ? '#ef4444' : '#1e293b'}`,
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div className="flex items-start justify-between gap-3" style={{ flexWrap: 'wrap' }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: 600 }}>
                          {h.name}
                        </h3>
                        <span
                          className={`badge ${
                            isDiversion
                              ? 'badge-danger'
                              : h.status === 'AVAILABLE'
                              ? 'badge-success'
                              : 'badge-warning'
                          }`}
                          style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        >
                          {h.status.replace(/_/g, ' ')}
                        </span>
                        {h.cathLabOperational && (
                          <span
                            className="badge badge-info"
                            style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}
                          >
                            CATH LAB 24/7
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                        {h.address}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#64748b' }}>
                        <span>ED Hotline: <strong style={{ color: '#94a3b8' }}>{h.phone}</strong></span>
                        {h.designatedEdPhone && (
                          <>
                            <span>·</span>
                            <span>Dedicated Inbound SMS: <strong style={{ color: '#38bdf8' }}>{h.designatedEdPhone}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Diversion Action Toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleDiversion(h)}
                        className={`btn btn-sm ${isDiversion ? 'btn-success' : 'btn-outline-danger'}`}
                        style={{
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          borderColor: isDiversion ? '#10b981' : '#ef4444',
                          color: isDiversion ? '#10b981' : '#f87171',
                        }}
                        title={isDiversion ? 'Clear diversion status and accept ambulances' : 'Place ED on diversion'}
                      >
                        {isDiversion ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Clear Diversion</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={13} />
                            <span>Declare Diversion</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Resource Gauges */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '8px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                    }}
                  >
                    <div>
                      <div className="text-xs text-muted">ER Beds</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                        {generalAvail} <span style={{ fontSize: '11px', color: '#64748b' }}>/ {h.totalBeds ?? 120}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted">ICU Reserves</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: icuAvail <= 2 ? '#f87171' : '#f8fafc' }}>
                        {icuAvail} <span style={{ fontSize: '11px', color: '#64748b' }}>/ {h.icuBedsTotal ?? 20}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted">Trauma Resus Bays</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: traumaAvail <= 1 ? '#f59e0b' : '#f8fafc' }}>
                        {traumaAvail} <span style={{ fontSize: '11px', color: '#64748b' }}>/ {h.traumaBaysTotal ?? 8}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted">Ventilators</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#34d399' }}>
                        {ventAvail} <span style={{ fontSize: '11px', color: '#64748b' }}>Ready</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid #1e293b', padding: '12px 16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Capacity Monitor
          </button>
        </div>
      </div>
    </div>
  );
};
