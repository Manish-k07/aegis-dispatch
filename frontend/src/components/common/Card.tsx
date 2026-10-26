import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 16 | 24 | 0;
  variant?: 'elevated' | 'outlined' | 'tonal';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 16,
  variant = 'outlined',
  interactive = false,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`m3-card m3-card-${variant} m3-card-pad-${padding} ${interactive ? 'm3-card-interactive' : ''} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};
