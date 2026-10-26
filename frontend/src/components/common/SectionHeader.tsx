import React from 'react';
import { Icon } from './Icon';

export interface SectionHeaderProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  subtitle,
  action,
  className = '',
  style,
}) => {
  return (
    <div
      className={`m3-section-header ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        minHeight: '32px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        {icon && (
          <Icon
            name={icon}
            size={20}
            style={{ color: 'var(--md-sys-color-primary)', flexShrink: 0 }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
          <h2
            className="m3-section-title"
            style={{
              fontSize: '16px',
              lineHeight: '24px',
              fontWeight: 500,
              color: 'var(--md-sys-color-text)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <span
              style={{
                fontSize: '12px',
                lineHeight: '16px',
                color: 'var(--md-sys-color-text-secondary)',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
      {action && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>{action}</div>}
    </div>
  );
};
