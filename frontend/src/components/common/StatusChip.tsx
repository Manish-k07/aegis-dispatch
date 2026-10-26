import React from 'react';
import { Icon } from './Icon';

export type StatusTone = 'critical' | 'high' | 'medium' | 'low' | 'success' | 'warning' | 'info' | 'neutral' | 'error';

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
  tone,
  size = 'standard',
  className = '',
  style,
  onClick,
}) => {
  const isSmall = size === 'small';

  // Auto-infer tone if not explicitly provided
  let effectiveTone = tone;
  if (!effectiveTone) {
    const l = label.toLowerCase();
    if (l.includes('avail') || l.includes('open') || l.includes('complete') || l.includes('active')) {
      effectiveTone = 'success';
    } else if (l.includes('limited') || l.includes('warning') || l.includes('busy') || l.includes('transit')) {
      effectiveTone = 'warning';
    } else if (l.includes('divert') || l.includes('critical') || l.includes('error') || l.includes('cancelled')) {
      effectiveTone = 'error';
    } else if (l.includes('offline') || l.includes('unknown') || l.includes('pending')) {
      effectiveTone = 'neutral';
    } else {
      effectiveTone = 'info';
    }
  }

  // Determine tone colors
  let bg = 'var(--md-sys-color-surface-container-high)';
  let fg = 'var(--md-sys-color-text)';
  let border = 'none';
  let defaultIcon = 'info';

  switch (effectiveTone) {
    case 'critical':
    case 'error':
      bg = 'var(--md-sys-color-error-container)';
      fg = 'var(--md-sys-color-on-error-container)';
      defaultIcon = 'error';
      break;
    case 'high':
    case 'warning':
    case 'medium':
      bg = 'var(--md-sys-color-warning-container)';
      fg = 'var(--md-sys-color-on-warning-container)';
      defaultIcon = 'warning';
      break;
    case 'low':
    case 'info':
      bg = 'var(--md-sys-color-primary-container)';
      fg = 'var(--md-sys-color-on-primary-container)';
      defaultIcon = 'info';
      break;
    case 'success':
      bg = 'var(--md-sys-color-success-container)';
      fg = 'var(--md-sys-color-on-success-container)';
      defaultIcon = 'check_circle';
      break;
    case 'neutral':
    default:
      bg = 'var(--md-sys-color-surface-container-high)';
      fg = 'var(--md-sys-color-text-secondary)';
      border = '1px solid var(--md-sys-color-outline)';
      defaultIcon = 'circle';
      break;
  }

  const iconName = icon || defaultIcon;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`m3-status-chip m3-tone-${effectiveTone} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: isSmall ? '24px' : '32px',
        padding: isSmall ? '0 8px' : '0 12px',
        borderRadius: 'var(--radius-chip)',
        backgroundColor: bg,
        color: fg,
        border,
        fontFamily: 'var(--md-ref-typeface-plain)',
        fontSize: isSmall ? '11px' : '12px',
        lineHeight: 1,
        fontWeight: 600,
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
