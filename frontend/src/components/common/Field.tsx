import React, { useState, useId, useRef } from 'react';
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
  showPasswordToggle?: boolean;
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
  showPasswordToggle = false,
  id,
  value,
  defaultValue,
  placeholder,
  disabled,
  required,
  type = 'text',
  className = '',
  style,
  children,
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
  const isFloating = isFocused || hasValue || Boolean(placeholder);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If the click was not directly on the input, focus the input
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`m3-field-container ${error ? 'm3-field-has-error' : ''} ${disabled ? 'm3-field-disabled' : ''} ${className}`}
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
        className="m3-field-box"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: multiline ? 'flex-start' : 'center',
          minHeight: multiline ? `${rows * 24 + 32}px` : '56px',
          height: multiline ? 'auto' : '56px',
          borderRadius: '8px',
          border: `1px solid ${
            error
              ? 'var(--md-sys-color-error, #ef4444)'
              : isFocused
              ? 'var(--md-sys-color-primary, #0284c7)'
              : 'var(--md-sys-color-outline, #475569)'
          }`,
          backgroundColor: 'var(--md-sys-color-surface, #1e293b)',
          padding: '0 12px',
          boxSizing: 'border-box',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          boxShadow: isFocused ? '0 0 0 1px var(--md-sys-color-primary, #0284c7)' : 'none',
        }}
      >
        {leadingIcon && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginRight: '8px',
              color: error ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-text-secondary)',
              pointerEvents: 'none',
              flexShrink: 0,
            }}
          >
            <Icon name={leadingIcon} size={20} />
          </div>
        )}

        <div style={{ flex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', position: 'relative' }}>
          {children ? (
            children
          ) : multiline ? (
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
                paddingTop: isFloating ? '16px' : '8px',
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
                paddingTop: isFloating ? '16px' : '0',
                paddingBottom: '0',
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

          {/* Floating Label */}
          <label
            htmlFor={inputId}
            style={{
              position: 'absolute',
              left: 0,
              top: isFloating ? '6px' : '50%',
              transform: isFloating ? 'none' : 'translateY(-50%)',
              fontSize: isFloating ? '11px' : '14px',
              fontWeight: isFloating ? 600 : 400,
              color: error
                ? 'var(--md-sys-color-error, #ef4444)'
                : isFocused
                ? 'var(--md-sys-color-primary, #0284c7)'
                : 'var(--md-sys-color-text-secondary, #94a3b8)',
              pointerEvents: 'none',
              transition: 'all 120ms ease',
              whiteSpace: 'nowrap',
              zIndex: 1,
            }}
          >
            {label} {required && <span style={{ color: 'var(--md-sys-color-error)' }}>*</span>}
          </label>
        </div>

        {/* Password Visibility Toggle */}
        {showPasswordToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPassword(!showPassword);
            }}
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
          style={{
            fontSize: '11px',
            lineHeight: '14px',
            paddingLeft: '4px',
            color: error ? 'var(--md-sys-color-error, #ef4444)' : 'var(--md-sys-color-text-secondary, #94a3b8)',
          }}
        >
          {error || helperText}
        </span>
      )}
    </div>
  );
};
