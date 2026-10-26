import React from 'react';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: number | string;
  center?: boolean;
  padding?: 0 | 16 | 24 | 32;
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  maxWidth = '1280px',
  center = true,
  padding = 24,
  children,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`m3-page-container ${center ? 'm3-page-centered' : ''} ${className}`}
      style={{
        maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
        width: '100%',
        margin: center ? '0 auto' : undefined,
        padding: `${padding}px`,
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
