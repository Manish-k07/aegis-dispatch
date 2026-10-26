import React, { useEffect } from 'react';
import { Icon } from './Icon';

interface SnackbarProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
  leadingIcon?: string;
}

export const Snackbar: React.FC<SnackbarProps> = ({
  message,
  isOpen,
  onClose,
  actionLabel,
  onAction,
  durationMs = 5000,
  leadingIcon,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [isOpen, onClose, durationMs]);

  if (!isOpen) return null;

  return (
    <div className="m3-snackbar-portal" role="status" aria-live="polite">
      <div className="m3-snackbar">
        {leadingIcon && <Icon name={leadingIcon} size={20} className="m3-snackbar-icon" />}
        <span className="m3-snackbar-text">{message}</span>
        {actionLabel && onAction && (
          <button
            type="button"
            className="m3-snackbar-action"
            onClick={() => {
              onAction();
              onClose();
            }}
          >
            {actionLabel}
          </button>
        )}
        <button
          type="button"
          className="m3-snackbar-close"
          onClick={onClose}
          aria-label="Dismiss notification"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  );
};
