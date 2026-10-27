import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CitizenProfile, Emergency, Ambulance, Hospital, Dispatch } from '../types';
import { getAmbulanceIcon, getEmergencyIcon, getHospitalIcon } from '../utils/mapIcons';
import { Icon } from './common/Icon';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { StatusChip } from './common/StatusChip';
import { SectionHeader } from './common/SectionHeader';
import { Field } from './common/Field';
import { Select } from './common/Select';
import { Dialog } from './common/Dialog';
import { Snackbar } from './common/Snackbar';
import { API_BASE } from '../config';

interface CitizenDashboardProps {
  profile: CitizenProfile;
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  dispatches: Dispatch[];
  onRequestSOS: (sosData: {
    type: string;
    priority: 'CRITICAL';
    callerName: string;
    phone: string;
    address: string;
    latitude: number;
    longitude: number;
    description: string;
  }) => void;
  onCancelSOS?: (emergencyId: string) => void;
  onUpdateProfile?: (updated: CitizenProfile) => void;
  onLogout: () => void;
}

interface EmergencyTypeOption {
  id: string;
  label: string;
  icon: string;
}

// Exactly 6 options: 2 columns on mobile, 3 columns on desktop, no orphan cards
const EMERGENCY_TYPES: EmergencyTypeOption[] = [
  { id: 'CARDIAC', label: 'Cardiac & chest pain', icon: 'favorite' },
  { id: 'BREATHING', label: 'Breathing difficulty', icon: 'air' },
  { id: 'TRAUMA', label: 'Severe bleeding & trauma', icon: 'healing' },
  { id: 'ACCIDENT', label: 'Road traffic accident', icon: 'car_crash' },
  { id: 'MATERNITY', label: 'Maternity emergency', icon: 'pregnant_woman' },
  { id: 'UNCONSCIOUS', label: 'Unconscious or stroke', icon: 'personal_injury' },
];

const PRESET_DISEASES = [
  'Diabetes Type 1/2',
  'Hypertension (BP)',
  'Severe asthma',
  'Coronary heart disease',
  'Epilepsy / seizures',
  'Chronic kidney disease',
  'COPD',
  'None / healthy',
];

const PRESET_ALLERGIES = [
  'Penicillin / amoxicillin',
  'Peanuts / tree nuts',
  'Latex',
  'Aspirin / NSAIDs',
  'Sulfa drugs',
  'Shellfish / seafood',
  'Egg proteins',
  'No known allergies (NKDA)',
];

function formatGender(gender: string): string {
  if (gender === 'PREFER_NOT_TO_SAY') return 'Prefer not to say';
  if (gender === 'FEMALE') return 'Female';
  if (gender === 'MALE') return 'Male';
  if (gender === 'OTHER') return 'Other';
  return gender;
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({
  profile,
  emergencies,
  ambulances,
  hospitals,
  dispatches,
  onRequestSOS,
  onCancelSOS,
  onUpdateProfile,
  onLogout,
}) => {
  const [selectedEmergencyType, setSelectedEmergencyType] = useState('CARDIAC');
  const [userAddress, setUserAddress] = useState('100ft Road, Indiranagar, Bengaluru');
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number }>({
    lat: 12.9716,
    lon: 77.6412,
  });
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState('100ft Road, Indiranagar, Bengaluru');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [activeFirstAidTab, setActiveFirstAidTab] = useState<'CPR' | 'BLEEDING' | 'ASTHMA' | 'STROKE' | 'AI_TRIAGE'>('CPR');
  const [citizenTriageInput, setCitizenTriageInput] = useState('');
  const [citizenTriageResult, setCitizenTriageResult] = useState<any>(null);
  const [isCitizenTriaging, setIsCitizenTriaging] = useState(false);

  // Metronome state: visual beat + real Web Audio API oscillator
  const [cprBeat, setCprBeat] = useState(false);
  const [isMetronomeAudioOn, setIsMetronomeAudioOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Confirmation dialog & undo state for emergency SOS
  const [isConfirmSosOpen, setIsConfirmSosOpen] = useState(false);
  const [undoSnackbarOpen, setUndoSnackbarOpen] = useState(false);
  const [recentlyDispatchedId, setRecentlyDispatchedId] = useState<string | null>(null);

  // Editable profile state for modal
  const [editForm, setEditForm] = useState<CitizenProfile>(profile);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Sync editForm when profile updates
  useEffect(() => {
    setEditForm(profile);
  }, [profile]);

  // Visual pulse metronome (110 BPM = 545ms interval)
  useEffect(() => {
    const interval = setInterval(() => {
      setCprBeat((prev) => !prev);
      if (isMetronomeAudioOn) {
        playBeep();
      }
    }, 545);
    return () => clearInterval(interval);
  }, [isMetronomeAudioOn]);

  const playBeep = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtxRef.current.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.08);
      }
    } catch {
      // ignore audio context restrictions
    }
  };

  const toggleAudioMetronome = () => {
    if (!isMetronomeAudioOn) {
      playBeep();
    }
    setIsMetronomeAudioOn(!isMetronomeAudioOn);
  };

  const handleUseMyLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
          setUserAddress(`Current location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          setAddressDraft(`Current location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        },
        () => {
          // Fallback if denied
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  // Find active emergency submitted by this citizen (by phone or callerName)
  const activeEmergency = useMemo(() => {
    return emergencies.find(
      (e) =>
        (e.phone === profile.phone || e.callerName === profile.name) &&
        !['COMPLETED', 'CANCELLED'].includes(e.status)
    );
  }, [emergencies, profile.phone, profile.name]);

  // Find active dispatch linked to this emergency
  const activeDispatch = useMemo(() => {
    if (!activeEmergency) return null;
    return dispatches.find((d) => d.emergencyId === activeEmergency.id);
  }, [activeEmergency, dispatches]);

  // Find assigned ambulance
  const assignedAmbulance = useMemo(() => {
    if (!activeDispatch) return null;
    return ambulances.find((a) => a.id === activeDispatch.ambulanceId);
  }, [activeDispatch, ambulances]);

  // Find destination hospital
  const assignedHospital = useMemo(() => {
    if (!activeDispatch?.hospitalId) {
      return hospitals[0] || null;
    }
    return hospitals.find((h) => h.id === activeDispatch.hospitalId) || hospitals[0];
  }, [activeDispatch, hospitals]);

  // Handle AI Symptom Triage Assessment
  const handleCitizenRunTriage = async () => {
    if (!citizenTriageInput.trim()) return;
    setIsCitizenTriaging(true);
    try {
      const res = await fetch(`${API_BASE}/ai/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: citizenTriageInput }),
      });
      if (res.ok) {
        const json = await res.json();
        setCitizenTriageResult(json);
        return;
      }
    } catch {
      // heuristic fallback
      const lower = citizenTriageInput.toLowerCase();
      let priority = 'MEDIUM';
      let esiLevel = 'Level 3 - Urgent / Stable';
      let requiredUnit = 'BLS Emergency Unit';
      let protocolChecklist = ['Sit upright in a well-ventilated space', 'Loosen tight clothing', 'Monitor breathing pattern'];
      if (lower.includes('chest') || lower.includes('heart') || lower.includes('cardiac') || lower.includes('attack')) {
        priority = 'CRITICAL';
        esiLevel = 'Level 1 - Resuscitation';
        requiredUnit = 'ALS Resuscitation Unit';
        protocolChecklist = ['Stay calm and seated', 'Chew 325mg Aspirin if non-allergic', 'Do not exert or walk around', 'Unlock front door for paramedics'];
      } else if (lower.includes('bleed') || lower.includes('cut') || lower.includes('wound') || lower.includes('fall')) {
        priority = 'HIGH';
        esiLevel = 'Level 2 - Emergent';
        requiredUnit = 'Trauma Emergency Unit';
        protocolChecklist = ['Apply firm continuous pressure with clean cloth', 'Elevate wound above heart if possible', 'Do not remove blood-soaked dressings'];
      }
      setCitizenTriageResult({ priority, esiLevel, requiredUnit, protocolChecklist });
    } finally {
      setIsCitizenTriaging(false);
    }
  };

  // Handle Trigger SOS
  const executeTriggerSOS = () => {
    setIsConfirmSosOpen(false);
    const emgTypeObj = EMERGENCY_TYPES.find((t) => t.id === selectedEmergencyType) || EMERGENCY_TYPES[0];

    const clinicalNotes = `[CITIZEN EMERGENCY DISPATCH]:
• Citizen name: ${toTitleCase(profile.name)} (${profile.age}y, ${formatGender(profile.gender)})
• Contact phone: ${profile.phone}${profile.email ? ` | Email: ${profile.email}` : ''}
• Blood group: ${profile.bloodGroup && profile.bloodGroup !== 'Not Specified' ? profile.bloodGroup : 'Not reported'}
• Known diseases/history: ${profile.diseases.join(', ') || 'None reported'}
• Known allergies: ${profile.allergies.join(', ') || 'No known drug allergies (NKDA)'}
• Emergency contact: ${profile.emergencyContactName || 'N/A'} (${profile.emergencyContactPhone || 'N/A'})`;

    onRequestSOS({
      type: emgTypeObj.id,
      priority: 'CRITICAL',
      callerName: profile.name,
      phone: profile.phone,
      address: userAddress,
      latitude: userCoords.lat,
      longitude: userCoords.lon,
      description: clinicalNotes,
    });

    setUndoSnackbarOpen(true);
  };

  const handleUndoDispatch = () => {
    setUndoSnackbarOpen(false);
    if (activeEmergency && onCancelSOS) {
      onCancelSOS(activeEmergency.id);
    }
  };

  const handleToggleDisease = (disease: string) => {
    if (disease.toLowerCase().includes('none')) {
      setEditForm({ ...editForm, diseases: ['None / healthy'] });
      return;
    }
    const current = (editForm.diseases || []).filter((d) => !d.toLowerCase().includes('none'));
    if (current.includes(disease)) {
      const next = current.filter((d) => d !== disease);
      setEditForm({ ...editForm, diseases: next.length > 0 ? next : ['None / healthy'] });
    } else {
      setEditForm({ ...editForm, diseases: [...current, disease] });
    }
  };

  const handleToggleAllergy = (allergy: string) => {
    if (allergy.toLowerCase().includes('no known')) {
      setEditForm({ ...editForm, allergies: ['No known allergies (NKDA)'] });
      return;
    }
    const current = (editForm.allergies || []).filter((a) => !a.toLowerCase().includes('no known'));
    if (current.includes(allergy)) {
      const next = current.filter((a) => a !== allergy);
      setEditForm({ ...editForm, allergies: next.length > 0 ? next : ['No known allergies (NKDA)'] });
    } else {
      setEditForm({ ...editForm, allergies: [...current, allergy] });
    }
  };

  // Determine dispatch status step index
  const currentStep = useMemo(() => {
    if (!activeEmergency) return 0;
    if (!activeDispatch) return 1;
    const status = activeDispatch.status;
    if (status === 'DISPATCHED' || status === 'AMBULANCE_ACCEPTED') return 2;
    if (status === 'EN_ROUTE_TO_SCENE') return 2;
    if (status === 'ARRIVED_AT_SCENE' || status === 'PATIENT_ONBOARD') return 3;
    if (status === 'EN_ROUTE_TO_HOSPITAL') return 4;
    if (status === 'ARRIVED_AT_HOSPITAL' || status === 'PATIENT_HANDED_OVER') return 5;
    return 1;
  }, [activeEmergency, activeDispatch]);

  const hasBloodGroup = profile.bloodGroup && profile.bloodGroup !== 'Not Specified' && profile.bloodGroup !== 'Unknown';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-text)',
        fontFamily: 'Roboto, sans-serif',
      }}
    >
      {/* M3 Top App Bar (64px) */}
      <header
        style={{
          height: '64px',
          backgroundColor: 'var(--md-sys-color-surface)',
          borderBottom: '1px solid var(--md-sys-color-outline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="e911_emergency" size={22} />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--md-sys-color-text)', whiteSpace: 'nowrap' }}>
            Aegis SOS
          </span>
          <span className="m3-hide-mobile">
            <StatusChip label="Citizen portal" tone="neutral" size="small" />
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setEditForm(profile);
              setSaveSuccessMsg(false);
              setIsEditProfileOpen(true);
            }}
            startIcon={<Icon name="manage_accounts" size={18} />}
          >
            <span className="m3-hide-mobile">Edit profile</span>
          </Button>

          <Button
            variant="text"
            size="small"
            onClick={onLogout}
            startIcon={<Icon name="logout" size={18} />}
          >
            <span className="m3-hide-mobile">Log out</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area: Responsive Grid */}
      <main className="citizen-page-main">
        <div className="citizen-main-grid">
          {/* Column 1: SOS Card (or Active Tracking Card) & Direct Emergency Numbers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {activeEmergency ? (
              /* Active Emergency Tracking Card */
              <Card
                variant="outlined"
                style={{
                  padding: '24px',
                  backgroundColor: 'var(--md-sys-color-surface)',
                  borderColor: 'var(--md-sys-color-outline)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--md-sys-color-error)',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--md-sys-color-error)' }}>
                      Emergency assistance dispatched
                    </span>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: '12px',
                      color: 'var(--md-sys-color-text-secondary)',
                      backgroundColor: 'var(--md-sys-color-surface-container-high)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                    }}
                  >
                    #{activeEmergency.id.slice(-6)}
                  </span>
                </div>

                {/* Progress Stepper */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '24px',
                    padding: '0 8px',
                  }}
                >
                  {[
                    { step: 1, label: 'Call logged' },
                    { step: 2, label: 'Dispatched' },
                    { step: 3, label: 'At scene' },
                    { step: 4, label: 'Hospital transit' },
                  ].map((item, idx) => {
                    const isCompleted = currentStep > item.step;
                    const isCurrent = currentStep === item.step;
                    return (
                      <React.Fragment key={item.step}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: isCompleted
                                ? 'var(--md-sys-color-success)'
                                : isCurrent
                                ? 'var(--md-sys-color-error)'
                                : 'var(--md-sys-color-surface-container-high)',
                              color: isCompleted || isCurrent ? '#FFFFFF' : 'var(--md-sys-color-text-secondary)',
                            }}
                          >
                            {isCompleted ? <Icon name="check" size={16} /> : item.step}
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: isCurrent ? 600 : 400,
                              color: isCurrent
                                ? 'var(--md-sys-color-text)'
                                : 'var(--md-sys-color-text-secondary)',
                              textAlign: 'center',
                            }}
                          >
                            {item.label}
                          </span>
                        </div>
                        {idx < 3 && (
                          <div
                            style={{
                              flex: 1,
                              height: '2px',
                              margin: '-16px 8px 0',
                              backgroundColor:
                                currentStep > item.step
                                  ? 'var(--md-sys-color-success)'
                                  : 'var(--md-sys-color-outline)',
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* ETA & Unit Information */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--md-sys-color-surface-container-low)',
                      border: '1px solid var(--md-sys-color-outline)',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', marginBottom: '4px' }}>
                      Estimated arrival
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--md-sys-color-warning)' }}>
                      {activeDispatch?.etaMinutes ? `${activeDispatch.etaMinutes} min` : 'Approx 3-4 min'}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--md-sys-color-surface-container-low)',
                      border: '1px solid var(--md-sys-color-outline)',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', marginBottom: '4px' }}>
                      Assigned unit
                    </div>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                      {assignedAmbulance ? assignedAmbulance.registrationNumber : 'En route'}
                    </div>
                  </div>
                </div>

                {/* Pre-alerted Hospital */}
                {assignedHospital && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--md-sys-color-surface-container-low)',
                      border: '1px solid var(--md-sys-color-outline)',
                      marginBottom: '16px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>
                        Destination hospital
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                        {assignedHospital.name}
                      </div>
                    </div>
                    {assignedHospital.phone && (
                      <a
                        href={`tel:${assignedHospital.phone}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                          color: 'var(--md-sys-color-primary)',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        <Icon name="phone" size={16} />
                        <span>Call ED</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Live Tracking Map with OSM Standard Tiles */}
                <div
                  style={{
                    height: '240px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid var(--md-sys-color-outline)',
                    marginBottom: '16px',
                  }}
                >
                  <MapContainer
                    center={[userCoords.lat, userCoords.lon]}
                    zoom={14}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <Marker
                      position={[userCoords.lat, userCoords.lon]}
                      icon={getEmergencyIcon(activeEmergency, true)}
                    >
                      <Popup>
                        <div style={{ fontSize: '12px' }}>
                          <strong>Your location</strong><br />
                          {userAddress}
                        </div>
                      </Popup>
                    </Marker>

                    {assignedAmbulance && (
                      <Marker
                        position={[assignedAmbulance.latitude, assignedAmbulance.longitude]}
                        icon={getAmbulanceIcon(assignedAmbulance, true)}
                      >
                        <Popup>
                          <div style={{ fontSize: '12px' }}>
                            <strong>Ambulance {assignedAmbulance.registrationNumber}</strong><br />
                            Speed: {assignedAmbulance.speed} km/h
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {assignedAmbulance && (
                      <Polyline
                        positions={[
                          [assignedAmbulance.latitude, assignedAmbulance.longitude],
                          [userCoords.lat, userCoords.lon],
                        ]}
                        pathOptions={{
                          color: '#D93025',
                          weight: 4,
                          dashArray: '6, 6',
                          opacity: 0.9,
                        }}
                      />
                    )}

                    {assignedHospital && (
                      <Marker
                        position={[assignedHospital.latitude, assignedHospital.longitude]}
                        icon={getHospitalIcon(assignedHospital)}
                      >
                        <Popup>
                          <div style={{ fontSize: '12px' }}>
                            <strong>{assignedHospital.name}</strong>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>

                {onCancelSOS && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this emergency request?')) {
                          onCancelSOS(activeEmergency.id);
                        }
                      }}
                    >
                      Cancel emergency request
                    </Button>
                  </div>
                )}
              </Card>
            ) : (
              /* Emergency Medical Request Intake Card */
              <Card
                variant="outlined"
                style={{
                  padding: '24px',
                  backgroundColor: 'var(--md-sys-color-surface)',
                  borderColor: 'var(--md-sys-color-outline)',
                }}
              >
                <div style={{ marginBottom: '20px' }}>
                  <SectionHeader
                    icon="e911_emergency"
                    title="Request emergency medical assistance"
                  />
                  <p style={{ fontSize: '13px', margin: '6px 0 0 0', color: 'var(--md-sys-color-text-secondary)', lineHeight: '1.4' }}>
                    Directly alerts the central dispatch console to mobilize the closest emergency medical unit.
                  </p>
                </div>

                {/* Incident Type Selector: 24px outlined radiogroup (2 cols mobile, 3 cols desktop, no orphan cards) */}
                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--md-sys-color-text-secondary)',
                      marginBottom: '10px',
                    }}
                  >
                    Select emergency type
                  </label>
                  <div className="citizen-emergency-types">
                    {EMERGENCY_TYPES.map((type) => {
                      const isSelected = selectedEmergencyType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedEmergencyType(type.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px',
                            borderRadius: '12px',
                            border: `1px solid ${isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)'}`,
                            backgroundColor: isSelected
                              ? 'var(--md-sys-color-primary-container)'
                              : 'var(--md-sys-color-surface-container-low)',
                            color: isSelected
                              ? 'var(--md-sys-color-on-primary-container)'
                              : 'var(--md-sys-color-text)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                            fontFamily: 'inherit',
                            minHeight: '48px',
                          }}
                        >
                          <Icon
                            name={isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                            size={20}
                            style={{
                              color: isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-text-secondary)',
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <Icon
                              name={type.icon}
                              size={18}
                              style={{
                                color: isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-text-secondary)',
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500, lineHeight: '1.2' }}>
                              {type.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Incident Location Box: Single row with Use my location, accuracy chip, address, change button */}
                <div
                  style={{
                    marginBottom: '20px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--md-sys-color-surface-container-low)',
                    border: '1px solid var(--md-sys-color-outline)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon name="location_on" size={20} style={{ color: 'var(--md-sys-color-error)', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                        Incident location
                      </span>
                      <StatusChip label="GPS ±5m" tone="success" size="small" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Button
                        variant="text"
                        size="small"
                        onClick={handleUseMyLocation}
                        startIcon={<Icon name="my_location" size={16} />}
                      >
                        Locate me
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => {
                          if (isEditingAddress) {
                            setUserAddress(addressDraft);
                            setIsEditingAddress(false);
                          } else {
                            setAddressDraft(userAddress);
                            setIsEditingAddress(true);
                          }
                        }}
                        startIcon={<Icon name={isEditingAddress ? 'check' : 'edit'} size={16} />}
                      >
                        {isEditingAddress ? 'Save' : 'Change'}
                      </Button>
                    </div>
                  </div>

                  {isEditingAddress ? (
                    <Field
                      label="Delivery Address"
                      value={addressDraft}
                      onChange={(e) => setAddressDraft(e.target.value)}
                      placeholder="Enter street address, building or landmark"
                    />
                  ) : (
                    <div style={{ fontSize: '13px', color: 'var(--md-sys-color-text)', paddingLeft: '28px' }}>
                      {userAddress}
                    </div>
                  )}
                </div>

                {/* Consent & Clinical Note */}
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--md-sys-color-text-secondary)',
                    lineHeight: '1.4',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Icon name="info" size={16} style={{ flexShrink: 0 }} />
                  <span>Medical conditions and allergies are shared only with responding paramedics upon emergency activation.</span>
                </div>

                {/* Primary Emergency Action Button (Solid #D93025 with white text in BOTH themes, 56px tall) */}
                <Button
                  variant="emergency"
                  size="large"
                  fullWidth
                  onClick={() => setIsConfirmSosOpen(true)}
                  startIcon={<Icon name="e911_emergency" size={24} />}
                  style={{
                    height: '56px',
                    borderRadius: '9999px',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                >
                  Request emergency ambulance
                </Button>
              </Card>
            )}

            {/* Direct Emergency Telephone Numbers: 4 outlined buttons with tel: links */}
            <Card
              variant="outlined"
              style={{
                padding: '20px',
                backgroundColor: 'var(--md-sys-color-surface)',
                borderColor: 'var(--md-sys-color-outline)',
              }}
            >
              <div style={{ marginBottom: '14px' }}>
                <SectionHeader
                  icon="call"
                  title="Direct emergency hotlines"
                />
              </div>

              <div className="citizen-direct-numbers">
                {[
                  { number: '112', label: 'National emergency' },
                  { number: '108', label: 'Ambulance service' },
                  { number: '102', label: 'Maternity helpline' },
                  { number: '100', label: 'Police control' },
                ].map((item) => (
                  <a
                    key={item.number}
                    href={`tel:${item.number}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '56px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: '1px solid var(--md-sys-color-outline)',
                      backgroundColor: 'var(--md-sys-color-surface-container-low)',
                      textDecoration: 'none',
                      color: 'var(--md-sys-color-text)',
                      transition: 'background-color 0.15s ease, border-color 0.15s ease',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--md-sys-color-primary)',
                      }}
                    >
                      {item.number}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--md-sys-color-text-secondary)',
                        textAlign: 'center',
                        lineHeight: '1.2',
                        marginTop: '2px',
                      }}
                    >
                      {item.label}
                    </span>
                  </a>
                ))}
              </div>
            </Card>
          </div>

          {/* Column 2: Personal Medical Emergency ID & First Aid Guide */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Clean Medical Emergency ID Card: 3 rows with sentence-case 12px secondary labels */}
            <Card
              variant="outlined"
              style={{
                backgroundColor: 'var(--md-sys-color-surface)',
                borderColor: 'var(--md-sys-color-outline)',
                padding: '24px',
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <SectionHeader
                  icon="badge"
                  title="Emergency health profile"
                  action={
                    hasBloodGroup ? (
                      <StatusChip label={`Blood: ${profile.bloodGroup}`} tone="info" size="small" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm(profile);
                          setSaveSuccessMsg(false);
                          setIsEditProfileOpen(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--md-sys-color-primary)',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline',
                          fontFamily: 'inherit',
                        }}
                      >
                        Add blood group
                      </button>
                    )
                  }
                />
              </div>

              {/* User Meta Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid var(--md-sys-color-outline)',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--md-sys-color-text-secondary)',
                  }}
                >
                  <Icon name="person" size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                    {toTitleCase(profile.name)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '2px' }}>
                    {formatGender(profile.gender)} · {profile.age} years · {profile.phone}
                  </div>
                </div>
              </div>

              {/* 3 Clean Rows: Allergies, Conditions, Emergency Contact */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Row 1: Allergies */}
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--md-sys-color-text-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    Allergies
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(profile.allergies || []).length > 0 ? (
                      (profile.allergies || []).map((allergy, i) => (
                        <StatusChip key={i} label={allergy} tone="neutral" size="small" />
                      ))
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                        No known drug allergies (NKDA)
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Conditions */}
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--md-sys-color-text-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    Medical conditions
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(profile.diseases || []).length > 0 ? (
                      (profile.diseases || []).map((disease, i) => (
                        <StatusChip key={i} label={disease} tone="neutral" size="small" />
                      ))
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                        None reported
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 3: Emergency Contact */}
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--md-sys-color-text-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    Next-of-kin emergency contact
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      color: 'var(--md-sys-color-text)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {profile.emergencyContactName || 'Amit Patel (Spouse)'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                        {profile.emergencyContactPhone || '+91 98450 99887'}
                      </div>
                    </div>
                    {profile.emergencyContactPhone && (
                      <a
                        href={`tel:${profile.emergencyContactPhone}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                          color: 'var(--md-sys-color-primary)',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                      >
                        <Icon name="call" size={16} />
                        <span>Call</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Emergency First-Aid Protocols with real CPR Metronome */}
            <Card
              variant="outlined"
              style={{
                backgroundColor: 'var(--md-sys-color-surface)',
                borderColor: 'var(--md-sys-color-outline)',
                padding: '24px',
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <SectionHeader
                  icon="medical_services"
                  title="First-aid guidance"
                />
                <p style={{ fontSize: '12px', margin: '4px 0 0 0', color: 'var(--md-sys-color-text-secondary)' }}>
                  Actionable steps while the emergency crew is en route
                </p>
              </div>

              {/* First Aid Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  backgroundColor: 'var(--md-sys-color-surface-container-low)',
                  padding: '4px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                {[
                  { id: 'CPR', label: 'CPR' },
                  { id: 'BLEEDING', label: 'Bleeding' },
                  { id: 'ASTHMA', label: 'Asthma' },
                  { id: 'STROKE', label: 'Stroke' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFirstAidTab(tab.id as any)}
                    style={{
                      flex: 1,
                      border: 'none',
                      backgroundColor:
                        activeFirstAidTab === tab.id
                          ? 'var(--md-sys-color-surface)'
                          : 'transparent',
                      color:
                        activeFirstAidTab === tab.id
                          ? 'var(--md-sys-color-primary)'
                          : 'var(--md-sys-color-text-secondary)',
                      padding: '8px 4px',
                      fontSize: '12px',
                      fontWeight: activeFirstAidTab === tab.id ? 600 : 500,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: activeFirstAidTab === tab.id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Protocol Content */}
              <div>
                {activeFirstAidTab === 'CPR' && (
                  <div>
                    {/* CPR Metronome Box with 110 BPM visual pulse + AudioContext Oscillator */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--md-sys-color-surface-container-low)',
                        border: '1px solid var(--md-sys-color-outline)',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span
                          style={{
                            transform: cprBeat ? 'scale(1.25)' : 'scale(1.0)',
                            transition: 'transform 0.1s ease',
                            display: 'inline-flex',
                            color: 'var(--md-sys-color-error)',
                            flexShrink: 0,
                          }}
                        >
                          <Icon name="favorite" size={24} />
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                            CPR Metronome: 110 BPM
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', lineHeight: '1.4' }}>
                            Compress chest firmly to this beat.
                          </div>
                        </div>
                      </div>

                      <Button
                        variant={isMetronomeAudioOn ? 'filled' : 'outlined'}
                        size="small"
                        onClick={toggleAudioMetronome}
                        startIcon={<Icon name={isMetronomeAudioOn ? 'volume_up' : 'volume_off'} size={16} />}
                      >
                        {isMetronomeAudioOn ? 'Audio on' : 'Start sound'}
                      </Button>
                    </div>

                    <ol
                      style={{
                        margin: 0,
                        paddingLeft: '20px',
                        fontSize: '13px',
                        color: 'var(--md-sys-color-text)',
                        lineHeight: '1.6',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <li>Place the heel of one hand in the center of the chest; place other hand on top.</li>
                      <li>Push hard and fast at a depth of 5 to 6 cm (2 inches).</li>
                      <li>Allow the chest to fully recoil between each compression.</li>
                      <li>Do not pause until professional responders take over or an AED is ready.</li>
                    </ol>
                  </div>
                )}

                {activeFirstAidTab === 'BLEEDING' && (
                  <ol
                    style={{
                      margin: 0,
                      paddingLeft: '20px',
                      fontSize: '13px',
                      color: 'var(--md-sys-color-text)',
                      lineHeight: '1.6',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <li>Apply direct, firm, continuous pressure to the wound with a clean cloth or dressing.</li>
                    <li>Do not remove blood-soaked dressings; apply additional cloths directly over them.</li>
                    <li>If bleeding is severe on an extremity, apply a tourniquet 5–7 cm above the wound.</li>
                    <li>Keep the patient warm and lying down to reduce the risk of shock.</li>
                  </ol>
                )}

                {activeFirstAidTab === 'ASTHMA' && (
                  <ol
                    style={{
                      margin: 0,
                      paddingLeft: '20px',
                      fontSize: '13px',
                      color: 'var(--md-sys-color-text)',
                      lineHeight: '1.6',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <li>Help the person sit upright and loosen any tight clothing around the neck.</li>
                    <li>Administer their reliever inhaler (Salbutamol): 4 puffs, 1 puff every 4 breaths.</li>
                    <li>Reassure the patient calmly; anxiety increases oxygen demand and airway resistance.</li>
                    <li>If symptoms persist after 4 minutes, repeat 4 puffs until the ambulance arrives.</li>
                  </ol>
                )}

                {activeFirstAidTab === 'STROKE' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { code: 'F - Face', text: 'Ask them to smile. Does one side of the face droop?' },
                      { code: 'A - Arms', text: 'Ask them to raise both arms. Does one arm drift downward?' },
                      { code: 'S - Speech', text: 'Ask them to repeat a simple sentence. Is speech slurred?' },
                      { code: 'T - Time', text: 'Ambulance requested. Record the exact time symptoms began.' },
                    ].map((item) => (
                      <div
                        key={item.code}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--md-sys-color-surface-container-low)',
                          border: '1px solid var(--md-sys-color-outline)',
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: '2px' }}>
                          {item.code}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', lineHeight: '1.3' }}>
                          {item.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Confirmation Dialog Before Triggering Emergency Dispatch */}
      <Dialog
        isOpen={isConfirmSosOpen}
        onClose={() => setIsConfirmSosOpen(false)}
        title="Confirm emergency dispatch"
        confirmLabel="Confirm & dispatch"
        cancelLabel="Cancel"
        onConfirm={executeTriggerSOS}
      >
        <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.5', color: 'var(--md-sys-color-text)' }}>
          This action will immediately alert central dispatch to mobilize an emergency medical unit to:
        </p>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--md-sys-color-text)',
            marginBottom: '12px',
          }}
        >
          {userAddress}
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
          Only submit genuine emergency requests. Responding units are mobilized immediately.
        </p>
      </Dialog>

      {/* 5-second Undo Dispatch Snackbar */}
      <Snackbar
        message="Emergency ambulance dispatched. Dispatcher notified."
        actionLabel="Undo"
        onAction={handleUndoDispatch}
        isOpen={undoSnackbarOpen}
        onClose={() => setUndoSnackbarOpen(false)}
        durationMs={5000}
      />

      {/* Edit Profile / Settings Modal */}
      <Dialog
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Citizen emergency profile & settings"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (onUpdateProfile) {
              onUpdateProfile(editForm);
            }
            setSaveSuccessMsg(true);
            setTimeout(() => {
              setSaveSuccessMsg(false);
              setIsEditProfileOpen(false);
            }, 800);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {saveSuccessMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--md-sys-color-success-container)',
                color: 'var(--md-sys-color-success)',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Profile and responder details updated successfully.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Field
              label="Full legal name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field
                label="Mobile number"
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                required
              />

              <Field
                label="Age"
                type="number"
                value={editForm.age.toString()}
                onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 25 })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Select
                label="Gender"
                value={editForm.gender}
                onChange={(val) => setEditForm({ ...editForm, gender: val as any })}
                options={[
                  { value: 'FEMALE', label: 'Female' },
                  { value: 'MALE', label: 'Male' },
                  { value: 'OTHER', label: 'Other' },
                  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
                ]}
              />

              <Select
                label="Blood group"
                value={editForm.bloodGroup || 'O+'}
                onChange={(val) => setEditForm({ ...editForm, bloodGroup: val })}
                options={[
                  { value: 'O+', label: 'O+' },
                  { value: 'O-', label: 'O-' },
                  { value: 'A+', label: 'A+' },
                  { value: 'A-', label: 'A-' },
                  { value: 'B+', label: 'B+' },
                  { value: 'B-', label: 'B-' },
                  { value: 'AB+', label: 'AB+' },
                  { value: 'AB-', label: 'AB-' },
                  { value: 'Not Specified', label: 'Not Specified' },
                ]}
              />
            </div>

            <Field
              label="Email address (optional)"
              type="email"
              value={editForm.email || ''}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </div>

          {/* Medical Conditions Selector */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--md-sys-color-text-secondary)', marginBottom: '8px' }}>
              Chronic diseases & medical conditions
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PRESET_DISEASES.map((d) => {
                const isSelected = (editForm.diseases || []).includes(d);
                return (
                  <StatusChip
                    key={d}
                    label={d}
                    tone={isSelected ? 'info' : 'neutral'}
                    onClick={() => handleToggleDisease(d)}
                    size="small"
                  />
                );
              })}
            </div>
          </div>

          {/* Known Allergies Selector */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--md-sys-color-text-secondary)', marginBottom: '8px' }}>
              Known drug & food allergies
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PRESET_ALLERGIES.map((a) => {
                const isSelected = (editForm.allergies || []).includes(a);
                return (
                  <StatusChip
                    key={a}
                    label={a}
                    tone={isSelected ? 'info' : 'neutral'}
                    onClick={() => handleToggleAllergy(a)}
                    size="small"
                  />
                );
              })}
            </div>
          </div>

          {/* Next of Kin */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field
              label="Emergency contact name"
              value={editForm.emergencyContactName || ''}
              onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
            />
            <Field
              label="Emergency contact phone"
              type="tel"
              value={editForm.emergencyContactPhone || ''}
              onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="outlined" type="button" onClick={() => setIsEditProfileOpen(false)}>
              Cancel
            </Button>
            <Button variant="filled" type="submit">
              Save changes
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};