import React from 'react';

export interface ScrollPanelProps {
  children: React.ReactNode;
  maxHeight?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const ScrollPanel: React.FC<ScrollPanelProps> = ({
  children,
  maxHeight = '100%',
  className = '',
  style,
}) => {
  return (
    <div
      className={`m3-scroll-panel ${className}`}
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
        maxHeight,
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingBottom: '24px',
        paddingTop: '8px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
