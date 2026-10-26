import React from 'react';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: 0 | 4 | 8 | 12 | 16 | 20 | 24 | 32 | number;
  align?: 'stretch' | 'flex-start' | 'center' | 'flex-end';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Stack: React.FC<StackProps> = ({
  gap = 16,
  align = 'stretch',
  justify = 'flex-start',
  fullWidth = false,
  children,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`m3-stack ${fullWidth ? 'm3-stack-full' : ''} ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${gap}px`,
        alignItems: align,
        justifyContent: justify,
        width: fullWidth ? '100%' : undefined,
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
