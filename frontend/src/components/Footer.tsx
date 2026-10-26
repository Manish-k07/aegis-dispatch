import React, { useState, useEffect } from 'react';

interface FooterProps {
  isConnected: boolean;
  isVirtualMode?: boolean;
}

/**
 * Material Design 3 Single 32px Status Bar:
 * - Left: connection dot + "Connected to CAD server"
 * - Center: "Last sync hh:mm:ss"
 * - Right: "Simulated data" chip only when VITE_DEMO_MODE=true
 */
export const Footer: React.FC<FooterProps> = ({ isConnected }) => {
  const [syncTime, setSyncTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setSyncTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isDemo =
    typeof window !== 'undefined' &&
    ((import.meta as any).env?.VITE_DEMO_MODE === 'true' ||
      window.location.search.includes('demo=1'));

  return (
    <footer
      style={{
        height: '32px',
        backgroundColor: 'var(--md-sys-color-surface-high)',
        borderTop: '1px solid var(--md-sys-color-outline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontSize: '12px',
        color: 'var(--md-sys-color-text-secondary)',
        boxSizing: 'border-box',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* Left: connection dot + "Connected to CAD server" */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isConnected
              ? 'var(--md-sys-color-success)'
              : 'var(--md-sys-color-error)',
            display: 'inline-block',
          }}
        />
        <span>{isConnected ? 'Connected to CAD server' : 'Disconnected from CAD server'}</span>
      </div>

      {/* Center: "Last sync hh:mm:ss" */}
      <div style={{ fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums' }}>
        Last sync {syncTime || '00:00:00'}
      </div>

      {/* Right: "Simulated data" chip only when VITE_DEMO_MODE=true */}
      <div>
        {isDemo ? (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-warning-container)',
              color: 'var(--md-sys-color-warning)',
              fontWeight: 500,
            }}
          >
            Simulated data
          </span>
        ) : (
          <span style={{ fontSize: '11px', opacity: 0.7 }}>Aegis OS</span>
        )}
      </div>
    </footer>
  );
};
