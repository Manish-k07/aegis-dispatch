import React from 'react';
import { Icon } from './Icon';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  size?: 'standard' | 'large' | 'small';
  selected?: boolean;
  'aria-label': string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 'standard',
  selected = false,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  const dimension = isLarge ? 48 : isSmall ? 32 : 40;
  const iconSize = isLarge ? 24 : isSmall ? 18 : 20;

  return (
    <button
      type="button"
      className={`m3-icon-button ${selected ? 'is-selected' : ''} ${className}`}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${dimension}px`,
        height: `${dimension}px`,
        minWidth: `${dimension}px`,
        minHeight: `${dimension}px`,
        borderRadius: '50%',
        border: 'none',
        background: selected ? 'var(--md-sys-color-primary-container)' : 'transparent',
        color: selected ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.38 : 1,
        transition: 'background-color 150ms ease, color 150ms ease',
        padding: 0,
        boxSizing: 'border-box',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !selected) {
          e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
          e.currentTarget.style.color = 'var(--md-sys-color-text)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !selected) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--md-sys-color-text-secondary)';
        }
      }}
      {...props}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
};
