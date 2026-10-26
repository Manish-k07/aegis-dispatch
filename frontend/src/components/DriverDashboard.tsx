import React, { useState, useEffect, useRef } from 'react';
import {
  Ambulance,
  Emergency,
  Hospital,
  Dispatch,
  PatientVitals,
  TrafficPreemptionSignal,
} from '../types';
import { MedicalMonitorWidget } from './MedicalMonitorWidget';
import { API_BASE } from '../config';
import { AmbulanceRouteMap } from './AmbulanceRouteMap';
import {
  Icon,
  Button,
  Card,
  SectionHeader,
  StatusChip,
  Field,
  EmptyState,
  Snackbar,
  Row,
  Stack,
  Dialog,
} from './common';

export type ResponderViewMode = 'DRIVER' | 'OPERATOR';

interface DriverDashboardProps {
  ambulance: Ambulance;
  allAmbulances?: Ambulance[];
  onSelectAmbulance?: (a: Ambulance) => void;
  dispatch?: Dispatch | null;
  emergency?: Emergency | null;
  hospital?: Hospital | null;
  isSimulating: boolean;
  onToggleSimulation: (dispatchId: string) => void;
  onAdvanceStatus: (dispatch: Dispatch, nextStatus: string) => void;
  onStreamVitals: (dispatchId: string, vitals: PatientVitals) => void;
  missionTelemetry?: {
    maneuver?: string;
    etaRemaining?: number;
    roadWaypoints?: [number, number][];
  };
  apiBase?: string;
  onLogout?: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({
  ambulance,
  dispatch,
  emergency,
  hospital,
  isSimulating,
  onToggleSimulation,
  onAdvanceStatus,
  onStreamVitals,
  missionTelemetry,
  apiBase,
  onLogout,
}) => {
  // Hands-free Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string>(
    'Hands-free voice recognition ready. Say "En route", "On scene", "Patient onboard", or "At hospital".'
  );
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

  const [viewMode, setViewMode] = useState<ResponderViewMode>(() => {
    const saved = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('aegis_responder_view_mode') as ResponderViewMode | null) : null;
    return saved || 'DRIVER';
  });

  const [showModeModal, setShowModeModal] = useState<boolean>(() => {
    return typeof sessionStorage !== 'undefined' ? !sessionStorage.getItem('aegis_responder_view_mode') : false;
  });

  const handleSwitchMode = (mode: ResponderViewMode) => {
    setViewMode(mode);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('aegis_responder_view_mode', mode);
    }
    setShowModeModal(false);
  };

  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Simulated traffic preemption signals
  const [preemptionSignals] = useState<TrafficPreemptionSignal[]>([
    { id: 'SIG-101', intersection: 'Brigade Rd & Residency Rd', state: 'GREEN_PREEMPTED', distanceMeters: 140, countdownSec: 28 },
    { id: 'SIG-102', intersection: 'Richmond Circle Junction', state: 'GREEN_PREEMPTED', distanceMeters: 520, countdownSec: 45 },
    { id: 'SIG-103', intersection: 'Hosur Road Metro Gate', state: 'CLEARING', distanceMeters: 980, countdownSec: 70 },
  ]);

  const dispatchRef = useRef(dispatch);
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  // Speech recognition initialization with proper cleanup
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

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      setRecognitionInstance(recognition);

      return () => {
        try {
          recognition.abort();
        } catch {}
      };
    }
  }, []);

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
    const currentDispatch = dispatchRef.current;
    if (!currentDispatch) {
      speakConfirmation('No active dispatch mission assigned to this vehicle.');
      return;
    }

    if (command.includes('en route') || command.includes('on the way')) {
      onAdvanceStatus(currentDispatch, 'EN_ROUTE_TO_SCENE');
      speakConfirmation('Status updated to En Route to Scene');
      setVoiceFeedback('Voice command accepted: En route to scene');
    } else if (command.includes('scene') || command.includes('arrived at scene')) {
      onAdvanceStatus(currentDispatch, 'ARRIVED_AT_SCENE');
      speakConfirmation('Status updated to Arrived at Scene');
      setVoiceFeedback('Voice command accepted: Arrived at scene');
    } else if (command.includes('patient onboard') || command.includes('onboard') || command.includes('loaded')) {
      onAdvanceStatus(currentDispatch, 'PATIENT_ONBOARD');
      speakConfirmation('Status updated to Patient Onboard');
      setVoiceFeedback('Voice command accepted: Patient onboard');
    } else if (command.includes('hospital') || command.includes('transport') || command.includes('transporting')) {
      onAdvanceStatus(currentDispatch, 'EN_ROUTE_TO_HOSPITAL');
      speakConfirmation('Status updated to En Route to Hospital');
      setVoiceFeedback('Voice command accepted: Transporting to hospital');
    } else if (command.includes('at hospital') || command.includes('arrived at hospital')) {
      onAdvanceStatus(currentDispatch, 'ARRIVED_AT_HOSPITAL');
      speakConfirmation('Status updated to Arrived at Hospital');
      setVoiceFeedback('Voice command accepted: Arrived at hospital');
    } else if (command.includes('complete') || command.includes('clear')) {
      onAdvanceStatus(currentDispatch, 'COMPLETED');
      speakConfirmation('Mission completed. Vehicle back in service.');
      setVoiceFeedback('Voice command accepted: Mission completed');
    } else {
      setVoiceFeedback(`Unrecognized command: "${command}". Try "En route" or "Patient onboard".`);
    }
  };

  const toggleListening = () => {
    if (!recognitionInstance) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionInstance.stop();
      setIsListening(false);
      setVoiceFeedback('Hands-free microphone paused.');
    } else {
      try {
        recognitionInstance.start();
        setIsListening(true);
        setVoiceFeedback('Listening for hands-free status commands...');
      } catch (e) {
        console.error(e);
      }
    }
  };

  // AI Clinical Decision Support State
  const [aiProtocolResult, setAiProtocolResult] = useState<any>(null);
  const [isAiProtocolLoading, setIsAiProtocolLoading] = useState(false);
  const [showAiGuidance, setShowAiGuidance] = useState(false);

  const handleRunAiProtocolTriage = async () => {
    setIsAiProtocolLoading(true);
    try {
      const desc = vitals.conditionSummary || emergency?.type || 'EMERGENCY';
      const res = await fetch(`${apiBase || API_BASE}/ai/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, type: emergency?.type || 'ACCIDENT' }),
      });
      if (res.ok) {
        const json = await res.json();
        setAiProtocolResult(json);
        setShowAiGuidance(true);
        return;
      }
    } catch {
      // Heuristic fallback
      const emType = emergency?.type || 'CARDIAC';
      setAiProtocolResult({
        priority: 'CRITICAL',
        esiLevel: 'Level 1 - Resuscitation',
        requiredUnit: 'ALS Unit',
        protocolChecklist: [
          'Acquire 12-lead ECG & transmit to receiving ED',
          'Chewable Aspirin 325mg if not contraindicated',
          'Bilateral 18G IV lines with saline lock',
          'Notify Cath Lab for pre-arrival STEMI activation',
        ],
      });
      setShowAiGuidance(true);
    } finally {
      setIsAiProtocolLoading(false);
    }
  };

  const handleApplyAiProtocol = () => {
    if (!aiProtocolResult?.protocolChecklist) return;
    const checklistStr = aiProtocolResult.protocolChecklist.join('; ');
    const updatedNotes = vitals.conditionSummary
      ? `${vitals.conditionSummary}\n[AI Protocol: ${checklistStr}]`
      : `[AI Protocol: ${checklistStr}]`;
    setVitals({ ...vitals, conditionSummary: updatedNotes });
    setSnackbarMessage('AI Clinical Protocol applied to patient transmission notes');
  };

  const handleBroadcastVitals = () => {
    if (dispatch) {
      onStreamVitals(dispatch.id, vitals);
      speakConfirmation('Patient vitals transmitted to receiving emergency department.');
      setSnackbarMessage(`Vitals broadcast to ${hospital?.name || 'receiving emergency department'}`);
    }
  };

  const nextStatusOptions: { [key: string]: { next: string; label: string } } = {
    DISPATCHED: { next: 'AMBULANCE_ACCEPTED', label: 'Accept call' },
    AMBULANCE_ACCEPTED: { next: 'EN_ROUTE_TO_SCENE', label: 'En route to scene' },
    EN_ROUTE_TO_SCENE: { next: 'ARRIVED_AT_SCENE', label: 'Arrived at scene' },
    ARRIVED_AT_SCENE: { next: 'PATIENT_ONBOARD', label: 'Patient onboard' },
    PATIENT_ONBOARD: { next: 'EN_ROUTE_TO_HOSPITAL', label: 'Transport to hospital' },
    EN_ROUTE_TO_HOSPITAL: { next: 'ARRIVED_AT_HOSPITAL', label: 'Arrived at hospital' },
    ARRIVED_AT_HOSPITAL: { next: 'COMPLETED', label: 'Complete mission & clear' },
  };

  const nextAction = dispatch ? nextStatusOptions[dispatch.status] : null;

  // Status chip tone: NO yellow per Step 4 rules (only green, blue, neutral)
  const getStatusTone = (status: string): 'success' | 'info' | 'neutral' => {
    if (status === 'AVAILABLE') return 'success';
    return 'info'; // Blue for in-mission/en route
  };

  const formatStatus = (s: string) => {
    const clean = s.replace(/_/g, ' ').toLowerCase();
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  // Vitals out-of-range checks
  const isHypoxemic = vitals.spO2 < 90;
  const isTachycardic = vitals.heartRate > 130;
  const isBradycardic = vitals.heartRate < 50;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-text)',
      }}
    >
      {/* 1. Header: Unit ID in mono, sentence-case subtitle, status tonal chip, NO yellow, NO operator dropdown */}
      <header
        style={{
          minHeight: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          backgroundColor: 'var(--md-sys-color-surface)',
          borderBottom: '1px solid var(--md-sys-color-outline)',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <Row gap={12} align="center">
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="ambulance" size={24} />
          </div>
          <div>
            <Row gap={8} align="center">
              <span className="mono" style={{ fontSize: '18px', fontWeight: 600 }}>
                {ambulance.registrationNumber}
              </span>
              <StatusChip
                tone={getStatusTone(ambulance.status)}
                label={formatStatus(ambulance.status)}
                icon={ambulance.status === 'AVAILABLE' ? 'check_circle' : 'navigation'}
              />
            </Row>
            <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '2px' }}>
              Advanced life support ambulance · Paramedic unit
            </div>
          </div>
        </Row>

        <Row gap={12} align="center">
          {/* M3 Segmented Switcher for Driver vs Operator view */}
          <div className="m3-segmented-control" role="group" aria-label="Console View Mode">
            <button
              type="button"
              className={`m3-segmented-item ${viewMode === 'DRIVER' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('DRIVER')}
              title="Driver navigation view: Full map and road guidance"
            >
              <Icon name="navigation" size={18} />
              <span>Driver (Map)</span>
            </button>
            <button
              type="button"
              className={`m3-segmented-item ${viewMode === 'OPERATOR' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('OPERATOR')}
              title="Operator clinical console: Telemetry, vitals, ECG"
            >
              <Icon name="monitor_heart" size={18} />
              <span>Operator (Full)</span>
            </button>
          </div>

          <div className="m3-hide-mobile" style={{ fontSize: '14px', color: 'var(--md-sys-color-text-secondary)' }}>
            Crew: <strong>{ambulance.driverName || 'Arun Kumar'}</strong> &amp; <strong>{ambulance.emtName || 'Meena R'}</strong>
          </div>
          {onLogout && (
            <Button
              variant="outlined"
              size="standard"
              icon="logout"
              onClick={() => {
                if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('aegis_responder_view_mode');
                if (onLogout) onLogout();
              }}
            >
              Log out
            </Button>
          )}
        </Row>
      </header>

      {/* Mode Selection Modal Dialog */}
      <Dialog
        isOpen={showModeModal}
        onClose={() => {
          if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('aegis_responder_view_mode')) {
            handleSwitchMode('DRIVER');
          } else {
            setShowModeModal(false);
          }
        }}
        title="Select Console Mode"
        icon="terminal"
        maxWidth="640px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '14px', color: 'var(--md-sys-color-text-secondary)', lineHeight: '20px' }}>
            Choose the active interface configuration for Unit <strong>{ambulance.registrationNumber}</strong>. You can switch modes at any time using the toggle in the top bar.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {/* Driver View Option */}
            <div
              onClick={() => handleSwitchMode('DRIVER')}
              style={{
                border: '2px solid var(--md-sys-color-primary)',
                borderRadius: '12px',
                padding: '16px',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 150ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--md-sys-color-primary)',
                    color: 'var(--md-sys-color-on-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="navigation" size={24} />
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                  }}
                >
                  DRIVER SIDE
                </span>
              </div>

              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                  Driver Navigation View
                </div>
                <div style={{ fontSize: '13px', color: 'var(--md-sys-color-text-secondary)', marginTop: '4px', lineHeight: '18px' }}>
                  Full-screen GPS road navigation, turn-by-turn guidance, live speed/ETA telemetry, and priority traffic preemption. Zero medical clutter.
                </div>
              </div>

              <Button
                variant="filled"
                size="standard"
                icon="navigation"
                onClick={() => handleSwitchMode('DRIVER')}
                style={{ width: '100%', marginTop: 'auto' }}
              >
                Launch Driver View
              </Button>
            </div>

            {/* Operator View Option */}
            <div
              onClick={() => handleSwitchMode('OPERATOR')}
              style={{
                border: '1px solid var(--md-sys-color-outline)',
                borderRadius: '12px',
                padding: '16px',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 150ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--md-sys-color-surface-variant)',
                    color: 'var(--md-sys-color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="monitor_heart" size={24} />
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--md-sys-color-surface-variant)',
                    color: 'var(--md-sys-color-text-secondary)',
                  }}
                >
                  OPERATOR SIDE
                </span>
              </div>

              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                  Operator Clinical Console
                </div>
                <div style={{ fontSize: '13px', color: 'var(--md-sys-color-text-secondary)', marginTop: '4px', lineHeight: '18px' }}>
                  Dual-column clinical operations dashboard with patient vitals monitoring, 12-lead ECG telemetry, hospital broadcast, and voice control.
                </div>
              </div>

              <Button
                variant="outlined"
                size="standard"
                icon="monitor_heart"
                onClick={() => handleSwitchMode('OPERATOR')}
                style={{ width: '100%', marginTop: 'auto' }}
              >
                Launch Operator View
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Driver View (Map Only) vs Operator View (Full Dashboard) */}
      {viewMode === 'DRIVER' ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 16px',
            gap: '12px',
            boxSizing: 'border-box',
            minHeight: 0,
          }}
        >
          {/* Full Screen Road Navigation Map */}
          <div style={{ flex: 1, minHeight: '480px', position: 'relative' }}>
            <AmbulanceRouteMap
              ambulance={ambulance}
              dispatch={dispatch}
              emergency={emergency}
              hospital={hospital}
              isSimulating={isSimulating}
              onToggleSimulation={onToggleSimulation}
              missionTelemetry={missionTelemetry}
              fullHeight={true}
            />
          </div>

          {/* Driver Quick Actions Bottom Bar (Zero Medical Clutter) */}
          <Card padding={16} variant="outlined" style={{ flexShrink: 0 }}>
            {dispatch ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                {/* Mission Summary Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--md-sys-color-primary-container)',
                      color: 'var(--md-sys-color-on-primary-container)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="navigation" size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                      {emergency?.address || 'Incident Scene'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                      Target: {hospital?.name || 'Assigned Hospital'} · Priority: <strong>{emergency?.priority || 'URGENT'}</strong> · Status: {formatStatus(dispatch.status)}
                    </div>
                  </div>
                </div>

                {/* Status Advancement & Phase Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {nextAction && (
                    <Button
                      variant="filled"
                      size="large"
                      iconTrailing="arrow_forward"
                      onClick={() => onAdvanceStatus(dispatch, nextAction.next)}
                      style={{ height: '48px', minWidth: '220px', fontWeight: 600 }}
                    >
                      Advance: {nextAction.label}
                    </Button>
                  )}

                  {/* 48px Touch-friendly Status Buttons */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { label: 'En route', status: 'EN_ROUTE_TO_SCENE' },
                      { label: 'At scene', status: 'ARRIVED_AT_SCENE' },
                      { label: 'Onboard', status: 'PATIENT_ONBOARD' },
                      { label: 'Transporting', status: 'EN_ROUTE_TO_HOSPITAL' },
                      { label: 'At hospital', status: 'ARRIVED_AT_HOSPITAL' },
                      { label: 'Clear', status: 'COMPLETED' },
                    ].map((btn) => (
                      <button
                        key={btn.status}
                        type="button"
                        onClick={() => onAdvanceStatus(dispatch, btn.status)}
                        style={{
                          height: '48px',
                          padding: '0 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--md-sys-color-outline)',
                          backgroundColor:
                            dispatch.status === btn.status
                              ? 'var(--md-sys-color-primary-container)'
                              : 'var(--md-sys-color-surface-variant)',
                          color:
                            dispatch.status === btn.status
                              ? 'var(--md-sys-color-on-primary-container)'
                              : 'var(--md-sys-color-text)',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Row justify="space-between" align="center">
                <Row gap={8} align="center">
                  <Icon name="check_circle" size={20} style={{ color: 'var(--md-sys-color-success)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    Vehicle on standby · GPS telemetry broadcasting to CAD
                  </span>
                </Row>
                <StatusChip tone="success" label="Available for dispatch" />
              </Row>
            )}
          </Card>
        </div>
      ) : (
        /* 2. Main 2-Column MDT Grid (Responsive 1-Column on Mobile via .driver-mdt-grid) */
        <div
          className="driver-mdt-grid"
        style={{
          flex: 1,
          padding: '16px',
          boxSizing: 'border-box',
          overflow: 'auto',
        }}
      >
        {/* Left Column: Status Card above Map, Map, Voice Controls, V2X Panel */}
        <Stack gap={16}>
          {/* Status Card Above Map as a Normal Row */}
          <Card padding={16} variant="outlined">
            {dispatch && emergency ? (
              <Stack gap={12}>
                <Row justify="space-between" align="center">
                  <SectionHeader
                    icon="navigation"
                    title={`Active mission · #${dispatch.id.slice(0, 8)}`}
                  />
                  <StatusChip tone="info" label={formatStatus(dispatch.status)} />
                </Row>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    padding: '12px',
                    backgroundColor: 'var(--md-sys-color-surface-high)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginBottom: '4px' }}>
                      Incident location
                    </div>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="place" size={16} style={{ color: 'var(--md-sys-color-error)' }} />
                      <span>{emergency.address}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '2px' }}>
                      {emergency.type} · Priority: {emergency.priority}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginBottom: '4px' }}>
                      Destination hospital
                    </div>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="local_hospital" size={16} style={{ color: 'var(--md-sys-color-primary)' }} />
                      <span>{hospital?.name || 'Demo City General ED'}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '2px' }}>
                      ETA: <strong style={{ color: 'var(--md-sys-color-primary)' }}>{missionTelemetry?.etaRemaining ? `${missionTelemetry.etaRemaining} min` : '4.5 min'}</strong> · Speed: {ambulance.speed} km/h
                    </div>
                  </div>
                </div>

                {/* Primary Advance Phase Button (48px tall) */}
                {nextAction && (
                  <Button
                    variant="filled"
                    size="large"
                    iconTrailing="arrow_forward"
                    onClick={() => onAdvanceStatus(dispatch, nextAction.next)}
                    style={{ height: '48px', width: '100%' }}
                  >
                    Advance phase: {nextAction.label}
                  </Button>
                )}
              </Stack>
            ) : (
              <EmptyState
                icon="schedule"
                title="No active dispatch"
                description="No active dispatch. Stand by for mission assignment."
              />
            )}
          </Card>

          {/* Route Map Card */}
          <Card padding={16} variant="outlined" style={{ display: 'flex', flexDirection: 'column', height: '420px' }}>
            <SectionHeader
              icon="explore"
              title="Tactical navigation route"
              action={
                dispatch && (
                  <Button
                    variant="outlined"
                    size="small"
                    icon={isSimulating ? 'pause' : 'play_arrow'}
                    onClick={() => onToggleSimulation(dispatch.id)}
                  >
                    {isSimulating ? 'Pause route drive' : 'Simulate drive'}
                  </Button>
                )
              }
            />
            <div style={{ flex: 1, marginTop: '8px', minHeight: 0, borderRadius: '8px', overflow: 'hidden' }}>
              <AmbulanceRouteMap
                ambulance={ambulance}
                dispatch={dispatch}
                emergency={emergency}
                hospital={hospital}
                isSimulating={isSimulating}
                onToggleSimulation={onToggleSimulation}
                missionTelemetry={missionTelemetry}
              />
            </div>
          </Card>

          {/* Voice Controls with 48px Tonal Buttons */}
          <Card padding={16} variant="outlined">
            <SectionHeader
              icon="mic"
              title="Hands-free voice status control"
              action={
                <Button
                  variant={isListening ? 'filled' : 'outlined'}
                  size="standard"
                  icon={isListening ? 'mic_off' : 'mic'}
                  onClick={toggleListening}
                >
                  {isListening ? 'Stop mic' : 'Activate mic'}
                </Button>
              }
            />

            <div
              style={{
                fontSize: '13px',
                color: isListening ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-text-secondary)',
                backgroundColor: 'var(--md-sys-color-surface-high)',
                padding: '10px 14px',
                borderRadius: '8px',
                margin: '12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Icon name="volume_up" size={18} />
              <span>{voiceFeedback}</span>
            </div>

            {/* 48px Tonal Voice Quick Buttons */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
              }}
            >
              {[
                { label: 'En route', status: 'EN_ROUTE_TO_SCENE' },
                { label: 'At scene', status: 'ARRIVED_AT_SCENE' },
                { label: 'Patient onboard', status: 'PATIENT_ONBOARD' },
                { label: 'Transporting', status: 'EN_ROUTE_TO_HOSPITAL' },
                { label: 'At hospital', status: 'ARRIVED_AT_HOSPITAL' },
                { label: 'Complete & clear', status: 'COMPLETED' },
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={!dispatch}
                  onClick={() => dispatch && onAdvanceStatus(dispatch, action.status)}
                  style={{
                    height: '48px',
                    borderRadius: '8px',
                    border: '1px solid var(--md-sys-color-outline)',
                    backgroundColor: 'var(--md-sys-color-surface-variant)',
                    color: 'var(--md-sys-color-text)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: dispatch ? 'pointer' : 'not-allowed',
                    opacity: dispatch ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </Card>

          {/* V2X Preemption Panel with "Simulated" Chip */}
          <Card padding={16} variant="outlined">
            <Row justify="space-between" align="center" style={{ marginBottom: '12px' }}>
              <SectionHeader icon="traffic" title="Traffic signal preemption (V2X)" />
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--md-sys-color-surface-variant)',
                  color: 'var(--md-sys-color-text-secondary)',
                  fontWeight: 500,
                }}
              >
                Simulated
              </span>
            </Row>

            <Stack gap={8}>
              {preemptionSignals.map((sig) => (
                <div
                  key={sig.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'var(--md-sys-color-surface-high)',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--md-sys-color-success)',
                        display: 'inline-block',
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>{sig.intersection}</div>
                      <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>
                        Corridor clearing · {sig.distanceMeters}m ahead
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="mono" style={{ color: 'var(--md-sys-color-success)', fontWeight: 600 }}>
                      {sig.countdownSec}s
                    </span>
                  </div>
                </div>
              ))}
            </Stack>
          </Card>
        </Stack>

        {/* Right Column: Vitals: ONE panel */}
        <Stack gap={16}>
          <Card padding={16} variant="outlined">
            <SectionHeader
              icon="monitor_heart"
              title="Patient vital signs & telemetry"
              subtitle="Clinical monitoring and hospital transmission"
            />

            {/* Read-only monitor strip (4 tiles: HR, BP, SpO2, Resp) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                margin: '16px 0',
              }}
            >
              {/* HR Tile */}
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--md-sys-color-surface-high)',
                  border: `1px solid ${isTachycardic || isBradycardic ? 'var(--md-sys-color-warning)' : 'var(--md-sys-color-outline)'}`,
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>Heart rate</div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 600, margin: '4px 0' }}>
                  {vitals.heartRate}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>bpm</div>
              </div>

              {/* BP Tile */}
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--md-sys-color-surface-high)',
                  border: '1px solid var(--md-sys-color-outline)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>Blood pressure</div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 600, margin: '4px 0' }}>
                  {vitals.bloodPressureSys}/{vitals.bloodPressureDia}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>mmHg</div>
              </div>

              {/* SpO2 Tile */}
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--md-sys-color-surface-high)',
                  border: `1px solid ${isHypoxemic ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-outline)'}`,
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>O2 Sat</div>
                <div
                  className="mono"
                  style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    margin: '4px 0',
                    color: isHypoxemic ? 'var(--md-sys-color-error)' : 'inherit',
                  }}
                >
                  {vitals.spO2}%
                </div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>SpO2</div>
              </div>

              {/* Resp Tile */}
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--md-sys-color-surface-high)',
                  border: '1px solid var(--md-sys-color-outline)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>Respiration</div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 600, margin: '4px 0' }}>
                  {vitals.respiratoryRate}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>/min</div>
              </div>
            </div>

            {/* Simulated ECG Sweep */}
            <div style={{ marginBottom: '16px' }}>
              <MedicalMonitorWidget
                vitals={vitals}
                onActivateCathLab={() => {
                  setVoiceFeedback('Cath Lab pre-alert broadcast to trauma center');
                  speakConfirmation('Emergency STEMI pre-alert broadcast to receiving trauma center');
                }}
              />
            </div>

            {/* "Update vitals" 3-column form with standard Fields & unit suffixes */}
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              Update vitals
            </div>

            <Stack gap={12}>
              {/* Row 1: HR, Sys BP, Dia BP */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <Field
                  label="Heart rate"
                  value={String(vitals.heartRate)}
                  onChange={(e) => setVitals({ ...vitals, heartRate: parseInt(e.target.value) || 0 })}
                  type="number"
                  suffix="bpm"
                  helperText={isTachycardic ? 'Tachycardia (>130)' : isBradycardic ? 'Bradycardia (<50)' : undefined}
                />
                <Field
                  label="Systolic BP"
                  value={String(vitals.bloodPressureSys)}
                  onChange={(e) => setVitals({ ...vitals, bloodPressureSys: parseInt(e.target.value) || 0 })}
                  type="number"
                  suffix="mmHg"
                />
                <Field
                  label="Diastolic BP"
                  value={String(vitals.bloodPressureDia)}
                  onChange={(e) => setVitals({ ...vitals, bloodPressureDia: parseInt(e.target.value) || 0 })}
                  type="number"
                  suffix="mmHg"
                />
              </div>

              {/* Row 2: SpO2, Resp, Temp */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <Field
                  label="Oxygen saturation"
                  value={String(vitals.spO2)}
                  onChange={(e) => setVitals({ ...vitals, spO2: parseInt(e.target.value) || 0 })}
                  type="number"
                  suffix="%"
                  error={isHypoxemic ? 'Critical hypoxemia (<90%)' : undefined}
                />
                <Field
                  label="Resp rate"
                  value={String(vitals.respiratoryRate)}
                  onChange={(e) => setVitals({ ...vitals, respiratoryRate: parseInt(e.target.value) || 0 })}
                  type="number"
                  suffix="/min"
                />
                <Field
                  label="Temperature"
                  value={String(vitals.temperature)}
                  onChange={(e) => setVitals({ ...vitals, temperature: parseFloat(e.target.value) || 0 })}
                  type="number"
                  suffix="°C"
                />
              </div>

              {/* Row 3: Clinical notes */}
              <Field
                label="Paramedic clinical notes / mechanism"
                value={vitals.conditionSummary || ''}
                onChange={(e) => setVitals({ ...vitals, conditionSummary: e.target.value })}
                multiline
                rows={2}
              />

              {/* "Broadcast vitals to hospital": solid primary, 48px, disabled when no active mission */}
              <Button
                variant="filled"
                size="large"
                icon="radio"
                disabled={!dispatch}
                onClick={handleBroadcastVitals}
                style={{ height: '48px', width: '100%', marginTop: '8px' }}
              >
                Broadcast vitals to hospital
              </Button>
            </Stack>
          </Card>
                </Stack>
      </div>
      )}

      {/* Snackbar notification on broadcast */}
      <Snackbar
        message={snackbarMessage || ''}
        isOpen={Boolean(snackbarMessage)}
        onClose={() => setSnackbarMessage(null)}
      />
    </div>
  );
};
