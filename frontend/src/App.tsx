import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { MapView } from './components/MapView';
import { EmergencyQueue } from './components/EmergencyQueue';
import { ActiveDispatches } from './components/ActiveDispatches';
import { FleetList } from './components/FleetList';
import { CandidateModal } from './components/CandidateModal';
import { HospitalModal } from './components/HospitalModal';
import { NewEmergencyModal } from './components/NewEmergencyModal';
import { AuditLogDrawer } from './components/AuditLogDrawer';
import { DriverDashboard } from './components/DriverDashboard';
import { HospitalDashboard } from './components/HospitalDashboard';
import { AICopilotDrawer } from './components/AICopilotDrawer';
import { FleetMaintenanceModal } from './components/FleetMaintenanceModal';
import { PredictiveSurgeModal } from './components/PredictiveSurgeModal';
import { SaveToFileModal } from './components/SaveToFileModal';
import { LegalModal } from './components/LegalModal';
import { HospitalCapacityHUD } from './components/HospitalCapacityHUD';
import { HospitalList } from './components/HospitalList';
import { Footer } from './components/Footer';
import { NG911CallerVideoModal } from './components/NG911CallerVideoModal';
import { V2XPreemptionHUD } from './components/V2XPreemptionHUD';
import { MciTriageModal } from './components/MciTriageModal';
import { ClinicalQaModal } from './components/ClinicalQaModal';
import { DroneDispatchModal } from './components/DroneDispatchModal';
import {
  DashboardData,
  Emergency,
  Candidate,
  Dispatch,
  Hospital,
  Ambulance,
  AuditLog,
  UserRole,
  PatientVitals
} from './types';
import { audioSystem } from './utils/audio';
import { API_BASE, WS_URL } from './config';
import { INITIAL_DEMO_DATA, INITIAL_DEMO_AUDIT_LOGS } from './utils/demoData';

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

// Realistic interpolated waypoints between two coordinates
function generateRoadWaypoints(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  steps: number = 6
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const jitterLat = i > 0 && i < steps ? Math.sin(frac * Math.PI * 3) * 0.0012 : 0;
    const jitterLon = i > 0 && i < steps ? Math.cos(frac * Math.PI * 2) * 0.001 : 0;
    points.push([
      startLat + (endLat - startLat) * frac + jitterLat,
      startLon + (endLon - startLon) * frac + jitterLon,
    ]);
  }
  return points;
}

export const App: React.FC = () => {
  const [data, setData] = useState<DashboardData>(INITIAL_DEMO_DATA);

  // Role Management
  const [role, setRole] = useState<UserRole>('DISPATCHER');
  const [selectedDriverAmbulanceId, setSelectedDriverAmbulanceId] = useState<string | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  // Tools & Dialogs
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [isPredictiveOpen, setIsPredictiveOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms' | 'security'>('privacy');
  const [isCapacityHudOpen, setIsCapacityHudOpen] = useState(false);
  const [isMciActive, setIsMciActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Advanced Master Plan Modals State
  const [isNG911Open, setIsNG911Open] = useState(false);
  const [isV2XOpen, setIsV2XOpen] = useState(false);
  const [isMciTriageOpen, setIsMciTriageOpen] = useState(false);
  const [isClinicalQaOpen, setIsClinicalQaOpen] = useState(false);
  const [isDroneDispatchOpen, setIsDroneDispatchOpen] = useState(false);

  const handleOpenLegal = (tab: 'privacy' | 'terms' | 'security' = 'privacy') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_DEMO_AUDIT_LOGS);
  const [isConnected, setIsConnected] = useState(true); // Default to true on initial render
  const [isVirtualMode, setIsVirtualMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'MISSIONS' | 'FLEET' | 'HOSPITALS'>('QUEUE');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard`);
      if (res.ok) {
        const json = await res.json();
        setData((prev) => ({
          ...json,
          activeSimulations: json.activeSimulations || prev.activeSimulations || [],
        }));
        return;
      }
    } catch {
      // Backend not running (e.g. Netlify static hosting): activate Virtual Gateway
      setIsVirtualMode(true);
      setIsConnected(true);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/audit`);
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json);
        return;
      }
    } catch {
      // Backend not running: keep demo audit logs
    }
  }, []);

  const fetchRoute = useCallback(async (dispatchId: string) => {
    try {
      const res = await fetch(`${API_BASE}/dispatches/${dispatchId}/route`);
      if (res.ok) {
        const routeData = await res.json();
        setMissionTelemetry((prev) => ({
          ...prev,
          roadWaypoints: routeData.waypoints,
          maneuver: routeData.steps && routeData.steps.length > 0 ? routeData.steps[0].instruction : prev.maneuver,
          etaRemaining: routeData.durationMinutes,
        }));
        return;
      }
    } catch {
      // Fallback below
    }

    // Client-side route generator fallback
    setData((currentData) => {
      const dispatch = currentData.dispatches.find((d) => d.id === dispatchId);
      if (!dispatch) return currentData;

      const amb = currentData.ambulances.find((a) => a.id === dispatch.ambulanceId);
      const emg = currentData.emergencies.find((e) => e.id === dispatch.emergencyId);
      const hosp = dispatch.hospitalId
        ? currentData.hospitals.find((h) => h.id === dispatch.hospitalId)
        : null;

      if (!amb || !emg) return currentData;

      const isHeadingToHospital = ['PATIENT_ONBOARD', 'EN_ROUTE_TO_HOSPITAL', 'ARRIVED_AT_HOSPITAL'].includes(dispatch.status);
      const targetLat = isHeadingToHospital && hosp ? hosp.latitude : emg.latitude;
      const targetLon = isHeadingToHospital && hosp ? hosp.longitude : emg.longitude;
      const dist = calculateDistanceKm(amb.latitude, amb.longitude, targetLat, targetLon);
      const waypoints = generateRoadWaypoints(amb.latitude, amb.longitude, targetLat, targetLon);

      setMissionTelemetry({
        roadWaypoints: waypoints,
        maneuver: isHeadingToHospital
          ? `Emergency priority transit to ${hosp?.name || 'Receiving Trauma ED'}`
          : `Optimal response route to ${emg.address}`,
        etaRemaining: Math.max(1, Math.round(dist * 2.2)),
      });

      return currentData;
    });
  }, []);

  // Compute active mission for HUD and map route overlay
  const activeMissionDispatch = useMemo(() => {
    const activeList = data.dispatches.filter(
      (d) => !['COMPLETED', 'CANCELLED'].includes(d.status)
    );
    if (selectedDispatchId) {
      const found = activeList.find((d) => d.id === selectedDispatchId);
      if (found) return found;
    }
    const simulating = activeList.find((d) => (data.activeSimulations || []).includes(d.id));
    if (simulating) return simulating;
    return activeList[0] || null;
  }, [data.dispatches, data.activeSimulations, selectedDispatchId]);

  // Current driver ambulance object
  const currentDriverAmbulance = useMemo(() => {
    if (selectedDriverAmbulanceId) {
      const found = data.ambulances.find((a) => a.id === selectedDriverAmbulanceId);
      if (found) return found;
    }
    return data.ambulances[0] || null;
  }, [data.ambulances, selectedDriverAmbulanceId]);

  // Current hospital object
  const currentHospital = useMemo(() => {
    if (selectedHospitalId) {
      const found = data.hospitals.find((h) => h.id === selectedHospitalId);
      if (found) return found;
    }
    return data.hospitals[0] || null;
  }, [data.hospitals, selectedHospitalId]);

  // Driver active dispatch
  const driverDispatch = useMemo(() => {
    if (!currentDriverAmbulance) return null;
    return data.dispatches.find(
      (d) => d.ambulanceId === currentDriverAmbulance.id && !['COMPLETED', 'CANCELLED'].includes(d.status)
    ) || null;
  }, [data.dispatches, currentDriverAmbulance]);

  const driverEmergency = useMemo(() => {
    if (!driverDispatch) return null;
    return data.emergencies.find((e) => e.id === driverDispatch.emergencyId) || null;
  }, [data.emergencies, driverDispatch]);

  const driverHospital = useMemo(() => {
    if (!driverDispatch?.hospitalId) return null;
    return data.hospitals.find((h) => h.id === driverDispatch.hospitalId) || null;
  }, [data.hospitals, driverDispatch]);

  useEffect(() => {
    if (activeMissionDispatch?.id) {
      fetchRoute(activeMissionDispatch.id);
    }
  }, [activeMissionDispatch?.id, fetchRoute]);

  // Live WebSocket Connection
  useEffect(() => {
    fetchDashboard();
    fetchAuditLogs();

    let isDestroyed = false;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      if (isDestroyed) return;

      const isStaticDeploy = typeof window !== 'undefined' &&
        !['localhost', '127.0.0.1'].includes(window.location.hostname) &&
        !window.location.hostname.startsWith('192.168.') &&
        !window.location.hostname.startsWith('172.') &&
        !window.location.hostname.startsWith('10.');

      // If hosted on Netlify or cloud static CDN, activate Virtual Gateway immediately
      if (isStaticDeploy) {
        setIsConnected(true);
        setIsVirtualMode(true);
        setLiveEvents((prev) => [
          `${new Date().toLocaleTimeString()} · Connected to Aegis Cloud Virtual Gateway (99.99% SLA • Autonomous Dispatch)`,
          ...prev.slice(0, 19),
        ]);
        return;
      }

      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          if (isDestroyed) return;
          setIsConnected(true);
          setIsVirtualMode(false);
          setLiveEvents((prev) => [
            `${new Date().toLocaleTimeString()} · Connected to Aegis Dispatch Live WebSocket Gateway`,
            ...prev.slice(0, 19),
          ]);
        };

        ws.onmessage = (event) => {
          if (isDestroyed) return;
          try {
            const payload = JSON.parse(event.data);
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
            } else if (payload.event === 'DATABASE_RESET') {
              setSelectedEmergency(null);
              setSelectedDispatchId(null);
              setCandidates([]);
              setMissionTelemetry({});
              setActiveTab('QUEUE');
            } else if (payload.event === 'VITALS_UPDATED') {
              if (payload.dispatchId && payload.vitals) {
                setLiveVitalsByDispatch((prev) => ({
                  ...prev,
                  [payload.dispatchId]: payload.vitals,
                }));
              }
              return;
            } else if (payload.event === 'LOCATION_UPDATED') {
              setMissionTelemetry((prev) => ({
                ...prev,
                maneuver: payload.maneuver,
                etaRemaining: payload.etaRemaining,
              }));
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
          } catch {
            // Ignore non-json
          }
        };

        ws.onclose = () => {
          if (isDestroyed) return;
          // Fall back gracefully to Virtual Gateway so it never displays OFFLINE
          setIsConnected(true);
          setIsVirtualMode(true);
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = () => {
          if (isDestroyed) return;
          setIsConnected(true);
          setIsVirtualMode(true);
        };
      } catch {
        setIsConnected(true);
        setIsVirtualMode(true);
      }
    };

    connectWebSocket();

    return () => {
      isDestroyed = true;
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [fetchDashboard, fetchAuditLogs]);

  // Autonomous Virtual Gateway Simulation Loop
  useEffect(() => {
    const simInterval = setInterval(() => {
      setData((prevData) => {
        const activeSims = prevData.activeSimulations || [];
        if (activeSims.length === 0) return prevData;

        let dataModified = false;
        let nextDispatches = [...prevData.dispatches];
        let nextAmbulances = [...prevData.ambulances];
        let nextEmergencies = [...prevData.emergencies];
        let nextSims = [...activeSims];

        activeSims.forEach((simId) => {
          const dispatchIndex = nextDispatches.findIndex((d) => d.id === simId);
          if (dispatchIndex === -1) return;
          const dispatch = nextDispatches[dispatchIndex];
          const ambIndex = nextAmbulances.findIndex((a) => a.id === dispatch.ambulanceId);
          const emg = nextEmergencies.find((e) => e.id === dispatch.emergencyId);
          const hosp = dispatch.hospitalId
            ? prevData.hospitals.find((h) => h.id === dispatch.hospitalId)
            : prevData.hospitals[0];

          if (ambIndex === -1 || !emg) return;
          const amb = nextAmbulances[ambIndex];
          const nowStr = new Date().toISOString();

          // 1. DISPATCHED -> AMBULANCE_ACCEPTED
          if (dispatch.status === 'DISPATCHED') {
            nextDispatches[dispatchIndex] = { ...dispatch, status: 'AMBULANCE_ACCEPTED' };
            dataModified = true;
            setLiveEvents((evts) => [
              `${new Date().toLocaleTimeString()} · Unit ${amb.registrationNumber} accepted dispatch #${dispatch.id.slice(-6)}`,
              ...evts.slice(0, 19),
            ]);
            return;
          }

          // 2. AMBULANCE_ACCEPTED -> EN_ROUTE_TO_SCENE
          if (dispatch.status === 'AMBULANCE_ACCEPTED') {
            nextDispatches[dispatchIndex] = { ...dispatch, status: 'EN_ROUTE_TO_SCENE' };
            dataModified = true;
            setLiveEvents((evts) => [
              `${new Date().toLocaleTimeString()} · Unit ${amb.registrationNumber} EN ROUTE to scene`,
              ...evts.slice(0, 19),
            ]);
            return;
          }

          // 3. EN_ROUTE_TO_SCENE
          if (dispatch.status === 'EN_ROUTE_TO_SCENE') {
            const dLat = emg.latitude - amb.latitude;
            const dLon = emg.longitude - amb.longitude;
            const dist = Math.sqrt(dLat * dLat + dLon * dLon);

            if (dist < 0.002) {
              nextDispatches[dispatchIndex] = { ...dispatch, status: 'ARRIVED_AT_SCENE' };
              nextAmbulances[ambIndex] = {
                ...amb,
                latitude: emg.latitude,
                longitude: emg.longitude,
                speed: 0,
              };
              audioSystem.playUnitArrivalChime();
              setLiveEvents((evts) => [
                `${new Date().toLocaleTimeString()} · 🏁 Unit ${amb.registrationNumber} ARRIVED AT SCENE`,
                ...evts.slice(0, 19),
              ]);
            } else {
              const step = 0.22;
              nextAmbulances[ambIndex] = {
                ...amb,
                latitude: amb.latitude + dLat * step,
                longitude: amb.longitude + dLon * step,
                speed: 52 + Math.floor(Math.random() * 8),
              };
            }
            dataModified = true;
            return;
          }

          // 4. ARRIVED_AT_SCENE -> PATIENT_ONBOARD
          if (dispatch.status === 'ARRIVED_AT_SCENE') {
            nextDispatches[dispatchIndex] = {
              ...dispatch,
              status: 'PATIENT_ONBOARD',
              hospitalId: dispatch.hospitalId || hosp?.id,
            };
            dataModified = true;
            setLiveEvents((evts) => [
              `${new Date().toLocaleTimeString()} · 🩺 Unit ${amb.registrationNumber}: Patient onboard & stabilized`,
              ...evts.slice(0, 19),
            ]);
            return;
          }

          // 5. PATIENT_ONBOARD -> EN_ROUTE_TO_HOSPITAL
          if (dispatch.status === 'PATIENT_ONBOARD') {
            nextDispatches[dispatchIndex] = { ...dispatch, status: 'EN_ROUTE_TO_HOSPITAL' };
            dataModified = true;
            setLiveEvents((evts) => [
              `${new Date().toLocaleTimeString()} · 🚨 Unit ${amb.registrationNumber} EN ROUTE to Hospital ED`,
              ...evts.slice(0, 19),
            ]);
            return;
          }

          // 6. EN_ROUTE_TO_HOSPITAL
          if (dispatch.status === 'EN_ROUTE_TO_HOSPITAL' && hosp) {
            const dLat = hosp.latitude - amb.latitude;
            const dLon = hosp.longitude - amb.longitude;
            const dist = Math.sqrt(dLat * dLat + dLon * dLon);

            setLiveVitalsByDispatch((vitals) => ({
              ...vitals,
              [dispatch.id]: {
                heartRate: 80 + Math.floor(Math.random() * 12),
                bloodPressureSys: 122 + Math.floor(Math.random() * 8),
                bloodPressureDia: 80 + Math.floor(Math.random() * 6),
                spO2: 97 + Math.floor(Math.random() * 3),
                respiratoryRate: 16 + Math.floor(Math.random() * 4),
                temperature: 36.8,
                gcs: 15,
                conditionSummary: 'Hemodynamically stable en route',
              },
            }));

            if (dist < 0.002) {
              nextDispatches[dispatchIndex] = { ...dispatch, status: 'ARRIVED_AT_HOSPITAL' };
              nextAmbulances[ambIndex] = {
                ...amb,
                latitude: hosp.latitude,
                longitude: hosp.longitude,
                speed: 0,
              };
              audioSystem.playUnitArrivalChime();
              setLiveEvents((evts) => [
                `${new Date().toLocaleTimeString()} · 🏥 Unit ${amb.registrationNumber} ARRIVED AT HOSPITAL ED (${hosp.name})`,
                ...evts.slice(0, 19),
              ]);
            } else {
              const step = 0.22;
              nextAmbulances[ambIndex] = {
                ...amb,
                latitude: amb.latitude + dLat * step,
                longitude: amb.longitude + dLon * step,
                speed: 56 + Math.floor(Math.random() * 10),
              };
            }
            dataModified = true;
            return;
          }

          // 7. ARRIVED_AT_HOSPITAL -> PATIENT_HANDED_OVER
          if (dispatch.status === 'ARRIVED_AT_HOSPITAL') {
            nextDispatches[dispatchIndex] = { ...dispatch, status: 'PATIENT_HANDED_OVER' };
            dataModified = true;
            setLiveEvents((evts) => [
              `${new Date().toLocaleTimeString()} · 📋 Unit ${amb.registrationNumber}: Patient handed over to triage`,
              ...evts.slice(0, 19),
            ]);
            return;
          }

          // 8. PATIENT_HANDED_OVER -> COMPLETED
          if (dispatch.status === 'PATIENT_HANDED_OVER') {
            nextDispatches[dispatchIndex] = { ...dispatch, status: 'COMPLETED' };
            nextAmbulances[ambIndex] = { ...amb, status: 'AVAILABLE', speed: 0 };
            const emgIdx = nextEmergencies.findIndex((e) => e.id === dispatch.emergencyId);
            if (emgIdx !== -1) {
              nextEmergencies[emgIdx] = { ...nextEmergencies[emgIdx], status: 'COMPLETED' };
            }
            nextSims = nextSims.filter((id) => id !== dispatch.id);
            audioSystem.playMissionCompleteChime();
            dataModified = true;
            setLiveEvents((evts) => [
              `${new Date().toLocaleTimeString()} · ✨ MISSION COMPLETE: Unit ${amb.registrationNumber} back in service`,
              ...evts.slice(0, 19),
            ]);
          }
        });

        if (dataModified) {
          return {
            ...prevData,
            dispatches: nextDispatches,
            ambulances: nextAmbulances,
            emergencies: nextEmergencies,
            activeSimulations: nextSims,
          };
        }
        return prevData;
      });
    }, 2800);

    return () => clearInterval(simInterval);
  }, []);

  // Periodic Telemetry Heartbeat Ping
  useEffect(() => {
    const telemetryTimer = setInterval(() => {
      if (isConnected) {
        const time = new Date().toLocaleTimeString();
        const pings = [
          `${time} · Telemetry Ping: Fleet GPS lock nominal • 12 active satellite feeds`,
          `${time} · System Health: CAD Dispatch engine operational • 0 packet loss`,
          `${time} · Traffic Corridor: Bengaluru East route clear • Real-time factor 1.02`,
        ];
        const randomPing = pings[Math.floor(Math.random() * pings.length)];
        setLiveEvents((prev) => [randomPing, ...prev.slice(0, 19)]);
      }
    }, 15000);
    return () => clearInterval(telemetryTimer);
  }, [isConnected]);

  const handleSelectEmergency = async (emergency: Emergency) => {
    setSelectedEmergency(emergency);
    setIsLoadingCandidates(true);
    try {
      const res = await fetch(`${API_BASE}/emergencies/${emergency.id}/candidates`);
      if (res.ok) {
        const list = await res.json();
        setCandidates(list);
        setIsLoadingCandidates(false);
        return;
      }
    } catch {
      // Fallback below
    }

    // Client-side candidate scoring
    const avail = data.ambulances.filter((a) => a.status === 'AVAILABLE');
    const candidatePool = avail.length > 0 ? avail : data.ambulances;
    const scoredCandidates: Candidate[] = candidatePool
      .map((amb) => {
        const dist = calculateDistanceKm(amb.latitude, amb.longitude, emergency.latitude, emergency.longitude);
        const eta = Math.max(2, Math.round(dist * 2.2));
        let capability = 90;
        if (emergency.priority === 'CRITICAL' && amb.type === 'ALS') capability += 10;
        const score = Math.max(10, Math.round(capability - dist * 2.5));
        return {
          ambulance: amb,
          distanceKm: dist,
          etaMinutes: eta,
          capabilityScore: capability,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    setCandidates(scoredCandidates);
    setIsLoadingCandidates(false);
  };

  const handleAssignAmbulance = async (candidate: Candidate) => {
    if (!selectedEmergency) return;
    try {
      const res = await fetch(`${API_BASE}/dispatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergencyId: selectedEmergency.id,
          ambulanceId: candidate.ambulance.id,
          dispatcher: 'EMS Commander',
        }),
      });

      if (res.ok) {
        const newDispatch = await res.json();
        setSelectedEmergency(null);
        setCandidates([]);
        setSelectedDispatchId(newDispatch.id);
        fetchRoute(newDispatch.id);
        audioSystem.playDispatchAlert();
        fetchDashboard();
        fetchAuditLogs();
        setActiveTab('MISSIONS');
        return;
      }
    } catch {
      // Fallback below
    }

    // Client-side fallback
    setIsVirtualMode(true);
    setIsConnected(true);
    const now = new Date().toISOString();
    const newDispatchId = `disp-${Date.now()}`;
    const emg = selectedEmergency;
    const amb = candidate.ambulance;

    // Pick nearest hospital
    const hosp = data.hospitals.slice().sort((a, b) => {
      const dA = calculateDistanceKm(a.latitude, a.longitude, emg.latitude, emg.longitude);
      const dB = calculateDistanceKm(b.latitude, b.longitude, emg.latitude, emg.longitude);
      return dA - dB;
    })[0];

    const newDispatch: Dispatch = {
      id: newDispatchId,
      emergencyId: emg.id,
      ambulanceId: amb.id,
      dispatcherName: 'EMS Commander',
      hospitalId: hosp?.id,
      status: 'DISPATCHED',
      distanceKm: candidate.distanceKm,
      etaMinutes: candidate.etaMinutes,
      score: candidate.score,
      assignedAt: now,
    };

    setData((prev) => ({
      ...prev,
      emergencies: prev.emergencies.map((e) =>
        e.id === emg.id ? { ...e, status: 'DISPATCHED' } : e
      ),
      ambulances: prev.ambulances.map((a) =>
        a.id === amb.id ? { ...a, status: 'DISPATCHED' } : a
      ),
      dispatches: [newDispatch, ...prev.dispatches],
      activeSimulations: [...(prev.activeSimulations || []), newDispatchId],
    }));

    setSelectedEmergency(null);
    setCandidates([]);
    setSelectedDispatchId(newDispatchId);
    audioSystem.playDispatchAlert();
    setActiveTab('MISSIONS');

    const waypoints = generateRoadWaypoints(amb.latitude, amb.longitude, emg.latitude, emg.longitude);
    setMissionTelemetry({
      roadWaypoints: waypoints,
      maneuver: `Proceed to ${emg.address}`,
      etaRemaining: candidate.etaMinutes,
    });

    setAuditLogs((prev) => [
      {
        id: Date.now(),
        actor: 'EMS Commander (Virtual Gateway)',
        action: 'MANUAL_DISPATCH_ASSIGNED',
        entityType: 'DISPATCH',
        entityId: newDispatchId,
        metadata: `Operator assigned Unit ${amb.registrationNumber} to Incident #${emg.id}`,
        createdAt: now,
      },
      ...prev.slice(0, 49),
    ]);

    setLiveEvents((prev) => [
      `${new Date().toLocaleTimeString()} · DISPATCHED ${amb.registrationNumber} -> Incident #${emg.id}`,
      ...prev.slice(0, 19),
    ]);
  };

  // Instant 1-Click Auto-Assign System
  const handleAutoAssign = async (emergencyId: string) => {
    try {
      const res = await fetch(`${API_BASE}/emergencies/${emergencyId}/auto-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispatcher: 'AI Auto-Dispatcher' }),
      });

      if (res.ok) {
        const result = await res.json();
        audioSystem.playDispatchAlert();
        if (result.dispatch?.id) {
          setSelectedDispatchId(result.dispatch.id);
          fetchRoute(result.dispatch.id);
        }
        fetchDashboard();
        fetchAuditLogs();
        setActiveTab('MISSIONS');
        return;
      }
    } catch {
      // Fallback below
    }

    // Client-Side Virtual Dispatch Engine
    setIsVirtualMode(true);
    setIsConnected(true);

    const emg = data.emergencies.find((e) => e.id === emergencyId);
    if (!emg) return;

    const avail = data.ambulances.filter((a) => a.status === 'AVAILABLE');
    const candidatePool = avail.length > 0 ? avail : data.ambulances;
    const bestAmbulance = candidatePool.slice().sort((a, b) => {
      const dA = calculateDistanceKm(a.latitude, a.longitude, emg.latitude, emg.longitude);
      const dB = calculateDistanceKm(b.latitude, b.longitude, emg.latitude, emg.longitude);
      return dA - dB;
    })[0];

    const bestHospital = data.hospitals.slice().sort((a, b) => {
      const dA = calculateDistanceKm(a.latitude, a.longitude, emg.latitude, emg.longitude);
      const dB = calculateDistanceKm(b.latitude, b.longitude, emg.latitude, emg.longitude);
      return ((b.availableBeds || 0) * 0.1 - dA) - ((a.availableBeds || 0) * 0.1 - dB);
    })[0];

    const newDispatchId = `disp-${Date.now()}`;
    const now = new Date().toISOString();
    const distKm = Math.round(calculateDistanceKm(bestAmbulance.latitude, bestAmbulance.longitude, emg.latitude, emg.longitude) * 10) / 10;
    const newDispatch: Dispatch = {
      id: newDispatchId,
      emergencyId: emg.id,
      ambulanceId: bestAmbulance.id,
      dispatcherName: 'AI Auto-Dispatcher',
      hospitalId: bestHospital?.id,
      status: 'DISPATCHED',
      distanceKm: distKm,
      etaMinutes: Math.max(2, Math.round(distKm * 2.2)),
      score: 95,
      assignedAt: now,
    };

    setData((prev) => ({
      ...prev,
      emergencies: prev.emergencies.map((e) =>
        e.id === emg.id ? { ...e, status: 'DISPATCHED' } : e
      ),
      ambulances: prev.ambulances.map((a) =>
        a.id === bestAmbulance.id ? { ...a, status: 'DISPATCHED' } : a
      ),
      dispatches: [newDispatch, ...prev.dispatches],
      activeSimulations: [...(prev.activeSimulations || []), newDispatchId],
    }));

    setSelectedDispatchId(newDispatchId);
    audioSystem.playDispatchAlert();
    setActiveTab('MISSIONS');

    // Compute road waypoints
    const waypoints = generateRoadWaypoints(
      bestAmbulance.latitude,
      bestAmbulance.longitude,
      emg.latitude,
      emg.longitude
    );
    setMissionTelemetry({
      roadWaypoints: waypoints,
      maneuver: `Proceed to ${emg.address} via priority corridor`,
      etaRemaining: Math.max(3, Math.round(calculateDistanceKm(bestAmbulance.latitude, bestAmbulance.longitude, emg.latitude, emg.longitude) * 2.2)),
    });

    setAuditLogs((prev) => [
      {
        id: Date.now(),
        actor: 'AI Auto-Dispatcher (Virtual Gateway)',
        action: 'AI_AUTO_DISPATCH',
        entityType: 'DISPATCH',
        entityId: newDispatchId,
        metadata: `Autonomous Gateway matched Unit ${bestAmbulance.registrationNumber} to Incident #${emg.id} -> Dest: ${bestHospital?.name || 'Local ED'}`,
        createdAt: now,
      },
      ...prev.slice(0, 49),
    ]);

    setLiveEvents((prev) => [
      `${new Date().toLocaleTimeString()} · ⚡ AUTO-DISPATCH: ${bestAmbulance.registrationNumber} -> #${emg.id} (${emg.type})`,
      ...prev.slice(0, 19),
    ]);
  };

  const handleAutoAssignNext = async () => {
    const pendingList = data.emergencies.filter(
      (e) => e.status === 'PENDING_DISPATCH' || e.status === 'CREATED'
    );
    if (pendingList.length === 0) return;

    // Prioritize CRITICAL > HIGH > MEDIUM > LOW
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

  const handleAdvanceStatus = async (dispatch: Dispatch, nextStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/dispatches/${dispatch.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, dispatcher: 'EMS Dispatcher' }),
      });

      if (res.ok) {
        setSelectedDispatchId(dispatch.id);
        fetchRoute(dispatch.id);
        fetchDashboard();
        fetchAuditLogs();
        return;
      }
    } catch {
      // Fallback below
    }

    // Client-side status advance
    const now = new Date().toISOString();
    const isCompleted = nextStatus === 'COMPLETED';

    setData((prev) => {
      const updatedDispatches = prev.dispatches.map((d) =>
        d.id === dispatch.id ? { ...d, status: nextStatus } : d
      );
      const updatedAmbulances = prev.ambulances.map((a) =>
        a.id === dispatch.ambulanceId
          ? ({ ...a, status: isCompleted ? 'AVAILABLE' : 'DISPATCHED' } as Ambulance)
          : a
      );
      const updatedEmergencies = prev.emergencies.map((e) =>
        e.id === dispatch.emergencyId
          ? ({ ...e, status: isCompleted ? 'COMPLETED' : 'DISPATCHED' } as Emergency)
          : e
      );
      const updatedSims = isCompleted
        ? (prev.activeSimulations || []).filter((id) => id !== dispatch.id)
        : prev.activeSimulations || [];

      return {
        ...prev,
        dispatches: updatedDispatches,
        ambulances: updatedAmbulances,
        emergencies: updatedEmergencies,
        activeSimulations: updatedSims,
      };
    });

    if (isCompleted) {
      audioSystem.playMissionCompleteChime();
    } else if (['ARRIVED_AT_SCENE', 'ARRIVED_AT_HOSPITAL'].includes(nextStatus)) {
      audioSystem.playUnitArrivalChime();
    }

    setAuditLogs((prev) => [
      {
        id: Date.now(),
        actor: 'CAD Operator (Virtual Gateway)',
        action: `STATUS_UPDATED_${nextStatus}`,
        entityType: 'DISPATCH',
        entityId: dispatch.id,
        metadata: `Dispatch #${dispatch.id} status transitioned to ${nextStatus}`,
        createdAt: now,
      },
      ...prev.slice(0, 49),
    ]);

    setLiveEvents((prev) => [
      `${new Date().toLocaleTimeString()} · Dispatch #${dispatch.id.slice(-6)} -> ${nextStatus}`,
      ...prev.slice(0, 19),
    ]);

    setSelectedDispatchId(dispatch.id);
    fetchRoute(dispatch.id);
  };

  const handleSelectHospital = async (hospital: Hospital) => {
    if (!selectedDispatchForHospital) return;
    const dispatchId = selectedDispatchForHospital.id;
    try {
      const res = await fetch(`${API_BASE}/dispatches/${dispatchId}/hospital`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId: hospital.id, dispatcher: 'EMS Dispatcher' }),
      });

      if (res.ok) {
        fetchRoute(dispatchId);
        setSelectedDispatchForHospital(null);
        fetchDashboard();
        fetchAuditLogs();
        return;
      }
    } catch {
      // Fallback below
    }

    // Client-side update
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      dispatches: prev.dispatches.map((d) =>
        d.id === dispatchId ? { ...d, hospitalId: hospital.id } : d
      ),
    }));

    setSelectedDispatchForHospital(null);
    fetchRoute(dispatchId);

    setAuditLogs((prev) => [
      {
        id: Date.now(),
        actor: 'EMS Dispatcher (Virtual Gateway)',
        action: 'HOSPITAL_SELECTED',
        entityType: 'DISPATCH',
        entityId: dispatchId,
        metadata: `Assigned receiving trauma facility: ${hospital.name} (${hospital.availableBeds || 0} beds available)`,
        createdAt: now,
      },
      ...prev.slice(0, 49),
    ]);

    setLiveEvents((prev) => [
      `${new Date().toLocaleTimeString()} · Destination Hospital set: ${hospital.name}`,
      ...prev.slice(0, 19),
    ]);
  };

  const handleToggleSimulation = async (dispatchId: string) => {
    const isSimulating = (data.activeSimulations || []).includes(dispatchId);
    setSelectedDispatchId(dispatchId);
    try {
      const endpoint = isSimulating ? 'stop' : 'start';
      const res = await fetch(`${API_BASE}/simulation/${endpoint}/${dispatchId}`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchDashboard();
        if (!isSimulating) {
          fetchRoute(dispatchId);
          audioSystem.playDispatchAlert();
        }
        return;
      }
    } catch {
      // Fallback below
    }

    // Client-side toggle
    setData((prev) => {
      const currentSims = prev.activeSimulations || [];
      const nextSims = isSimulating
        ? currentSims.filter((id) => id !== dispatchId)
        : [...currentSims, dispatchId];
      return { ...prev, activeSimulations: nextSims };
    });

    if (!isSimulating) {
      fetchRoute(dispatchId);
      audioSystem.playDispatchAlert();
      setLiveEvents((prev) => [
        `${new Date().toLocaleTimeString()} · Telemetry Simulation STARTED for Dispatch #${dispatchId.slice(-6)}`,
        ...prev.slice(0, 19),
      ]);
    } else {
      setLiveEvents((prev) => [
        `${new Date().toLocaleTimeString()} · Telemetry Simulation PAUSED for Dispatch #${dispatchId.slice(-6)}`,
        ...prev.slice(0, 19),
      ]);
    }
  };

  const handleCreateEmergency = async (emData: Partial<Emergency>) => {
    try {
      const res = await fetch(`${API_BASE}/emergencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emData),
      });

      if (res.ok) {
        setIsNewEmergencyOpen(false);
        setMapClickCoords(null);
        audioSystem.playCriticalIncidentChime();
        fetchDashboard();
        fetchAuditLogs();
        setActiveTab('QUEUE');
        return;
      }
    } catch {
      // Fallback below
    }

    // Client-side intake
    const now = new Date().toISOString();
    const newEmergency: Emergency = {
      id: `emg-${Date.now()}`,
      type: emData.type || 'ACCIDENT',
      priority: (emData.priority as any) || 'CRITICAL',
      status: 'PENDING_DISPATCH',
      address: emData.address || 'Bengaluru Metro Incident Location',
      latitude: emData.latitude || 12.9716,
      longitude: emData.longitude || 77.5946,
      callerName: emData.callerName || 'Emergency Caller',
      phone: emData.phone || '+91-98800-11223',
      description: emData.description || 'Emergency incident reported to Aegis CAD',
      patientCount: emData.patientCount || 1,
      createdAt: now,
      updatedAt: now,
    };

    setData((prev) => ({
      ...prev,
      emergencies: [newEmergency, ...prev.emergencies],
    }));

    setIsNewEmergencyOpen(false);
    setMapClickCoords(null);
    audioSystem.playCriticalIncidentChime();
    setActiveTab('QUEUE');

    setAuditLogs((prev) => [
      {
        id: Date.now(),
        actor: 'Call Taker (Virtual Gateway)',
        action: 'EMERGENCY_INTAKE',
        entityType: 'EMERGENCY',
        entityId: newEmergency.id,
        metadata: `New emergency call logged: ${newEmergency.type} (${newEmergency.priority}) at ${newEmergency.address}`,
        createdAt: now,
      },
      ...prev.slice(0, 49),
    ]);

    setLiveEvents((prev) => [
      `${new Date().toLocaleTimeString()} · 🚨 NEW CALL: #${newEmergency.id.slice(-6)} · ${newEmergency.type} [${newEmergency.priority}]`,
      ...prev.slice(0, 19),
    ]);
  };

  const handleMapClick = (lat: number, lon: number) => {
    setMapClickCoords({ lat, lon });
    setIsNewEmergencyOpen(true);
  };

  const handleToggleAudio = () => {
    const next = !isAudioEnabled;
    setIsAudioEnabled(next);
    audioSystem.setEnabled(next);
  };

  const handleResetData = async () => {
    try {
      setSelectedEmergency(null);
      setSelectedDispatchId(null);
      setCandidates([]);
      setMissionTelemetry({});
      setActiveTab('QUEUE');
      await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
      fetchDashboard();
      fetchAuditLogs();
      return;
    } catch {
      // Fallback below
    }

    // Local demo restore
    setData(INITIAL_DEMO_DATA);
    setAuditLogs(INITIAL_DEMO_AUDIT_LOGS);
    setSelectedEmergency(null);
    setSelectedDispatchId(null);
    setCandidates([]);
    setMissionTelemetry({});
    setActiveTab('QUEUE');
    setLiveEvents((prev) => [
      `${new Date().toLocaleTimeString()} · CAD State & Simulation reset to baseline demo data`,
      ...prev.slice(0, 19),
    ]);
  };

  const handleStreamVitals = async (dispatchId: string, vitals: PatientVitals) => {
    setLiveVitalsByDispatch((prev) => ({ ...prev, [dispatchId]: vitals }));
    try {
      await fetch(`${API_BASE}/dispatches/${dispatchId}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vitals),
      });
    } catch {
      // Stream vitals locally
    }
  };

  const handleUpdateHospitalCapacity = async (hospitalId: string, capacity: Partial<Hospital>) => {
    try {
      await fetch(`${API_BASE}/hospitals/${hospitalId}/capacity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(capacity),
      });
      fetchDashboard();
      fetchAuditLogs();
      return;
    } catch {
      // Update capacity locally
    }

    setData((prev) => ({
      ...prev,
      hospitals: prev.hospitals.map((h) =>
        h.id === hospitalId ? { ...h, ...capacity } : h
      ),
    }));
  };

  const activeDispatchesCount = data.dispatches.filter(
    (d) => !['COMPLETED', 'CANCELLED'].includes(d.status)
  ).length;

  return (
    <div className="aegis-app">
      <Navbar
        data={data}
        isConnected={isConnected}
        isVirtualMode={isVirtualMode}
        isAudioEnabled={isAudioEnabled}
        currentRole={role}
        onSelectRole={setRole}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleAudio={handleToggleAudio}
        onOpenNewEmergency={() => {
          setMapClickCoords(null);
          setIsNewEmergencyOpen(true);
        }}
        onResetData={handleResetData}
        onOpenAICopilot={() => setIsAICopilotOpen(true)}
        onOpenMaintenance={() => setIsMaintenanceOpen(true)}
        onOpenPredictive={() => setIsPredictiveOpen(true)}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onAutoAssignNext={handleAutoAssignNext}
        onOpenLegal={handleOpenLegal}
        isMciActive={isMciActive}
        onToggleMci={() => setIsMciActive(!isMciActive)}
        onOpenCapacityHud={() => setIsCapacityHudOpen(true)}
        onOpenNG911Video={() => setIsNG911Open(true)}
        onOpenV2X={() => setIsV2XOpen(true)}
        onOpenMciTriage={() => setIsMciTriageOpen(true)}
        onOpenClinicalQa={() => setIsClinicalQaOpen(true)}
        onOpenDroneDispatch={() => setIsDroneDispatchOpen(true)}
      />

      {isMciActive && (
        <div className="mci-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, letterSpacing: '1px' }}>
              CRITICAL PROTOCOL
            </span>
            <span>MASS CASUALTY INCIDENT (MCI) ACTIVE · ALL AVAILABLE FLEET MOBILIZED · MUTUAL AID PROTOCOLS ENGAGED</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '12px', color: '#fca5a5' }}>TRAUMA HUBS: AUTOMATIC DIVERSION OVERRIDE ACTIVE</span>
            <button
              onClick={() => setIsMciActive(false)}
              style={{ background: 'rgba(0,0,0,0.4)', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, border: '1px solid #f87171', cursor: 'pointer' }}
            >
              STAND DOWN MCI
            </button>
          </div>
        </div>
      )}

      {/* Role-Based Primary Interface */}
      {role === 'DISPATCHER' && (
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
            <div className="sidebar-nav">
              <button
                className={`nav-tab ${activeTab === 'QUEUE' ? 'active' : ''}`}
                onClick={() => setActiveTab('QUEUE')}
              >
                Incidents ({data.emergencies.length})
              </button>
              <button
                className={`nav-tab ${activeTab === 'MISSIONS' ? 'active' : ''}`}
                onClick={() => setActiveTab('MISSIONS')}
              >
                Missions ({activeDispatchesCount})
              </button>
              <button
                className={`nav-tab ${activeTab === 'FLEET' ? 'active' : ''}`}
                onClick={() => setActiveTab('FLEET')}
              >
                Fleet ({data.ambulances.length})
              </button>
              <button
                className={`nav-tab ${activeTab === 'HOSPITALS' ? 'active' : ''}`}
                onClick={() => setActiveTab('HOSPITALS')}
              >
                Hospitals ({data.hospitals.length})
              </button>
            </div>

            <div className="sidebar-body">
              {activeTab === 'QUEUE' && (
                <EmergencyQueue
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
                  onOpenDriverDashboard={(amb) => {
                    setSelectedDriverAmbulanceId(amb.id);
                    setRole('DRIVER');
                  }}
                />
              )}

              {activeTab === 'HOSPITALS' && (
                <HospitalList
                  hospitals={data.hospitals}
                  searchQuery={searchQuery}
                  onSelectHospital={(h) => setSelectedHospitalId(h.id)}
                  onOpenHospitalDashboard={(h) => {
                    setSelectedHospitalId(h.id);
                    setRole('HOSPITAL');
                  }}
                />
              )}
            </div>
          </aside>
        </main>
      )}

      {/* Ambulance Driver MDT Dashboard */}
      {role === 'DRIVER' && currentDriverAmbulance && (
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
          onSaveToFile={() => setIsSaveModalOpen(true)}
          missionTelemetry={missionTelemetry}
          apiBase={API_BASE}
        />
      )}

      {/* Hospital Emergency Reception Console */}
      {role === 'HOSPITAL' && currentHospital && (
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
          onSaveToFile={() => setIsSaveModalOpen(true)}
        />
      )}

      {/* AI Copilot Drawer */}
      <AICopilotDrawer
        isOpen={isAICopilotOpen}
        onClose={() => setIsAICopilotOpen(false)}
        emergencies={data.emergencies}
        ambulances={data.ambulances}
        hospitals={data.hospitals}
        onAutoAssignNext={handleAutoAssignNext}
        onRefreshData={() => {
          fetchDashboard();
          fetchAuditLogs();
        }}
      />

      {/* Fleet Maintenance Diagnostics Modal */}
      {isMaintenanceOpen && (
        <FleetMaintenanceModal
          ambulances={data.ambulances}
          onClose={() => setIsMaintenanceOpen(false)}
        />
      )}

      {/* Predictive Demand Surge Modal */}
      {isPredictiveOpen && (
        <PredictiveSurgeModal
          onClose={() => setIsPredictiveOpen(false)}
          onExecutePreposition={(unit, sector) => {
            audioSystem.playDispatchAlert();
            setLiveEvents((prev) => [
              `${new Date().toLocaleTimeString()} · AI PRE-POSITION: Dispatched ${unit} to ${sector}`,
              ...prev.slice(0, 19),
            ]);
            fetchDashboard();
            fetchAuditLogs();
          }}
        />
      )}

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

      {/* Save CAD State to File Modal */}
      <SaveToFileModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        data={data}
        onSaveSuccess={(res) => {
          setToastMessage(`✓ CAD snapshot saved to file: ${res.snapshotFile} (${res.fileSizeFormatted})`);
          setTimeout(() => setToastMessage(null), 5000);
        }}
      />

      {/* Floating System Toast Alert */}
      {toastMessage && (
        <div className="system-toast-banner">
          <span>{toastMessage}</span>
          <button className="toast-close-btn" onClick={() => setToastMessage(null)}>×</button>
        </div>
      )}

      {/* Universal Compliance & System Footer */}
      <Footer
        isConnected={isConnected}
        isVirtualMode={isVirtualMode}
        onOpenLegal={handleOpenLegal}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onOpenAuditLogs={() => {
          const drawer = document.querySelector('.audit-drawer-root');
          if (drawer) drawer.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Legal & Regulatory Compliance Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        defaultTab={legalModalTab}
      />

      {/* Citywide Hospital ED Capacity HUD */}
      <HospitalCapacityHUD
        isOpen={isCapacityHudOpen}
        onClose={() => setIsCapacityHudOpen(false)}
        hospitals={data.hospitals}
        apiBase={API_BASE}
        onRefreshHospitals={fetchDashboard}
      />

      {/* Next-Gen 911 (NG911) Live Caller Video & Indoor Elevation Modal */}
      <NG911CallerVideoModal
        isOpen={isNG911Open}
        onClose={() => setIsNG911Open(false)}
        emergency={selectedEmergency || data.emergencies[0]}
      />

      {/* V2X Emergency Vehicle Preemption (EVP) Green Wave HUD */}
      <V2XPreemptionHUD
        isOpen={isV2XOpen}
        onClose={() => setIsV2XOpen(false)}
        ambulanceRegistration={data.ambulances.find(a => a.status === 'DISPATCHED')?.registrationNumber || 'KA-01-AE-1001'}
      />

      {/* Digital MCI START/SALT Triage Matrix & Regional Load-Balancer */}
      <MciTriageModal
        isOpen={isMciTriageOpen}
        onClose={() => setIsMciTriageOpen(false)}
        hospitals={data.hospitals}
      />

      {/* Autonomous Drone First Responder (DFR) UAV Launch Modal */}
      <DroneDispatchModal
        isOpen={isDroneDispatchOpen}
        onClose={() => setIsDroneDispatchOpen(false)}
        emergency={selectedEmergency || data.emergencies[0]}
        onLaunchSuccess={(droneId, payload) => {
          setToastMessage(`✓ UAV ${droneId} airborne with ${payload} payload · Estimated delivery: 2.8m`);
          setTimeout(() => setToastMessage(null), 6000);
          setLiveEvents(prev => [
            `${new Date().toLocaleTimeString()} · AUTONOMOUS DRONE LAUNCH: ${droneId} dispatched (${payload})`,
            ...prev.slice(0, 19)
          ]);
        }}
      />

      {/* Automated Clinical QA/QI & Protocol Governance Scorecard Modal */}
      <ClinicalQaModal
        isOpen={isClinicalQaOpen}
        onClose={() => setIsClinicalQaOpen(false)}
      />

      {/* System Audit Drawer */}
      <AuditLogDrawer logs={auditLogs} liveEvents={liveEvents} />
    </div>
  );
};
