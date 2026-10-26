import React from 'react';
import { Icon } from './Icon';

export type StatusTone = 'critical' | 'high' | 'medium' | 'low' | 'success' | 'warning' | 'info' | 'neutral';

export interface StatusChipProps {
  label: string;
  icon?: string;
  tone?: StatusTone;
  size?: 'standard' | 'small';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  icon,
  tone = 'neutral',
  size = 'standard',
  className = '',
  style,
  onClick,
}) => {
  const isSmall = size === 'small';

  // Determine tone colors
  let bg = 'var(--md-sys-color-surface-container-high)';
  let fg = 'var(--md-sys-color-text)';
  let defaultIcon = 'info';

  switch (tone) {
    case 'critical':
      bg = 'var(--md-sys-color-error-container)';
      fg = 'var(--md-sys-color-error)';
      defaultIcon = 'error';
      break;
    case 'high':
    case 'warning':
      bg = 'var(--md-sys-color-warning-container)';
      fg = 'var(--md-sys-color-warning)';
      defaultIcon = 'warning';
      break;
    case 'medium':
      bg = 'var(--md-sys-color-warning-container)';
      fg = 'var(--md-sys-color-warning)';
      defaultIcon = 'schedule';
      break;
    case 'low':
    case 'info':
      bg = 'var(--md-sys-color-primary-container)';
      fg = 'var(--md-sys-color-primary)';
      defaultIcon = 'info';
      break;
    case 'success':
      bg = 'var(--md-sys-color-success-container)';
      fg = 'var(--md-sys-color-success)';
      defaultIcon = 'check_circle';
      break;
    case 'neutral':
    default:
      bg = 'var(--md-sys-color-surface-container-high)';
      fg = 'var(--md-sys-color-text-secondary)';
      defaultIcon = 'circle';
      break;
  }

  const iconName = icon || defaultIcon;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`m3-status-chip m3-tone-${tone} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: isSmall ? '24px' : '32px',
        padding: isSmall ? '0 8px' : '0 12px',
        borderRadius: '8px',
        backgroundColor: bg,
        color: fg,
        fontFamily: 'var(--md-ref-typeface-plain)',
        fontSize: isSmall ? '11px' : '12px',
        lineHeight: 1,
        fontWeight: 500,
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <Icon name={iconName} size={isSmall ? 14 : 16} style={{ color: 'currentColor' }} />
      <span>{label}</span>
    </div>
  );
};
