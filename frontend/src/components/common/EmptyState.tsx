import React from 'react';
import { Icon } from './Icon';

export interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
  style,
}) => {
  return (
    <div
      className={`m3-empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '32px 16px',
        boxSizing: 'border-box',
        width: '100%',
        ...style,
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          flexShrink: 0,
        }}
      >
        <Icon
          name={icon}
          size={48}
          style={{ color: 'var(--md-sys-color-text-secondary)' }}
        />
      </div>

      <div
        style={{
          fontFamily: 'var(--md-ref-typeface-brand)',
          fontSize: '16px',
          lineHeight: '24px',
          fontWeight: 500,
          color: 'var(--md-sys-color-text)',
          marginBottom: description ? '4px' : '0',
        }}
      >
        {title}
      </div>

      {description && (
        <div
          style={{
            fontFamily: 'var(--md-ref-typeface-plain)',
            fontSize: '14px',
            lineHeight: '20px',
            color: 'var(--md-sys-color-text-secondary)',
            maxWidth: '360px',
            marginBottom: action ? '16px' : '0',
          }}
        >
          {description}
        </div>
      )}

      {action && <div>{action}</div>}
    </div>
  );
};
