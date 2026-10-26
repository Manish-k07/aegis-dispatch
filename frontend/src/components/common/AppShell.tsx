import React from 'react';

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  alertStrip?: React.ReactNode;
  statusBar?: React.ReactNode;
  children: React.ReactNode;
  fixedViewport?: boolean; // For CAD tactical map
}

export const AppShell: React.FC<AppShellProps> = ({
  header,
  alertStrip,
  statusBar,
  children,
  fixedViewport = false,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`m3-app-shell ${fixedViewport ? 'm3-app-shell-fixed' : ''} ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        height: fixedViewport ? '100vh' : 'auto',
        width: '100%',
        backgroundColor: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-text)',
        fontFamily: 'var(--md-ref-typeface-plain)',
        overflow: fixedViewport ? 'hidden' : 'auto',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {header && <div className="m3-shell-header-slot" style={{ flexShrink: 0, zIndex: 100 }}>{header}</div>}
      {alertStrip && <div className="m3-shell-alert-slot" style={{ flexShrink: 0 }}>{alertStrip}</div>}
      <main
        className="m3-shell-main"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: fixedViewport ? 'hidden' : 'visible',
          position: 'relative',
        }}
      >
        {children}
      </main>
      {statusBar && <div className="m3-shell-status-slot" style={{ flexShrink: 0 }}>{statusBar}</div>}
    </div>
  );
};
