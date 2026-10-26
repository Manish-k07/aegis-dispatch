import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

export interface MenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  items?: MenuItem[];
  children?: React.ReactNode;
  anchorRef?: React.RefObject<HTMLElement>;
  anchorEl?: HTMLElement | null;
  align?: 'left' | 'right';
  width?: number | string;
  className?: string;
}

export const MenuPopover: React.FC<MenuPopoverProps> = ({
  isOpen,
  onClose,
  items,
  children,
  align = 'right',
  width,
  className = '',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape and Outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      className={`m3-menu-popover ${className}`}
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        [align === 'right' ? 'right' : 'left']: 0,
        backgroundColor: 'var(--md-sys-color-surface)',
        border: '1px solid var(--md-sys-color-outline)',
        borderRadius: '8px',
        padding: '4px 0',
        minWidth: typeof width === 'number' ? `${width}px` : width || '200px',
        maxWidth: '320px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        zIndex: 2000,
        boxSizing: 'border-box',
      }}
    >
      {children}
      {items &&
        items.map((item) => (
          <React.Fragment key={item.id}>
            {item.divider && (
              <div
                style={{
                  height: '1px',
                  backgroundColor: 'var(--md-sys-color-outline-variant)',
                  margin: '4px 0',
                }}
              />
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                item.onClick();
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                fontFamily: 'var(--md-ref-typeface-plain)',
                fontSize: '14px',
                color: item.danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-text)',
                cursor: 'pointer',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {item.icon && (
                <Icon
                  name={item.icon}
                  size={20}
                  style={{
                    color: item.danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-text-secondary)',
                    flexShrink: 0,
                  }}
                />
              )}
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </span>
            </button>
          </React.Fragment>
        ))}
    </div>
  );
};
