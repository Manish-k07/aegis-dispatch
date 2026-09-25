import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, MapPin, Users, Send, Phone, AlertTriangle, Zap, CheckCircle2, History } from 'lucide-react';
import { Emergency } from '../types';

interface EmergencyQueueProps {
  emergencies: Emergency[];
  selectedEmergency: Emergency | null;
  searchQuery?: string;
  onSelectEmergency: (e: Emergency) => void;
  onAutoAssign?: (emergencyId: string) => void;
  onAutoAssignNext?: () => void;
  onResetData?: () => void;
}

export const EmergencyQueue: React.FC<EmergencyQueueProps> = ({
  emergencies,
  selectedEmergency,
  searchQuery = '',
  onSelectEmergency,
  onAutoAssign,
  onAutoAssignNext,
  onResetData,
}) => {
  const [filter, setFilter] = useState<'ACTIVE' | 'CRITICAL' | 'HIGH' | 'PENDING' | 'SHIFT_LOG'>('ACTIVE');

  // Auto-tick every 15s so relative elapsed time badges refresh continuously without page reloads
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  // Filter out completed & cancelled from primary active queues to prevent cognitive overload & SLA confusion
  const filtered = emergencies.filter((e) => {
    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        e.type.toLowerCase().includes(q) ||
        e.address.toLowerCase().includes(q) ||
        (e.callerName && e.callerName.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q));
      if (!match) return false;
    }

    const isClosed = ['COMPLETED', 'CANCELLED'].includes(e.status);

    if (filter === 'ACTIVE') return !isClosed;
    if (filter === 'CRITICAL') return !isClosed && e.priority === 'CRITICAL';
    if (filter === 'HIGH') return !isClosed && e.priority === 'HIGH';
    if (filter === 'PENDING') return !isClosed && (e.status === 'PENDING_DISPATCH' || e.status === 'CREATED');
    if (filter === 'SHIFT_LOG') return isClosed;

    return !isClosed;
  });

  const activeEmergencies = emergencies.filter((e) => !['COMPLETED', 'CANCELLED'].includes(e.status));
  const closedCount = emergencies.filter((e) => ['COMPLETED', 'CANCELLED'].includes(e.status)).length;

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

  const isOverdue = (dateStr?: string, status?: string) => {
    if (!dateStr || !status || ['COMPLETED', 'CANCELLED'].includes(status)) return false;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      const ms = Date.now() - d.getTime();
      return ms > 15 * 60 * 1000; // 15 mins SLA threshold
    } catch {
      return false;
    }
  };

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-red" />
          <h2>Emergency Incident Queue</h2>
        </div>
        <div className="flex items-center gap-2">
          {onAutoAssignNext && activeEmergencies.some((e) => e.status === 'PENDING_DISPATCH' || e.status === 'CREATED') && (
            <button
              className="btn btn-xs btn-primary btn-auto-head"
              onClick={onAutoAssignNext}
              title="Automatically dispatch nearest ambulance to highest priority incident"
            >
              <Zap size={11} />
              <span>⚡ Auto-Dispatch Next</span>
            </button>
          )}
          <span className="badge-count text-red">{activeEmergencies.length} Active</span>
        </div>
      </div>

      {/* Segmented Queue Filter Navigation */}
      <div className="filter-tabs">
        <button
          className={`tab-btn ${filter === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => setFilter('ACTIVE')}
          title="Active incoming and en-route emergency calls"
        >
          Active ({activeEmergencies.length})
        </button>
        <button
          className={`tab-btn ${filter === 'CRITICAL' ? 'active' : ''}`}
          onClick={() => setFilter('CRITICAL')}
        >
          Critical
        </button>
        <button
          className={`tab-btn ${filter === 'HIGH' ? 'active' : ''}`}
          onClick={() => setFilter('HIGH')}
        >
          High
        </button>
        <button
          className={`tab-btn ${filter === 'PENDING' ? 'active' : ''}`}
          onClick={() => setFilter('PENDING')}
        >
          Pending
        </button>
        <button
          className={`tab-btn ${filter === 'SHIFT_LOG' ? 'active' : ''}`}
          onClick={() => setFilter('SHIFT_LOG')}
          title="Historical closed incidents in current shift"
        >
          Shift Log ({closedCount})
        </button>
      </div>

      <div className="queue-list">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px 12px' }}>
            <p style={{ margin: 0, color: '#94a3b8' }}>
              {filter === 'SHIFT_LOG'
                ? 'No closed incidents in current shift log.'
                : 'Zero active incidents matching current filters.'}
            </p>
            {filter !== 'SHIFT_LOG' && onResetData && (
              <button
                className="btn btn-sm btn-primary"
                onClick={onResetData}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}
                title="Seed 3 active high-acuity emergency calls into the dispatch queue"
              >
                <Zap size={13} />
                <span>🚨 Seed Live Emergency Calls</span>
              </button>
            )}
          </div>
        ) : (
          filtered.map((em) => {
            const isSelected = selectedEmergency?.id === em.id;
            const isPending = em.status === 'PENDING_DISPATCH' || em.status === 'CREATED';
            const isCritical = em.priority === 'CRITICAL';
            const isClosed = ['COMPLETED', 'CANCELLED'].includes(em.status);
            const slaBreach = isOverdue(em.createdAt, em.status);

            return (
              <div
                key={em.id}
                className={`incident-card ${em.priority.toLowerCase()} ${isSelected ? 'selected' : ''} ${isClosed ? 'opacity-70' : ''}`}
                onClick={() => onSelectEmergency(em)}
                style={isClosed ? { borderLeftColor: '#64748b' } : undefined}
              >
                <div className="incident-header">
                  <div className="incident-title-row">
                    <span className={`priority-tag ${em.priority.toLowerCase()}`}>
                      {em.priority}
                    </span>
                    <strong className="incident-type">{em.type}</strong>
                    {isCritical && !isClosed && <span className="incident-critical-badge">IMMEDIATE</span>}
                    {slaBreach && (
                      <span className="chip" style={{ background: '#7f1d1d', color: '#fca5a5', fontSize: '9px', padding: '1px 5px' }}>
                        SLA 15m+
                      </span>
                    )}
                    {isClosed && (
                      <span className="chip" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '10px' }}>
                        ✓ CLOSED
                      </span>
                    )}
                  </div>
                  <span className="time-ticker text-muted text-xs">{formatElapsed(em.createdAt)}</span>
                </div>

                <div className="incident-details">
                  <div className="detail-item">
                    <MapPin size={13} className="text-secondary flex-shrink-0" />
                    <span className="text-primary font-medium">{em.address}</span>
                  </div>

                  <div className="detail-row">
                    <div className="detail-item">
                      <Phone size={12} className="text-secondary" />
                      <span>{em.callerName} ({em.phone})</span>
                    </div>
                    <div className="detail-item">
                      <Users size={12} className="text-secondary" />
                      <span>{em.patientCount} Patient(s)</span>
                    </div>
                  </div>

                  {em.description && (
                    <div className="incident-notes text-secondary text-xs mt-1">
                      "{em.description}"
                    </div>
                  )}
                </div>

                <div className="incident-footer-row mt-2">
                  <span className="status-pill">{em.status.replace(/_/g, ' ')}</span>
                  {isPending && (
                    <div className="flex items-center gap-1">
                      {onAutoAssign && (
                        <button
                          className="btn btn-xs btn-outline-sky"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAutoAssign(em.id);
                          }}
                          title="Instant auto-assign closest ambulance & matching hospital"
                        >
                          <Zap size={11} className="text-amber" />
                          <span>⚡ Auto-Assign</span>
                        </button>
                      )}
                      <button
                        className="btn btn-xs btn-dispatch"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEmergency(em);
                        }}
                      >
                        <Send size={11} />
                        <span>Review</span>
                      </button>
                    </div>
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
