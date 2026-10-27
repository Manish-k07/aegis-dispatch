import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: string;
}

export interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  leadingIcon?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  leadingIcon,
  helperText,
  error,
  disabled = false,
  fullWidth = true,
  className = '',
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const isFloating = isOpen || Boolean(selectedOption);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(0);
      } else {
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(options.length - 1);
      } else {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen && focusedIndex >= 0 && options[focusedIndex]) {
        onChange(options[focusedIndex].value);
        setIsOpen(false);
      } else {
        setIsOpen(!isOpen);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`m3-select-container ${error ? 'm3-select-error' : ''} ${disabled ? 'm3-select-disabled' : ''} ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: fullWidth ? '100%' : 'auto',
        position: 'relative',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        role="button"
        className="m3-select-box"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px',
          borderRadius: '8px',
          border: `1px solid ${error ? 'var(--md-sys-color-error, #B3261E)' : isOpen ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)'}`,
          backgroundColor: 'var(--field-bg, var(--md-sys-color-surface))',
          padding: '0 16px',
          boxSizing: 'border-box',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 1px var(--md-sys-color-primary)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          {leadingIcon && (
            <Icon
              name={leadingIcon}
              size={20}
              style={{
                color: error ? 'var(--md-sys-color-error, #B3261E)' : 'var(--md-sys-color-text-secondary)',
                flexShrink: 0,
              }}
            />
          )}

          <div
            style={{
              fontFamily: 'inherit',
              fontSize: '14px',
              color: selectedOption ? 'var(--md-sys-color-text)' : 'transparent',
              paddingTop: '0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedOption?.label || ''}
          </div>
        </div>

        <label
          style={{
            position: 'absolute',
            left: leadingIcon ? '48px' : '16px',
            top: isFloating ? '0' : '50%',
            transform: isFloating ? 'translateY(-50%) scale(0.75)' : 'translateY(-50%)',
            transformOrigin: 'top left',
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: isFloating ? 500 : 400,
            lineHeight: '20px',
            color: error
              ? 'var(--md-sys-color-error, #B3261E)'
              : isOpen
              ? 'var(--md-sys-color-primary)'
              : 'var(--md-sys-color-text-secondary)',
            backgroundColor: isFloating ? 'var(--field-bg, var(--md-sys-color-surface))' : 'transparent',
            padding: isFloating ? '0 4px' : '0',
            pointerEvents: 'none',
            transition: 'all 180ms ease',
            whiteSpace: 'nowrap',
            zIndex: 1,
          }}
        >
          {label}
        </label>

        <Icon
          name={isOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
          size={24}
          style={{ color: 'var(--md-sys-color-text-secondary)', flexShrink: 0 }}
        />
      </div>

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '60px',
            left: 0,
            right: 0,
            zIndex: 1500,
            backgroundColor: 'var(--md-sys-color-surface)',
            border: '1px solid var(--md-sys-color-outline)',
            borderRadius: '8px',
            padding: '4px 0',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFocused = index === focusedIndex;

            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: isSelected
                    ? 'var(--md-sys-color-primary-container)'
                    : isFocused
                    ? 'var(--md-sys-color-surface-container-high)'
                    : 'transparent',
                  color: isSelected
                    ? 'var(--md-sys-color-on-primary-container)'
                    : 'var(--md-sys-color-text)',
                  fontFamily: 'var(--md-ref-typeface-plain)',
                  fontSize: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {option.icon && <Icon name={option.icon} size={20} />}
                  <div>
                    <div>{option.label}</div>
                    {option.sublabel && (
                      <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                        {option.sublabel}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Icon name="check" size={18} style={{ color: 'var(--md-sys-color-primary)' }} />
                )}
              </div>
            );
          })}
        </div>
      )}

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
