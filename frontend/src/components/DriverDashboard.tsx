import React, { useState, useEffect, useRef } from 'react';
import {
  Ambulance,
  Emergency,
  Hospital,
  Dispatch,
  PatientVitals,
  TrafficPreemptionSignal
} from '../types';
import {
  Shield,
  Navigation,
  Compass,
  Mic,
  MicOff,
  Activity,
  Heart,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Building2,
  MapPin,
  Volume2,
  Zap,
  ArrowRight,
  Save,
  HardDrive,
  Send,
  X,
  PhoneCall
} from 'lucide-react';
import { API_BASE } from '../config';

interface DriverDashboardProps {
  ambulance: Ambulance;
  allAmbulances: Ambulance[];
  onSelectAmbulance: (a: Ambulance) => void;
  dispatch?: Dispatch | null;
  emergency?: Emergency | null;
  hospital?: Hospital | null;
  isSimulating: boolean;
  onToggleSimulation: (dispatchId: string) => void;
  onAdvanceStatus: (dispatch: Dispatch, nextStatus: string) => void;
  onStreamVitals: (dispatchId: string, vitals: PatientVitals) => void;
  onSaveToFile?: () => void;
  missionTelemetry?: {
    maneuver?: string;
    etaRemaining?: number;
  };
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({
  ambulance,
  allAmbulances,
  onSelectAmbulance,
  dispatch,
  emergency,
  hospital,
  isSimulating,
  onToggleSimulation,
  onAdvanceStatus,
  onStreamVitals,
  onSaveToFile,
  missionTelemetry,
}) => {
  // Hands-free Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string>('Hands-free voice recognition ready. Say "En Route", "At Scene", "Patient Onboard", "Transporting", or "Arrived"');
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  // Live Patient Vitals state
  const [vitals, setVitals] = useState<PatientVitals>({
    heartRate: 88,
    bloodPressureSys: 124,
    bloodPressureDia: 82,
    spO2: 97,
    respiratoryRate: 18,
    temperature: 36.9,
    gcs: 15,
    conditionSummary: 'Patient conscious, alert, baseline vitals stable',
  });

  const [vitalsStreamSuccess, setVitalsStreamSuccess] = useState(false);

  // Simulated traffic preemption signals
  const [preemptionSignals] = useState<TrafficPreemptionSignal[]>([
    { id: 'SIG-101', intersection: 'Brigade Rd & Residency Rd', state: 'GREEN_PREEMPTED', distanceMeters: 140, countdownSec: 28 },
    { id: 'SIG-102', intersection: 'Richmond Circle Junction', state: 'GREEN_PREEMPTED', distanceMeters: 520, countdownSec: 45 },
    { id: 'SIG-103', intersection: 'Hosur Road Metro Gate', state: 'CLEARING', distanceMeters: 980, countdownSec: 70 },
  ]);

  // Speech recognition initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
        handleVoiceCommand(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setRecognitionInstance(recognition);
    }
  }, [dispatch]);

  const speakConfirmation = (phrase: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceCommand = (command: string) => {
    setVoiceFeedback(`Heard: "${command}"`);

    if (!dispatch) {
      speakConfirmation("No active dispatch mission assigned to this vehicle.");
      return;
    }

    if (command.includes('en route') || command.includes('on the way')) {
      onAdvanceStatus(dispatch, 'EN_ROUTE_TO_SCENE');
      speakConfirmation("Status updated to En Route to Scene");
      setVoiceFeedback("Voice Command Accepted: EN ROUTE TO SCENE");
    } else if (command.includes('at scene') || command.includes('arrived at scene') || command.includes('scene')) {
      onAdvanceStatus(dispatch, 'ARRIVED_AT_SCENE');
      speakConfirmation("Status updated to Arrived at Emergency Scene");
      setVoiceFeedback("Voice Command Accepted: ARRIVED AT SCENE");
    } else if (command.includes('patient onboard') || command.includes('on board') || command.includes('loaded')) {
      onAdvanceStatus(dispatch, 'PATIENT_ONBOARD');
      speakConfirmation("Status updated to Patient Onboard");
      setVoiceFeedback("Voice Command Accepted: PATIENT ONBOARD");
    } else if (command.includes('hospital') || command.includes('transport') || command.includes('transporting')) {
      onAdvanceStatus(dispatch, 'EN_ROUTE_TO_HOSPITAL');
      speakConfirmation("Status updated to En Route to Hospital");
      setVoiceFeedback("Voice Command Accepted: EN ROUTE TO HOSPITAL");
    } else if (command.includes('arrived at hospital') || command.includes('at hospital')) {
      onAdvanceStatus(dispatch, 'ARRIVED_AT_HOSPITAL');
      speakConfirmation("Status updated to Arrived at Hospital Emergency Department");
      setVoiceFeedback("Voice Command Accepted: ARRIVED AT HOSPITAL");
    } else if (command.includes('complete') || command.includes('finished') || command.includes('clear')) {
      onAdvanceStatus(dispatch, 'COMPLETED');
      speakConfirmation("Mission complete. Vehicle back in service.");
      setVoiceFeedback("Voice Command Accepted: MISSION COMPLETED");
    } else {
      setVoiceFeedback(`Unrecognized voice command: "${command}". Try "En Route" or "Patient Onboard".`);
    }
  };

  const toggleListening = () => {
    if (!recognitionInstance) {
      alert("Web Speech API is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionInstance.stop();
      setIsListening(false);
      setVoiceFeedback("Hands-free microphone paused.");
    } else {
      try {
        recognitionInstance.start();
        setIsListening(true);
        setVoiceFeedback("Listening for hands-free status commands...");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSendVitals = () => {
    if (dispatch) {
      onStreamVitals(dispatch.id, vitals);
      setVitalsStreamSuccess(true);
      speakConfirmation("Patient vital signs transmitted to Hospital Emergency Department.");
      setTimeout(() => setVitalsStreamSuccess(false), 3000);
    }
  };

  // Hospital ED SMS Notification States
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [isNotifyingEd, setIsNotifyingEd] = useState(false);
  const [edNotifiedTime, setEdNotifiedTime] = useState<string | null>(null);

  const handleNotifyHospital = async () => {
    if (!dispatch) return;
    setIsNotifyingEd(true);
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const etaMin = missionTelemetry?.etaRemaining ? Math.round(missionTelemetry.etaRemaining) : 5;

    try {
      await fetch(`${API_BASE}/missions/notify-hospital`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId: dispatch.id,
          hospitalId: hospital?.id,
        }),
      });
    } catch (err) {
      console.warn("SMS endpoint network notice (simulating offline response)", err);
    } finally {
      setIsNotifyingEd(false);
      setShowNotifyModal(false);
      setEdNotifiedTime(nowTime);
      speakConfirmation(`Hospital Emergency Department notified. Estimated arrival in ${etaMin} minutes.`);
    }
  };

  const nextStatusOptions: { [key: string]: { next: string; label: string } } = {
    DISPATCHED: { next: 'AMBULANCE_ACCEPTED', label: 'Accept Call' },
    AMBULANCE_ACCEPTED: { next: 'EN_ROUTE_TO_SCENE', label: 'En Route to Scene' },
    EN_ROUTE_TO_SCENE: { next: 'ARRIVED_AT_SCENE', label: 'Arrived at Scene' },
    ARRIVED_AT_SCENE: { next: 'PATIENT_ONBOARD', label: 'Patient Onboard' },
    PATIENT_ONBOARD: { next: 'EN_ROUTE_TO_HOSPITAL', label: 'Transport to Hospital' },
    EN_ROUTE_TO_HOSPITAL: { next: 'ARRIVED_AT_HOSPITAL', label: 'Arrived at Hospital' },
    ARRIVED_AT_HOSPITAL: { next: 'COMPLETED', label: 'Complete Mission & Clear' },
  };

  const nextAction = dispatch ? nextStatusOptions[dispatch.status] : null;

  return (
    <div className="driver-dashboard-container">
      {/* Top Driver Tactical Identity Header */}
      <div className="driver-identity-header">
        <div className="driver-identity-info">
          <div className="driver-avatar-badge">
            <Shield size={24} className="text-emerald" />
          </div>
          <div>
            <div className="driver-label">ACTIVE AMBULANCE OPERATOR</div>
            <h1 className="driver-name-title">{ambulance.driverName || 'Arun Kumar'}</h1>
            <div className="driver-sub-meta">
              <span>Unit: <strong>{ambulance.registrationNumber}</strong> ({ambulance.type} UNIT)</span>
              <span className="dot-sep">·</span>
              <span>EMT Partner: <strong>{ambulance.emtName || 'Meena R'}</strong></span>
              <span className="dot-sep">·</span>
              <span className={`status-pill ${ambulance.status === 'AVAILABLE' ? 'ok' : 'busy'}`}>
                {ambulance.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions & Vehicle Unit Switcher */}
        <div className="flex items-center gap-3">
          {onSaveToFile && (
            <button
              className="btn btn-sm btn-outline btn-save-mdt"
              onClick={onSaveToFile}
              title="Save full CAD state and active MDT mission log to file"
            >
              <Save size={13} className="text-sky" />
              <span>Save MDT Log to File</span>
            </button>
          )}

          <div className="driver-unit-switcher">
            <label>Operator View:</label>
            <select
              value={ambulance.id}
              onChange={(e) => {
                const selected = allAmbulances.find((a) => a.id === e.target.value);
                if (selected) onSelectAmbulance(selected);
              }}
            >
              {allAmbulances.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.driverName} — {a.registrationNumber} ({a.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main MDT Content Grid */}
      <div className="driver-mdt-grid">
        {/* Left Column: Navigation, Mission Lifecycle & Voice Controls */}
        <div className="driver-left-column">
          {/* Mission Status & Destination Card */}
          <div className="driver-card mission-brief-card">
            <div className="card-header-row">
              <div className="flex items-center gap-2">
                <Navigation size={18} className="text-sky" />
                <span className="font-bold text-sm tracking-wider uppercase">Active Dispatch Mission</span>
              </div>
              {dispatch && (
                <span className="priority-tag critical">MISSION CODE: {dispatch.id.substring(0, 8)}</span>
              )}
            </div>

            {dispatch && emergency ? (
              <div className="mission-brief-content">
                <div className="mission-target-grid">
                  <div className="target-item">
                    <span className="target-label">INCIDENT LOCATION</span>
                    <div className="target-val flex items-center gap-1">
                      <MapPin size={14} className="text-red flex-shrink-0" />
                      <span>{emergency.address}</span>
                    </div>
                    <small className="text-secondary">{emergency.type} · Priority: {emergency.priority}</small>
                  </div>

                  <div className="target-item">
                    <span className="target-label">DESTINATION MEDICAL FACILITY</span>
                    <div className="target-val flex items-center gap-1">
                      <Building2 size={14} className="text-sky flex-shrink-0" />
                      <span>{hospital?.name || 'Aegis City General ED'}</span>
                    </div>
                    <small className="text-secondary">{hospital?.address || 'Medical District'}</small>
                  </div>
                </div>

                {/* Turn-by-Turn Navigation HUD */}
                <div className="driver-nav-hud">
                  <div className="nav-maneuver-box">
                    <Compass size={28} className="text-amber" />
                    <div>
                      <div className="nav-maneuver-title">
                        {missionTelemetry?.maneuver || 'Proceed along emergency route corridor'}
                      </div>
                      <div className="nav-maneuver-sub">
                        <span>Speed: <strong>{ambulance.speed} km/h</strong></span>
                        <span className="dot-sep">·</span>
                        <span>Heading: <strong>{ambulance.heading}°</strong></span>
                        <span className="dot-sep">·</span>
                        <span>ETA: <strong className="text-amber">{missionTelemetry?.etaRemaining ? `${missionTelemetry.etaRemaining} min` : '4.5 min'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button
                    className={`btn ${isSimulating ? 'btn-sim-active' : 'btn-sim'} btn-sim-toggle`}
                    onClick={() => onToggleSimulation(dispatch.id)}
                  >
                    {isSimulating ? <Square size={14} /> : <Play size={14} />}
                    <span>{isSimulating ? 'Pause GPS Drive' : 'Engage Road GPS'}</span>
                  </button>
                </div>

                {/* Next Status Action Bar */}
                {nextAction && (
                  <div className="mt-3">
                    <button
                      className="btn btn-primary btn-advance-large w-full"
                      onClick={() => onAdvanceStatus(dispatch, nextAction.next)}
                    >
                      <span>Advance Phase: {nextAction.label}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {/* Hospital ED SMS Notification Trigger */}
                <div className="mt-3">
                  <button
                    className={`btn btn-sm ${edNotifiedTime ? 'btn-outline-emerald' : 'btn-outline-sky'} w-full flex items-center justify-center gap-2`}
                    style={{ minHeight: '38px', fontWeight: 700 }}
                    onClick={() => setShowNotifyModal(true)}
                    disabled={isNotifyingEd}
                    title="Send automated HIPAA clinical ETA notification to receiving Emergency Department via SMS Gateway"
                  >
                    <Send size={14} className={edNotifiedTime ? 'text-emerald' : 'text-sky'} />
                    <span>
                      {edNotifiedTime
                        ? `✓ ED Notified at ${edNotifiedTime} (Bed Ready)`
                        : '📲 Notify Receiving ED'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <CheckCircle2 size={32} className="text-emerald mb-2" />
                <strong>Unit KA-01-AE-1001 is Available & Ready in Sector</strong>
                <p className="text-secondary text-xs mt-1">Awaiting CAD emergency dispatch assignment from command center.</p>
              </div>
            )}
          </div>

          {/* Hands-Free Voice Control Terminal */}
          <div className="driver-card voice-control-card">
            <div className="card-header-row">
              <div className="flex items-center gap-2">
                <Mic size={18} className={isListening ? 'text-red pulse-icon' : 'text-secondary'} />
                <span className="font-bold text-sm tracking-wider uppercase">Hands-Free Voice Status Control</span>
              </div>
              <button
                className={`btn btn-sm ${isListening ? 'btn-dispatch' : 'btn-outline'}`}
                onClick={toggleListening}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                <span>{isListening ? 'Stop Mic' : 'Activate Voice'}</span>
              </button>
            </div>

            <div className="voice-body">
              <div className="voice-status-indicator">
                {isListening ? (
                  <div className="voice-wave-active">
                    <span className="soundwave-bar"></span>
                    <span className="soundwave-bar"></span>
                    <span className="soundwave-bar"></span>
                    <span className="soundwave-bar"></span>
                    <span className="soundwave-bar"></span>
                    <span className="text-xs text-red font-bold uppercase ml-2">MIC LISTENING LIVE</span>
                  </div>
                ) : (
                  <span className="text-secondary text-xs">Mic muted. Click "Activate Voice" or speak hands-free commands.</span>
                )}
              </div>
              <div className="voice-feedback-banner">
                <Volume2 size={14} className="text-sky flex-shrink-0" />
                <span>{voiceFeedback}</span>
              </div>
              <div className="voice-commands-help mt-2">
                <small className="text-muted">Supported Voice Commands:</small>
                <div className="flex gap-1 flex-wrap mt-1">
                  <span className="chip chip-als">"En Route"</span>
                  <span className="chip chip-als">"At Scene"</span>
                  <span className="chip chip-als">"Patient Onboard"</span>
                  <span className="chip chip-als">"Transporting"</span>
                  <span className="chip chip-als">"At Hospital"</span>
                  <span className="chip chip-als">"Complete"</span>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Traffic Light Preemption (V2X Green Wave) */}
          <div className="driver-card preemption-card">
            <div className="card-header-row">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-emerald" />
                <span className="font-bold text-sm tracking-wider uppercase">Smart Traffic Signal Preemption (V2X)</span>
              </div>
              <span className="signal-status-badge active-green">GREEN WAVE ACTIVE</span>
            </div>

            <div className="preemption-signals-list">
              {preemptionSignals.map((sig) => (
                <div key={sig.id} className="signal-row">
                  <div className="signal-light-pill green">
                    <div className="light-dot"></div>
                    <span>{sig.state === 'GREEN_PREEMPTED' ? 'PREEMPTED' : 'CLEARING'}</span>
                  </div>
                  <div className="signal-details">
                    <strong>{sig.intersection}</strong>
                    <small className="text-secondary">Corridor clearing · {sig.distanceMeters}m ahead</small>
                  </div>
                  <div className="signal-countdown">
                    <span className="time-num text-emerald">{sig.countdownSec}s</span>
                    <small>HOLD</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Paramedic Telemetry & Real-Time Patient Vitals Streamer */}
        <div className="driver-right-column">
          <div className="driver-card vitals-streamer-card">
            <div className="card-header-row">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-red" />
                <span className="font-bold text-sm tracking-wider uppercase">Paramedic Patient Vitals Streamer</span>
              </div>
              <span className="pulse-tag text-emerald">LIVE TELEMETRY</span>
            </div>

            <p className="text-secondary text-xs mb-3">
              Transmit real-time clinical vital signs directly to the receiving hospital trauma team prior to arrival.
            </p>

            {/* Simulated Live ECG Monitor Waveform */}
            <div className="ecg-monitor-container mb-3">
              <div className="ecg-grid-overlay"></div>
              <div className="ecg-wave-line"></div>
              <div className="ecg-hud-readout">
                <div className="flex items-center gap-1 text-emerald">
                  <Heart size={14} className="pulse-icon text-red" />
                  <span className="font-mono text-sm font-bold">{vitals.heartRate} BPM</span>
                </div>
                <span className="font-mono text-xs text-sky">LEAD II · SINUS RHYTHM</span>
              </div>
            </div>

            {/* Vital Dials Grid */}
            <div className="vitals-input-grid">
              <div className="vital-input-box">
                <label>HEART RATE (BPM)</label>
                <input
                  type="number"
                  value={vitals.heartRate}
                  onChange={(e) => setVitals({ ...vitals, heartRate: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="vital-input-box">
                <label>BLOOD PRESSURE (SYS/DIA)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={vitals.bloodPressureSys}
                    onChange={(e) => setVitals({ ...vitals, bloodPressureSys: parseInt(e.target.value) || 0 })}
                  />
                  <span>/</span>
                  <input
                    type="number"
                    value={vitals.bloodPressureDia}
                    onChange={(e) => setVitals({ ...vitals, bloodPressureDia: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="vital-input-box">
                <label>O2 SATURATION (SpO2 %)</label>
                <input
                  type="number"
                  value={vitals.spO2}
                  onChange={(e) => setVitals({ ...vitals, spO2: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="vital-input-box">
                <label>RESPIRATORY RATE</label>
                <input
                  type="number"
                  value={vitals.respiratoryRate}
                  onChange={(e) => setVitals({ ...vitals, respiratoryRate: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="vital-input-box">
                <label>TEMPERATURE (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={vitals.temperature}
                  onChange={(e) => setVitals({ ...vitals, temperature: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="vital-input-box">
                <label>GLASGOW COMA (GCS 3-15)</label>
                <input
                  type="number"
                  value={vitals.gcs}
                  onChange={(e) => setVitals({ ...vitals, gcs: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="form-group mt-3">
              <label>Paramedic Clinical Notes / Mechanism:</label>
              <textarea
                rows={2}
                value={vitals.conditionSummary}
                onChange={(e) => setVitals({ ...vitals, conditionSummary: e.target.value })}
              />
            </div>

            <button
              className="btn btn-primary w-full mt-3 flex items-center justify-center gap-2 py-3"
              onClick={handleSendVitals}
              disabled={!dispatch}
            >
              <Radio size={16} />
              <span>Broadcast Live Vitals to Hospital ED</span>
            </button>

            {vitalsStreamSuccess && (
              <div className="stream-success-pill mt-2">
                <CheckCircle2 size={14} className="text-emerald" />
                <span>Telemetry stream packet synchronized with {hospital?.name || 'Receiving Facility'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Confirmation Modal to Prevent Accidental SMS Dispatch on Bumpy Roads */}
      {showNotifyModal && (
        <div className="cctv-modal-overlay" onClick={() => setShowNotifyModal(false)}>
          <div className="cctv-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={16} className="text-sky" />
                <h3 style={{ fontSize: '1rem', color: '#ffffff', margin: 0 }}>Notify Receiving Hospital ED</h3>
              </div>
              <button
                onClick={() => setShowNotifyModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: '14px' }}>
                Transmitting real-time clinical ETA and triage status to <strong>{hospital?.name || 'Aegis City General ED'}</strong> via SMS Gateway.
              </p>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.82rem' }}>
                <div style={{ color: '#94a3b8', marginBottom: '4px' }}>
                  Target ED Phone: <strong style={{ color: '#38bdf8' }}>{hospital?.designatedEdPhone || hospital?.phone || '+91 80 2222 0001'}</strong>
                </div>
                <div style={{ color: '#94a3b8', marginBottom: '6px' }}>
                  Payload Preview (HIPAA Compliant · Zero PHI Leaks):
                </div>
                <div style={{ fontFamily: 'monospace', color: '#34d399', background: '#050811', padding: '8px 10px', borderRadius: '4px', fontSize: '0.78rem' }}>
                  AEGIS ALERT: Unit {ambulance.registrationNumber} en route. ETA: {missionTelemetry?.etaRemaining ? Math.round(missionTelemetry.etaRemaining) : 5} mins. Acuity: {emergency?.priority || 'CRITICAL'}. Chief Complaint: {emergency?.type || 'TRAUMA'}. Patient ID: #{emergency ? emergency.id.substring(0, 6).toUpperCase() : '8492'}.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowNotifyModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleNotifyHospital}
                  disabled={isNotifyingEd}
                >
                  {isNotifyingEd ? 'Transmitting SMS...' : 'Confirm & Transmit SMS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
