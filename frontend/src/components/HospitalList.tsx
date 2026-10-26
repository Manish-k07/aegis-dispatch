import React, { useState } from 'react';
import { Hospital } from '../types';
import { Icon } from './common/Icon';
import { Chip } from './common/Chip';
import { Button } from './common/Button';

interface HospitalListProps {
  hospitals: Hospital[];
  searchQuery?: string;
  onSelectHospital: (hospital: Hospital) => void;
  onOpenHospitalDashboard?: (hospital: Hospital) => void;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="local_hospital" size={18} style={{ color: 'var(--md-sys-color-primary)' }} />
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
            Hospital receiving centers
          </h2>
        </div>
        <Chip label={`${hospitals.length} centers`} size="small" />
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: `All (${hospitals.length})` },
          { id: 'AVAILABLE', label: 'Available' },
          { id: 'ICU_READY', label: 'ICU ready' },
          { id: 'DIVERSION', label: 'Diversion' },
        ].map((tab) => (
          <Chip
            key={tab.id}
            label={tab.label}
            selected={filter === tab.id}
            onClick={() => setFilter(tab.id as any)}
            size="small"
          />
        ))}
      </div>

      <div className="fleet-list">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '13px' }}>
            No receiving facilities match the active filter.
          </div>
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
                onClick={() => onSelectHospital(hosp)}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--md-sys-color-outline)',
                  backgroundColor: 'var(--md-sys-color-surface)',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface)' }}>
                      {hosp.name}
                    </strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '2px' }}>
                      <Icon name="location_on" size={14} style={{ flexShrink: 0 }} />
                      <span>{hosp.address}</span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: isDiversion
                        ? 'var(--md-sys-color-error-container)'
                        : isAvailable
                        ? 'var(--md-sys-color-success-container)'
                        : 'var(--md-sys-color-surface-container-high)',
                      color: isDiversion
                        ? 'var(--md-sys-color-error)'
                        : isAvailable
                        ? 'var(--md-sys-color-success)'
                        : 'var(--md-sys-color-on-surface-variant)',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {hosp.status.toLowerCase().replace(/_/g, ' ')}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '8px' }}>
                  <span>Phone: <strong style={{ fontFamily: 'Roboto Mono, monospace' }}>{hosp.phone}</strong></span>
                </div>

                {/* Live Capacity Indicators */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    margin: '8px 0',
                    backgroundColor: 'var(--md-sys-color-surface-container-low)',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>ER beds</div>
                    <strong style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface)', fontFamily: 'Roboto Mono, monospace' }}>
                      {bedsAvail} <span style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)' }}>/ {hosp.totalBeds ?? 120}</span>
                    </strong>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>ICU bays</div>
                    <strong style={{ fontSize: '13px', color: icuAvail <= 2 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)', fontFamily: 'Roboto Mono, monospace' }}>
                      {icuAvail} <span style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)' }}>/ {hosp.icuBedsTotal ?? 20}</span>
                    </strong>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>Trauma bays</div>
                    <strong style={{ fontSize: '13px', color: 'var(--md-sys-color-success)', fontFamily: 'Roboto Mono, monospace' }}>
                      {traumaAvail} <span style={{ fontSize: '10px', color: 'var(--md-sys-color-on-surface-variant)' }}>/ {hosp.traumaBaysTotal ?? 8}</span>
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <div>
                    {hosp.cathLabOperational && (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--md-sys-color-surface-container-high)',
                          color: 'var(--md-sys-color-on-surface-variant)',
                        }}
                      >
                        Cath lab 24/7
                      </span>
                    )}
                  </div>

                  {onOpenHospitalDashboard && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenHospitalDashboard(hosp);
                      }}
                      endIcon={<Icon name="open_in_new" size={14} />}
                    >
                      Open ED
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
