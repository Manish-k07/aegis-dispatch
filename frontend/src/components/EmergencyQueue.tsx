import React, { useState, useEffect } from 'react';
import { Emergency } from '../types';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Icon } from './common/Icon';
import { StatusChip } from './common/StatusChip';
import { EmptyState } from './common/EmptyState';

interface EmergencyQueueProps {
  emergencies: Emergency[];
  selectedEmergency: Emergency | null;
  searchQuery?: string;
  onSelectEmergency: (e: Emergency) => void;
  onAutoAssign?: (emergencyId: string) => void;
  onAutoAssignNext?: () => void;
  onResetData?: () => void;
  onClearSearch?: () => void;
}

type FilterType = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM';

export const EmergencyQueue: React.FC<EmergencyQueueProps> = ({
  emergencies,
  selectedEmergency,
  searchQuery = '',
  onSelectEmergency,
  onAutoAssign,
  onResetData,
  onClearSearch,
}) => {
  const [filter, setFilter] = useState<FilterType>('ALL');

  // Relative elapsed time auto-refresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const ms = Date.now() - d.getTime();
      const mins = Math.floor(ms / 60000);
      if (mins < 1) return '< 1m ago';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m ago`;
    } catch {
      return '';
    }
  };

  const toSentenceCase = (text: string) => {
    if (!text) return '';
    const clean = text.replace(/_/g, ' ').toLowerCase();
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const isClosedStatus = (status?: string) => {
    if (!status) return false;
    const s = status.trim().toUpperCase();
    return s === 'COMPLETED' || s === 'CANCELLED' || s === 'RESOLVED' || s === 'CLOSED';
  };

  const filtered = emergencies.filter((e) => {
    if (isClosedStatus(e.status)) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        (e.type || '').toLowerCase().includes(q) ||
        (e.address || '').toLowerCase().includes(q) ||
        (e.callerName && e.callerName.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.id || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    const p = (e.priority || 'MEDIUM').toUpperCase();
    if (filter === 'CRITICAL') return p === 'CRITICAL';
    if (filter === 'HIGH') return p === 'HIGH';
    if (filter === 'MEDIUM') return p === 'MEDIUM' || p === 'LOW';

    return true;
  });

  const filterChips: { id: FilterType; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'CRITICAL', label: 'P1-Critical' },
    { id: 'HIGH', label: 'P2-High' },
    { id: 'MEDIUM', label: 'P3-Medium' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Filter chips: All, P1-Critical, P2-High, P3-Medium */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 16px 0',
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        {filterChips.map((chip) => {
          const isActive = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isActive ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)',
                backgroundColor: isActive
                  ? 'var(--md-sys-color-primary-container)'
                  : 'var(--md-sys-color-surface)',
                color: isActive
                  ? 'var(--md-sys-color-on-primary-container)'
                  : 'var(--md-sys-color-text)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'background-color 150ms ease, border-color 150ms ease',
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Incident List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No active incidents"
            description={
              filter !== 'ALL' || Boolean(searchQuery)
                ? 'No incidents match the active filter criteria.'
                : 'All reported incidents have been dispatched or completed.'
            }
            action={
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {(filter !== 'ALL' || Boolean(searchQuery)) && (
                  <Button
                    variant="filled"
                    size="standard"
                    icon="filter_alt_off"
                    onClick={() => {
                      setFilter('ALL');
                      if (onClearSearch) onClearSearch();
                    }}
                  >
                    Reset filters
                  </Button>
                )}
                {onResetData && (
                  <Button
                    variant="outlined"
                    size="standard"
                    icon="refresh"
                    onClick={onResetData}
                  >
                    Restore demo incidents
                  </Button>
                )}
              </div>
            }
          />
        ) : (
          filtered.map((em) => {
            const isSelected = selectedEmergency?.id === em.id;
            const isPending = em.status === 'PENDING_DISPATCH' || em.status === 'CREATED';
            const shortId = em.id.startsWith('em-') ? em.id : `INC-${em.id.slice(0, 6)}`;

            return (
              <Card
                key={em.id}
                padding={16}
                interactive
                onClick={() => onSelectEmergency(em)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  borderColor: isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)',
                  boxShadow: isSelected ? '0 0 0 1px var(--md-sys-color-primary)' : 'none',
                }}
              >
                {/* 1. Header: Priority chip + incident ID in mono + time ago in Roboto */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusChip
                      tone={
                        em.priority === 'CRITICAL'
                          ? 'critical'
                          : em.priority === 'HIGH'
                          ? 'high'
                          : em.priority === 'MEDIUM'
                          ? 'medium'
                          : 'low'
                      }
                      label={em.priority === 'CRITICAL' ? 'Critical' : em.priority === 'HIGH' ? 'High' : 'Medium'}
                      icon={em.priority === 'CRITICAL' ? 'warning' : 'report'}
                    />
                    <span
                      className="mono"
                      style={{
                        fontSize: '12px',
                        color: 'var(--md-sys-color-text-secondary)',
                      }}
                    >
                      {shortId}
                    </span>
                  </div>
                  {/* Time ago (Roboto, NOT mono) */}
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--md-sys-color-text-secondary)',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                  >
                    {formatElapsed(em.createdAt)}
                  </span>
                </div>

                {/* 2. Type in sentence case (16px medium) */}
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: '24px',
                    color: 'var(--md-sys-color-text)',
                  }}
                >
                  {toSentenceCase(em.type)}
                </div>

                {/* 3. Address with 20px 'place' icon */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '14px',
                    color: 'var(--md-sys-color-text-secondary)',
                    lineHeight: '20px',
                  }}
                >
                  <Icon name="place" size={20} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{em.address}</span>
                </div>

                {/* 4. Assigned unit or "Unassigned" chip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isPending ? (
                    <StatusChip tone="warning" label="Unassigned" icon="schedule" />
                  ) : (
                    <StatusChip tone="success" label="Unit assigned" icon="check_circle" />
                  )}
                  {em.patientCount && em.patientCount > 1 && (
                    <span style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                      · {em.patientCount} patients
                    </span>
                  )}
                </div>

                {/* 5. Divider */}
                <div
                  style={{
                    height: '1px',
                    backgroundColor: 'var(--md-sys-color-outline)',
                    width: '100%',
                  }}
                />

                {/* 6. Actions row: right-aligned, 8px gap: outlined "Auto-assign" + filled "Review" (40px tall) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                  }}
                >
                  {isPending && onAutoAssign && (
                    <Button
                      variant="outlined"
                      size="standard"
                      icon="bolt"
                      style={{ height: '40px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAutoAssign(em.id);
                      }}
                    >
                      Auto-assign
                    </Button>
                  )}
                  <Button
                    variant="filled"
                    size="standard"
                    style={{ height: '40px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEmergency(em);
                    }}
                  >
                    Review
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
