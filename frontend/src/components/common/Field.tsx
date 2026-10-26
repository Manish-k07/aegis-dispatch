import React, { useState } from 'react';
import { Icon } from './Icon';

export interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  helperText?: string;
  error?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  onTrailingIconClick?: () => void;
  fullWidth?: boolean;
  suffix?: string;
  multiline?: boolean;
  rows?: number;
  children?: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  helperText,
  error,
  leadingIcon,
  trailingIcon,
  onTrailingIconClick,
  fullWidth = true,
  suffix,
  multiline = false,
  rows = 3,
  id,
  value,
  defaultValue,
  placeholder,
  disabled,
  className = '',
  style,
  children,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id || `m3-field-${Math.random().toString(36).substring(2, 9)}`;

  const hasValue =
    value !== undefined && value !== null && value !== ''
      ? true
      : defaultValue !== undefined && defaultValue !== null && defaultValue !== '';
  const isFloating = isFocused || hasValue || Boolean(placeholder);

  return (
    <div
      className={`m3-field-container ${error ? 'm3-field-has-error' : ''} ${disabled ? 'm3-field-disabled' : ''} ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: fullWidth ? '100%' : 'auto',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        className="m3-field-box"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: multiline ? 'flex-start' : 'center',
          minHeight: multiline ? `${rows * 28 + 24}px` : '56px',
          height: multiline ? 'auto' : '56px',
          borderRadius: '4px',
          border: `1px solid ${
            error
              ? 'var(--md-sys-color-error)'
              : isFocused
              ? 'var(--md-sys-color-primary)'
              : 'var(--md-sys-color-outline)'
          }`,
          backgroundColor: 'var(--md-sys-color-surface)',
          padding: multiline ? '12px 16px' : '0 16px',
          boxSizing: 'border-box',
          transition: 'border-color 180ms ease, box-shadow 180ms ease',
          boxShadow: isFocused ? '0 0 0 1px var(--md-sys-color-primary)' : 'none',
        }}
      >
        {leadingIcon && (
          <Icon
            name={leadingIcon}
            size={20}
            style={{
              color: error ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-text-secondary)',
              marginRight: '12px',
              marginTop: multiline ? '4px' : '0',
              flexShrink: 0,
            }}
          />
        )}

        {children ? (
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center' }}>
            {children}
          </div>
        ) : multiline ? (
          <textarea
            id={inputId}
            className="m3-field-input"
            value={value as string}
            defaultValue={defaultValue as string}
            placeholder={isFocused ? placeholder : ''}
            disabled={disabled}
            rows={rows}
            onFocus={(e) => {
              setIsFocused(true);
              (props as any).onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              (props as any).onBlur?.(e);
            }}
            onChange={(e) => (props as any).onChange?.(e)}
            style={{
              flex: 1,
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              resize: 'vertical',
              paddingTop: isFloating ? '8px' : '0',
              fontFamily: 'var(--md-ref-typeface-plain)',
              fontSize: '14px',
              lineHeight: '20px',
              color: 'var(--md-sys-color-text)',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <input
            id={inputId}
            className="m3-field-input"
            value={value}
            defaultValue={defaultValue}
            placeholder={isFocused ? placeholder : ''}
            disabled={disabled}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              paddingTop: isFloating ? '16px' : '0',
              fontFamily: 'var(--md-ref-typeface-plain)',
              fontSize: '16px',
              color: 'var(--md-sys-color-text)',
              boxSizing: 'border-box',
            }}
            {...props}
          />
        )}

        {/* Floating Outline Label */}
        <label
          htmlFor={inputId}
          style={{
            position: 'absolute',
            left: leadingIcon ? '48px' : '16px',
            top: isFloating ? '0' : multiline ? '18px' : '50%',
            transform: isFloating ? 'translateY(-50%) scale(0.75)' : 'translateY(-50%)',
            transformOrigin: 'top left',
            fontFamily: 'var(--md-ref-typeface-plain)',
            fontSize: '16px',
            lineHeight: '24px',
            color: error
              ? 'var(--md-sys-color-error)'
              : isFocused
              ? 'var(--md-sys-color-primary)'
              : 'var(--md-sys-color-text-secondary)',
            backgroundColor: 'var(--md-sys-color-surface)',
            padding: '0 4px',
            pointerEvents: 'none',
            transition: 'all 180ms ease',
            whiteSpace: 'nowrap',
            zIndex: 1,
          }}
        >
          {label}
        </label>

        {/* Unit Suffix inside field (e.g. bpm, mmHg, %, /min, °C) */}
        {suffix && (
          <span
            style={{
              fontSize: '13px',
              color: 'var(--md-sys-color-text-secondary)',
              paddingLeft: '4px',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {suffix}
          </span>
        )}

        {trailingIcon && (
          <button
            type="button"
            onClick={onTrailingIconClick}
            tabIndex={-1}
            style={{
              background: 'none',
              border: 'none',
              cursor: onTrailingIconClick ? 'pointer' : 'default',
              padding: '4px',
              marginLeft: '8px',
              color: 'var(--md-sys-color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={trailingIcon} size={20} />
          </button>
        )}
      </div>

      {(error || helperText) && (
        <span
          style={{
            fontSize: '12px',
            lineHeight: '16px',
            color: error ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-text-secondary)',
            padding: '0 16px',
          }}
        >
          {error || helperText}
        </span>
      )}
    </div>
  );
};
