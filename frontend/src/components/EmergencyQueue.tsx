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
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'PENDING' | 'RESOLVED'>('ALL');

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

    if (filter === 'CRITICAL') return e.priority === 'CRITICAL';
    if (filter === 'HIGH') return e.priority === 'HIGH';
    if (filter === 'PENDING') return e.status === 'PENDING_DISPATCH' || e.status === 'CREATED';
    if (filter === 'RESOLVED') return ['COMPLETED', 'CANCELLED'].includes(e.status);
    return true;
  });

  const formatElapsed = (dateStr: string) => {
    try {
      const ms = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(ms / 60000);
      if (mins < 1) return '< 1m ago';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m ago`;
    } catch {
      return '';
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
          {onAutoAssignNext && (
            <button
              className="btn btn-xs btn-primary btn-auto-head"
              onClick={onAutoAssignNext}
              title="Automatically dispatch nearest ambulance to highest priority incident"
            >
              <Zap size={11} />
              <span>⚡ Auto-Dispatch Next</span>
            </button>
          )}
          <span className="badge-count text-red">{emergencies.length}</span>
        </div>
      </div>

      <div className="filter-tabs">
        {(['ALL', 'CRITICAL', 'HIGH', 'PENDING', 'RESOLVED'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="queue-list">
        {filtered.length === 0 ? (
          <div className="empty-state">No incidents match the active filters.</div>
        ) : (
          filtered.map((em) => {
            const isSelected = selectedEmergency?.id === em.id;
            const isPending = em.status === 'PENDING_DISPATCH' || em.status === 'CREATED';
            const isCritical = em.priority === 'CRITICAL';

            return (
              <div
                key={em.id}
                className={`incident-card ${em.priority.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectEmergency(em)}
              >
                <div className="incident-header">
                  <div className="incident-title-row">
                    <span className={`priority-tag ${em.priority.toLowerCase()}`}>
                      {em.priority}
                    </span>
                    <strong className="incident-type">{em.type}</strong>
                    {isCritical && <span className="incident-critical-badge">IMMEDIATE</span>}
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
