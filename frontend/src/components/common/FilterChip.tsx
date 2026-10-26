import React from 'react';
import { Icon } from './Icon';
import { CountBadge } from './CountBadge';

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  count?: number;
  icon?: string;
  style?: React.CSSProperties;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  selected,
  onClick,
  count,
  icon,
  style,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '32px',
        padding: '0 12px',
        borderRadius: 'var(--radius-chip)',
        border: selected
          ? '1px solid var(--md-sys-color-primary-container)'
          : '1px solid var(--md-sys-color-outline)',
        backgroundColor: selected
          ? 'var(--md-sys-color-primary-container)'
          : 'var(--md-sys-color-surface)',
        color: selected
          ? 'var(--md-sys-color-on-primary-container)'
          : 'var(--md-sys-color-text)',
        fontSize: '13px',
        fontWeight: selected ? 600 : 500,
        cursor: 'pointer',
        transition: 'background-color 150ms ease, border-color 150ms ease',
        ...style,
      }}
    >
      {selected ? (
        <Icon name="check" size={16} />
      ) : icon ? (
        <Icon name={icon} size={16} />
      ) : null}
      <span>{label}</span>
      {count !== undefined && (
        <CountBadge
          count={count}
          tone={selected ? 'primary' : 'neutral'}
          style={{ height: '18px', minWidth: '18px', fontSize: '10px' }}
        />
      )}
    </button>
  );
};
