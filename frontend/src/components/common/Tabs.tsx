import React from 'react';
import { Icon } from './Icon';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  badge?: number | string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'primary' | 'segmented';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'primary',
  className = '',
}) => {
  return (
    <div
      role="tablist"
      className={`m3-tabs m3-tabs-${variant} ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`m3-tab-btn ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <Icon name={tab.icon} size={20} className="m3-tab-icon" />}
            <span className="m3-tab-label">{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span className="m3-tab-badge">{tab.badge}</span>
            )}
            {variant === 'primary' && isActive && <span className="m3-tab-indicator" />}
          </button>
        );
      })}
    </div>
  );
};
