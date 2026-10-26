import React, { useState, useEffect } from 'react';
import { formatTime } from '../utils/time';
import { AuditLog } from '../types';
import { ChevronUp, ChevronDown, Radio, History, X } from 'lucide-react';

interface FooterProps {
  isConnected: boolean;
  isVirtualMode?: boolean;
  latestEvent?: string;
  logs?: AuditLog[];
  liveEvents?: string[];
}

export const Footer: React.FC<FooterProps> = ({
  isConnected,
  isVirtualMode = false,
  latestEvent = 'System initialized. Live monitoring active.',
  logs = [],
  liveEvents = [],
}) => {
  const [syncTime, setSyncTime] = useState<string>(() => formatTime(new Date()));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'AUDIT'>('LIVE');

  useEffect(() => {
    const updateTime = () => {
      setSyncTime(formatTime(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const displayLatestEvent = (liveEvents && liveEvents.length > 0) ? liveEvents[0] : latestEvent;

  return (
    <>
      {/* Expandable Audit Log Panel above Footer */}
      {isDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '32px',
            left: 0,
            right: 0,
            height: '240px',
            backgroundColor: 'var(--md-sys-color-surface)',
            borderTop: '1px solid var(--md-sys-color-outline)',
            boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.25)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              height: '40px',
              padding: '0 16px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderBottom: '1px solid var(--md-sys-color-outline-variant)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={16} style={{ color: 'var(--md-sys-color-primary)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                  System Event &amp; Audit Logs
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('LIVE')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: activeTab === 'LIVE' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)',
                    backgroundColor: activeTab === 'LIVE' ? 'var(--md-sys-color-primary-container)' : 'transparent',
                    color: activeTab === 'LIVE' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-text-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Radio size={12} />
                  Live WebSocket Stream ({liveEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('AUDIT')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: activeTab === 'AUDIT' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)',
                    backgroundColor: activeTab === 'AUDIT' ? 'var(--md-sys-color-primary-container)' : 'transparent',
                    color: activeTab === 'AUDIT' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-text-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Audit Records ({logs.length})
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close event log drawer"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--md-sys-color-text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Log Entries List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 16px',
              fontFamily: 'var(--md-sys-font-mono, monospace)',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {activeTab === 'LIVE' ? (
              liveEvents.length > 0 ? (
                liveEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--md-sys-color-surface-container)',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'baseline',
                    }}
                  >
                    <span style={{ color: 'var(--md-sys-color-text-secondary)', fontSize: '11px', flexShrink: 0 }}>
                      {evt.split('·')[0]?.trim()}
                    </span>
                    <span style={{ color: 'var(--md-sys-color-text)' }}>
                      {evt.split('·').slice(1).join('·').trim() || evt}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--md-sys-color-text-secondary)', padding: '16px', textAlign: 'center' }}>
                  Awaiting dispatch events...
                </div>
              )
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--md-sys-color-surface-container)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ color: 'var(--md-sys-color-text-secondary)', fontSize: '11px', flexShrink: 0 }}>
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                  <strong style={{ color: 'var(--md-sys-color-primary)' }}>{log.actor}</strong>
                  <span style={{ color: 'var(--md-sys-color-text)' }}>{log.action}</span>
                  <span style={{ color: 'var(--md-sys-color-warning)', fontSize: '11px' }}>
                    {log.previousState && `${log.previousState} → `}
                    {log.newState}
                  </span>
                  {log.metadata && (
                    <span style={{ color: 'var(--md-sys-color-text-secondary)', fontSize: '11px' }}>
                      ({log.metadata})
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--md-sys-color-text-secondary)', padding: '16px', textAlign: 'center' }}>
                No permanent audit records recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Single Status Footer Bar */}
      <footer
        style={{
          height: '32px',
          backgroundColor: 'var(--md-sys-color-surface)',
          borderTop: '1px solid var(--md-sys-color-outline-variant)',
          display: 'grid',
          gridTemplateColumns: 'auto minmax(180px, 1fr) auto',
          alignItems: 'center',
          padding: '0 16px',
          fontSize: '12px',
          color: 'var(--md-sys-color-text-secondary)',
          boxSizing: 'border-box',
          flexShrink: 0,
          zIndex: 50,
          gap: '16px',
        }}
      >
        {/* Left zone: connection chip ("Connected" with dot) + "Last sync HH:mm:ss" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--md-sys-color-text)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isConnected ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-error)',
                display: 'inline-block',
              }}
            />
            <span>{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
          <span style={{ color: 'var(--md-sys-color-outline)' }}>|</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '11px' }}>
            Last sync {syncTime}
          </span>
        </div>

        {/* Center zone: "Event log" trigger + latest event ticker */}
        <div
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          title="Click to view full event stream & audit log"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: 0,
            overflow: 'hidden',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ color: 'var(--md-sys-color-outline)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--md-sys-color-primary)',
                letterSpacing: '0.3px',
              }}
            >
              Event log
            </span>
            {isDrawerOpen ? (
              <ChevronDown size={14} style={{ color: 'var(--md-sys-color-primary)' }} />
            ) : (
              <ChevronUp size={14} style={{ color: 'var(--md-sys-color-primary)' }} />
            )}
          </div>
          <span
            title={displayLatestEvent}
            style={{
              fontSize: '11px',
              color: 'var(--md-sys-color-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayLatestEvent}
          </span>
        </div>

        {/* Right zone: version */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ color: 'var(--md-sys-color-outline)' }}>|</span>
          <span style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', opacity: 0.8 }}>
            v1.0.0
          </span>
        </div>
      </footer>
    </>
  );
};
