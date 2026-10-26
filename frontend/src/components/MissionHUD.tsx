import React from 'react';
import { Dispatch, Ambulance, Emergency, Hospital } from '../types';
import { Icon } from './common/Icon';
import { Button } from './common/Button';

interface MissionHUDProps {
  dispatch: Dispatch;
  ambulance: Ambulance;
  emergency?: Emergency;
  hospital?: Hospital;
  maneuver?: string;
  etaRemaining?: number;
  isSimulating: boolean;
  onStopSimulation: () => void;
}

export const MissionHUD: React.FC<MissionHUDProps> = ({
  dispatch,
  ambulance,
  emergency,
  hospital,
  maneuver,
  etaRemaining,
  isSimulating,
  onStopSimulation,
}) => {
  const isHospitalPhase = ['EN_ROUTE_TO_HOSPITAL', 'ARRIVED_AT_HOSPITAL'].includes(dispatch.status);
  const targetName = isHospitalPhase ? (hospital?.name || 'Assigned Hospital') : (emergency?.address || 'Incident Scene');

  const stages = [
    { key: 'DISPATCHED', label: 'Dispatched' },
    { key: 'AMBULANCE_ACCEPTED', label: 'Accepted' },
    { key: 'EN_ROUTE_TO_SCENE', label: 'En route' },
    { key: 'ARRIVED_AT_SCENE', label: 'At scene' },
    { key: 'PATIENT_ONBOARD', label: 'Onboard' },
    { key: 'EN_ROUTE_TO_HOSPITAL', label: 'Hospital' },
    { key: 'ARRIVED_AT_HOSPITAL', label: 'Arrived' },
    { key: 'COMPLETED', label: 'Complete' },
  ];

  let currentStageIdx = 0;
  switch (dispatch.status) {
    case 'DISPATCHED': currentStageIdx = 0; break;
    case 'AMBULANCE_ACCEPTED': currentStageIdx = 1; break;
    case 'EN_ROUTE_TO_SCENE': currentStageIdx = 2; break;
    case 'ARRIVED_AT_SCENE': currentStageIdx = 3; break;
    case 'PATIENT_ONBOARD': currentStageIdx = 4; break;
    case 'EN_ROUTE_TO_HOSPITAL': currentStageIdx = 5; break;
    case 'ARRIVED_AT_HOSPITAL': currentStageIdx = 6; break;
    case 'COMPLETED': currentStageIdx = 7; break;
    default: currentStageIdx = 0; break;
  }

  // Determine direction maneuver icon
  const mLower = (maneuver || '').toLowerCase();
  let maneuverIconName = 'straight';
  if (mLower.includes('left')) maneuverIconName = 'turn_left';
  else if (mLower.includes('right')) maneuverIconName = 'turn_right';
  else if (mLower.includes('u-turn')) maneuverIconName = 'u_turn_left';
  else if (mLower.includes('arrive') || mLower.includes('destination')) maneuverIconName = 'check_circle';

  return (
    <div className="mission-hud-overlay">
      <div
        className="hud-card"
        style={{
          backgroundColor: 'var(--md-sys-color-surface)',
          border: '1px solid var(--md-sys-color-outline)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}
      >
        {/* Top telemetry strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong
              style={{
                fontFamily: 'Roboto Mono, monospace',
                fontSize: '14px',
                color: 'var(--md-sys-color-on-surface)',
              }}
            >
              {ambulance.registrationNumber}
            </strong>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                color: 'var(--md-sys-color-on-surface-variant)',
                fontWeight: 600,
              }}
            >
              {ambulance.type}
            </span>
            {isSimulating && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--md-sys-color-primary-container)',
                  color: 'var(--md-sys-color-on-primary-container)',
                  fontWeight: 500,
                }}
              >
                Simulating GPS
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--md-sys-color-on-surface-variant)',
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {dispatch.status.toLowerCase().replace(/_/g, ' ')}
            </span>

            {isSimulating && (
              <Button
                variant="outlined"
                size="small"
                onClick={onStopSimulation}
              >
                Stop GPS
              </Button>
            )}
          </div>
        </div>

        {/* Mission Lifecycle Stepper */}
        <div className="mission-stepper" style={{ marginBottom: '12px' }}>
          <div className="stepper-track">
            <div
              className="stepper-progress"
              style={{
                width: `${(currentStageIdx / (stages.length - 1)) * 100}%`,
                backgroundColor: 'var(--md-sys-color-primary)',
              }}
            />
          </div>
          {stages.map((stage, idx) => {
            const isCompleted = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            return (
              <div
                key={stage.key}
                className={`stepper-node ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                title={stage.label}
              >
                <span className="stepper-num" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                  {idx + 1}
                </span>
              </div>
            );
          })}
        </div>

        {/* Turn-by-Turn Instruction Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            marginBottom: '12px',
          }}
        >
          <Icon name={maneuverIconName} size={20} style={{ color: 'var(--md-sys-color-primary)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              Next road maneuver
            </div>
            <strong style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface)' }}>
              {maneuver || 'Proceeding along optimal response route'}
            </strong>
          </div>
        </div>

        {/* Tactical Telemetry Metric Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-surface-container-low)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>Velocity</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', fontFamily: 'Roboto Mono, monospace' }}>
              {ambulance.speed.toFixed(0)} <span style={{ fontSize: '10px' }}>km/h</span>
            </div>
          </div>

          <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-surface-container-low)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>Bearing</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', fontFamily: 'Roboto Mono, monospace' }}>
              {ambulance.heading.toFixed(0)}°
            </div>
          </div>

          <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-surface-container-low)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>Road ETA</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-warning)', fontFamily: 'Roboto Mono, monospace' }}>
              {etaRemaining !== undefined ? etaRemaining : dispatch.etaMinutes} <span style={{ fontSize: '10px' }}>min</span>
            </div>
          </div>

          <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-surface-container-low)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>Distance</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', fontFamily: 'Roboto Mono, monospace' }}>
              {dispatch.distanceKm} <span style={{ fontSize: '10px' }}>km</span>
            </div>
          </div>
        </div>

        {/* Destination Target Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--md-sys-color-on-surface)' }}>
          <Icon
            name={isHospitalPhase ? 'local_hospital' : 'location_on'}
            size={16}
            style={{ color: isHospitalPhase ? 'var(--md-sys-color-primary)' : '#D93025', flexShrink: 0 }}
          />
          <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Target:</span>
          <strong>{targetName}</strong>
        </div>
      </div>
    </div>
  );
};
