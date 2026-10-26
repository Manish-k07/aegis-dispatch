import React from 'react';
import { Icon } from './Icon';

export type ButtonVariant = 'filled' | 'outlined' | 'text' | 'tonal' | 'emergency';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: string;
  iconTrailing?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  isEmergency?: boolean;
  isLoading?: boolean;
  fullWidth?: boolean;
  size?: 'standard' | 'large' | 'small';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'filled',
  icon,
  iconTrailing,
  startIcon,
  endIcon,
  isEmergency = false,
  isLoading = false,
  fullWidth = false,
  size = 'standard',
  className = '',
  disabled,
  style,
  ...props
}) => {
  const actualVariant = isEmergency ? 'emergency' : variant;
  const isLarge = isEmergency || size === 'large';

  return (
    <button
      className={`m3-btn m3-btn-${actualVariant} m3-btn-size-${size} ${isLarge ? 'm3-btn-large' : ''} ${fullWidth ? 'm3-btn-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      style={style}
      {...props}
    >
      {isLoading ? (
        <span className="m3-btn-spinner" aria-hidden="true" />
      ) : (
        startIcon ? startIcon : icon ? <Icon name={icon} size={20} className="m3-btn-icon" /> : null
      )}
      <span className="m3-btn-label">{children}</span>
      {!isLoading && (
        endIcon ? endIcon : iconTrailing ? <Icon name={iconTrailing} size={20} className="m3-btn-icon-trailing" /> : null
      )}
    </button>
  );
};
