import React from 'react';

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: 0 | 4 | 8 | 12 | 16 | 20 | 24 | 32 | number;
  align?: 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'baseline';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  wrap?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Row: React.FC<RowProps> = ({
  gap = 8,
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  fullWidth = false,
  children,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`m3-row ${fullWidth ? 'm3-row-full' : ''} ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: `${gap}px`,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : 'nowrap',
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
