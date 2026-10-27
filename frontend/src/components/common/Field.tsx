import React, { useState, useId, useRef } from 'react';
import { Icon } from './Icon';

export interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  onTrailingIconClick?: () => void;
  fullWidth?: boolean;
  suffix?: string;
  multiline?: boolean;
  rows?: number;
  showPasswordToggle?: boolean;
  fieldSize?: 'compact' | 'standard';
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
  showPasswordToggle = false,
  fieldSize = 'standard',
  id,
  value,
  defaultValue,
  placeholder,
  disabled,
  required,
  type = 'text',
  className = '',
  style,
  onFocus,
  onBlur,
  onChange,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const actualType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  const hasValue =
    value !== undefined && value !== null && value !== ''
      ? true
      : defaultValue !== undefined && defaultValue !== null && defaultValue !== '';
  const isFloating = isFocused || hasValue;
  const isCompact = fieldSize === 'compact';

  const handleContainerClick = () => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`m3-field-container ${label ? 'has-floating-label' : ''} ${
        error ? 'm3-field-has-error' : ''
      } ${disabled ? 'm3-field-disabled' : ''} ${className}`}
      onClick={handleContainerClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: fullWidth ? '100%' : 'auto',
        boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'text',
        ...style,
      }}
    >
      <div
        className={`m3-field-box ${hasValue ? 'has-value' : ''}`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: multiline ? 'flex-start' : 'center',
          minHeight: multiline ? `${rows * 24 + 32}px` : isCompact ? '40px' : '56px',
          height: multiline ? 'auto' : isCompact ? '40px' : '56px',
          borderRadius: isCompact ? '20px' : '8px',
          border: `1px solid ${
            error
              ? 'var(--md-sys-color-error, #B3261E)'
              : isFocused
              ? 'var(--md-sys-color-primary, #0284c7)'
              : 'var(--md-sys-color-outline, #475569)'
          }`,
          backgroundColor: 'var(--field-bg, var(--md-sys-color-surface, #1e293b))',
          padding: isCompact ? '0 14px' : '0 12px',
          boxSizing: 'border-box',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          boxShadow: isFocused ? '0 0 0 1px var(--md-sys-color-primary, #0284c7)' : 'none',
        }}
      >
        {/* Floating Label in Notch */}
        {label && (
          <label
            htmlFor={inputId}
            className="m3-field-floating-label"
            style={{
              position: 'absolute',
              left: leadingIcon ? '40px' : '12px',
              top: isFloating ? '0' : multiline ? '18px' : '50%',
              transform: isFloating ? 'translateY(-50%) scale(0.75)' : 'translateY(-50%)',
              transformOrigin: 'top left',
              fontFamily: 'inherit',
              fontSize: '14px',
              fontWeight: isFloating ? 500 : 400,
              color: error
                ? 'var(--md-sys-color-error, #B3261E)'
                : isFocused
                ? 'var(--md-sys-color-primary, #0284c7)'
                : 'var(--md-sys-color-text-secondary, #94a3b8)',
              backgroundColor: isFloating ? 'var(--field-bg, var(--md-sys-color-surface, #1e293b))' : 'transparent',
              padding: isFloating ? '0 4px' : '0',
              cursor: 'text',
              transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap',
              zIndex: 2,
            }}
          >
            {label} {required && <span style={{ color: 'var(--md-sys-color-error, #B3261E)' }}>*</span>}
          </label>
        )}

        {leadingIcon && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginRight: '8px',
              color: error ? 'var(--md-sys-color-error, #B3261E)' : 'var(--md-sys-color-text-secondary)',
              pointerEvents: 'none',
              flexShrink: 0,
            }}
          >
            <Icon name={leadingIcon} size={20} />
          </div>
        )}

        <div style={{ flex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', position: 'relative' }}>
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              id={inputId}
              className="m3-field-input"
              value={value as string}
              defaultValue={defaultValue as string}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              rows={rows}
              onFocus={(e) => {
                setIsFocused(true);
                (onFocus as any)?.(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                (onBlur as any)?.(e);
              }}
              onChange={(e) => (onChange as any)?.(e)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                resize: 'vertical',
                paddingTop: '12px',
                paddingBottom: '8px',
                paddingLeft: 0,
                paddingRight: 0,
                fontFamily: 'inherit',
                fontSize: '14px',
                lineHeight: '20px',
                color: 'var(--md-sys-color-text, #f8fafc)',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              id={inputId}
              className="m3-field-input"
              type={actualType}
              value={value}
              defaultValue={defaultValue}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              onFocus={(e) => {
                setIsFocused(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                onBlur?.(e);
              }}
              onChange={onChange}
              style={{
                width: '100%',
                height: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                paddingTop: 0,
                paddingBottom: 0,
                paddingLeft: 0,
                paddingRight: showPasswordToggle || trailingIcon ? '32px' : '0',
                fontFamily: 'inherit',
                fontSize: '14px',
                color: 'var(--md-sys-color-text, #f8fafc)',
                boxSizing: 'border-box',
              }}
              {...props}
            />
          )}
        </div>

        {/* Password Visibility Toggle */}
        {showPasswordToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPassword(!showPassword);
            }}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--md-sys-color-text-secondary, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
            }}
          >
            <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
          </button>
        )}

        {/* Trailing Icon Button */}
        {trailingIcon && !showPasswordToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTrailingIconClick?.();
            }}
            disabled={!onTrailingIconClick}
            aria-label={props['aria-label'] || 'Field action'}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--md-sys-color-text-secondary, #94a3b8)',
              cursor: onTrailingIconClick ? 'pointer' : 'default',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: onTrailingIconClick ? 'auto' : 'none',
            }}
          >
            <Icon name={trailingIcon} size={18} />
          </button>
        )}

        {/* Suffix Label */}
        {suffix && (
          <span
            style={{
              fontSize: '13px',
              color: 'var(--md-sys-color-text-secondary, #94a3b8)',
              pointerEvents: 'none',
              marginLeft: '4px',
            }}
          >
            {suffix}
          </span>
        )}
      </div>

      {/* Helper text / error message */}
      {(error || helperText) && (
        <span
          className="m3-field-helper-text"
          style={{
            fontSize: '12px',
            lineHeight: '16px',
            paddingLeft: '4px',
            color: error ? 'var(--md-sys-color-error, #B3261E)' : 'var(--md-sys-color-text-secondary, #94a3b8)',
          }}
        >
          {error || helperText}
        </span>
      )}
    </div>
  );
};
