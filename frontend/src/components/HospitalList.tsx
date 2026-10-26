import React, { useState } from 'react';
import { Hospital } from '../types';
import { Icon } from './common/Icon';
import { Button } from './common/Button';
import { StatusChip } from './common/StatusChip';
import { FilterChip } from './common/FilterChip';
import { CountBadge } from './common/CountBadge';
import { ProgressBar } from './common/ProgressBar';
import { PhoneLink } from './common/PhoneLink';
import { ScrollPanel } from './common/ScrollPanel';

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
}) => {
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'DIVERSION' | 'ICU_READY'>('ALL');

  const counts = {
    all: hospitals.length,
    available: hospitals.filter((h) => h.status === 'AVAILABLE').length,
    icuReady: hospitals.filter((h) => (h.icuBedsAvailable ?? 0) > 0).length,
    diversion: hospitals.filter((h) => h.status === 'DIVERSION').length,
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      {/* Section Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px 8px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="local_hospital" size={20} style={{ color: 'var(--md-sys-color-primary)' }} />
          <h2 style={{ fontSize: '16px', lineHeight: '24px', fontWeight: 500, margin: 0, color: 'var(--md-sys-color-text)' }}>
            Hospital receiving centers
          </h2>
        </div>
        <CountBadge count={hospitals.length} tone="neutral" />
      </div>

      {/* Filter Chips: Every chip shows a count */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 16px 12px 16px', flexWrap: 'wrap' }}>
        <FilterChip
          label="All"
          count={counts.all}
          selected={filter === 'ALL'}
          onClick={() => setFilter('ALL')}
        />
        <FilterChip
          label="Available"
          count={counts.available}
          selected={filter === 'AVAILABLE'}
          onClick={() => setFilter('AVAILABLE')}
        />
        <FilterChip
          label="ICU ready"
          count={counts.icuReady}
          selected={filter === 'ICU_READY'}
          onClick={() => setFilter('ICU_READY')}
        />
        <FilterChip
          label="Diversion"
          count={counts.diversion}
          selected={filter === 'DIVERSION'}
          onClick={() => setFilter('DIVERSION')}
        />
      </div>

      {/* Scrollable Hospital Cards List */}
      <ScrollPanel style={{ flex: 1 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--md-sys-color-text-secondary)', fontSize: '13px' }}>
            No receiving facilities match the active filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map((hosp) => {
              const isAvailable = hosp.status === 'AVAILABLE';
              const isDiversion = hosp.status === 'DIVERSION';
              const icuAvail = hosp.icuBedsAvailable ?? 5;
              const traumaAvail = hosp.traumaBaysAvailable ?? 3;
              const erAvail = hosp.availableBeds ?? 48;
              const totalEr = 250;
              const totalIcu = 30;
              const totalTrauma = 10;

              return (
                <div
                  key={hosp.id}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--md-sys-color-outline)',
                    backgroundColor: 'var(--md-sys-color-surface)',
                    boxShadow: 'var(--elevation-1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'border-color 150ms ease, box-shadow 150ms ease',
                  }}
                >
                  {/* Top row: Hospital Name + StatusChip */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                      {hosp.name}
                    </div>
                    <StatusChip
                      label={isDiversion ? 'Diversion' : isAvailable ? 'Available' : 'Limited'}
                      tone={isDiversion ? 'error' : isAvailable ? 'success' : 'warning'}
                      size="small"
                    />
                  </div>

                  {/* Address with location icon */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--md-sys-color-text-secondary)' }}>
                    <Icon name="location_on" size={16} style={{ flexShrink: 0 }} />
                    <span>{hosp.address}</span>
                  </div>

                  {/* PhoneLink */}
                  {hosp.phone && (
                    <div>
                      <PhoneLink phone={hosp.phone} />
                    </div>
                  )}

                  {/* 3 Capacity rows with ProgressBars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', backgroundColor: 'var(--md-sys-color-surface-container)', borderRadius: '8px' }}>
                    <ProgressBar label="ER beds" current={erAvail} total={totalEr} />
                    <ProgressBar label="ICU beds" current={icuAvail} total={totalIcu} />
                    <ProgressBar label="Trauma bays" current={traumaAvail} total={totalTrauma} />
                  </div>

                  {/* Specialties as small chips */}
                  {(() => {
                    const specs = [
                      hosp.cardiacServices && 'Cardiac',
                      hosp.pediatricServices && 'Pediatrics',
                      hosp.maternityServices && 'Maternity',
                      hosp.icuAvailable && 'ICU',
                    ].filter(Boolean) as string[];

                    if (specs.length === 0) return null;

                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {specs.map((spec) => (
                          <span
                            key={spec}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--md-sys-color-surface-container-high)',
                              color: 'var(--md-sys-color-text-secondary)',
                              fontWeight: 500,
                            }}
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Action button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onSelectHospital(hosp)}
                    >
                      Select as destination
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollPanel>
    </div>
  );
};
