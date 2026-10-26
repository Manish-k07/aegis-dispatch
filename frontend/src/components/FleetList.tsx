import React, { useState } from 'react';
import { Ambulance } from '../types';
import { Icon } from './common/Icon';
import { Chip } from './common/Chip';
import { Button } from './common/Button';

interface FleetListProps {
  ambulances: Ambulance[];
  searchQuery?: string;
  onOpenDriverDashboard?: (ambulance: Ambulance) => void;
}

export const FleetList: React.FC<FleetListProps> = ({
  ambulances,
  searchQuery = '',
  onOpenDriverDashboard,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'MISSION' | 'ALS' | 'BLS'>('ALL');

  const filtered = ambulances.filter((amb) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        amb.registrationNumber.toLowerCase().includes(q) ||
        (amb.driverName && amb.driverName.toLowerCase().includes(q)) ||
        (amb.emtName && amb.emtName.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (filter === 'AVAILABLE') return amb.status === 'AVAILABLE';
    if (filter === 'MISSION') return amb.status !== 'AVAILABLE' && amb.status !== 'OUT_OF_SERVICE';
    if (filter === 'ALS') return amb.type === 'ALS';
    if (filter === 'BLS') return amb.type === 'BLS';
    return true;
  });

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="ambulance" size={18} style={{ color: 'var(--md-sys-color-primary)' }} />
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
            Fleet status
          </h2>
        </div>
        <Chip label={`${ambulances.length} units`} size="small" />
      </div>

      {/* Filter Tabs / Chips */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: 'All' },
          { id: 'AVAILABLE', label: 'Available' },
          { id: 'MISSION', label: 'On mission' },
          { id: 'ALS', label: 'ALS' },
          { id: 'BLS', label: 'BLS' },
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
            No ambulances match the active filter.
          </div>
        ) : (
          filtered.map((amb) => {
            const isAvailable = amb.status === 'AVAILABLE';
            const isALS = amb.type === 'ALS';

            return (
              <div
                key={amb.id}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--md-sys-color-outline)',
                  backgroundColor: 'var(--md-sys-color-surface)',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isAvailable
                          ? 'var(--md-sys-color-success)'
                          : 'var(--md-sys-color-warning)',
                        display: 'inline-block',
                      }}
                    />
                    <strong
                      style={{
                        fontFamily: 'Roboto Mono, monospace',
                        fontSize: '13px',
                        color: 'var(--md-sys-color-on-surface)',
                      }}
                    >
                      {amb.registrationNumber}
                    </strong>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--md-sys-color-surface-container-high)',
                        color: 'var(--md-sys-color-on-surface-variant)',
                        fontWeight: 600,
                      }}
                    >
                      {amb.type}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: isAvailable
                        ? 'var(--md-sys-color-success)'
                        : 'var(--md-sys-color-on-surface-variant)',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}
                  >
                    {amb.status.toLowerCase().replace(/_/g, ' ')}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '8px' }}>
                  <span>Driver: <strong>{amb.driverName || 'N/A'}</strong></span> · <span>EMT: <strong>{amb.emtName || 'N/A'}</strong></span>
                </div>

                {/* Capabilities with clean sentence case */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {(isALS
                    ? ['Defibrillator', 'Ventilator', 'IV access']
                    : ['O2 therapy', 'First aid', 'Stretcher']
                  ).map((cap) => (
                    <span
                      key={cap}
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--md-sys-color-surface-container-low)',
                        color: 'var(--md-sys-color-on-surface-variant)',
                        border: '1px solid var(--md-sys-color-outline-variant)',
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'var(--md-sys-color-on-surface-variant)',
                    borderTop: '1px solid var(--md-sys-color-outline-variant)',
                    paddingTop: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="speed" size={14} />
                      <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{amb.speed} km/h</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="navigation" size={14} />
                      <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{amb.heading}°</span>
                    </span>
                  </div>

                  {onOpenDriverDashboard && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => onOpenDriverDashboard(amb)}
                      endIcon={<Icon name="open_in_new" size={14} />}
                    >
                      Open MDT
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
