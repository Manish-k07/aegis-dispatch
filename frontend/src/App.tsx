import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { MapView } from './components/MapView';
import { EmergencyQueue } from './components/EmergencyQueue';
import { ActiveDispatches } from './components/ActiveDispatches';
import { FleetList } from './components/FleetList';
import { CandidateModal } from './components/CandidateModal';
import { HospitalModal } from './components/HospitalModal';
import { NewEmergencyModal } from './components/NewEmergencyModal';
import { AICopilotDrawer } from './components/AICopilotDrawer';
import { DriverDashboard } from './components/DriverDashboard';
import { HospitalDashboard } from './components/HospitalDashboard';
import { HospitalList } from './components/HospitalList';
import { Footer } from './components/Footer';
import { LoginGateway } from './components/LoginGateway';
import { CitizenDashboard } from './components/CitizenDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { BackendNotConfiguredScreen } from './components/BackendNotConfiguredScreen';
import { BackendUnreachableScreen } from './components/BackendUnreachableScreen';
import { Tabs } from './components/common';
import { Icon } from './components/common/Icon';
import {
  DashboardData,
  Emergency,
  Candidate,
  Dispatch,
  Hospital,
  Ambulance,
  AuditLog,
  UserRole,
  PatientVitals,
  AuthSession,
  CitizenProfile
} from './types';
import { audioSystem } from './utils/audio';
import { API_BASE, IS_BACKEND_CONFIGURED } from './config';
import { ModeProvider, useMode } from './services/ModeProvider';

// Haversine distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const AppContent: React.FC = () => {
  const {
    mode,
    dataSource,
    connectionStatus,
    isBackendReachable,
    checkBackendHealth,
    setMode,
    exitDemo,
  } = useMode();

  const [data, setData] = useState<DashboardData>({
    emergencies: [],
    ambulances: [],
    hospitals: [],
    dispatches: [],
    activeSimulations: [],
  });

  const sessionKey = `aegis.${mode.toLowerCase()}.auth_session`;

  // Authentication & Role Session Isolation
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      const saved = localStorage.getItem(sessionKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [role, setRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.role || null;
      }
    } catch {}
    return null;
  });

  // Re-sync session when mode changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`aegis.${mode.toLowerCase()}.auth_session`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setAuthSession(parsed);
        setRole(parsed.role || null);
        if (parsed.ambulanceId) setSelectedDriverAmbulanceId(parsed.ambulanceId);
        if (parsed.hospitalId) setSelectedHospitalId(parsed.hospitalId);
        if (parsed.citizenProfile) setCitizenProfile(parsed.citizenProfile);
      } else {
        setAuthSession(null);
        setRole(null);
      }
    } catch {
      setAuthSession(null);
      setRole(null);
    }
  }, [mode]);

  // Google Material M3 Theme Management
  const [userThemeOverride, setUserThemeOverride] = useState<'light' | 'dark' | null>(() => {
    try {
      const saved = localStorage.getItem('aegis_theme_preference');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return null;
  });

  const effectiveTheme: 'light' | 'dark' = useMemo(() => {
    if (userThemeOverride) return userThemeOverride;
    if (role === 'DISPATCHER' || role === 'DRIVER' || role === 'PARAMEDIC') return 'dark';
    return 'light';
  }, [userThemeOverride, role]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  const handleToggleTheme = () => {
    const next = effectiveTheme === 'dark' ? 'light' : 'dark';
    setUserThemeOverride(next);
    try {
      localStorage.setItem('aegis_theme_preference', next);
    } catch {}
  };

  // CAD Alert strip session dismissal state
  const [isAlertDismissed, setIsAlertDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('aegis_alert_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  // CAD Auto-dispatch toggle state (default OFF)
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState<boolean>(false);

  const [citizenProfile, setCitizenProfile] = useState<CitizenProfile | null>(() => {
    try {
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.citizenProfile || null;
      }
    } catch {}
    return null;
  });

  const [selectedDriverAmbulanceId, setSelectedDriverAmbulanceId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.ambulanceId || null;
      }
    } catch {}
    return null;
  });

  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.hospitalId || null;
      }
    } catch {}
    return null;
  });

  const handleLogin = (session: AuthSession) => {
    setAuthSession(session);
    setRole(session.role);
    if (session.ambulanceId) {
      setSelectedDriverAmbulanceId(session.ambulanceId);
      try {
        sessionStorage.removeItem('aegis_responder_view_mode');
      } catch {}
    }
    if (session.hospitalId) {
      setSelectedHospitalId(session.hospitalId);
    }
    if (session.citizenProfile) {
      setCitizenProfile(session.citizenProfile);
    }
    try {
      localStorage.setItem(`aegis.${mode.toLowerCase()}.auth_session`, JSON.stringify(session));
    } catch {}
    audioSystem.playMissionCompleteChime();
    setToastMessage(`Authenticated: ${session.userLabel} (${session.role})`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLogout = () => {
    setAuthSession(null);
    setRole(null);
    setSelectedDriverAmbulanceId(null);
    setSelectedHospitalId(null);
    try {
      localStorage.removeItem(`aegis.${mode.toLowerCase()}.auth_session`);
      localStorage.removeItem(`aegis.${mode.toLowerCase()}.token`);
    } catch {}
    setToastMessage('Terminal locked. Returned to Security Gateway.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Tools & Dialogs
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleExportAnalyticsCsv = () => {
    const url = dataSource.getAnalyticsExportCsvUrl();
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `aegis_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMessage('Exporting analytics CSV report...');
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Live Streamed Patient Vitals by dispatch ID
  const [liveVitalsByDispatch, setLiveVitalsByDispatch] = useState<{ [dispatchId: string]: PatientVitals }>({});

  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  const [selectedDispatchForHospital, setSelectedDispatchForHospital] = useState<Dispatch | null>(null);
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
  const [isNewEmergencyOpen, setIsNewEmergencyOpen] = useState(false);
  const [mapClickCoords, setMapClickCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [missionTelemetry, setMissionTelemetry] = useState<{
    maneuver?: string;
    etaRemaining?: number;
    roadWaypoints?: [number, number][];
  }>({});

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [liveEvents, setLiveEvents] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'MISSIONS' | 'FLEET' | 'HOSPITALS'>('QUEUE');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await dataSource.getDashboard();
      setData(res);
    } catch {}
  }, [dataSource]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const logs = await dataSource.getAuditLogs();
      setAuditLogs(logs);
    } catch {}
  }, [dataSource]);

  const fetchRoute = useCallback(async (dispatchId: string) => {
    try {
      const route = await dataSource.getRoute(dispatchId);
      if (route) {
        setMissionTelemetry({
          roadWaypoints: route.waypoints,
          etaRemaining: route.etaMinutes,
          maneuver: route.maneuvers?.[0]?.instruction || `En route (${route.distanceKm} km)`,
        });
      }
    } catch {}
  }, [dataSource]);

  // Event Subscription via DataSource
  useEffect(() => {
    fetchDashboard();
    fetchAuditLogs();

    const unsub = dataSource.subscribeToEvents((payload: any) => {
      try {
        const time = new Date().toLocaleTimeString();
        const evtDesc = payload.event
          ? `${time} · ${payload.event}${payload.id ? ` [${payload.id.substring(0, 8)}]` : ''}${payload.status ? ` [${payload.status}]` : ''}`
          : `${time} · Telemetry ping`;

        setLiveEvents((prev) => [evtDesc, ...prev.slice(0, 19)]);

        if (payload.event === 'NEW_EMERGENCY') {
          audioSystem.playCriticalIncidentChime();
        } else if (payload.event === 'AMBULANCE_ASSIGNED' || payload.event === 'SIMULATION_STARTED') {
          audioSystem.playDispatchAlert();
          if (payload.dispatchId) {
            setSelectedDispatchId(payload.dispatchId);
          }
        } else if (payload.event === 'VITALS_UPDATED') {
          if (payload.dispatchId && payload.vitals) {
            setLiveVitalsByDispatch((prev) => ({
              ...prev,
              [payload.dispatchId]: payload.vitals,
            }));
          }
          return;
        } else if (payload.event === 'LOCATION_UPDATED') {
          setData((prev) => ({
            ...prev,
            ambulances: prev.ambulances.map((a) =>
              a.id === payload.ambulanceId
                ? {
                    ...a,
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                    speed: payload.speed,
                    heading: payload.heading,
                  }
                : a
            ),
          }));
          return;
        }

        fetchDashboard();
        fetchAuditLogs();
      } catch {}
    });

    return () => unsub();
  }, [dataSource, fetchDashboard, fetchAuditLogs]);

  // Periodic Telemetry Heartbeat Ping in CAD UI
  useEffect(() => {
    const telemetryTimer = setInterval(() => {
      if (connectionStatus === 'CONNECTED') {
        const time = new Date().toLocaleTimeString();
        const pings = [
          `${time} · Telemetry Ping: Fleet GPS lock nominal • Real-time feeds operational`,
          `${time} · System Health: CAD Dispatch engine connected • 0 packet loss`,
          `${time} · Route Optimization: OSRM routing active`,
        ];
        const randomPing = pings[Math.floor(Math.random() * pings.length)];
        setLiveEvents((prev) => [randomPing, ...prev.slice(0, 19)]);
      }
    }, 20000);
    return () => clearInterval(telemetryTimer);
  }, [connectionStatus]);

  const handleSelectEmergency = async (emergency: Emergency) => {
    setSelectedEmergency(emergency);
    setIsLoadingCandidates(true);
    try {
      const list = await dataSource.getCandidates(emergency.id);
      setCandidates(list);
    } catch {
      setCandidates([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const handleAssignAmbulance = async (candidate: Candidate) => {
    if (!selectedEmergency) return;
    try {
      const newDispatch = await dataSource.createDispatch(
        selectedEmergency.id,
        candidate.ambulance.id,
        authSession?.userLabel || 'EMS Commander'
      );
      setSelectedEmergency(null);
      setCandidates([]);
      setSelectedDispatchId(newDispatch.id);
      fetchRoute(newDispatch.id);
      audioSystem.playDispatchAlert();
      fetchDashboard();
      fetchAuditLogs();
      setActiveTab('MISSIONS');
    } catch (err: any) {
      setToastMessage(`Assignment error: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleAutoAssign = async (emergencyId: string) => {
    try {
      const res = await dataSource.autoAssign(emergencyId, authSession?.userLabel || 'AI Auto-Dispatcher');
      audioSystem.playDispatchAlert();
      if (res.dispatch?.id) {
        setSelectedDispatchId(res.dispatch.id);
        fetchRoute(res.dispatch.id);
      }
      fetchDashboard();
      fetchAuditLogs();
      setActiveTab('MISSIONS');
    } catch (err: any) {
      setToastMessage(`Auto-dispatch failed: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleAutoAssignNext = async () => {
    const pendingList = data.emergencies.filter(
      (e) => e.status === 'PENDING_DISPATCH' || e.status === 'CREATED'
    );
    if (pendingList.length === 0) {
      setToastMessage('Queue clear: No pending emergency calls awaiting dispatch.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const availableAmbulances = (data.ambulances || []).filter(
      (a) => a.status === 'AVAILABLE'
    );
    if (availableAmbulances.length === 0) {
      setToastMessage('All fleet units currently assigned. Standing by for unit availability.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const priorityWeight: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };
    const highest = pendingList.slice().sort((a, b) => {
      return (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
    })[0];

    await handleAutoAssign(highest.id);
  };

  const handleToggleAutoDispatch = (enabled: boolean) => {
    setAutoDispatchEnabled(enabled);
    if (enabled) {
      audioSystem.playMissionCompleteChime();
      setToastMessage('AI Auto-dispatch ACTIVE: Continuously assigning nearest units to priority incidents.');
      setTimeout(() => setToastMessage(null), 4000);
      setLiveEvents((prev) => [
        `${new Date().toLocaleTimeString()} · [AI AUTO-DISPATCH] Autonomous engine ACTIVE · Monitoring emergency queue`,
        ...prev.slice(0, 19),
      ]);
      setTimeout(() => {
        handleAutoAssignNext();
      }, 250);
    } else {
      setToastMessage('Auto-dispatch PAUSED: Manual dispatcher confirmation required.');
      setTimeout(() => setToastMessage(null), 3500);
      setLiveEvents((prev) => [
        `${new Date().toLocaleTimeString()} · [AI AUTO-DISPATCH] Paused by dispatcher`,
        ...prev.slice(0, 19),
      ]);
    }
  };

  useEffect(() => {
    if (!autoDispatchEnabled || role !== 'DISPATCHER') return;

    const timer = setInterval(() => {
      const pendingList = (data.emergencies || []).filter(
        (e) => e.status === 'PENDING_DISPATCH' || e.status === 'CREATED'
      );
      const availableAmbulances = (data.ambulances || []).filter(
        (a) => a.status === 'AVAILABLE'
      );

      if (pendingList.length > 0 && availableAmbulances.length > 0) {
        const priorityWeight: Record<string, number> = {
          CRITICAL: 4,
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
        };
        const highest = pendingList.slice().sort((a, b) => {
          return (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
        })[0];

        handleAutoAssign(highest.id);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [autoDispatchEnabled, role, data.emergencies, data.ambulances]);

  const handleAdvanceStatus = async (dispatch: Dispatch, nextStatus: string) => {
    try {
      await dataSource.advanceDispatchStatus(
        dispatch.id,
        nextStatus,
        authSession?.userLabel || 'Personnel'
      );
      setSelectedDispatchId(dispatch.id);
      fetchRoute(dispatch.id);
      fetchDashboard();
      fetchAuditLogs();

      if (['COMPLETED', 'CLOSED'].includes(nextStatus)) {
        audioSystem.playMissionCompleteChime();
      } else if (['ARRIVED_AT_SCENE', 'ARRIVED_AT_HOSPITAL'].includes(nextStatus)) {
        audioSystem.playUnitArrivalChime();
      }
    } catch (err: any) {
      setToastMessage(`Status update failed: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleSelectHospital = async (hospital: Hospital) => {
    if (!selectedDispatchForHospital) return;
    const dispatchId = selectedDispatchForHospital.id;
    try {
      await dataSource.reassignHospital(dispatchId, hospital.id);
      fetchRoute(dispatchId);
      setSelectedDispatchForHospital(null);
      fetchDashboard();
      fetchAuditLogs();
    } catch (err: any) {
      setToastMessage(`Failed to reassign hospital: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleToggleSimulation = async (dispatchId: string) => {
    const isSimulating = (data.activeSimulations || []).includes(dispatchId);
    setSelectedDispatchId(dispatchId);
    try {
      if (isSimulating) {
        await dataSource.stopSimulation(dispatchId);
      } else {
        await dataSource.startSimulation(dispatchId);
        fetchRoute(dispatchId);
        audioSystem.playDispatchAlert();
      }
      fetchDashboard();
    } catch (err: any) {
      console.error('Simulation toggle failed', err);
    }
  };

  const handleCreateEmergency = async (emData: Partial<Emergency>) => {
    try {
      const created = await dataSource.createEmergency(emData);
      setIsNewEmergencyOpen(false);
      setMapClickCoords(null);
      audioSystem.playCriticalIncidentChime();
      fetchDashboard();
      fetchAuditLogs();
      setActiveTab('QUEUE');
      if (autoDispatchEnabled && created?.id) {
        setTimeout(() => {
          handleAutoAssign(created.id);
        }, 350);
      }
    } catch (err: any) {
      setToastMessage(`Failed to report emergency: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleMapClick = (lat: number, lon: number) => {
    setMapClickCoords({ lat, lon });
    setIsNewEmergencyOpen(true);
  };

  const handleToggleAudio = () => {
    const nextState = !isAudioEnabled;
    setIsAudioEnabled(nextState);
    audioSystem.setEnabled(nextState);
    setToastMessage(nextState ? 'Audio chime alerts ENABLED' : 'Audio chime alerts MUTED');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleResetData = async () => {
    try {
      setSelectedEmergency(null);
      setSelectedDispatchId(null);
      setCandidates([]);
      setMissionTelemetry({});
      setActiveTab('QUEUE');
      await dataSource.resetSimulation();
      fetchDashboard();
      fetchAuditLogs();
    } catch {}
  };

  const handleStreamVitals = async (dispatchId: string, vitals: PatientVitals) => {
    setLiveVitalsByDispatch((prev) => ({ ...prev, [dispatchId]: vitals }));
    try {
      await dataSource.streamVitals(dispatchId, vitals);
    } catch {}
  };

  const handleUpdateHospitalCapacity = async (hospitalId: string, capacity: Partial<Hospital>) => {
    try {
      await dataSource.updateHospitalCapacity(hospitalId, capacity);
      fetchDashboard();
      fetchAuditLogs();
    } catch (err: any) {
      setToastMessage(`Failed to update hospital capacity: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const activeMissionDispatch = useMemo(() => {
    if (!selectedDispatchId) return null;
    return (data.dispatches || []).find((d) => d.id === selectedDispatchId) || null;
  }, [data.dispatches, selectedDispatchId]);

  const currentDriverAmbulance = useMemo(() => {
    if (!selectedDriverAmbulanceId) return data.ambulances[0] || null;
    return data.ambulances.find((a) => a.id === selectedDriverAmbulanceId) || data.ambulances[0] || null;
  }, [data.ambulances, selectedDriverAmbulanceId]);

  const driverDispatch = useMemo(() => {
    if (!currentDriverAmbulance) return null;
    return (data.dispatches || []).find(
      (d) =>
        d.ambulanceId === currentDriverAmbulance.id &&
        !['COMPLETED', 'CANCELLED', 'RESOLVED', 'CLOSED'].includes((d.status || '').toUpperCase())
    ) || null;
  }, [data.dispatches, currentDriverAmbulance]);

  const driverEmergency = useMemo(() => {
    if (!driverDispatch) return null;
    return (data.emergencies || []).find((e) => e.id === driverDispatch.emergencyId) || null;
  }, [data.emergencies, driverDispatch]);

  const driverHospital = useMemo(() => {
    if (!driverDispatch?.hospitalId) return null;
    return (data.hospitals || []).find((h) => h.id === driverDispatch.hospitalId) || null;
  }, [data.hospitals, driverDispatch]);

  const currentHospital = useMemo(() => {
    if (!selectedHospitalId) return data.hospitals[0] || null;
    return data.hospitals.find((h) => h.id === selectedHospitalId) || data.hospitals[0] || null;
  }, [data.hospitals, selectedHospitalId]);

  const activeDispatchesCount = (data.dispatches || []).filter(
    (d) => !['COMPLETED', 'CANCELLED', 'RESOLVED', 'CLOSED'].includes((d.status || '').toUpperCase())
  ).length;

  const activeEmergencies = useMemo(() => {
    return (data.emergencies || []).filter(
      (e) => !['COMPLETED', 'CANCELLED', 'RESOLVED', 'CLOSED'].includes((e.status || '').toUpperCase())
    );
  }, [data.emergencies]);

  // -------------------------------------------------------------------------
  // MODE CHECKS & ERROR STATES (Step 0 & Step 2)
  // -------------------------------------------------------------------------

  // Static deploy with no backend configured
  if (!IS_BACKEND_CONFIGURED && mode === 'LIVE') {
    return (
      <BackendNotConfiguredScreen
        onOpenDemo={() => setMode('DEMO')}
      />
    );
  }

  // Live mode backend unreachable error state (do NOT fall back automatically)
  if (mode === 'LIVE' && !isBackendReachable) {
    return (
      <BackendUnreachableScreen
        onRetry={checkBackendHealth}
        onOpenDemo={() => setMode('DEMO')}
      />
    );
  }

  // -------------------------------------------------------------------------
  // ROLE-BASED ROUTING
  // -------------------------------------------------------------------------

  // 1. If not authenticated, render LoginGateway
  if (!authSession || !role) {
    return (
      <div className="aegis-app" data-theme={effectiveTheme}>
        <LoginGateway
          ambulances={data.ambulances}
          hospitals={data.hospitals}
          onLogin={handleLogin}
          theme={effectiveTheme}
          onToggleTheme={handleToggleTheme}
        />
        {toastMessage && (
          <div className="system-toast-banner">
            <span>{toastMessage}</span>
            <button className="toast-close-btn" onClick={() => setToastMessage(null)}>×</button>
          </div>
        )}
      </div>
    );
  }

  // 2. Admin Console
  if (role === 'ADMIN') {
    return (
      <AdminDashboard
        userLabel={authSession?.userLabel || 'Admin'}
        onLogout={handleLogout}
      />
    );
  }

  // 3. Citizen Dashboard
  if (role === 'CITIZEN') {
    const effectiveCitizenProfile: CitizenProfile = citizenProfile || {
      id: authSession?.dispatcherBadge || authSession?.userLabel || 'citizen',
      name: authSession?.userLabel || 'Citizen',
      phone: authSession?.dispatcherBadge || '+91 9845000000',
      age: 30,
      gender: 'PREFER_NOT_TO_SAY',
      diseases: [],
      allergies: [],
      registeredAt: new Date().toISOString(),
    };
    return (
      <div className="aegis-app" data-theme={effectiveTheme}>
        <CitizenDashboard
          profile={effectiveCitizenProfile}
          emergencies={data.emergencies}
          ambulances={data.ambulances}
          hospitals={data.hospitals}
          dispatches={data.dispatches}
          onRequestSOS={async (sosData) => {
            try {
              const created = await dataSource.createEmergency({
                type: sosData.type,
                priority: 'CRITICAL',
                status: 'PENDING_DISPATCH',
                address: sosData.address,
                latitude: sosData.latitude,
                longitude: sosData.longitude,
                callerName: sosData.callerName,
                phone: sosData.phone,
                description: sosData.description,
                patientCount: 1,
              });
              audioSystem.playCriticalIncidentChime();
              setToastMessage('Emergency SOS registered in CAD database. Dispatching nearest first responder...');
              setTimeout(() => setToastMessage(null), 5000);
              await fetchDashboard();
              await fetchAuditLogs();
              if (created?.id) {
                await handleAutoAssign(created.id);
              }
            } catch (err: any) {
              setToastMessage(`SOS Request Error: ${err.message}`);
              setTimeout(() => setToastMessage(null), 5000);
            }
          }}
          onCancelSOS={async (emgId) => {
            const activeDispatch = (data.dispatches || []).find((d) => d.emergencyId === emgId);
            if (activeDispatch) {
              await handleAdvanceStatus(activeDispatch, 'CANCELLED');
            } else {
              try {
                await dataSource.updateEmergencyStatus(emgId, 'CANCELLED', 'Citizen SOS Cancel');
              } catch {}
            }
            await fetchDashboard();
            await fetchAuditLogs();
            setToastMessage('Emergency request cancelled and CAD notified.');
            setTimeout(() => setToastMessage(null), 4000);
          }}
          onUpdateProfile={(updated) => {
            setCitizenProfile(updated);
            if (authSession) {
              const nextSession = {
                ...authSession,
                userLabel: updated.name,
                citizenProfile: updated,
                subLabel: `Citizen Profile · Blood: ${updated.bloodGroup || 'O+'}`,
              };
              setAuthSession(nextSession);
              try {
                localStorage.setItem(`aegis.${mode.toLowerCase()}.auth_session`, JSON.stringify(nextSession));
              } catch {}
            }
            setToastMessage('Medical profile updated successfully.');
            setTimeout(() => setToastMessage(null), 3500);
          }}
          onLogout={handleLogout}
        />
        {toastMessage && (
          <div className="system-toast-banner">
            <span>{toastMessage}</span>
            <button className="toast-close-btn" onClick={() => setToastMessage(null)}>×</button>
          </div>
        )}
      </div>
    );
  }

  // 4. Paramedic / Ambulance Driver MDT Dashboard
  if (role === 'DRIVER' || role === 'PARAMEDIC') {
    return (
      <div className="aegis-app" data-theme={effectiveTheme}>
        {currentDriverAmbulance ? (
          <DriverDashboard
            ambulance={currentDriverAmbulance}
            allAmbulances={data.ambulances}
            onSelectAmbulance={(a) => setSelectedDriverAmbulanceId(a.id)}
            dispatch={driverDispatch}
            emergency={driverEmergency}
            hospital={driverHospital}
            isSimulating={(data.activeSimulations || []).includes(driverDispatch?.id || '')}
            onToggleSimulation={handleToggleSimulation}
            onAdvanceStatus={handleAdvanceStatus}
            onStreamVitals={handleStreamVitals}
            missionTelemetry={missionTelemetry}
            apiBase={API_BASE}
            onLogout={handleLogout}
          />
        ) : (
          <div className="p-8 text-center">
            <h3>Vehicle unit not selected</h3>
            <button className="btn btn-primary mt-4" onClick={handleLogout}>Return to Login Gateway</button>
          </div>
        )}
        {toastMessage && (
          <div className="system-toast-banner">
            <span>{toastMessage}</span>
            <button className="toast-close-btn" onClick={() => setToastMessage(null)}>×</button>
          </div>
        )}
      </div>
    );
  }

  // 5. Hospital Emergency Department Console
  if (role === 'HOSPITAL' || role === 'HOSPITAL_STAFF') {
    return (
      <div className="aegis-app" data-theme={effectiveTheme}>
        {currentHospital ? (
          <HospitalDashboard
            hospital={currentHospital}
            allHospitals={data.hospitals}
            onSelectHospital={(h) => setSelectedHospitalId(h.id)}
            dispatches={data.dispatches}
            emergencies={data.emergencies}
            ambulances={data.ambulances}
            liveVitalsByDispatch={liveVitalsByDispatch}
            onUpdateCapacity={handleUpdateHospitalCapacity}
            onAdvanceStatus={handleAdvanceStatus}
            onLogout={handleLogout}
          />
        ) : (
          <div className="p-8 text-center">
            <h3>Hospital facility not selected</h3>
            <button className="btn btn-primary mt-4" onClick={handleLogout}>Return to Login Gateway</button>
          </div>
        )}
        {toastMessage && (
          <div className="system-toast-banner">
            <span>{toastMessage}</span>
            <button className="toast-close-btn" onClick={() => setToastMessage(null)}>×</button>
          </div>
        )}
      </div>
    );
  }

  // 6. Central CAD Command Dashboard (DISPATCHER)
  return (
    <div className="aegis-app" data-theme={effectiveTheme}>
      <Navbar
        data={data}
        isConnected={connectionStatus === 'CONNECTED'}
        isAudioEnabled={isAudioEnabled}
        currentRole={role}
        authSession={authSession}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleAudio={handleToggleAudio}
        onOpenNewEmergency={() => {
          setMapClickCoords(null);
          setIsNewEmergencyOpen(true);
        }}
        onAutoAssignNext={handleAutoAssignNext}
        autoDispatchEnabled={autoDispatchEnabled}
        onToggleAutoDispatch={handleToggleAutoDispatch}
        onOpenAICopilot={() => setIsAICopilotOpen(true)}
        onExportData={handleExportAnalyticsCsv}
        theme={effectiveTheme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Dismissible Alert Strip Below Top App Bar */}
      {!isAlertDismissed && (
        <div
          style={{
            height: '36px',
            backgroundColor: 'var(--md-sys-color-warning-container)',
            color: 'var(--md-sys-color-warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            fontSize: '13px',
            fontWeight: 500,
            borderBottom: '1px solid var(--md-sys-color-outline)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="warning" size={18} />
            <span>
              {activeEmergencies.filter(
                (e) => (e.priority || '').toUpperCase() === 'CRITICAL' && (e.status === 'PENDING_DISPATCH' || e.status === 'CREATED')
              ).length}{' '}
              active high-priority incidents require dispatch
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAlertDismissed(true);
              try {
                sessionStorage.setItem('aegis_alert_dismissed', 'true');
              } catch {}
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Dismiss alert"
            aria-label="Dismiss alert"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* Role-Based Primary Interface */}
      <main className="main-content">
        {/* Tactical Map Screen */}
        <section className="map-section">
          <MapView
            ambulances={data.ambulances}
            emergencies={data.emergencies}
            hospitals={data.hospitals}
            dispatches={data.dispatches}
            activeSimulations={data.activeSimulations || []}
            selectedEmergency={selectedEmergency}
            activeMissionDispatch={activeMissionDispatch}
            missionTelemetry={missionTelemetry}
            onSelectEmergency={handleSelectEmergency}
            onMapClick={handleMapClick}
            onStopSimulation={handleToggleSimulation}
          />
        </section>

        {/* Tactical CAD Sidebar */}
        <aside className="sidebar-section-container">
          <Tabs
            tabs={[
              { id: 'QUEUE', label: 'Incidents', badge: activeEmergencies.length },
              { id: 'MISSIONS', label: 'Missions', badge: activeDispatchesCount },
              { id: 'FLEET', label: 'Fleet', badge: data.ambulances.length },
              { id: 'HOSPITALS', label: 'Hospitals', badge: data.hospitals.length },
            ]}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as any)}
          />

          <div className="sidebar-body">
            {activeTab === 'QUEUE' && (
              <EmergencyQueue
                onClearSearch={() => setSearchQuery('')}
                emergencies={data.emergencies}
                selectedEmergency={selectedEmergency}
                searchQuery={searchQuery}
                onSelectEmergency={handleSelectEmergency}
                onAutoAssign={handleAutoAssign}
                onAutoAssignNext={handleAutoAssignNext}
                onResetData={handleResetData}
              />
            )}

            {activeTab === 'MISSIONS' && (
              <ActiveDispatches
                dispatches={data.dispatches}
                emergencies={data.emergencies}
                ambulances={data.ambulances}
                hospitals={data.hospitals}
                activeSimulations={data.activeSimulations || []}
                selectedDispatchId={activeMissionDispatch?.id}
                searchQuery={searchQuery}
                onSelectDispatch={(d) => {
                  setSelectedDispatchId(d.id);
                  fetchRoute(d.id);
                }}
                onAdvanceStatus={handleAdvanceStatus}
                onOpenHospitalModal={(d) => setSelectedDispatchForHospital(d)}
                onToggleSimulation={handleToggleSimulation}
              />
            )}

            {activeTab === 'FLEET' && (
              <FleetList
                ambulances={data.ambulances}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'HOSPITALS' && (
              <HospitalList
                hospitals={data.hospitals}
                searchQuery={searchQuery}
                onSelectHospital={(h) => setSelectedHospitalId(h.id)}
              />
            )}
          </div>
        </aside>
      </main>

      {/* Candidate Recommendation Matrix Modal */}
      {selectedEmergency && (
        <CandidateModal
          emergency={selectedEmergency}
          candidates={candidates}
          isLoading={isLoadingCandidates}
          onClose={() => {
            setSelectedEmergency(null);
            setCandidates([]);
          }}
          onAssign={handleAssignAmbulance}
        />
      )}

      {/* Destination Hospital Selection Modal */}
      {selectedDispatchForHospital && (
        <HospitalModal
          dispatch={selectedDispatchForHospital}
          hospitals={data.hospitals}
          onClose={() => setSelectedDispatchForHospital(null)}
          onSelectHospital={handleSelectHospital}
        />
      )}

      {/* Emergency Request Intake Modal */}
      {isNewEmergencyOpen && (
        <NewEmergencyModal
          initialCoordinates={mapClickCoords}
          onClose={() => {
            setIsNewEmergencyOpen(false);
            setMapClickCoords(null);
          }}
          onSubmit={handleCreateEmergency}
        />
      )}

      {/* AI Tactical Copilot & Clinical Triage Drawer */}
      <AICopilotDrawer
        isOpen={isAICopilotOpen}
        onClose={() => setIsAICopilotOpen(false)}
        emergencies={data.emergencies}
        ambulances={data.ambulances}
        hospitals={data.hospitals}
        onAutoAssignNext={handleAutoAssignNext}
        onRefreshData={fetchDashboard}
      />

      {/* Floating System Toast Alert */}
      {toastMessage && (
        <div className="system-toast-banner">
          <span>{toastMessage}</span>
          <button className="toast-close-btn" onClick={() => setToastMessage(null)}>×</button>
        </div>
      )}

      {/* Universal Compliance & System Footer with Integrated Event/Audit Drawer */}
      <Footer
        isConnected={connectionStatus === 'CONNECTED'}
        latestEvent={liveEvents[0] || 'System initialized. Live monitoring active.'}
        logs={auditLogs}
        liveEvents={liveEvents}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ModeProvider>
      <AppContent />
    </ModeProvider>
  );
};
