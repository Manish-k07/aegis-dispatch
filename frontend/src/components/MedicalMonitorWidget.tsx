import React, { useEffect, useRef, useState } from 'react';
import { Activity, Heart, AlertTriangle, ShieldCheck, Zap, Radio, Bell } from 'lucide-react';
import { PatientVitals } from '../types';

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

  // Real-time animated 12-lead ECG sweep canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let x = 0;
    const height = canvas.height;
    const width = canvas.width;
    const baseline = height / 2;

    // Simulated P-QRS-T complex buffer
    const points: number[] = [];
    const stepSize = 2;

    const render = () => {
      // Clear a small leading eraser bar for medical monitor sweep effect
      ctx.fillStyle = 'rgba(6, 11, 20, 0.25)';
      ctx.fillRect(x, 0, 16, height);

      // Grid background dots
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 0.5;

      // Generate ECG Y coordinate based on phase of heartbeat
      const cyclePos = (x % 140) / 140;
      let y = baseline;

      if (cyclePos > 0.15 && cyclePos < 0.22) {
        // P wave
        y = baseline - Math.sin((cyclePos - 0.15) / 0.07 * Math.PI) * 7;
      } else if (cyclePos >= 0.26 && cyclePos < 0.28) {
        // Q dip
        y = baseline + 6;
      } else if (cyclePos >= 0.28 && cyclePos < 0.33) {
        // R spike (tall systolic depolarization)
        const rFrac = (cyclePos - 0.28) / 0.05;
        y = baseline - (1 - Math.abs(rFrac - 0.5) * 2) * (height * 0.42);
      } else if (cyclePos >= 0.33 && cyclePos < 0.36) {
        // S dip
        y = baseline + 10;
      } else if (cyclePos > 0.45 && cyclePos < 0.62) {
        // T wave (with slight elevation for critical patients)
        const stElevation = isStemiAlertActive ? 12 : 0;
        y = baseline - Math.sin((cyclePos - 0.45) / 0.17 * Math.PI) * (10 + stElevation);
      }

      // Draw glowing ECG sweep trace
      ctx.beginPath();
      const prevX = (x - stepSize + width) % width;
      const prevY = points[Math.floor(prevX / stepSize)] || baseline;
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);

      ctx.strokeStyle = isStemiAlertActive ? '#ef4444' : '#10b981';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = isStemiAlertActive ? '#ef4444' : '#10b981';
      ctx.stroke();
      ctx.shadowBlur = 0;

      points[Math.floor(x / stepSize)] = y;

      x = (x + stepSize) % width;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isStemiAlertActive]);

  const handleTriggerCathLab = () => {
    setCathLabActivated(true);
    if (onActivateCathLab) onActivateCathLab();
  };

  return (
    <div
      className="medical-monitor-card"
      style={{
        background: 'rgba(10, 15, 29, 0.95)',
        border: isStemiAlertActive ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '16px',
        padding: compact ? '16px' : '22px',
        boxShadow: isStemiAlertActive ? '0 0 25px rgba(239, 68, 68, 0.25)' : '0 10px 30px rgba(0, 0, 0, 0.4)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} style={{ color: isStemiAlertActive ? '#ef4444' : '#38bdf8' }} />
          <strong style={{ fontSize: '13px', color: '#f8fafc', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            ZOLL X-Series Telemetry Sync · Lead II Continuous
          </strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsStemiAlertActive(!isStemiAlertActive)}
            style={{
              background: isStemiAlertActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isStemiAlertActive ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
              color: isStemiAlertActive ? '#fca5a5' : '#94a3b8',
              fontSize: '10px',
              padding: '4px 8px',
              borderRadius: '6px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.5px',
            }}
          >
            {isStemiAlertActive ? '⚠️ STEMI PROTOCOL ACTIVE' : 'SIMULATE ST-ELEVATION'}
          </button>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
            ePCR LIVE
          </span>
        </div>
      </div>

      {/* Real-time ECG Waveform Canvas */}
      <div
        style={{
          position: 'relative',
          background: '#040711',
          borderRadius: '10px',
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
            color: isStemiAlertActive ? '#ef4444' : '#10b981',
            fontWeight: 800,
            letterSpacing: '1px',
            fontFamily: 'monospace',
          }}
        >
          {isStemiAlertActive ? 'ST-ELEVATION DETECTED: +2.4mm V2-V4' : 'NSR · HR: ' + hr + ' BPM'}
        </div>
      </div>

      {/* Vital Metrics Grid with Generous Whitespace */}
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
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Heart size={12} className="text-red" />
            <span>PULSE (HR)</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.5px' }}>
            {hr} <span style={{ fontSize: '10px', color: '#64748b' }}>BPM</span>
          </div>
        </div>

        {/* NIBP */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>
            NIBP
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.5px' }}>
            {sys}/{dia} <span style={{ fontSize: '10px', color: '#64748b' }}>mmHg</span>
          </div>
        </div>

        {/* SpO2 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>
            SpO₂ (O2)
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: spo2 < 94 ? '#ef4444' : '#38bdf8', letterSpacing: '0.5px' }}>
            {spo2}%
          </div>
        </div>

        {/* EtCO2 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>
            EtCO₂ / RESP
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.5px' }}>
            {etco2} <span style={{ fontSize: '10px', color: '#64748b' }}>/{resp}</span>
          </div>
        </div>
      </div>

      {/* STEMI Cath Lab Pre-Activation Action Banner */}
      {isStemiAlertActive && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.3))',
            border: '1px solid #ef4444',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle className="text-red animate-bounce" size={20} />
            <div>
              <strong style={{ fontSize: '12px', color: '#fef2f2' }}>ACUTE STEMI PROTOCOL ACTIVATED</strong>
              <div style={{ fontSize: '11px', color: '#fca5a5' }}>
                ST elevation in Leads V2-V4 · Prepare receiving Hospital Cardiac Cath Lab
              </div>
            </div>
          </div>

          <button
            onClick={handleTriggerCathLab}
            disabled={cathLabActivated}
            style={{
              background: cathLabActivated ? '#10b981' : '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: cathLabActivated ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
              letterSpacing: '0.5px',
            }}
          >
            {cathLabActivated ? (
              <>
                <ShieldCheck size={14} />
                <span>CATH LAB PRE-ACTIVATED</span>
              </>
            ) : (
              <>
                <Zap size={14} />
                <span>PRE-ALERT CATH LAB</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
