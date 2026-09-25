import React, { useState } from 'react';
import { Building2, Bed, Heart, Activity, Phone, MapPin, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Hospital } from '../types';

interface HospitalListProps {
  hospitals: Hospital[];
  searchQuery?: string;
  onSelectHospital: (hospital: Hospital) => void;
  onOpenHospitalDashboard: (hospital: Hospital) => void;
}

export const HospitalList: React.FC<HospitalListProps> = ({
  hospitals,
  searchQuery = '',
  onSelectHospital,
  onOpenHospitalDashboard,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'DIVERSION' | 'ICU_READY'>('ALL');

  const filtered = hospitals.filter((h) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        h.name.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        (h.phone && h.phone.includes(q));
      if (!match) return false;
    }

    if (filter === 'AVAILABLE') return h.status === 'AVAILABLE';
    if (filter === 'DIVERSION') return h.status === 'DIVERSION';
    if (filter === 'ICU_READY') return (h.icuBedsAvailable ?? 0) > 0;
    return true;
  });

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-sky" />
          <h2>Emergency Departments & Trauma Centers</h2>
        </div>
        <span className="badge-count text-sky">{hospitals.length} Centers</span>
      </div>

      <div className="filter-tabs">
        <button
          className={`tab-btn ${filter === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilter('ALL')}
        >
          All ({hospitals.length})
        </button>
        <button
          className={`tab-btn ${filter === 'AVAILABLE' ? 'active' : ''}`}
          onClick={() => setFilter('AVAILABLE')}
        >
          Available
        </button>
        <button
          className={`tab-btn ${filter === 'ICU_READY' ? 'active' : ''}`}
          onClick={() => setFilter('ICU_READY')}
        >
          ICU Ready
        </button>
        <button
          className={`tab-btn ${filter === 'DIVERSION' ? 'active' : ''}`}
          onClick={() => setFilter('DIVERSION')}
        >
          Diversion
        </button>
      </div>

      <div className="fleet-list">
        {filtered.length === 0 ? (
          <div className="empty-state">No receiving facilities match the active filter.</div>
        ) : (
          filtered.map((hosp) => {
            const isAvailable = hosp.status === 'AVAILABLE';
            const isDiversion = hosp.status === 'DIVERSION';
            const icuAvail = hosp.icuBedsAvailable ?? 5;
            const traumaAvail = hosp.traumaBaysAvailable ?? 3;
            const bedsAvail = hosp.availableBeds ?? 30;

            return (
              <div
                key={hosp.id}
                className="fleet-card"
                style={{
                  borderLeft: `4px solid ${isDiversion ? '#ef4444' : isAvailable ? '#10b981' : '#f59e0b'}`,
                  cursor: 'pointer',
                }}
                onClick={() => onSelectHospital(hosp)}
              >
                <div className="fleet-card-header">
                  <div>
                    <strong style={{ fontSize: '14px', color: '#f8fafc' }}>{hosp.name}</strong>
                    <div className="flex items-center gap-1 text-xs text-secondary mt-1">
                      <MapPin size={11} />
                      <span>{hosp.address}</span>
                    </div>
                  </div>
                  <span
                    className={`status-pill ${
                      isDiversion ? 'status-busy' : isAvailable ? 'status-available' : 'status-hospital'
                    }`}
                  >
                    {hosp.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="fleet-crew text-secondary text-xs flex items-center justify-between mt-1">
                  <span>ED Phone: <strong>{hosp.phone}</strong></span>
                  {hosp.designatedEdPhone && (
                    <span>SMS Carrier: <strong style={{ color: '#38bdf8' }}>{hosp.designatedEdPhone}</strong></span>
                  )}
                </div>

                {/* Live Capacity Indicators */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    margin: '8px 0',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '6px 8px',
                    borderRadius: '6px',
                  }}
                >
                  <div className="text-center">
                    <div className="text-xs text-muted">ER Beds</div>
                    <strong style={{ color: '#f8fafc', fontSize: '13px' }}>
                      {bedsAvail} <span style={{ fontSize: '10px', color: '#64748b' }}>/ {hosp.totalBeds ?? 120}</span>
                    </strong>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted">ICU Bays</div>
                    <strong style={{ color: icuAvail <= 2 ? '#fb7185' : '#38bdf8', fontSize: '13px' }}>
                      {icuAvail} <span style={{ fontSize: '10px', color: '#64748b' }}>/ {hosp.icuBedsTotal ?? 20}</span>
                    </strong>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted">Trauma Bays</div>
                    <strong style={{ color: '#34d399', fontSize: '13px' }}>
                      {traumaAvail} <span style={{ fontSize: '10px', color: '#64748b' }}>/ {hosp.traumaBaysTotal ?? 8}</span>
                    </strong>
                  </div>
                </div>

                {/* Action button to open full Hospital Dashboard */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-light">
                  <span className="text-xs text-secondary flex items-center gap-1">
                    {hosp.cathLabOperational ? (
                      <span className="chip chip-als" style={{ padding: '2px 6px', fontSize: '9px' }}>
                        CATH LAB 24/7
                      </span>
                    ) : null}
                  </span>

                  <button
                    className="btn btn-xs btn-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenHospitalDashboard(hosp);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: '#10b981',
                      borderColor: 'rgba(16, 185, 129, 0.4)',
                      background: 'rgba(16, 185, 129, 0.08)',
                    }}
                    title="Launch full Hospital Emergency Reception Console"
                  >
                    <span>Open Hospital Dashboard</span>
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
