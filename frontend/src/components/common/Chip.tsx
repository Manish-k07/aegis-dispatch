import React from 'react';
import { Icon } from './Icon';

export type ChipVariant = 'filter' | 'assist' | 'tonal' | 'critical' | 'high' | 'medium' | 'low' | 'success';

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  icon?: string;
  selected?: boolean;
  variant?: ChipVariant;
  size?: 'small' | 'standard';
  onClick?: () => void;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  selected = false,
  variant = 'assist',
  size = 'standard',
  onClick,
  className = '',
  style,
  ...props
}) => {
  const isClickable = Boolean(onClick);

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`m3-chip m3-chip-${variant} ${selected ? 'm3-chip-selected' : ''} ${isClickable ? 'm3-chip-clickable' : ''} ${size === 'small' ? 'm3-chip-small' : ''} ${className}`}
      style={{
        ...(size === 'small' ? { height: '26px', padding: '0 8px', fontSize: '11px' } : {}),
        ...style,
      }}
      {...props}
    >
      {icon && <Icon name={icon} size={size === 'small' ? 14 : 20} className="m3-chip-icon" />}
      <span className="m3-chip-label">{label}</span>
    </div>
  );
};
