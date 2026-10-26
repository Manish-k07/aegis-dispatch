import React, { useState } from 'react';
import { Icon } from './Icon';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  onTrailingIconClick?: () => void;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  helperText,
  error,
  leadingIcon,
  trailingIcon,
  onTrailingIconClick,
  id,
  value,
  defaultValue,
  placeholder,
  className = '',
  disabled,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id || `m3-input-${Math.random().toString(36).substr(2, 9)}`;
  const hasValue = value !== undefined ? Boolean(value) : Boolean(defaultValue);
  const isFloating = isFocused || hasValue || Boolean(placeholder);

  return (
    <div className={`m3-textfield-wrapper ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}>
      <div className={`m3-textfield ${isFocused ? 'is-focused' : ''} ${isFloating ? 'is-floating' : ''}`}>
        {leadingIcon && <Icon name={leadingIcon} size={20} className="m3-textfield-leading-icon" />}
        <input
          id={inputId}
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
          className="m3-textfield-input"
          {...props}
        />
        <label htmlFor={inputId} className="m3-textfield-label">
          {label}
        </label>
        {trailingIcon && (
          <button
            type="button"
            className="m3-textfield-trailing-btn"
            onClick={onTrailingIconClick}
            tabIndex={-1}
          >
            <Icon name={trailingIcon} size={20} />
          </button>
        )}
      </div>
      {(error || helperText) && (
        <span className={`m3-textfield-helper ${error ? 'm3-textfield-error' : ''}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
};
