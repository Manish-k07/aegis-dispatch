import React, { useState, useEffect } from 'react';
import {
  Hospital,
  Dispatch,
  Emergency,
  Ambulance,
  PatientVitals
} from '../types';
import {
  Building2,
  Activity,
  Bed,
  Heart,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Phone,
  MapPin,
  RefreshCw,
  Plus,
  Minus,
  Save
} from 'lucide-react';
import { MedicalMonitorWidget } from './MedicalMonitorWidget';

interface HospitalDashboardProps {
  hospital: Hospital;
  allHospitals: Hospital[];
  onSelectHospital: (h: Hospital) => void;
  dispatches: Dispatch[];
  emergencies: Emergency[];
  ambulances: Ambulance[];
  liveVitalsByDispatch?: { [dispatchId: string]: PatientVitals };
  onUpdateCapacity: (hospitalId: string, capacity: Partial<Hospital>) => void;
  onAdvanceStatus: (dispatch: Dispatch, nextStatus: string) => void;
  onSaveToFile?: () => void;
}

export const HospitalDashboard: React.FC<HospitalDashboardProps> = ({
  hospital,
  allHospitals,
  onSelectHospital,
  dispatches,
  emergencies,
  ambulances,
  liveVitalsByDispatch = {},
  onUpdateCapacity,
  onAdvanceStatus,
  onSaveToFile,
}) => {
  // Local bed states for editing
  const [availableBeds, setAvailableBeds] = useState(hospital.availableBeds ?? 48);
  const [icuBedsAvailable, setIcuBedsAvailable] = useState(hospital.icuBedsAvailable ?? 7);
  const [traumaBaysAvailable, setTraumaBaysAvailable] = useState(hospital.traumaBaysAvailable ?? 4);
  const [status, setStatus] = useState(hospital.status);
  const [savedBanner, setSavedBanner] = useState(false);

  // Sync state whenever hospital prop changes
  useEffect(() => {
    setAvailableBeds(hospital.availableBeds ?? 48);
    setIcuBedsAvailable(hospital.icuBedsAvailable ?? 7);
    setTraumaBaysAvailable(hospital.traumaBaysAvailable ?? 4);
    setStatus(hospital.status);
  }, [hospital.id, hospital.availableBeds, hospital.icuBedsAvailable, hospital.traumaBaysAvailable, hospital.status]);

  // Inbound dispatches destined for this hospital
  const inboundDispatches = dispatches.filter(
    (d) =>
      d.hospitalId === hospital.id &&
      !['COMPLETED', 'CANCELLED'].includes(d.status)
  );

  const handleSaveBeds = () => {
    onUpdateCapacity(hospital.id, {
      availableBeds,
      icuBedsAvailable,
      traumaBaysAvailable,
      status,
    });
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  return (
    <div className="hospital-dashboard-container">
      {/* Top Hospital Identity Banner */}
      <div className="hospital-identity-header">
        <div className="hospital-identity-info">
          <div className="hospital-avatar-badge">
            <Building2 size={26} className="text-sky" />
          </div>
          <div>
            <div className="hospital-label">EMERGENCY & TRAUMA RECEPTION CENTER</div>
            <h1 className="hospital-name-title">{hospital.name}</h1>
            <div className="hospital-sub-meta">
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-secondary" />
                {hospital.address}
              </span>
              <span className="dot-sep">·</span>
              <span className="flex items-center gap-1">
                <Phone size={12} className="text-secondary" />
                Direct ED Hotline: {hospital.phone}
              </span>
              <span className="dot-sep">·</span>
              <span className={`status-pill ${hospital.status === 'AVAILABLE' ? 'ok' : 'busy'}`}>
                {hospital.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions & Hospital Facility Switcher */}
        <div className="flex items-center gap-3">
          {onSaveToFile && (
            <button
              className="btn btn-sm btn-outline btn-save-mdt"
              onClick={onSaveToFile}
              title="Save full CAD state and hospital intake telemetry to file"
            >
              <Save size={13} className="text-sky" />
              <span>Save ED Log to File</span>
            </button>
          )}

          <div className="hospital-facility-switcher">
            <label>Facility Console:</label>
            <select
              value={hospital.id}
              onChange={(e) => {
                const selected = allHospitals.find((h) => h.id === e.target.value);
                if (selected) {
                  onSelectHospital(selected);
                  setAvailableBeds(selected.availableBeds ?? 48);
                  setIcuBedsAvailable(selected.icuBedsAvailable ?? 7);
                  setTraumaBaysAvailable(selected.traumaBaysAvailable ?? 4);
                  setStatus(selected.status);
                }
              }}
            >
              {allHospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hospital Metrics & Inbound Ambulance Radar Layout */}
      <div className="hospital-mdt-grid">
        {/* Left Column: Live Bed Availability & Capacity Controls */}
        <div className="hospital-left-column">
          <div className="hospital-card bed-manager-card">
            <div className="card-header-row">
              <div className="flex items-center gap-2">
                <Bed size={18} className="text-sky" />
                <span className="font-bold text-sm tracking-wider uppercase">Live Bed & Trauma Bay Management</span>
              </div>
              <button className="btn btn-xs btn-outline" onClick={handleSaveBeds}>
                <RefreshCw size={12} />
                <span>Publish Updates</span>
              </button>
            </div>

            <p className="text-secondary text-xs mb-3">
              Maintain active bed availability. Central CAD and en-route ambulances dynamically adjust hospital routing based on these telemetry values.
            </p>

            <div className="bed-controls-grid">
              {/* General ED Beds */}
              <div className="bed-counter-box">
                <div className="bed-counter-label">GENERAL EMERGENCY BEDS</div>
                <div className="bed-counter-value">
                  <span className="count-num text-emerald">{availableBeds}</span>
                  <span className="count-total">/ {hospital.totalBeds ?? 160}</span>
                </div>
                <div className="bed-step-btns">
                  <button onClick={() => setAvailableBeds(Math.max(0, availableBeds - 1))}>
                    <Minus size={12} />
                  </button>
                  <button onClick={() => setAvailableBeds(availableBeds + 1)}>
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              {/* ICU Resuscitation Beds */}
              <div className="bed-counter-box">
                <div className="bed-counter-label">AVAILABLE ICU BEDS</div>
                <div className="bed-counter-value">
                  <span className="count-num text-amber">{icuBedsAvailable}</span>
                  <span className="count-total">/ {hospital.icuBedsTotal ?? 28}</span>
                </div>
                <div className="bed-step-btns">
                  <button onClick={() => setIcuBedsAvailable(Math.max(0, icuBedsAvailable - 1))}>
                    <Minus size={12} />
                  </button>
                  <button onClick={() => setIcuBedsAvailable(icuBedsAvailable + 1)}>
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              {/* Trauma Resuscitation Bays */}
              <div className="bed-counter-box">
                <div className="bed-counter-label">TRAUMA RESUS BAYS</div>
                <div className="bed-counter-value">
                  <span className="count-num text-red">{traumaBaysAvailable}</span>
                  <span className="count-total">/ {hospital.traumaBaysTotal ?? 10}</span>
                </div>
                <div className="bed-step-btns">
                  <button onClick={() => setTraumaBaysAvailable(Math.max(0, traumaBaysAvailable - 1))}>
                    <Minus size={12} />
                  </button>
                  <button onClick={() => setTraumaBaysAvailable(traumaBaysAvailable + 1)}>
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>

            <div className="facility-status-row mt-3">
              <label className="text-xs font-bold text-secondary uppercase">Facility ED Divert Status:</label>
              <div className="flex gap-2 mt-1">
                <button
                  className={`btn btn-xs ${status === 'AVAILABLE' ? 'btn-success' : 'btn-outline'}`}
                  onClick={() => setStatus('AVAILABLE')}
                >
                  NORMAL (OPEN)
                </button>
                <button
                  className={`btn btn-xs ${status === 'LIMITED_CAPACITY' ? 'btn-sim' : 'btn-outline'}`}
                  onClick={() => setStatus('LIMITED_CAPACITY')}
                >
                  LIMITED CAPACITY
                </button>
                <button
                  className={`btn btn-xs ${status === 'FULL' ? 'btn-dispatch' : 'btn-outline'}`}
                  onClick={() => setStatus('FULL')}
                >
                  DIVERT (FULL)
                </button>
              </div>
            </div>

            {savedBanner && (
              <div className="stream-success-pill mt-3">
                <CheckCircle2 size={14} className="text-emerald" />
                <span>Bed availability published to Aegis Central CAD</span>
              </div>
            )}
          </div>

          {/* Clinical Readiness Checklist */}
          <div className="hospital-card readiness-checklist-card">
            <div className="card-header-row">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber" />
                <span className="font-bold text-sm tracking-wider uppercase">Facility Clinical Readiness</span>
              </div>
              <span className="chip chip-als">LEVEL 1 CERTIFIED</span>
            </div>

            <div className="clinical-features-grid mt-2">
              <div className="clinical-feature-item">
                <CheckCircle2 size={14} className="text-emerald" />
                <span>24/7 Comprehensive Stroke Team</span>
              </div>
              <div className="clinical-feature-item">
                <CheckCircle2 size={14} className="text-emerald" />
                <span>Cardiac Cath Lab: <strong>STANDBY READY</strong></span>
              </div>
              <div className="clinical-feature-item">
                <CheckCircle2 size={14} className="text-emerald" />
                <span>Blood Bank: <strong>O-Negative Available</strong></span>
              </div>
              <div className="clinical-feature-item">
                <CheckCircle2 size={14} className="text-emerald" />
                <span>CT / MRI Fast Track Clear</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Incoming Ambulances Radar & Live Streamed Patient Vitals */}
        <div className="hospital-right-column">
          <div className="hospital-card inbound-radar-card">
            <div className="card-header-row">
              <div className="flex items-center gap-2">
                <Radio size={18} className="text-red pulse-icon" />
                <h2 className="font-bold text-sm tracking-wider uppercase">Inbound Ambulances & Live Patient Vitals Radar</h2>
              </div>
              <span className="badge-count text-sky">{inboundDispatches.length} INBOUND</span>
            </div>

            {inboundDispatches.length === 0 ? (
              <div className="empty-state">
                <CheckCircle2 size={36} className="text-emerald mb-2" />
                <strong>No Inbound Emergency Transports</strong>
                <p className="text-secondary text-xs mt-1">Hospital ED reception is clear and prepared for incoming traffic.</p>
              </div>
            ) : (
              <div className="inbound-list">
                {inboundDispatches.map((dispatch) => {
                  const emergency = emergencies.find((e) => e.id === dispatch.emergencyId);
                  const ambulance = ambulances.find((a) => a.id === dispatch.ambulanceId);
                  const vitals = liveVitalsByDispatch[dispatch.id] || {
                    heartRate: 104,
                    bloodPressureSys: 130,
                    bloodPressureDia: 85,
                    spO2: 96,
                    respiratoryRate: 20,
                    temperature: 37.1,
                    gcs: 14,
                    conditionSummary: emergency?.description || 'En-route emergency transport',
                  };

                  return (
                    <div key={dispatch.id} className="inbound-patient-card">
                      {/* Inbound Header */}
                      <div className="inbound-header">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="priority-tag critical">{emergency?.priority || 'CRITICAL'}</span>
                            <span className="inbound-unit-callsign">UNIT {ambulance?.registrationNumber} ({ambulance?.type})</span>
                          </div>
                          <div className="inbound-complaint">
                            <strong>{emergency?.type}:</strong> {emergency?.description}
                          </div>
                        </div>

                        <div className="inbound-eta-box">
                          <Clock size={14} className="text-amber" />
                          <span className="eta-text">{dispatch.etaMinutes ? `${dispatch.etaMinutes} min` : '4 min'} ETA</span>
                        </div>
                      </div>

                      {/* Live Streamed Patient Vitals Monitor */}
                      <div className="streamed-vitals-box mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-red flex items-center gap-1 uppercase tracking-wider">
                            <Activity size={14} className="pulse-icon" />
                            Live Patient Vitals (Streamed from Vehicle)
                          </span>
                          <span className="font-mono text-xs text-emerald">UPDATED SECONDS AGO</span>
                        </div>

                        {/* Animated Real-Time 12-Lead ECG Sweep & Telemetry */}
                        <div className="mb-3">
                          <MedicalMonitorWidget vitals={vitals} compact={true} />
                        </div>

                        <div className="vitals-readout-grid">
                          <div className="vital-readout-pill">
                            <span className="lbl">NIBP</span>
                            <strong className="val">{vitals.bloodPressureSys}/{vitals.bloodPressureDia}</strong>
                          </div>

                          <div className="vital-readout-pill">
                            <span className="lbl">SpO2</span>
                            <strong className="val text-emerald">{vitals.spO2}%</strong>
                          </div>

                          <div className="vital-readout-pill">
                            <span className="lbl">RESP</span>
                            <strong className="val">{vitals.respiratoryRate} /min</strong>
                          </div>

                          <div className="vital-readout-pill">
                            <span className="lbl">TEMP</span>
                            <strong className="val">{vitals.temperature}°C</strong>
                          </div>

                          <div className="vital-readout-pill">
                            <span className="lbl">GCS</span>
                            <strong className="val text-amber">{vitals.gcs} / 15</strong>
                          </div>
                        </div>

                        <div className="patient-notes-banner mt-2">
                          <small className="text-secondary">Paramedic Notes: </small>
                          <span className="text-primary text-xs">{vitals.conditionSummary}</span>
                        </div>
                      </div>

                      {/* Reception Actions */}
                      <div className="inbound-actions-row mt-3">
                        <div className="flex gap-2">
                          <button
                            className="btn btn-xs btn-outline-sky"
                            onClick={() => alert(`Trauma Bay 2 reserved for inbound patient from ${ambulance?.registrationNumber}`)}
                          >
                            Reserve Trauma Bay 2
                          </button>
                          <button
                            className="btn btn-xs btn-outline"
                            onClick={() => alert(`Cardiac Cath Lab alerted for inbound transfer from ${ambulance?.registrationNumber}`)}
                          >
                            Pre-Alert Cath Lab
                          </button>
                        </div>

                        {dispatch.status === 'ARRIVED_AT_HOSPITAL' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => onAdvanceStatus(dispatch, 'COMPLETED')}
                          >
                            <UserCheck size={14} />
                            <span>Confirm Patient Handover & Clear</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
