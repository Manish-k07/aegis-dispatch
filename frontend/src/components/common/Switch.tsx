import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}) => {
  return (
    <label
      className={`m3-switch-wrapper ${disabled ? 'is-disabled' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        fontSize: '14px',
        color: 'var(--md-sys-color-text)',
      }}
    >
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onChange(!checked);
        }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (!disabled) onChange(!checked);
          }
        }}
        style={{
          width: '40px',
          height: '24px',
          borderRadius: '12px',
          backgroundColor: checked
            ? 'var(--md-sys-color-primary)'
            : 'var(--md-sys-color-surface-variant, rgba(255, 255, 255, 0.12))',
          border: checked
            ? '1px solid var(--md-sys-color-primary)'
            : '1px solid var(--md-sys-color-outline)',
          position: 'relative',
          transition: 'background-color 150ms ease, border-color 150ms ease',
          boxSizing: 'border-box',
          opacity: disabled ? 0.38 : 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '18px' : '2px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: checked
              ? 'var(--md-sys-color-on-primary, #FFFFFF)'
              : 'var(--md-sys-color-outline)',
            transition: 'left 150ms ease, background-color 150ms ease',
          }}
        />
      </div>
      {label && <span>{label}</span>}
    </label>
  );
};
