import React from 'react';

export interface IconProps {
  name: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

// Dev-time check pattern for valid Material Symbols ligature names
const VALID_ICON_NAME_PATTERN = /^[a-z0-9_]+$/;

/**
 * Material Symbols Outlined Icon Component.
 * Self-hosted from 'material-symbols/outlined.css'.
 * Never falls back to raw glyphs like '*'.
 */
export const Icon: React.FC<IconProps> = ({
  name,
  className = '',
  size = 20,
  style,
}) => {
  // Dev-time assertion check
  if ((import.meta as any).env?.DEV) {
    if (!name || !VALID_ICON_NAME_PATTERN.test(name)) {
      console.error(
        `[Material Symbols Icon Error]: Invalid icon ligature name "${name}". ` +
        `Icons must match /^[a-z0-9_]+$/ and never render plain text or fallback glyphs.`
      );
    }
  }

  const cleanName = name?.trim() || 'help';

  return (
    <span
      className={`material-symbols-outlined ${size >= 24 ? 'standalone' : ''} ${className}`}
      style={{
        fontSize: `${size}px`,
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        fontFamily: "'Material Symbols Outlined'",
        userSelect: 'none',
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
      data-icon={cleanName}
    >
      {cleanName}
    </span>
  );
};
