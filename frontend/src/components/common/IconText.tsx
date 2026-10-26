import React from 'react';
import { Icon } from './Icon';

export interface IconTextProps {
  icon: string;
  text: React.ReactNode;
  iconColor?: string;
  size?: 'standard' | 'small';
  className?: string;
  style?: React.CSSProperties;
}

export const IconText: React.FC<IconTextProps> = ({
  icon,
  text,
  iconColor,
  size = 'standard',
  className = '',
  style,
}) => {
  const isSmall = size === 'small';

  return (
    <div
      className={`m3-icon-text ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: isSmall ? '12px' : '14px',
        lineHeight: isSmall ? '16px' : '20px',
        color: 'var(--md-sys-color-text)',
        verticalAlign: 'middle',
        ...style,
      }}
    >
      <Icon
        name={icon}
        size={isSmall ? 16 : 20}
        style={{
          color: iconColor || 'var(--md-sys-color-text-secondary)',
          flexShrink: 0,
        }}
      />
      <span>{text}</span>
    </div>
  );
};
