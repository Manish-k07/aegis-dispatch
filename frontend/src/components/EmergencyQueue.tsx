import React, { useState } from 'react';
import { AlertCircle, Clock, MapPin, Users, Send, Phone, AlertTriangle, Zap } from 'lucide-react';
import { Emergency } from '../types';

interface EmergencyQueueProps {
  emergencies: Emergency[];
  selectedEmergency: Emergency | null;
  searchQuery?: string;
  onSelectEmergency: (e: Emergency) => void;
  onAutoAssign?: (emergencyId: string) => void;
  onAutoAssignNext?: () => void;
}

export const EmergencyQueue: React.FC<EmergencyQueueProps> = ({
  emergencies,
  selectedEmergency,
  searchQuery = '',
  onSelectEmergency,
  onAutoAssign,
  onAutoAssignNext,
}) => {
  const [filter, setFilter] = useState<'ACTIVE' | 'CRITICAL' | 'HIGH' | 'PENDING' | 'SHIFT_LOG'>('ACTIVE');

  // Compute active vs resolved populations
  const activeEmergencies = emergencies.filter(
    (e) => !['COMPLETED', 'CANCELLED'].includes(e.status)
  );
  const resolvedEmergencies = emergencies.filter(
    (e) => ['COMPLETED', 'CANCELLED'].includes(e.status)
  );

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

    const isResolved = ['COMPLETED', 'CANCELLED'].includes(e.status);

    if (filter === 'ACTIVE') return !isResolved;
    if (filter === 'CRITICAL') return !isResolved && e.priority === 'CRITICAL';
    if (filter === 'HIGH') return !isResolved && e.priority === 'HIGH';
    if (filter === 'PENDING') return e.status === 'PENDING_DISPATCH' || e.status === 'CREATED';
    if (filter === 'SHIFT_LOG') return isResolved;
    return true;
  });

  const formatElapsed = (dateStr: string, isResolved = false) => {
    try {
      const ms = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(ms / 60000);
      if (mins < 1) return '< 1m ago';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (isResolved) return `${hrs}h ago`;
      // For active calls waiting over 15 minutes, format with SLA warning
      if (hrs >= 1) return `⚠️ ${hrs}h ${mins % 60}m wait`;
      return `${mins}m ago`;
    } catch {
      return '';
    }
  };

  const criticalCount = activeEmergencies.filter((e) => e.priority === 'CRITICAL').length;
  const highCount = activeEmergencies.filter((e) => e.priority === 'HIGH').length;
  const pendingCount = activeEmergencies.filter(
    (e) => e.status === 'PENDING_DISPATCH' || e.status === 'CREATED'
  ).length;

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-red" />
          <h2>Emergency Incident Queue</h2>
        </div>
        <div className="flex items-center gap-2">
          {onAutoAssignNext && pendingCount > 0 && (
            <button
              className="btn btn-xs btn-primary btn-auto-head"
              onClick={onAutoAssignNext}
              title="Automatically dispatch nearest ambulance to highest priority incident"
            >
              <Zap size={11} />
              <span>⚡ Auto-Dispatch Next</span>
            </button>
          )}
          <span className="badge-count text-red" title={`${activeEmergencies.length} Active / ${emergencies.length} Total Incidents`}>
            {activeEmergencies.length}
          </span>
        </div>
      </div>

      <div className="filter-tabs">
        <button
          className={`tab-btn ${filter === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => setFilter('ACTIVE')}
          title="Active actionable emergency incidents in sector"
        >
          Active ({activeEmergencies.length})
        </button>
        <button
          className={`tab-btn ${filter === 'CRITICAL' ? 'active' : ''}`}
          onClick={() => setFilter('CRITICAL')}
        >
          Critical ({criticalCount})
        </button>
        <button
          className={`tab-btn ${filter === 'HIGH' ? 'active' : ''}`}
          onClick={() => setFilter('HIGH')}
        >
          High ({highCount})
        </button>
        <button
          className={`tab-btn ${filter === 'PENDING' ? 'active' : ''}`}
          onClick={() => setFilter('PENDING')}
        >
          Pending ({pendingCount})
        </button>
        <button
          className={`tab-btn ${filter === 'SHIFT_LOG' ? 'active' : ''}`}
          onClick={() => setFilter('SHIFT_LOG')}
          title="Resolved and closed incidents archived from active queue"
        >
          Shift Log ({resolvedEmergencies.length})
        </button>
      </div>

      <div className="queue-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            {filter === 'SHIFT_LOG'
              ? 'No closed incidents in current shift log.'
              : 'Zero active incidents matching current filters.'}
          </div>
        ) : (
          filtered.map((em) => {
            const isSelected = selectedEmergency?.id === em.id;
            const isPending = em.status === 'PENDING_DISPATCH' || em.status === 'CREATED';
            const isResolved = ['COMPLETED', 'CANCELLED'].includes(em.status);
            const isCritical = em.priority === 'CRITICAL';

            return (
              <div
                key={em.id}
                className={`incident-card ${em.priority.toLowerCase()} ${isSelected ? 'selected' : ''} ${isResolved ? 'archived-card' : ''}`}
                onClick={() => onSelectEmergency(em)}
                style={isResolved ? { opacity: 0.82, borderLeftColor: '#34d399' } : undefined}
              >
                <div className="incident-header">
                  <div className="incident-title-row">
                    <span className={`priority-tag ${isResolved ? 'resolved' : em.priority.toLowerCase()}`}>
                      {isResolved ? 'RESOLVED' : em.priority}
                    </span>
                    <strong className="incident-type">{em.type}</strong>
                    {isCritical && !isResolved && (
                      <span className="incident-critical-badge">IMMEDIATE</span>
                    )}
                    {isResolved && (
                      <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 700 }}>
                        ✓ CLOSED
                      </span>
                    )}
                  </div>
                  <span className="time-ticker text-muted text-xs">
                    {formatElapsed(em.createdAt, isResolved)}
                  </span>
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
                  <span className={`status-pill ${isResolved ? 'ok' : ''}`}>
                    {em.status.replace(/_/g, ' ')}
                  </span>

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
