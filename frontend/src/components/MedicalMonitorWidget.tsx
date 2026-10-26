import React, { useEffect, useRef, useState } from 'react';
import { PatientVitals } from '../types';
import { Icon } from './common/Icon';
import { StatusChip } from './common/StatusChip';
import { Button } from './common/Button';

interface MedicalMonitorWidgetProps {
  vitals?: PatientVitals;
  compact?: boolean;
  onActivateCathLab?: () => void;
}

export const MedicalMonitorWidget: React.FC<MedicalMonitorWidgetProps> = ({
  vitals,
  compact = false,
  onActivateCathLab,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isStemiAlertActive, setIsStemiAlertActive] = useState(false);
  const [cathLabActivated, setCathLabActivated] = useState(false);

  // Fallback default vitals if none provided
  const hr = vitals?.heartRate || 108;
  const sys = vitals?.bloodPressureSys || 142;
  const dia = vitals?.bloodPressureDia || 90;
  const spo2 = vitals?.spO2 || 97;
  const resp = 20;
  const etco2 = 38;

  // Real-time animated 12-lead ECG sweep canvas with Hi-DPI scaling & dynamic BPM
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const clientWidth = parent?.clientWidth || 640;
    const clientHeight = compact ? 80 : 110;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = clientWidth * dpr;
    canvas.height = clientHeight * dpr;
    canvas.style.width = '100%';
    canvas.style.height = `${clientHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    let animationId: number;
    let x = 0;
    const height = clientHeight;
    const width = clientWidth;
    const baseline = height / 2;

    const points: number[] = [];
    const stepSize = 2;
    const cycleLengthPx = Math.max(50, Math.min(240, Math.round((60 / Math.max(40, hr)) * 140)));

    const render = () => {
      ctx.fillStyle = 'rgba(6, 11, 20, 0.25)';
      ctx.fillRect(x, 0, 16, height);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 0.5;

      const cyclePos = (x % cycleLengthPx) / cycleLengthPx;
      let y = baseline;

      if (cyclePos > 0.15 && cyclePos < 0.22) {
        y = baseline - Math.sin(((cyclePos - 0.15) / 0.07) * Math.PI) * 7;
      } else if (cyclePos >= 0.26 && cyclePos < 0.28) {
        y = baseline + 6;
      } else if (cyclePos >= 0.28 && cyclePos < 0.33) {
        const rFrac = (cyclePos - 0.28) / 0.05;
        y = baseline - (1 - Math.abs(rFrac - 0.5) * 2) * (height * 0.42);
      } else if (cyclePos >= 0.33 && cyclePos < 0.36) {
        y = baseline + 10;
      } else if (cyclePos > 0.45 && cyclePos < 0.62) {
        const stElevation = isStemiAlertActive ? 12 : 0;
        y = baseline - Math.sin(((cyclePos - 0.45) / 0.17) * Math.PI) * (10 + stElevation);
      }

      ctx.beginPath();
      const prevX = (x - stepSize + width) % width;
      const prevY = points[Math.floor(prevX / stepSize)] || baseline;
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);

      ctx.strokeStyle = isStemiAlertActive ? '#f28b82' : '#81c995';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      ctx.stroke();

      points[Math.floor(x / stepSize)] = y;
      x = (x + stepSize) % width;

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [hr, compact, isStemiAlertActive]);

  const handleTriggerCathLab = () => {
    setCathLabActivated(true);
    if (onActivateCathLab) {
      onActivateCathLab();
    }
  };

  return (
    <div
      className="medical-monitor-card"
      style={{
        background: 'var(--md-sys-color-surface-container-high)',
        border: isStemiAlertActive
          ? '1px solid var(--md-sys-color-error)'
          : '1px solid var(--md-sys-color-outline)',
        borderRadius: '12px',
        padding: compact ? '16px' : '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon
            name="ecg_heart"
            size={20}
            style={{ color: isStemiAlertActive ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)' }}
          />
          <strong style={{ fontSize: '14px', color: 'var(--md-sys-color-text)', fontWeight: 500 }}>
            ECG Monitor · Lead II Continuous
          </strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsStemiAlertActive(!isStemiAlertActive)}
            style={{
              background: isStemiAlertActive ? 'var(--md-sys-color-error-container)' : 'transparent',
              border: `1px solid ${isStemiAlertActive ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-outline)'}`,
              color: isStemiAlertActive ? 'var(--md-sys-color-on-error-container)' : 'var(--md-sys-color-text-secondary)',
              fontSize: '12px',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'background-color 150ms ease, border-color 150ms ease',
            }}
          >
            {isStemiAlertActive ? (
              <>
                <Icon name="warning" size={16} />
                <span>STEMI simulated</span>
              </>
            ) : (
              'Simulate ST-elevation'
            )}
          </button>
          <StatusChip label="Simulated" tone="warning" size="small" />
        </div>
      </div>

      {/* Real-time ECG Waveform Canvas */}
      <div
        style={{
          position: 'relative',
          background: '#040711',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '16px',
          height: compact ? '80px' : '110px',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={compact ? 80 : 110}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '10px',
            fontSize: '11px',
            color: isStemiAlertActive ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-success)',
            fontWeight: 600,
            letterSpacing: '0.5px',
            fontFamily: 'var(--font-mono, "Roboto Mono", monospace)',
          }}
        >
          {isStemiAlertActive ? 'ST-ELEVATION DETECTED: +2.4mm V2-V4' : 'NSR · HR: ' + hr + ' BPM'}
        </div>
      </div>

      {/* Vital Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: isStemiAlertActive ? '16px' : '0',
        }}
      >
        {/* Heart Rate */}
        <div
          style={{
            background: 'var(--md-sys-color-surface)',
            border: '1px solid var(--md-sys-color-outline)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', fontWeight: 500, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Icon name="favorite" size={14} style={{ color: 'var(--md-sys-color-error)' }} />
            <span>PULSE (HR)</span>
          </div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
            {hr} <span style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', fontWeight: 400 }}>BPM</span>
          </div>
        </div>

        {/* NIBP */}
        <div
          style={{
            background: 'var(--md-sys-color-surface)',
            border: '1px solid var(--md-sys-color-outline)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
            NIBP
          </div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
            {sys}/{dia} <span style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', fontWeight: 400 }}>mmHg</span>
          </div>
        </div>

        {/* SpO2 */}
        <div
          style={{
            background: 'var(--md-sys-color-surface)',
            border: '1px solid var(--md-sys-color-outline)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
            SpO₂ (O2)
          </div>
          <div
            className="mono"
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: spo2 < 94 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)',
            }}
          >
            {spo2}%
          </div>
        </div>

        {/* EtCO2 */}
        <div
          style={{
            background: 'var(--md-sys-color-surface)',
            border: '1px solid var(--md-sys-color-outline)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
            EtCO₂ / RESP
          </div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
            {etco2} <span style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', fontWeight: 400 }}>/{resp}</span>
          </div>
        </div>
      </div>

      {/* STEMI Cath Lab Pre-Activation Action Banner */}
      {isStemiAlertActive && (
        <div
          style={{
            background: 'var(--md-sys-color-error-container)',
            border: '1px solid var(--md-sys-color-error)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="warning" size={24} style={{ color: 'var(--md-sys-color-error)' }} />
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--md-sys-color-on-error-container)', display: 'block' }}>
                Acute STEMI protocol activated
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-error-container)', opacity: 0.85 }}>
                ST elevation in Leads V2-V4 · Prepare receiving Hospital Cardiac Cath Lab
              </div>
            </div>
          </div>

          <Button
            variant="filled"
            onClick={handleTriggerCathLab}
            disabled={cathLabActivated}
            icon={cathLabActivated ? 'verified' : 'bolt'}
            style={{
              height: '40px',
              backgroundColor: cathLabActivated ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-emergency)',
              color: '#FFFFFF',
            }}
          >
            {cathLabActivated ? 'Cath lab pre-activated' : 'Pre-alert Cath Lab'}
          </Button>
        </div>
      )}
    </div>
  );
};
