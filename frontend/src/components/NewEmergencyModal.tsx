import React, { useState, useRef, useEffect } from 'react';
import { Emergency } from '../types';
import { API_BASE } from '../config';
import {
  Dialog,
  Field,
  Select,
  Button,
  Icon,
  Stack,
  SelectOption,
} from './common';

interface NewEmergencyModalProps {
  initialCoordinates?: { lat: number; lon: number } | null;
  onClose: () => void;
  onSubmit: (emergency: Partial<Emergency>) => void;
}

const EMERGENCY_TYPES: SelectOption[] = [
  { value: 'ACCIDENT', label: 'Accident / Collision', icon: 'car_crash' },
  { value: 'CARDIAC', label: 'Cardiac Arrest', icon: 'favorite' },
  { value: 'BREATHING', label: 'Respiratory Distress', icon: 'air' },
  { value: 'TRAUMA', label: 'Major Trauma', icon: 'personal_injury' },
  { value: 'PEDIATRIC', label: 'Pediatric Emergency', icon: 'child_care' },
  { value: 'MATERNITY', label: 'Maternity / OB-GYN', icon: 'pregnant_woman' },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'CRITICAL', label: 'Critical (P1)', icon: 'error' },
  { value: 'HIGH', label: 'High (P2)', icon: 'warning' },
  { value: 'MEDIUM', label: 'Medium (P3)', icon: 'info' },
  { value: 'LOW', label: 'Low (P4)', icon: 'check_circle' },
];

const PRESETS = [
  {
    label: 'Vehicle Collision',
    type: 'ACCIDENT',
    priority: 'CRITICAL' as const,
    address: 'Indiranagar 100ft Road, Bengaluru',
    lat: 12.9784,
    lon: 77.6408,
    desc: 'High-speed collision with injuries',
  },
  {
    label: 'Cardiac Arrest',
    type: 'CARDIAC',
    priority: 'CRITICAL' as const,
    address: 'Koramangala 4th Block, Bengaluru',
    lat: 12.9345,
    lon: 77.6256,
    desc: 'Elderly male collapsed, CPR initiated',
  },
  {
    label: 'Respiratory Distress',
    type: 'BREATHING',
    priority: 'HIGH' as const,
    address: 'MG Road Metro Station, Bengaluru',
    lat: 12.9756,
    lon: 77.6066,
    desc: 'Severe shortness of breath, asthma history',
  },
];

export const NewEmergencyModal: React.FC<NewEmergencyModalProps> = ({
  initialCoordinates,
  onClose,
  onSubmit,
}) => {
  const [callerName, setCallerName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('ACCIDENT');
  const [priority, setPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('CRITICAL');
  const [patientCount, setPatientCount] = useState(1);
  const [address, setAddress] = useState(
    initialCoordinates
      ? `Incident at Lat ${initialCoordinates.lat.toFixed(4)}, Lon ${initialCoordinates.lon.toFixed(4)} (Bengaluru)`
      : ''
  );
  const [latitude, setLatitude] = useState(initialCoordinates?.lat ?? 12.9738);
  const [longitude, setLongitude] = useState(initialCoordinates?.lon ?? 77.6074);
  const [description, setDescription] = useState(
    initialCoordinates
      ? 'Emergency incident reported via interactive map coordinate selection'
      : ''
  );

  const [triageLoading, setTriageLoading] = useState(false);
  const [triageSuggestion, setTriageSuggestion] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const toggleVoiceIntake = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser. Please type or use preset.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const speech = event.results[0][0].transcript;
      setVoiceTranscript(speech);
      setDescription((prev) => (prev ? prev + ' ' + speech : speech));

      const lower = speech.toLowerCase();
      if (lower.includes('cardiac') || lower.includes('chest pain') || lower.includes('heart attack')) {
        setType('CARDIAC');
        setPriority('CRITICAL');
      } else if (lower.includes('accident') || lower.includes('crash') || lower.includes('collision')) {
        setType('ACCIDENT');
        setPriority('CRITICAL');
      } else if (lower.includes('breath') || lower.includes('asthma') || lower.includes('suffocat')) {
        setType('BREATHING');
        setPriority('HIGH');
      } else if (lower.includes('trauma') || lower.includes('fall') || lower.includes('bleed')) {
        setType('TRAUMA');
        setPriority('CRITICAL');
      } else if (lower.includes('child') || lower.includes('baby') || lower.includes('pediatric')) {
        setType('PEDIATRIC');
        setPriority('HIGH');
      }
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleRunAiTriage = async () => {
    if (!description.trim()) return;
    setTriageLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          emergencyType: type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTriageSuggestion(data);
        return;
      }
    } catch {}

    // Fallback heuristic triage
    try {
      await new Promise((r) => setTimeout(r, 600));
      const lower = description.toLowerCase();
      let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
      let confidence = 0.88;
      let reason = 'Standard EMS emergency dispatch required.';
      let protocolChecklist = ['Monitor ABC vitals', 'Position patient safely', 'Prepare AED if unresponsiveness occurs'];

      if (lower.includes('cardiac') || lower.includes('cpr') || lower.includes('unconscious') || lower.includes('chest pain')) {
        priority = 'CRITICAL';
        confidence = 0.96;
        reason = 'High-risk cardiovascular event with hemodynamic instability.';
        protocolChecklist = ['Continuous CPR with bag-valve-mask', 'Attach 12-lead ECG monitor', 'Prepare IV epinephrine & defibrillator'];
      } else if (lower.includes('accident') || lower.includes('collision') || lower.includes('crash') || lower.includes('bleed')) {
        priority = 'CRITICAL';
        confidence = 0.94;
        reason = 'Major polytrauma or critical neurological compromise risk detected.';
        protocolChecklist = ['Airway & C-spine immobilization', 'GCS neurological assessment', 'Control severe hemorrhage', 'Direct transport to Level 1 Trauma'];
      } else if (lower.includes('breath') || lower.includes('asthma') || lower.includes('chok') || lower.includes('dyspnea')) {
        priority = 'HIGH';
        confidence = 0.93;
        reason = 'Acute respiratory compromise detected.';
        protocolChecklist = ['Nebulization therapy (Salbutamol/Ipratropium)', 'Continuous SpO2 monitoring', 'Upright patient positioning'];
      }

      setTriageSuggestion({
        priority,
        suggestedType: type || 'MEDICAL',
        confidence,
        reason,
        protocolChecklist,
      });
    } finally {
      setTriageLoading(false);
    }
  };

  const applyAiTriage = () => {
    if (triageSuggestion) {
      setPriority(triageSuggestion.priority);
      if (triageSuggestion.suggestedType) setType(triageSuggestion.suggestedType);
      const protocols = triageSuggestion.protocolChecklist?.join('; ');
      if (protocols && !description.includes('Protocol:')) {
        setDescription(`${description}\n[AI Protocol Checklist: ${protocols}]`);
      }
      setTriageSuggestion(null);
    }
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    setType(p.type);
    setPriority(p.priority);
    setAddress(p.address);
    setLatitude(p.lat);
    setLongitude(p.lon);
    setDescription(p.desc);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      callerName: callerName.trim() || 'Emergency Caller',
      phone: phone.trim() || 'N/A',
      type,
      priority,
      patientCount,
      address: address.trim() || (initialCoordinates ? `Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}` : 'Bengaluru Metropolitan Area'),
      latitude,
      longitude,
      description: description.trim() || 'Emergency medical assistance requested',
    });
  };

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title="Report emergency incident"
      icon="emergency"
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap={16} fullWidth>
          {/* Voice-to-Text Intake Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderRadius: '12px',
              border: '1px solid var(--md-sys-color-outline-variant)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={toggleVoiceIntake}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: '1px solid var(--md-sys-color-outline)',
                  backgroundColor: isListening ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-surface)',
                  color: isListening ? '#ffffff' : 'var(--md-sys-color-primary)',
                  cursor: 'pointer',
                  transition: 'background-color 150ms ease',
                }}
              >
                <Icon name={isListening ? 'mic_off' : 'mic'} size={16} />
                <span>{isListening ? 'Listening Live... (Speak)' : 'Voice-to-text intake'}</span>
              </button>
              {voiceTranscript && (
                <span style={{ fontSize: '12px', color: 'var(--md-sys-color-primary)', fontStyle: 'italic' }}>
                  "{voiceTranscript}"
                </span>
              )}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>
              Speech clinical entity extraction
            </span>
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--md-sys-color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Icon name="bolt" size={16} style={{ color: 'var(--md-sys-color-warning)' }} />
              Quick presets:
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  height: '28px',
                  padding: '0 10px',
                  borderRadius: '14px',
                  border: '1px solid var(--md-sys-color-outline)',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  color: 'var(--md-sys-color-text)',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 150ms ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 2-Column Form Fields */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            <Field
              label="Caller name"
              placeholder="e.g. Rahul Sharma"
              value={callerName}
              onChange={(e) => setCallerName(e.target.value)}
              leadingIcon="person"
              required
            />
            <Field
              label="Callback phone"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leadingIcon="call"
              required
            />
            <Select
              label="Emergency type"
              value={type}
              onChange={setType}
              options={EMERGENCY_TYPES}
              leadingIcon="medical_services"
            />
            <Select
              label="Priority"
              value={priority}
              onChange={(val) => setPriority(val as any)}
              options={PRIORITY_OPTIONS}
              leadingIcon="priority_high"
            />
            <Field
              label="Patient count"
              type="number"
              min={1}
              value={patientCount}
              onChange={(e) => setPatientCount(parseInt(e.target.value) || 1)}
              leadingIcon="group"
              required
            />
            <Field
              label="Location / Address"
              placeholder="e.g. Brigade Road Junction"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              leadingIcon="location_on"
              required
            />
            <Field
              label="Latitude"
              type="number"
              step="0.0001"
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
              leadingIcon="my_location"
              required
            />
            <Field
              label="Longitude"
              type="number"
              step="0.0001"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
              leadingIcon="explore"
              required
            />
          </div>

          {/* Incident Details / Clinical Notes & AI Triage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--md-sys-color-text-secondary)' }}>
                Incident details / Clinical notes
              </span>
              <button
                type="button"
                onClick={handleRunAiTriage}
                disabled={triageLoading || !description.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid var(--md-sys-color-primary)',
                  backgroundColor: 'var(--md-sys-color-primary-container)',
                  color: 'var(--md-sys-color-on-primary-container)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: triageLoading || !description.trim() ? 0.6 : 1,
                }}
              >
                <Icon name="auto_awesome" size={14} />
                <span>{triageLoading ? 'Triaging...' : 'AI clinical triage'}</span>
              </button>
            </div>
            <Field
              label="Clinical notes & symptoms"
              multiline
              rows={2}
              placeholder="Enter patient symptoms, mechanism of injury, vitals or scene hazards..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              leadingIcon="description"
            />
          </div>

          {/* AI Triage Recommendation Banner */}
          {triageSuggestion && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                border: '1px solid var(--md-sys-color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--md-sys-color-error-container)',
                    color: 'var(--md-sys-color-on-error-container)',
                  }}
                >
                  {triageSuggestion.priority}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--md-sys-color-text)' }}>
                  {triageSuggestion.reason}
                </span>
              </div>
              <Button size="small" variant="filled" onClick={applyAiTriage}>
                Apply recommendation
              </Button>
            </div>
          )}

          {/* Dialog Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '8px',
              borderTop: '1px solid var(--md-sys-color-outline-variant)',
            }}
          >
            <Button variant="outlined" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="filled"
              type="submit"
              style={{
                backgroundColor: 'var(--md-sys-color-emergency)',
                color: '#ffffff',
              }}
            >
              Dispatch request intake
            </Button>
          </div>
        </Stack>
      </form>
    </Dialog>
  );
};
