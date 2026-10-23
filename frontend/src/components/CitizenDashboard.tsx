import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Heart,
  Phone,
  MapPin,
  AlertTriangle,
  Clock,
  Truck,
  Building2,
  LogOut,
  User,
  Mail,
  CheckCircle2,
  Activity,
  Flame,
  Radio,
  Navigation,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Edit3,
  X,
  Compass,
  Settings,
  Plus,
  Save,
  Check,
  ShieldAlert
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CitizenProfile, Emergency, Ambulance, Hospital, Dispatch } from '../types';
import { getAmbulanceIcon, getEmergencyIcon, getHospitalIcon } from '../utils/mapIcons';

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

const EMERGENCY_TYPES = [
  { id: 'CARDIAC', label: 'Cardiac / Chest Pain', code: 'ALS-1' },
  { id: 'BREATHING', label: 'Severe Respiratory Distress', code: 'ALS-2' },
  { id: 'TRAUMA', label: 'Severe Bleeding / Trauma', code: 'TRM-1' },
  { id: 'ACCIDENT', label: 'Road Vehicle Accident', code: 'RTA-1' },
  { id: 'MATERNITY', label: 'Maternity / Active Labor', code: 'MAT-1' },
  { id: 'UNCONSCIOUS', label: 'Unconscious / Stroke', code: 'NEU-1' },
  { id: 'GENERAL', label: 'General Emergency', code: 'GEN-1' },
];

const PRESET_DISEASES = [
  'Diabetes Type 1/2',
  'Hypertension (BP)',
  'Severe Asthma',
  'Coronary Heart Disease',
  'Epilepsy / Seizures',
  'Chronic Kidney Disease',
  'COPD',
  'None / Healthy',
];

const PRESET_ALLERGIES = [
  'Penicillin / Amoxicillin',
  'Peanuts / Tree Nuts',
  'Latex',
  'Aspirin / NSAIDs',
  'Sulfa Drugs',
  'Shellfish / Seafood',
  'Egg Proteins',
  'No Known Allergies (NKDA)',
];

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
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [activeFirstAidTab, setActiveFirstAidTab] = useState<'CPR' | 'BLEEDING' | 'ASTHMA' | 'STROKE'>('CPR');
  const [cprBeat, setCprBeat] = useState(false);

  // Editable profile state for modal
  const [editForm, setEditForm] = useState<CitizenProfile>(profile);
  const [customDiseaseInput, setCustomDiseaseInput] = useState('');
  const [customAllergyInput, setCustomAllergyInput] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Sync editForm when profile updates
  useEffect(() => {
    setEditForm(profile);
  }, [profile]);

  const handleToggleDisease = (disease: string) => {
    if (disease.includes('None')) {
      setEditForm({ ...editForm, diseases: ['None / Healthy'] });
      return;
    }
    const current = editForm.diseases.filter((d) => !d.includes('None'));
    if (current.includes(disease)) {
      const next = current.filter((d) => d !== disease);
      setEditForm({ ...editForm, diseases: next.length > 0 ? next : ['None / Healthy'] });
    } else {
      setEditForm({ ...editForm, diseases: [...current, disease] });
    }
  };

  const handleAddCustomDisease = () => {
    if (customDiseaseInput.trim()) {
      const val = customDiseaseInput.trim();
      const current = editForm.diseases.filter((d) => !d.includes('None'));
      if (!current.includes(val)) {
        setEditForm({ ...editForm, diseases: [...current, val] });
      }
      setCustomDiseaseInput('');
    }
  };

  const handleRemoveDisease = (disease: string) => {
    const next = editForm.diseases.filter((d) => d !== disease);
    setEditForm({ ...editForm, diseases: next.length > 0 ? next : ['None / Healthy'] });
  };

  const handleToggleAllergy = (allergy: string) => {
    if (allergy.includes('No Known Allergies')) {
      setEditForm({ ...editForm, allergies: ['No Known Allergies (NKDA)'] });
      return;
    }
    const current = editForm.allergies.filter((a) => !a.includes('No Known Allergies'));
    if (current.includes(allergy)) {
      const next = current.filter((a) => a !== allergy);
      setEditForm({ ...editForm, allergies: next.length > 0 ? next : ['No Known Allergies (NKDA)'] });
    } else {
      setEditForm({ ...editForm, allergies: [...current, allergy] });
    }
  };

  const handleAddCustomAllergy = () => {
    if (customAllergyInput.trim()) {
      const val = customAllergyInput.trim();
      const current = editForm.allergies.filter((a) => !a.includes('No Known Allergies'));
      if (!current.includes(val)) {
        setEditForm({ ...editForm, allergies: [...current, val] });
      }
      setCustomAllergyInput('');
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    const next = editForm.allergies.filter((a) => a !== allergy);
    setEditForm({ ...editForm, allergies: next.length > 0 ? next : ['No Known Allergies (NKDA)'] });
  };

  // Heartbeat pulse for CPR metronome (105 BPM)
  useEffect(() => {
    const interval = setInterval(() => {
      setCprBeat((prev) => !prev);
    }, 570);
    return () => clearInterval(interval);
  }, []);

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

  // Handle Trigger SOS
  const handleTriggerSOS = () => {
    const emgTypeObj = EMERGENCY_TYPES.find((t) => t.id === selectedEmergencyType) || EMERGENCY_TYPES[0];
    
    // Auto-compile clinical note with personal medical conditions and allergies
    const clinicalNotes = `[CITIZEN 112 ERSS DISPATCH]:
• Citizen Name: ${profile.name} (${profile.age}y, ${profile.gender})
• Contact Phone: ${profile.phone}${profile.email ? ` | Email: ${profile.email}` : ''}
• Blood Group: ${profile.bloodGroup || 'Unknown'}
• Known Diseases/History: ${profile.diseases.join(', ') || 'None reported'}
• Known Allergies: ${profile.allergies.join(', ') || 'No known drug allergies (NKDA)'}
• Emergency Contact: ${profile.emergencyContactName || 'N/A'} (${profile.emergencyContactPhone || 'N/A'})`;

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
  };

  // Determine dispatch status step index
  const currentStep = useMemo(() => {
    if (!activeEmergency) return 0;
    if (!activeDispatch) return 1; // SOS Registered, finding ambulance
    const status = activeDispatch.status;
    if (status === 'DISPATCHED' || status === 'AMBULANCE_ACCEPTED') return 2; // Ambulance en route
    if (status === 'EN_ROUTE_TO_SCENE') return 2;
    if (status === 'ARRIVED_AT_SCENE' || status === 'PATIENT_ONBOARD') return 3; // At scene / onboard
    if (status === 'EN_ROUTE_TO_HOSPITAL') return 4; // Transporting to hospital
    if (status === 'ARRIVED_AT_HOSPITAL' || status === 'PATIENT_HANDED_OVER') return 5; // Arrived at ED
    return 1;
  }, [activeEmergency, activeDispatch]);

  return (
    <div className="citizen-dashboard-container">
      {/* Top Citizen Header Bar (Google Material M3 App Bar) */}
      <header className="citizen-header-bar">
        <div className="citizen-header-left">
          <div className="citizen-shield-badge">
            <Heart size={20} className="text-red" />
          </div>
          <div>
            <div className="citizen-sub-tag">112 ERSS · CITIZEN EMERGENCY PORTAL</div>
            <h1 className="citizen-user-name">{profile.name}</h1>
          </div>
        </div>

        <div className="citizen-header-right">
          <div className="citizen-health-badge" title="Verified Medical Emergency ID">
            <span>Blood: <strong>{profile.bloodGroup || 'O+'}</strong></span>
            <span className="dot-sep">·</span>
            <span>Age: <strong>{profile.age}</strong></span>
          </div>

          <button
            className="btn-citizen-header-action"
            onClick={() => {
              setEditForm(profile);
              setSaveSuccessMsg(false);
              setIsEditProfileOpen(true);
            }}
            title="Edit personal medical information & settings"
          >
            <Settings size={14} />
            <span>Edit Profile / Settings</span>
          </button>

          <button
            className="btn-citizen-logout"
            onClick={onLogout}
            title="Sign Out of Citizen Portal"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="citizen-main-content">
        {/* Left Column: SOS Action & Tracking */}
        <div className="citizen-left-col">
          {/* Active Emergency Tracker (If SOS is Active) */}
          {activeEmergency ? (
            <div className="citizen-active-sos-card">
              <div className="sos-card-header">
                <div className="flex items-center gap-2">
                  <span className="sos-live-beacon"></span>
                  <span className="font-bold tracking-wider text-rose">EMERGENCY ASSISTANCE DISPATCHED</span>
                </div>
                <span className="sos-id-pill">INCIDENT #{activeEmergency.id.slice(-6)}</span>
              </div>

              {/* Progress Stepper */}
              <div className="sos-stepper">
                <div className={`step-item ${currentStep >= 1 ? 'completed' : ''} ${currentStep === 1 ? 'current' : ''}`}>
                  <div className="step-circle">{currentStep > 1 ? <Check size={12} /> : '1'}</div>
                  <span className="step-label">Call Logged</span>
                </div>
                <div className={`step-line ${currentStep >= 2 ? 'active' : ''}`} />

                <div className={`step-item ${currentStep >= 2 ? 'completed' : ''} ${currentStep === 2 ? 'current' : ''}`}>
                  <div className="step-circle">{currentStep > 2 ? <Check size={12} /> : '2'}</div>
                  <span className="step-label">Ambulance Dispatched</span>
                </div>
                <div className={`step-line ${currentStep >= 3 ? 'active' : ''}`} />

                <div className={`step-item ${currentStep >= 3 ? 'completed' : ''} ${currentStep === 3 ? 'current' : ''}`}>
                  <div className="step-circle">{currentStep > 3 ? <Check size={12} /> : '3'}</div>
                  <span className="step-label">At Scene</span>
                </div>
                <div className={`step-line ${currentStep >= 4 ? 'active' : ''}`} />

                <div className={`step-item ${currentStep >= 4 ? 'completed' : ''} ${currentStep === 4 ? 'current' : ''}`}>
                  <div className="step-circle">{currentStep > 4 ? <Check size={12} /> : '4'}</div>
                  <span className="step-label">Hospital Transit</span>
                </div>
              </div>

              {/* ETA & Ambulance Info Banner */}
              <div className="sos-tracking-details">
                <div className="sos-eta-box">
                  <Clock size={28} className="text-amber" />
                  <div>
                    <span className="eta-title">ESTIMATED PARAMEDIC ARRIVAL</span>
                    <div className="eta-countdown text-amber">
                      {activeDispatch?.etaMinutes ? `${activeDispatch.etaMinutes} MINUTES` : 'APPROX 3.5 MIN'}
                    </div>
                  </div>
                </div>

                <div className="sos-unit-box">
                  <Truck size={24} className="text-emerald" />
                  <div>
                    <span className="unit-label">ASSIGNED UNIT</span>
                    <div className="unit-name font-bold">
                      {assignedAmbulance ? `${assignedAmbulance.registrationNumber} (${assignedAmbulance.type})` : 'Nearest ALS Unit En Route'}
                    </div>
                    <small className="text-secondary">
                      Paramedic Crew: {assignedAmbulance?.driverName || 'Arun Kumar'} & {assignedAmbulance?.emtName || 'Meena R'}
                    </small>
                  </div>
                </div>
              </div>

              {/* Destination Hospital ED */}
              <div className="sos-hospital-banner">
                <Building2 size={20} className="text-sky flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-muted">PRE-ALERTED EMERGENCY DEPARTMENT</div>
                  <div className="text-sm font-bold text-sky">{assignedHospital?.name || 'Aegis City General ED'}</div>
                  <small className="text-secondary">{assignedHospital?.address} · Trauma team on standby</small>
                </div>
                {assignedHospital?.phone && (
                  <a
                    href={`tel:${assignedHospital.phone}`}
                    className="btn btn-xs btn-outline-sky flex items-center gap-1"
                  >
                    <Phone size={12} />
                    <span>Call ED</span>
                  </a>
                )}
              </div>

              {/* Live Tracking Leaflet Map for Citizen */}
              <div className="citizen-map-frame">
                <div className="citizen-map-title-bar">
                  <span>LIVE PARAMEDIC GPS RADAR</span>
                  <span className="text-emerald font-bold">● LIVE TRACKING</span>
                </div>
                <div style={{ height: '240px', width: '100%', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                  <MapContainer
                    center={[userCoords.lat, userCoords.lon]}
                    zoom={14}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />

                    {/* Citizen Pin */}
                    <Marker
                      position={[userCoords.lat, userCoords.lon]}
                      icon={getEmergencyIcon(activeEmergency, true)}
                    >
                      <Popup>
                        <div className="text-xs">
                          <strong>Your SOS Location</strong><br />
                          {userAddress}
                        </div>
                      </Popup>
                    </Marker>

                    {/* Ambulance Pin */}
                    {assignedAmbulance && (
                      <Marker
                        position={[assignedAmbulance.latitude, assignedAmbulance.longitude]}
                        icon={getAmbulanceIcon(assignedAmbulance, true)}
                      >
                        <Popup>
                          <div className="text-xs">
                            <strong>Ambulance {assignedAmbulance.registrationNumber}</strong><br />
                            Speed: {assignedAmbulance.speed} km/h
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Route line */}
                    {assignedAmbulance && (
                      <Polyline
                        positions={[
                          [assignedAmbulance.latitude, assignedAmbulance.longitude],
                          [userCoords.lat, userCoords.lon],
                        ]}
                        pathOptions={{
                          color: '#f43f5e',
                          weight: 4,
                          dashArray: '8, 8',
                          opacity: 0.9,
                        }}
                      />
                    )}

                    {/* Destination Hospital */}
                    {assignedHospital && (
                      <Marker
                        position={[assignedHospital.latitude, assignedHospital.longitude]}
                        icon={getHospitalIcon(assignedHospital)}
                      >
                        <Popup>
                          <div className="text-xs">
                            <strong>{assignedHospital.name}</strong>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
              </div>

              {/* Cancel SOS Button */}
              {onCancelSOS && (
                <div className="mt-3 flex justify-end">
                  <button
                    className="btn-cancel-sos"
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this emergency request?')) {
                        onCancelSOS(activeEmergency.id);
                      }
                    }}
                  >
                    Cancel Emergency Request
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Google Material Emergency Intake Card */
            <div className="citizen-sos-trigger-card">
              <div className="sos-hero-header">
                <div className="sos-material-icon-box">
                  <ShieldAlert size={24} className="text-red" />
                </div>
                <div>
                  <h2 className="sos-hero-title">Emergency Medical Assistance Request</h2>
                  <p className="sos-hero-sub">
                    Directly alerts the 112 ERSS central dispatch console to assign the nearest emergency medical unit.
                  </p>
                </div>
              </div>

              {/* Emergency Category Selector */}
              <div className="sos-category-zone">
                <label className="section-label">INCIDENT NATURE & CLASSIFICATION</label>
                <div className="category-grid">
                  {EMERGENCY_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      className={`cat-tile ${selectedEmergencyType === type.id ? 'active' : ''}`}
                      onClick={() => setSelectedEmergencyType(type.id)}
                    >
                      <span className="cat-code">{type.code}</span>
                      <span className="cat-text">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Box */}
              <div className="sos-location-zone">
                <div className="flex items-center justify-between mb-1">
                  <label className="section-label">CONFIRMED INCIDENT LOCATION</label>
                  <button
                    type="button"
                    className="btn-link-edit"
                    onClick={() => setIsEditingAddress(!isEditingAddress)}
                  >
                    {isEditingAddress ? 'Done' : 'Change Address'}
                  </button>
                </div>

                <div className="location-box">
                  <MapPin size={18} className="text-red flex-shrink-0" />
                  {isEditingAddress ? (
                    <input
                      type="text"
                      className="location-input-edit"
                      value={userAddress}
                      onChange={(e) => setUserAddress(e.target.value)}
                      placeholder="Enter street address, building or landmark"
                    />
                  ) : (
                    <span className="location-text">{userAddress}</span>
                  )}
                </div>
              </div>

              {/* Medical Notice */}
              <div className="citizen-medical-alert-notice">
                <AlertTriangle size={16} className="text-amber flex-shrink-0" />
                <span>
                  <strong>Clinical Notice:</strong> Pre-existing medical conditions (
                  {profile.diseases.join(', ') || 'None'}) and known drug allergies (
                  {profile.allergies.join(', ') || 'None'}) will be securely transmitted to responding paramedics upon dispatch.
                </span>
              </div>

              {/* Professional Google Material Emergency Dispatch Button */}
              <button
                type="button"
                className="btn-material-emergency"
                onClick={handleTriggerSOS}
              >
                <ShieldAlert size={20} />
                <div className="btn-emergency-text">
                  <span className="emergency-main-txt">Dispatch Emergency Ambulance</span>
                  <span className="emergency-sub-txt">112 ERSS Priority Medical Request</span>
                </div>
              </button>
            </div>
          )}

          {/* Emergency Direct Call Numbers */}
          <div className="citizen-hotlines-card">
            <div className="hotline-title">
              <Phone size={16} className="text-sky" />
              <span>Direct Emergency Telephone Numbers</span>
            </div>
            <div className="hotline-grid">
              <a href="tel:112" className="hotline-pill">
                <strong>112</strong>
                <small>National SOS</small>
              </a>
              <a href="tel:108" className="hotline-pill">
                <strong>108</strong>
                <small>Ambulance</small>
              </a>
              <a href="tel:102" className="hotline-pill">
                <strong>102</strong>
                <small>Maternity</small>
              </a>
              <a href="tel:100" className="hotline-pill">
                <strong>100</strong>
                <small>Police CAD</small>
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Personal Medical Emergency ID & First Aid Guide */}
        <div className="citizen-right-col">
          {/* Medical Emergency ID Card */}
          <div className="citizen-medical-id-card">
            <div className="id-card-header">
              <div className="flex items-center gap-2">
                <Shield size={20} className="text-rose" />
                <span className="font-bold text-sm tracking-wider uppercase">DIGITAL EMERGENCY HEALTH ID</span>
              </div>
              <span className="id-blood-badge">BLOOD {profile.bloodGroup || 'O+'}</span>
            </div>

            <div className="id-card-body">
              <div className="id-user-meta">
                <div className="id-avatar">
                  <User size={28} className="text-secondary" />
                </div>
                <div>
                  <h3 className="id-name">{profile.name}</h3>
                  <div className="id-sub-info">
                    <span>{profile.gender}</span>
                    <span className="dot-sep">·</span>
                    <span>{profile.age} Years Old</span>
                    <span className="dot-sep">·</span>
                    <span>{profile.phone}</span>
                  </div>
                  {profile.email && <div className="text-xs text-muted">{profile.email}</div>}
                </div>
              </div>

              {/* Known Allergies Alert Box (CRITICAL) */}
              <div className="id-alert-block allergy-block">
                <div className="id-block-header text-red">
                  <AlertTriangle size={14} />
                  <span>KNOWN ALLERGIES (CRITICAL CONTRAINDICATIONS)</span>
                </div>
                <div className="id-chip-list">
                  {profile.allergies.map((allergy, i) => (
                    <span key={i} className="id-alert-chip red">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pre-existing Diseases / Medical Conditions */}
              <div className="id-alert-block disease-block">
                <div className="id-block-header text-amber">
                  <Activity size={14} />
                  <span>PRE-EXISTING MEDICAL CONDITIONS & CHRONIC ILLNESS</span>
                </div>
                <div className="id-chip-list">
                  {profile.diseases.map((disease, i) => (
                    <span key={i} className="id-alert-chip amber">
                      {disease}
                    </span>
                  ))}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="id-contact-box">
                <div className="text-xs text-muted mb-1">EMERGENCY NEXT OF KIN CONTACT</div>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>{profile.emergencyContactName || 'Amit Patel (Spouse)'}</strong>
                    <div className="text-xs text-secondary">{profile.emergencyContactPhone || '+91 98450 99887'}</div>
                  </div>
                  {profile.emergencyContactPhone && (
                    <a
                      href={`tel:${profile.emergencyContactPhone}`}
                      className="btn-call-kin"
                    >
                      <Phone size={13} />
                      <span>Call Kin</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Edit Profile & Settings Action Button in ID Card */}
              <div className="id-card-actions-row">
                <button
                  type="button"
                  className="btn-edit-profile-card"
                  onClick={() => {
                    setEditForm(profile);
                    setSaveSuccessMsg(false);
                    setIsEditProfileOpen(true);
                  }}
                >
                  <Settings size={15} />
                  <span>Edit Profile / Settings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive First Aid Protocols while waiting */}
          <div className="citizen-first-aid-card">
            <div className="first-aid-header">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-emerald" />
                <span className="font-bold text-sm tracking-wider uppercase">Emergency First-Aid Guide</span>
              </div>
              <small className="text-secondary">Actionable steps while unit is en route</small>
            </div>

            <div className="first-aid-tabs">
              <button
                className={`first-aid-tab-btn ${activeFirstAidTab === 'CPR' ? 'active' : ''}`}
                onClick={() => setActiveFirstAidTab('CPR')}
              >
                Hands-Only CPR
              </button>
              <button
                className={`first-aid-tab-btn ${activeFirstAidTab === 'BLEEDING' ? 'active' : ''}`}
                onClick={() => setActiveFirstAidTab('BLEEDING')}
              >
                Severe Bleeding
              </button>
              <button
                className={`first-aid-tab-btn ${activeFirstAidTab === 'ASTHMA' ? 'active' : ''}`}
                onClick={() => setActiveFirstAidTab('ASTHMA')}
              >
                Asthma Attack
              </button>
              <button
                className={`first-aid-tab-btn ${activeFirstAidTab === 'STROKE' ? 'active' : ''}`}
                onClick={() => setActiveFirstAidTab('STROKE')}
              >
                Stroke (FAST)
              </button>
            </div>

            <div className="first-aid-content">
              {activeFirstAidTab === 'CPR' && (
                <div className="protocol-body">
                  <div className="cpr-metronome-pill">
                    <span className={`cpr-heart-icon ${cprBeat ? 'beat' : ''}`}>
                      <Heart size={18} className="text-red fill-current" />
                    </span>
                    <div>
                      <strong>CPR Metronome: 100 - 120 Beats / Min</strong>
                      <small>Compress center of chest hard & fast to this beat</small>
                    </div>
                  </div>
                  <ol className="protocol-steps">
                    <li>Place heel of one hand in center of patient's chest; place other hand on top.</li>
                    <li>Push hard and fast at 2 inches (5 cm) depth.</li>
                    <li>Allow chest to fully recoil between each compression.</li>
                    <li>Do not stop until paramedics arrive or AED is applied.</li>
                  </ol>
                </div>
              )}

              {activeFirstAidTab === 'BLEEDING' && (
                <div className="protocol-body">
                  <ol className="protocol-steps">
                    <li>Apply direct, firm, continuous pressure to the wound with a clean cloth.</li>
                    <li>Do not remove soaked gauze; add more cloth on top.</li>
                    <li>If on an arm or leg and bleeding is life-threatening, apply a tourniquet 2-3 inches above wound.</li>
                    <li>Keep patient warm and lying down to prevent shock.</li>
                  </ol>
                </div>
              )}

              {activeFirstAidTab === 'ASTHMA' && (
                <div className="protocol-body">
                  <ol className="protocol-steps">
                    <li>Help the person sit upright and loosen any tight clothing around the neck.</li>
                    <li>Administer their reliever inhaler (Blue/Salbutamol): 4 puffs, 1 puff every 4 breaths.</li>
                    <li>Keep them calm; panic increases oxygen demand and airway constriction.</li>
                    <li>If no improvement after 4 minutes, give 4 more puffs until ambulance arrives.</li>
                  </ol>
                </div>
              )}

              {activeFirstAidTab === 'STROKE' && (
                <div className="protocol-body">
                  <div className="fast-grid">
                    <div className="fast-item">
                      <strong>F - Face</strong>
                      <span>Ask them to smile. Does one side of the face droop?</span>
                    </div>
                    <div className="fast-item">
                      <strong>A - Arms</strong>
                      <span>Ask them to raise both arms. Does one arm drift down?</span>
                    </div>
                    <div className="fast-item">
                      <strong>S - Speech</strong>
                      <span>Ask them to repeat a simple sentence. Is speech slurred?</span>
                    </div>
                    <div className="fast-item">
                      <strong>T - Time</strong>
                      <span>Ambulance has been alerted. Note exact time symptoms began.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Comprehensive Edit Profile / Settings Modal */}
      {isEditProfileOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content modal-lg citizen-settings-modal">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Settings size={20} className="text-rose" />
                <div>
                  <h3 className="font-bold text-lg">Citizen Emergency Profile & Settings</h3>
                  <p className="text-xs text-muted">Update your personal medical data and emergency responder details anytime</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsEditProfileOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

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
              className="modal-body citizen-settings-body space-y-4"
            >
              {saveSuccessMsg && (
                <div className="citizen-save-success-banner">
                  <Check size={16} className="text-emerald" />
                  <span>Profile & medical settings saved successfully! Responder data updated.</span>
                </div>
              )}

              {/* Section 1: Basic Personal Info */}
              <div className="settings-section">
                <div className="settings-section-heading">
                  <User size={15} className="text-sky" />
                  <span>1. Personal & Contact Information</span>
                </div>

                <div className="form-row-2">
                  <div className="form-group-item">
                    <label>Full Legal Name *</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Mobile Number (Emergency Contact) *</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="form-group-item">
                    <label>Age *</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={editForm.age}
                      onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 25 })}
                      required
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Gender *</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as any })}
                    >
                      <option value="FEMALE">Female</option>
                      <option value="MALE">Male</option>
                      <option value="OTHER">Other</option>
                      <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="form-group-item">
                    <label>Blood Group *</label>
                    <select
                      value={editForm.bloodGroup || 'O+'}
                      onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    >
                      <option value="O+">O+ (Universal Donor Red)</option>
                      <option value="O-">O- (Universal Donor)</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+ (Universal Recipient)</option>
                      <option value="AB-">AB-</option>
                      <option value="Not Specified">Not Specified</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-item">
                  <label>Email Address (Optional for e-prescriptions & discharge summaries)</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    placeholder="e.g. citizen@example.com"
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Section 2: Chronic Diseases & Medical History */}
              <div className="settings-section">
                <div className="settings-section-heading">
                  <Activity size={15} className="text-amber" />
                  <span>2. Chronic Diseases & Pre-Existing Conditions</span>
                </div>
                <p className="text-xs text-muted mb-2">
                  Select common medical conditions or type custom ones below. Responding paramedics receive this immediately upon dispatch.
                </p>

                {/* Preset Chips */}
                <div className="chip-selector-grid mb-2">
                  {PRESET_DISEASES.map((disease) => {
                    const isSelected = editForm.diseases.includes(disease);
                    return (
                      <button
                        key={disease}
                        type="button"
                        className={`chip-btn ${isSelected ? 'active amber' : ''}`}
                        onClick={() => handleToggleDisease(disease)}
                      >
                        {isSelected ? <Check size={12} className="inline mr-1" /> : <Plus size={12} className="inline mr-1" />}
                        {disease}
                      </button>
                    );
                  })}
                </div>

                {/* Custom disease input */}
                <div className="custom-input-row">
                  <input
                    type="text"
                    value={customDiseaseInput}
                    onChange={(e) => setCustomDiseaseInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomDisease();
                      }
                    }}
                    placeholder="Add custom condition (e.g. Sickle Cell, Pacemaker)..."
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleAddCustomDisease}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>

                {/* Selected chips list */}
                <div className="selected-chips-row mt-2">
                  <span className="text-xs text-muted">Active Conditions:</span>
                  <div className="chips-wrap">
                    {editForm.diseases.map((d, i) => (
                      <span key={i} className="active-item-chip amber">
                        <span>{d}</span>
                        <button
                          type="button"
                          className="chip-remove"
                          onClick={() => handleRemoveDisease(d)}
                          title="Remove condition"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 3: Known Allergies & Drug Contraindications */}
              <div className="settings-section">
                <div className="settings-section-heading">
                  <AlertTriangle size={15} className="text-rose" />
                  <span>3. Known Drug & Environmental Allergies (Critical)</span>
                </div>
                <p className="text-xs text-muted mb-2">
                  Vital for field paramedics to avoid administering contraindicated medication.
                </p>

                {/* Preset Allergy Chips */}
                <div className="chip-selector-grid mb-2">
                  {PRESET_ALLERGIES.map((allergy) => {
                    const isSelected = editForm.allergies.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        type="button"
                        className={`chip-btn ${isSelected ? 'active red' : ''}`}
                        onClick={() => handleToggleAllergy(allergy)}
                      >
                        {isSelected ? <Check size={12} className="inline mr-1" /> : <Plus size={12} className="inline mr-1" />}
                        {allergy}
                      </button>
                    );
                  })}
                </div>

                {/* Custom allergy input */}
                <div className="custom-input-row">
                  <input
                    type="text"
                    value={customAllergyInput}
                    onChange={(e) => setCustomAllergyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAllergy();
                      }
                    }}
                    placeholder="Add custom allergy (e.g. Ciprofloxacin, Morphine)..."
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleAddCustomAllergy}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>

                {/* Selected allergy chips list */}
                <div className="selected-chips-row mt-2">
                  <span className="text-xs text-muted">Active Allergies:</span>
                  <div className="chips-wrap">
                    {editForm.allergies.map((a, i) => (
                      <span key={i} className="active-item-chip red">
                        <span>{a}</span>
                        <button
                          type="button"
                          className="chip-remove"
                          onClick={() => handleRemoveAllergy(a)}
                          title="Remove allergy"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 4: Emergency Next of Kin Contact */}
              <div className="settings-section">
                <div className="settings-section-heading">
                  <Phone size={15} className="text-emerald" />
                  <span>4. Emergency Next-of-Kin Contact</span>
                </div>

                <div className="form-row-2">
                  <div className="form-group-item">
                    <label>Kin / Contact Name & Relationship</label>
                    <input
                      type="text"
                      value={editForm.emergencyContactName || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                      placeholder="e.g. Anita Sharma (Spouse) or Rahul (Brother)"
                    />
                  </div>
                  <div className="form-group-item">
                    <label>Kin Telephone Number</label>
                    <input
                      type="tel"
                      value={editForm.emergencyContactPhone || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                      placeholder="e.g. +91 98765 00000"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer pt-3">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsEditProfileOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex items-center gap-2">
                  <Save size={15} />
                  <span>Save Medical Profile & Settings</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
