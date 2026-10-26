import React from 'react';

export interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
  unit?: string;
  style?: React.CSSProperties;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  current,
  total,
  unit = '',
  style,
}) => {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.min(Math.max(current / safeTotal, 0), 1);
  const percentage = Math.round(ratio * 100);

  // Free capacity ratio determines color:
  // >30% free capacity = success
  // 10-30% free capacity = warning
  // <10% free capacity = error
  const freeRatio = Math.max(1 - ratio, 0);
  let color = 'var(--md-sys-color-success)';
  if (freeRatio < 0.1) {
    color = 'var(--md-sys-color-error)';
  } else if (freeRatio <= 0.3) {
    color = 'var(--md-sys-color-warning)';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <span style={{ color: 'var(--md-sys-color-text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--md-sys-color-text)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {current} / {total} {unit}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${label}: ${current} of ${total}`}
        style={{
          width: '100%',
          height: '6px',
          backgroundColor: 'var(--md-sys-color-surface-container-highest)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: color,
            borderRadius: '3px',
            transition: 'width 250ms ease',
          }}
        />
      </div>
    </div>
  );
};
