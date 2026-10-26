import React, { useEffect } from 'react';
import { Icon } from './Icon';
import { Button } from './Button';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  maxWidth?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  actions,
  confirmLabel,
  cancelLabel,
  onConfirm,
  maxWidth = '560px',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="m3-dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="m3-dialog-container"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="m3-dialog-title"
      >
        <div className="m3-dialog-header">
          {icon && <Icon name={icon} size={24} className="m3-dialog-icon" />}
          <h2 id="m3-dialog-title" className="m3-page-title" style={{ fontSize: '20px', lineHeight: '24px' }}>
            {title}
          </h2>
          <button
            type="button"
            className="m3-dialog-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="m3-dialog-content">{children}</div>

        {(actions || confirmLabel || cancelLabel) && (
          <div className="m3-dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px' }}>
            {actions ? (
              actions
            ) : (
              <>
                {cancelLabel && (
                  <Button variant="outlined" onClick={onClose}>
                    {cancelLabel}
                  </Button>
                )}
                {confirmLabel && (
                  <Button variant="filled" onClick={onConfirm}>
                    {confirmLabel}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
