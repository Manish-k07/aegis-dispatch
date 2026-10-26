import React, { useState, useEffect } from 'react';
import {
  Hospital,
  Dispatch,
  Emergency,
  Ambulance,
  PatientVitals,
} from '../types';
import { MedicalMonitorWidget } from './MedicalMonitorWidget';
import {
  Icon,
  Button,
  Card,
  SectionHeader,
  ProgressBar,
  StatusChip,
  EmptyState,
  Snackbar,
  Dialog,
  Switch,
  Row,
  Stack,
} from './common';

interface HospitalDashboardProps {
  hospital: Hospital;
  allHospitals?: Hospital[];
  onSelectHospital?: (h: Hospital) => void;
  dispatches: Dispatch[];
  emergencies: Emergency[];
  ambulances: Ambulance[];
  liveVitalsByDispatch?: { [dispatchId: string]: PatientVitals };
  onUpdateCapacity: (hospitalId: string, capacity: Partial<Hospital>) => void;
  onAdvanceStatus: (dispatch: Dispatch, nextStatus: string) => void;
  onLogout?: () => void;
}

interface ReadinessState {
  strokeTeam: boolean;
  strokeUpdated: string;
  cathLab: boolean;
  cathLabUpdated: string;
  bloodBank: boolean;
  bloodBankUpdated: string;
  imagingFastTrack: boolean;
  imagingUpdated: string;
}

export const HospitalDashboard: React.FC<HospitalDashboardProps> = ({
  hospital,
  dispatches,
  emergencies,
  ambulances,
  liveVitalsByDispatch = {},
  onUpdateCapacity,
  onAdvanceStatus,
  onLogout,
}) => {
  // Initial values for dirty tracking
  const initialAvailableBeds = hospital.availableBeds ?? 48;
  const initialIcuBeds = hospital.icuBedsAvailable ?? 7;
  const initialTraumaBays = hospital.traumaBaysAvailable ?? 4;
  const initialStatus = hospital.status || 'AVAILABLE';

  const [availableBeds, setAvailableBeds] = useState(initialAvailableBeds);
  const [icuBedsAvailable, setIcuBedsAvailable] = useState(initialIcuBeds);
  const [traumaBaysAvailable, setTraumaBaysAvailable] = useState(initialTraumaBays);
  const [status, setStatus] = useState<'AVAILABLE' | 'LIMITED_CAPACITY' | 'FULL'>(initialStatus as any);

  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('12:45');
  const [lastUpdatedBy] = useState<string>('Dr. S. Nair');

  // Divert confirmation dialog state
  const [isDivertConfirmOpen, setIsDivertConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'AVAILABLE' | 'LIMITED_CAPACITY' | 'FULL' | null>(null);

  // Snackbar state
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Readiness checklist switches with timestamps
  const [readiness, setReadiness] = useState<ReadinessState>({
    strokeTeam: true,
    strokeUpdated: 'Today at 08:30',
    cathLab: true,
    cathLabUpdated: 'Today at 09:15',
    bloodBank: true,
    bloodBankUpdated: 'Today at 07:00',
    imagingFastTrack: true,
    imagingUpdated: 'Today at 10:00',
  });
  const [readinessDirty, setReadinessDirty] = useState(false);

  // Inbound dispatches destined for this hospital
  const inboundDispatches = dispatches.filter(
    (d) =>
      d.hospitalId === hospital.id &&
      !['COMPLETED', 'CANCELLED'].includes(d.status)
  );

  // Dirty state calculation
  const isDirty =
    availableBeds !== initialAvailableBeds ||
    icuBedsAvailable !== initialIcuBeds ||
    traumaBaysAvailable !== initialTraumaBays ||
    status !== initialStatus ||
    readinessDirty;

  const totalBeds = hospital.totalBeds ?? 160;
  const totalIcu = hospital.icuBedsTotal ?? 28;
  const totalTrauma = hospital.traumaBaysTotal ?? 10;

  // Occupancy ratio color calculation (<70% text, 70-89% warning, >=90% error)
  const getOccupancyColor = (available: number, total: number): string => {
    const occupied = Math.max(0, total - available);
    const ratio = total > 0 ? (occupied / total) * 100 : 0;
    if (ratio >= 90) return 'var(--md-sys-color-error)';
    if (ratio >= 70) return 'var(--md-sys-color-warning)';
    return 'var(--md-sys-color-text)';
  };

  const handleStatusChange = (newStatus: 'AVAILABLE' | 'LIMITED_CAPACITY' | 'FULL') => {
    if (newStatus === 'FULL') {
      setPendingStatus('FULL');
      setIsDivertConfirmOpen(true);
    } else {
      setStatus(newStatus);
    }
  };

  const handleConfirmDivert = () => {
    if (pendingStatus) {
      setStatus(pendingStatus);
    }
    setIsDivertConfirmOpen(false);
    setPendingStatus(null);
  };

  const handlePublish = () => {
    onUpdateCapacity(hospital.id, {
      availableBeds,
      icuBedsAvailable,
      traumaBaysAvailable,
      status,
    });
    const now = new Date();
    setLastUpdatedTime(
      now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    );
    setReadinessDirty(false);
    setSnackbarMessage('ED status broadcast to CAD and inbound units');
  };

  // Facility name display
  const facilityName = hospital.name || 'Demo City Hospital';

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
      {/* 1. Header: Facility Name "Demo City Hospital", Subtitle, Status Chip, Sign out */}
      <header
        style={{
          minHeight: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          backgroundColor: 'var(--md-sys-color-surface)',
          borderBottom: '1px solid var(--md-sys-color-outline)',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '12px',
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
            <Icon name="local_hospital" size={24} />
          </div>
          <div>
            <Row gap={8} align="center">
              <span style={{ fontSize: '18px', fontWeight: 600 }}>{facilityName}</span>
              <StatusChip
                tone={status === 'AVAILABLE' ? 'success' : status === 'LIMITED_CAPACITY' ? 'warning' : 'critical'}
                label={status === 'AVAILABLE' ? 'Normal (Open)' : status === 'LIMITED_CAPACITY' ? 'Limited capacity' : 'Divert (Full)'}
                icon={status === 'AVAILABLE' ? 'check_circle' : 'warning'}
              />
            </Row>
            <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '2px' }}>
              {hospital.address} · Direct ED Hotline: {hospital.phone}
            </div>
          </div>
        </Row>

        <Row gap={12} align="center">
          <Button
            variant="filled"
            size="standard"
            icon="publish"
            disabled={!isDirty}
            onClick={handlePublish}
          >
            Publish updates
          </Button>

          {onLogout && (
            <Button
              variant="outlined"
              size="standard"
              icon="logout"
              onClick={onLogout}
            >
              Log out
            </Button>
          )}
        </Row>
      </header>

      {/* 2. Main 2-Column Hospital Layout */}
      <div
        className="driver-mdt-grid"
        style={{
          flex: 1,
          padding: '16px',
          boxSizing: 'border-box',
          overflow: 'auto',
        }}
      >
        {/* Left Column: Capacity Steppers, Diversion Segmented Control, Readiness Switches */}
        <Stack gap={16}>
          {/* Capacity Steppers Card */}
          <Card padding={16} variant="outlined">
            <SectionHeader
              icon="bed"
              title="Department capacity"
              subtitle={`Updated by ${lastUpdatedBy} at ${lastUpdatedTime}`}
            />

            <div
              className="hospital-stepper-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                margin: '16px 0',
              }}
            >
              {/* Emergency Department Beds */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--md-sys-color-surface-high)',
                  border: '1px solid var(--md-sys-color-outline)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Emergency beds</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: getOccupancyColor(availableBeds, totalBeds),
                    }}
                  >
                    {availableBeds}
                  </span>
                  <span className="mono" style={{ fontSize: '14px', color: 'var(--md-sys-color-text-secondary)' }}>
                    / {totalBeds}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>
                  {Math.round(((totalBeds - availableBeds) / totalBeds) * 100)}% occupied
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setAvailableBeds(Math.max(0, availableBeds - 1))}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      border: '1px solid var(--md-sys-color-outline)',
                      backgroundColor: 'var(--md-sys-color-surface)',
                      color: 'var(--md-sys-color-text)',
                      fontSize: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Decrease available emergency beds"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvailableBeds(availableBeds + 1)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      border: '1px solid var(--md-sys-color-outline)',
                      backgroundColor: 'var(--md-sys-color-surface)',
                      color: 'var(--md-sys-color-text)',
                      fontSize: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Increase available emergency beds"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* ICU Resuscitation Beds */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--md-sys-color-surface-high)',
                  border: '1px solid var(--md-sys-color-outline)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 500 }}>ICU beds</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: getOccupancyColor(icuBedsAvailable, totalIcu),
                    }}
                  >
                    {icuBedsAvailable}
                  </span>
                  <span className="mono" style={{ fontSize: '14px', color: 'var(--md-sys-color-text-secondary)' }}>
                    / {totalIcu}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>
                  {Math.round(((totalIcu - icuBedsAvailable) / totalIcu) * 100)}% occupied
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setIcuBedsAvailable(Math.max(0, icuBedsAvailable - 1))}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      border: '1px solid var(--md-sys-color-outline)',
                      backgroundColor: 'var(--md-sys-color-surface)',
                      color: 'var(--md-sys-color-text)',
                      fontSize: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Decrease available ICU beds"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setIcuBedsAvailable(icuBedsAvailable + 1)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      border: '1px solid var(--md-sys-color-outline)',
                      backgroundColor: 'var(--md-sys-color-surface)',
                      color: 'var(--md-sys-color-text)',
                      fontSize: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Increase available ICU beds"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Trauma Bays */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--md-sys-color-surface-high)',
                  border: '1px solid var(--md-sys-color-outline)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Trauma bays</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: getOccupancyColor(traumaBaysAvailable, totalTrauma),
                    }}
                  >
                    {traumaBaysAvailable}
                  </span>
                  <span className="mono" style={{ fontSize: '14px', color: 'var(--md-sys-color-text-secondary)' }}>
                    / {totalTrauma}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>
                  {Math.round(((totalTrauma - traumaBaysAvailable) / totalTrauma) * 100)}% occupied
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setTraumaBaysAvailable(Math.max(0, traumaBaysAvailable - 1))}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      border: '1px solid var(--md-sys-color-outline)',
                      backgroundColor: 'var(--md-sys-color-surface)',
                      color: 'var(--md-sys-color-text)',
                      fontSize: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Decrease available trauma bays"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setTraumaBaysAvailable(traumaBaysAvailable + 1)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      border: '1px solid var(--md-sys-color-outline)',
                      backgroundColor: 'var(--md-sys-color-surface)',
                      color: 'var(--md-sys-color-text)',
                      fontSize: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Increase available trauma bays"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Diversion: M3 Segmented Control (Open / Limited / Divert) */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                Emergency department diversion status
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  backgroundColor: 'var(--md-sys-color-surface-variant)',
                  borderRadius: '24px',
                  padding: '4px',
                  gap: '4px',
                }}
              >
                {[
                  { id: 'AVAILABLE', label: 'Open' },
                  { id: 'LIMITED_CAPACITY', label: 'Limited' },
                  { id: 'FULL', label: 'Divert' },
                ].map((option) => {
                  const isSelected = status === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleStatusChange(option.id as any)}
                      style={{
                        height: '40px',
                        borderRadius: '20px',
                        border: 'none',
                        backgroundColor: isSelected ? 'var(--md-sys-color-surface)' : 'transparent',
                        color: isSelected ? 'var(--md-sys-color-text)' : 'var(--md-sys-color-text-secondary)',
                        fontSize: '14px',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                        transition: 'all 150ms ease',
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Department Readiness Switches with Timestamps */}
          <Card padding={16} variant="outlined">
            <SectionHeader
              icon="checklist"
              title="Department readiness"
              subtitle="Self-reported capabilities"
            />

            <Stack gap={16} style={{ marginTop: '16px' }}>
              {/* 1. Stroke Team */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>24/7 Comprehensive Stroke Team</div>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                    Last verified: {readiness.strokeUpdated}
                  </div>
                </div>
                <Switch
                  checked={readiness.strokeTeam}
                  onChange={(c) => {
                    setReadiness({
                      ...readiness,
                      strokeTeam: c,
                      strokeUpdated: 'Just now',
                    });
                    setReadinessDirty(true);
                  }}
                />
              </div>

              {/* 2. Cardiac Cath Lab */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>Cardiac Cath Lab Standby</div>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                    Last verified: {readiness.cathLabUpdated}
                  </div>
                </div>
                <Switch
                  checked={readiness.cathLab}
                  onChange={(c) => {
                    setReadiness({
                      ...readiness,
                      cathLab: c,
                      cathLabUpdated: 'Just now',
                    });
                    setReadinessDirty(true);
                  }}
                />
              </div>

              {/* 3. Blood Bank */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>Blood Bank O-Negative Reserves</div>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                    Last verified: {readiness.bloodBankUpdated}
                  </div>
                </div>
                <Switch
                  checked={readiness.bloodBank}
                  onChange={(c) => {
                    setReadiness({
                      ...readiness,
                      bloodBank: c,
                      bloodBankUpdated: 'Just now',
                    });
                    setReadinessDirty(true);
                  }}
                />
              </div>

              {/* 4. Imaging Fast Track */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>CT / MRI Fast Track Clear</div>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                    Last verified: {readiness.imagingUpdated}
                  </div>
                </div>
                <Switch
                  checked={readiness.imagingFastTrack}
                  onChange={(c) => {
                    setReadiness({
                      ...readiness,
                      imagingFastTrack: c,
                      imagingUpdated: 'Just now',
                    });
                    setReadinessDirty(true);
                  }}
                />
              </div>
            </Stack>
          </Card>
        </Stack>

        {/* Right Column: Inbound Ambulances Card + Recent Activity Log */}
        <Stack gap={16}>
          {/* Inbound Ambulances Card */}
          <Card padding={16} variant="outlined">
            <Row justify="space-between" align="center" style={{ marginBottom: '12px' }}>
              <SectionHeader
                icon="radar"
                title="Inbound ambulances"
                subtitle="Live transport telemetry"
              />
              <span
                style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--md-sys-color-primary-container)',
                  color: 'var(--md-sys-color-on-primary-container)',
                  fontWeight: 500,
                }}
              >
                {inboundDispatches.length} inbound
              </span>
            </Row>

            {inboundDispatches.length === 0 ? (
              <EmptyState
                icon="local_hospital"
                title="No inbound ambulances"
                description="No inbound ambulances at this time. Reception bay is ready."
              />
            ) : (
              <Stack gap={12}>
                {inboundDispatches.map((disp) => {
                  const em = emergencies.find((e) => e.id === disp.emergencyId);
                  const amb = ambulances.find((a) => a.id === disp.ambulanceId);
                  const vit = liveVitalsByDispatch[disp.id] || {
                    heartRate: 104,
                    bloodPressureSys: 130,
                    bloodPressureDia: 85,
                    spO2: 96,
                    respiratoryRate: 20,
                    temperature: 37.1,
                    gcs: 14,
                    conditionSummary: em?.description || 'En-route emergency transport',
                  };

                  return (
                    <Card key={disp.id} padding={16} variant="outlined" style={{ backgroundColor: 'var(--md-sys-color-surface-high)' }}>
                      <Row justify="space-between" align="flex-start">
                        <div>
                          <Row gap={8} align="center">
                            <StatusChip
                              tone={em?.priority === 'CRITICAL' ? 'critical' : 'high'}
                              label={em?.priority || 'Critical'}
                            />
                            <span className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>
                              Unit {amb?.registrationNumber} ({amb?.type})
                            </span>
                          </Row>
                          <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
                            {em?.type}: {em?.description}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '2px' }}>
                            {em?.address}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                            {disp.etaMinutes ? `${disp.etaMinutes} min` : '4.5 min'} ETA
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>
                            In transit
                          </div>
                        </div>
                      </Row>

                      {/* Compact ECG and Vitals Monitor */}
                      <div style={{ margin: '12px 0' }}>
                        <MedicalMonitorWidget vitals={vit} compact={true} />
                      </div>

                      {/* Action buttons: Divert request or Confirm Handover */}
                      <Row justify="flex-end" gap={8}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSnackbarMessage(`Divert recommendation sent for Unit ${amb?.registrationNumber}`);
                          }}
                        >
                          Request divert
                        </Button>
                        {disp.status === 'ARRIVED_AT_HOSPITAL' && (
                          <Button
                            variant="filled"
                            size="small"
                            icon="check_circle"
                            onClick={() => onAdvanceStatus(disp, 'COMPLETED')}
                          >
                            Confirm handover &amp; clear
                          </Button>
                        )}
                      </Row>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Card>

          {/* Recent Activity Card (admitted/diverted in last 24h, replacing Save ED log) */}
          <Card padding={16} variant="outlined">
            <SectionHeader
              icon="history"
              title="Recent activity"
              subtitle="Transports received in past 24 hours"
            />

            <Stack gap={8} style={{ marginTop: '12px' }}>
              {[
                { time: '13:12', unit: 'KA-01-AE-1002 (ALS)', diagnosis: 'Acute coronary syndrome · Admitted to Cath Lab', status: 'Admitted' },
                { time: '12:04', unit: 'KA-01-AE-1004 (BLS)', diagnosis: 'Fracture post-fall · Transferred to Orthopedics', status: 'Admitted' },
                { time: '10:48', unit: 'KA-01-AE-1001 (ALS)', diagnosis: 'Multi-trauma · Diverted to City Level-1 Center', status: 'Diverted' },
                { time: '09:22', unit: 'KA-01-AE-1003 (ALS)', diagnosis: 'Asthmatic exacerbation · Stabilized and discharged', status: 'Admitted' },
              ].map((activity, index) => (
                <div
                  key={index}
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
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>
                        {activity.time}
                      </span>
                      <strong style={{ fontSize: '13px' }}>{activity.unit}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '2px' }}>
                      {activity.diagnosis}
                    </div>
                  </div>
                  <StatusChip
                    tone={activity.status === 'Admitted' ? 'success' : 'warning'}
                    label={activity.status}
                    size="small"
                  />
                </div>
              ))}
            </Stack>
          </Card>
        </Stack>
      </div>

      {/* Divert Confirmation Dialog */}
      <Dialog
        isOpen={isDivertConfirmOpen}
        onClose={() => {
          setIsDivertConfirmOpen(false);
          setPendingStatus(null);
        }}
        title="Confirm emergency diversion"
        confirmLabel="Confirm divert"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDivert}
      >
        <div style={{ fontSize: '14px', lineHeight: '20px', color: 'var(--md-sys-color-text-secondary)' }}>
          <p style={{ marginTop: 0 }}>
            Placing {facilityName} on <strong>Divert</strong> status signals CAD dispatchers and inbound ambulances that the facility is at maximum capacity.
          </p>
          <p>
            Emergency vehicles will be automatically suggested to reroute to secondary trauma hospitals. Are you sure you want to proceed?
          </p>
        </div>
      </Dialog>

      {/* Floating Snackbar */}
      <Snackbar
        message={snackbarMessage || ''}
        isOpen={Boolean(snackbarMessage)}
        onClose={() => setSnackbarMessage(null)}
      />
    </div>
  );
};
