import React from 'react';
import { Icon } from './Icon';
import { CountBadge } from './CountBadge';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  badge?: number | string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  style,
}) => {
  return (
    <div
      role="tablist"
      className={`m3-tabs ${className}`}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: '48px',
        backgroundColor: 'var(--md-sys-color-surface)',
        borderBottom: '1px solid var(--md-sys-color-outline-variant)',
        paddingLeft: '12px',
        paddingRight: '12px',
        boxSizing: 'border-box',
        width: '100%',
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const countNumber = typeof tab.badge === 'number'
          ? tab.badge
          : typeof tab.badge === 'string' && !isNaN(Number(tab.badge))
          ? Number(tab.badge)
          : undefined;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '48px',
              padding: '0 8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isActive
                ? 'var(--md-sys-color-primary)'
                : 'var(--md-sys-color-text-secondary)',
              fontSize: '14px',
              fontWeight: isActive ? 600 : 500,
              position: 'relative',
              outline: 'none',
              transition: 'color 150ms ease',
            }}
          >
            {tab.icon && <Icon name={tab.icon} size={18} />}
            <span>{tab.label}</span>
            {countNumber !== undefined && (
              <CountBadge
                count={countNumber}
                tone={isActive ? 'primary' : 'neutral'}
              />
            )}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  backgroundColor: 'var(--md-sys-color-primary)',
                  borderRadius: '3px 3px 0 0',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
