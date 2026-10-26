import React, { useState } from 'react';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

export interface PhoneLinkProps {
  phone: string;
  label?: string;
  style?: React.CSSProperties;
}

export const PhoneLink: React.FC<PhoneLinkProps> = ({
  phone,
  label,
  style,
}) => {
  const [copied, setCopied] = useState(false);

  const cleanPhone = phone.replace(/[^0-9+]/g, '');

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...style }}>
      <a
        href={`tel:${cleanPhone}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          color: 'var(--md-sys-color-primary)',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: 500,
        }}
      >
        <Icon name="call" size={16} />
        <span>{label || phone}</span>
      </a>
      <Tooltip content={copied ? 'Copied' : 'Copy phone number'}>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied phone number' : 'Copy phone number'}
          style={{
            background: 'none',
            border: 'none',
            padding: '2px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            color: copied ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-text-secondary)',
            borderRadius: '4px',
          }}
        >
          <Icon name={copied ? 'check' : 'content_copy'} size={14} />
        </button>
      </Tooltip>
    </div>
  );
};
