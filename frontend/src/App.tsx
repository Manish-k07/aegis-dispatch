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
import { Footer } from './components/Footer';
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

export const App: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    emergencies: [],
    ambulances: [],
    hospitals: [],
    dispatches: [],
    activeSimulations: [],
  });

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'MISSIONS' | 'FLEET'>('QUEUE');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard`);
      if (res.ok) {
        const json = await res.json();
        setData((prev) => ({
          ...json,
          activeSimulations: json.activeSimulations || prev.activeSimulations || [],
        }));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/audit`);
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
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
      }
    } catch (err) {
      console.error('Failed to fetch route for dispatch', err);
    }
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
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (isDestroyed) return;
        setIsConnected(true);
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
        setIsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        if (isDestroyed) return;
        setIsConnected(false);
      };
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

  const handleSelectEmergency = async (emergency: Emergency) => {
    setSelectedEmergency(emergency);
    setIsLoadingCandidates(true);
    try {
      const res = await fetch(`${API_BASE}/emergencies/${emergency.id}/candidates`);
      if (res.ok) {
        const list = await res.json();
        setCandidates(list);
      }
    } catch (err) {
      console.error('Failed to fetch candidates', err);
    } finally {
      setIsLoadingCandidates(false);
    }
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
      }
    } catch (err) {
      console.error('Failed to assign ambulance', err);
    }
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
      }
    } catch (err) {
      console.error('Failed to auto-assign', err);
    }
  };

  const handleAutoAssignNext = async () => {
    const pending = data.emergencies.find(
      (e) => e.status === 'PENDING_DISPATCH' || e.status === 'CREATED'
    );
    if (pending) {
      await handleAutoAssign(pending.id);
    }
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
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleSelectHospital = async (hospital: Hospital) => {
    if (!selectedDispatchForHospital) return;
    try {
      const res = await fetch(`${API_BASE}/dispatches/${selectedDispatchForHospital.id}/hospital`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId: hospital.id, dispatcher: 'EMS Dispatcher' }),
      });

      if (res.ok) {
        fetchRoute(selectedDispatchForHospital.id);
        setSelectedDispatchForHospital(null);
        fetchDashboard();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Failed to assign hospital', err);
    }
  };

  const handleToggleSimulation = async (dispatchId: string) => {
    const isSimulating = (data.activeSimulations || []).includes(dispatchId);
    setSelectedDispatchId(dispatchId);
    try {
      const endpoint = isSimulating ? 'stop' : 'start';
      await fetch(`${API_BASE}/simulation/${endpoint}/${dispatchId}`, {
        method: 'POST',
      });
      fetchDashboard();
      if (!isSimulating) {
        fetchRoute(dispatchId);
        audioSystem.playDispatchAlert();
      }
    } catch (err) {
      console.error('Failed to toggle simulation', err);
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
      }
    } catch (err) {
      console.error('Failed to create emergency', err);
    }
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
    } catch (err) {
      console.error('Failed to reset', err);
    }
  };

  const handleStreamVitals = async (dispatchId: string, vitals: PatientVitals) => {
    setLiveVitalsByDispatch((prev) => ({ ...prev, [dispatchId]: vitals }));
    try {
      await fetch(`${API_BASE}/dispatches/${dispatchId}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vitals),
      });
    } catch (err) {
      console.error('Failed to broadcast vitals', err);
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
    } catch (err) {
      console.error('Failed to update hospital capacity', err);
    }
  };

  const activeDispatchesCount = data.dispatches.filter(
    (d) => !['COMPLETED', 'CANCELLED'].includes(d.status)
  ).length;

  return (
    <div className="aegis-app">
      <Navbar
        data={data}
        isConnected={isConnected}
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
      />

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
                <FleetList ambulances={data.ambulances} searchQuery={searchQuery} />
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

      {/* System Audit Drawer */}
      <AuditLogDrawer logs={auditLogs} liveEvents={liveEvents} />
    </div>
  );
};
