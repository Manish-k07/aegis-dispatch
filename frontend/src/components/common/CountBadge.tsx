import React from 'react';

export interface CountBadgeProps {
  count: number;
  tone?: 'primary' | 'neutral' | 'error' | 'warning' | 'success';
  style?: React.CSSProperties;
}

export const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  tone = 'neutral',
  style,
}) => {
  const getColors = () => {
    switch (tone) {
      case 'primary':
        return {
          bg: 'var(--md-sys-color-primary-container)',
          text: 'var(--md-sys-color-on-primary-container)',
        };
      case 'error':
        return {
          bg: 'var(--md-sys-color-error-container)',
          text: 'var(--md-sys-color-on-error-container)',
        };
      case 'warning':
        return {
          bg: 'var(--md-sys-color-warning-container)',
          text: 'var(--md-sys-color-on-warning-container)',
        };
      case 'success':
        return {
          bg: 'var(--md-sys-color-success-container)',
          text: 'var(--md-sys-color-on-success-container)',
        };
      default:
        return {
          bg: 'var(--md-sys-color-surface-container-high)',
          text: 'var(--md-sys-color-text-secondary)',
        };
    }
  };

  const colors = getColors();

  return (
    <span
      className="m3-count-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '20px',
        height: '20px',
        padding: '0 6px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        backgroundColor: colors.bg,
        color: colors.text,
        letterSpacing: '0.1px',
        ...style,
      }}
    >
      {count}
    </span>
  );
};
