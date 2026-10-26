import React, { useState, useEffect } from 'react';
import { formatTime } from '../utils/time';

interface FooterProps {
  isConnected: boolean;
  isVirtualMode?: boolean;
  latestEvent?: string;
}

export const Footer: React.FC<FooterProps> = ({
  isConnected,
  isVirtualMode = false,
  latestEvent = 'System initialized. Live monitoring active.',
}) => {
  const [syncTime, setSyncTime] = useState<string>(() => formatTime(new Date()));

  useEffect(() => {
    const updateTime = () => {
      setSyncTime(formatTime(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
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

      {/* Center zone: "Event log" label + latest event in single-line clipped container with tooltip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <span style={{ color: 'var(--md-sys-color-outline)' }}>|</span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--md-sys-color-primary)',
            letterSpacing: '0.3px',
            flexShrink: 0,
          }}
        >
          Event log
        </span>
        <span
          title={latestEvent}
          style={{
            fontSize: '11px',
            color: 'var(--md-sys-color-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {latestEvent}
        </span>
      </div>

      {/* Right zone: muted "Prototype" + version (small, not styled as telemetry) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ color: 'var(--md-sys-color-outline)' }}>|</span>
        {isVirtualMode && (
          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: 'var(--md-sys-color-warning-container)',
              color: 'var(--md-sys-color-on-warning-container)',
              fontWeight: 600,
            }}
          >
            Simulated data
          </span>
        )}
        <span style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', opacity: 0.8 }}>
          Prototype v1.0.0
        </span>
      </div>
    </footer>
  );
};
