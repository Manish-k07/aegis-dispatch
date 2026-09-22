import React, { useState } from 'react';
import { History, ChevronUp, ChevronDown, Radio } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogDrawerProps {
  logs: AuditLog[];
  liveEvents: string[];
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({ logs, liveEvents }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'AUDIT'>('LIVE');

  return (
    <div className={`audit-drawer ${isOpen ? 'expanded' : 'collapsed'}`}>
      <div className="audit-drawer-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          <History size={16} className="text-secondary" />
          <span className="font-semibold text-xs tracking-wider uppercase">System Operations & Audit Trail</span>
          <span className="live-event-ticker text-secondary text-xs">
            {liveEvents[0] || 'Awaiting dispatch events…'}
          </span>
        </div>

        <button className="btn-collapse">
          {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {isOpen && (
        <div className="audit-drawer-content">
          <div className="audit-tabs">
            <button
              className={`tab-btn ${activeTab === 'LIVE' ? 'active' : ''}`}
              onClick={() => setActiveTab('LIVE')}
            >
              <Radio size={12} className="inline mr-1" />
              Live WebSocket Stream ({liveEvents.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'AUDIT' ? 'active' : ''}`}
              onClick={() => setActiveTab('AUDIT')}
            >
              Permanent Audit Records ({logs.length})
            </button>
          </div>

          <div className="audit-logs-list">
            {activeTab === 'LIVE' ? (
              liveEvents.map((evt, idx) => (
                <div key={idx} className="log-entry">
                  <span className="log-time">{evt.split('·')[0]}</span>
                  <span className="log-event">{evt.split('·')[1] || evt}</span>
                </div>
              ))
            ) : (
              logs.map((log) => (
                <div key={log.id} className="log-entry">
                  <span className="log-time">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  <strong className="log-actor">{log.actor}</strong>
                  <span className="log-action">{log.action}</span>
                  <span className="log-state">
                    {log.previousState && `${log.previousState} → `}
                    {log.newState}
                  </span>
                  {log.metadata && <span className="log-meta">({log.metadata})</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
