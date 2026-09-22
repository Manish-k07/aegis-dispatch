import React from 'react';
import {
  Gauge,
  Navigation,
  Compass,
  CornerUpRight,
  CornerUpLeft,
  MoveUp,
  Clock,
  RotateCcw,
  CheckCircle,
  MapPin,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { Dispatch, Ambulance, Emergency, Hospital } from '../types';

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

  // Determine stage index for milestone stepper
  const stages = [
    { key: 'DISPATCHED', label: 'Dispatched' },
    { key: 'AMBULANCE_ACCEPTED', label: 'Accepted' },
    { key: 'EN_ROUTE_TO_SCENE', label: 'En Route' },
    { key: 'ARRIVED_AT_SCENE', label: 'At Scene' },
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
  let ManeuverIcon = MoveUp;
  if (mLower.includes('left')) ManeuverIcon = CornerUpLeft;
  else if (mLower.includes('right')) ManeuverIcon = CornerUpRight;
  else if (mLower.includes('u-turn')) ManeuverIcon = RotateCcw;
  else if (mLower.includes('arrive') || mLower.includes('destination')) ManeuverIcon = CheckCircle;

  const speedPercent = Math.min(100, Math.round((ambulance.speed / 80) * 100));

  return (
    <div className="mission-hud-overlay">
      <div className="hud-card">
        {/* Top telemetry strip */}
        <div className="hud-header">
          <div className="hud-unit">
            <span className="hud-siren-indicator">
              <span className="siren-light red"></span>
              <span className="siren-light blue"></span>
            </span>
            <strong className="hud-reg">{ambulance.registrationNumber}</strong>
            <span className="hud-badge">{ambulance.type} UNIT</span>
            {isSimulating && <span className="sim-live-tag">GPS SIM LIVE</span>}
          </div>

          <div className="flex items-center gap-2">
            <div className="hud-mission-status">
              <span className="status-dot"></span>
              <span>{dispatch.status.replace(/_/g, ' ')}</span>
            </div>

            {isSimulating && (
              <button className="btn btn-xs btn-outline-red" onClick={onStopSimulation}>
                Stop GPS
              </button>
            )}
          </div>
        </div>

        {/* Mission Lifecycle Stepper */}
        <div className="mission-stepper">
          <div className="stepper-track">
            <div
              className="stepper-progress"
              style={{ width: `${(currentStageIdx / (stages.length - 1)) * 100}%` }}
            ></div>
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
                <span className="stepper-num">{idx + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Turn-by-Turn Instruction Banner */}
        <div className="hud-maneuver-banner">
          <ManeuverIcon size={20} className="text-sky flex-shrink-0" />
          <div className="hud-maneuver-text">
            <div className="text-secondary text-xs uppercase tracking-wider">Next Road Maneuver</div>
            <strong>{maneuver || 'Proceeding on optimal emergency road path'}</strong>
          </div>
        </div>

        {/* Tactical Telemetry Metric Strip */}
        <div className="hud-grid">
          {/* Speed Velocity with Mini Bar */}
          <div className="hud-stat">
            <div className="hud-stat-label">
              <Gauge size={12} />
              <span>Velocity</span>
            </div>
            <div className="hud-stat-value text-emerald">
              {ambulance.speed.toFixed(0)} <span className="unit">km/h</span>
            </div>
            <div className="hud-speed-bar">
              <div
                className="hud-speed-fill"
                style={{ width: `${speedPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Compass Rose with Dynamic Needle */}
          <div className="hud-stat">
            <div className="hud-stat-label">
              <Compass size={12} />
              <span>Bearing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="hud-compass-rose">
                <div
                  className="hud-compass-needle"
                  style={{ transform: `rotate(${ambulance.heading}deg)` }}
                ></div>
              </div>
              <div className="hud-stat-value text-sky">
                {ambulance.heading.toFixed(0)}°
              </div>
            </div>
          </div>

          {/* Road ETA */}
          <div className="hud-stat">
            <div className="hud-stat-label">
              <Clock size={12} />
              <span>Road ETA</span>
            </div>
            <div className="hud-stat-value text-amber">
              {etaRemaining !== undefined ? etaRemaining : dispatch.etaMinutes} <span className="unit">min</span>
            </div>
          </div>

          {/* Road Distance */}
          <div className="hud-stat">
            <div className="hud-stat-label">
              <Navigation size={12} />
              <span>Distance</span>
            </div>
            <div className="hud-stat-value">
              {dispatch.distanceKm} <span className="unit">km</span>
            </div>
          </div>
        </div>

        {/* Destination Target Strip */}
        <div className="hud-destination">
          {isHospitalPhase ? (
            <Building2 size={13} className="text-sky flex-shrink-0" />
          ) : (
            <MapPin size={13} className="text-red flex-shrink-0" />
          )}
          <span className="text-secondary text-xs uppercase font-bold">Target:</span>
          <span className="hud-dest-address">{targetName}</span>
        </div>
      </div>
    </div>
  );
};
