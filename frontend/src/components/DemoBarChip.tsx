import React from 'react';
import { useMode } from '../services/ModeProvider';
import { Icon } from './common';

export const DemoBarChip: React.FC = () => {
  const { mode, exitDemo } = useMode();

  if (mode !== 'DEMO') return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '3px 10px',
        borderRadius: '16px',
        backgroundColor: 'var(--md-sys-color-warning-container)',
        color: 'var(--md-sys-color-warning)',
        border: '1px solid var(--md-sys-color-outline-variant)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.2px',
      }}
    >
      <Icon name="science" size={14} />
      <span>Demo mode — synthetic data</span>
      <button
        onClick={exitDemo}
        style={{
          border: 'none',
          backgroundColor: 'var(--md-sys-color-warning)',
          color: 'var(--md-sys-color-surface)',
          borderRadius: '10px',
          padding: '2px 8px',
          fontSize: '10px',
          fontWeight: 700,
          cursor: 'pointer',
          marginLeft: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
        }}
        title="Return to real Live mode"
      >
        Exit demo
      </button>
    </div>
  );
};
