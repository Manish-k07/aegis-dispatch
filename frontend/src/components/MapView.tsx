import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Layers,
  Maximize2,
  Shield,
  Eye,
  MapPin,
  Building2,
  Navigation,
  Crosshair,
  Activity,
  Zap,
  Video,
  Flame,
  AlertTriangle,
  X,
  Check
} from 'lucide-react';
import { Ambulance, Emergency, Hospital, Dispatch } from '../types';
import { getAmbulanceIcon, getEmergencyIcon, getHospitalIcon } from '../utils/mapIcons';
import { MissionHUD } from './MissionHUD';

export type MapTileLayer = 'DARK' | 'OSM' | 'STREETS' | 'SATELLITE';

const trafficCorridors: { name: string; level: 'HEAVY' | 'MODERATE' | 'CLEAR'; color: string; coords: [number, number][] }[] = [
  {
    name: 'MG Road Corridor',
    level: 'HEAVY',
    color: '#ef4444',
    coords: [
      [12.9756, 77.6066],
      [12.9740, 77.6010],
      [12.9730, 77.5950],
      [12.9719, 77.5900],
    ],
  },
  {
    name: 'Richmond Road to Hosur Road',
    level: 'MODERATE',
    color: '#f59e0b',
    coords: [
      [12.9710, 77.6050],
      [12.9680, 77.6020],
      [12.9640, 77.5990],
    ],
  },
  {
    name: 'Koramangala 80ft Road Corridor',
    level: 'CLEAR',
    color: '#10b981',
    coords: [
      [12.9340, 77.6180],
      [12.9380, 77.6220],
      [12.9450, 77.6280],
    ],
  },
  {
    name: 'Cubbon Park Transit Loop',
    level: 'CLEAR',
    color: '#10b981',
    coords: [
      [12.9760, 77.5900],
      [12.9800, 77.5880],
      [12.9850, 77.5850],
    ],
  },
];

const preemptionPoints: { id: string; name: string; coords: [number, number] }[] = [
  { id: 'SIG-1', name: 'Brigade Rd Junction (PREEMPTED GREEN)', coords: [12.9738, 77.6074] },
  { id: 'SIG-2', name: 'Richmond Circle Signal (PREEMPTED GREEN)', coords: [12.9655, 77.6015] },
];

const trafficSignalIcon = L.divIcon({
  className: 'traffic-signal-marker',
  html: `<div class="traffic-signal-dot"><span class="signal-inner-glow"></span></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Architecture Stubs: Live CCTV Intersection Cameras
const cctvCameras = [
  { id: 'CAM-01', name: 'Brigade Road / MG Road Junction', coords: [12.9738, 77.6074] as [number, number], fps: 30, trafficStatus: 'CONGESTED', incidentNearby: true },
  { id: 'CAM-02', name: 'Richmond Circle Interchange', coords: [12.9655, 77.6015] as [number, number], fps: 30, trafficStatus: 'MODERATE', incidentNearby: false },
  { id: 'CAM-03', name: 'Koramangala 80ft Road Flyover', coords: [12.9380, 77.6220] as [number, number], fps: 28, trafficStatus: 'CLEAR', incidentNearby: false },
  { id: 'CAM-04', name: 'Cubbon Park North Gate', coords: [12.9800, 77.5880] as [number, number], fps: 30, trafficStatus: 'CLEAR', incidentNearby: false },
];

const cctvCameraIcon = L.divIcon({
  className: 'cctv-camera-marker',
  html: `<div style="background:#0f172a;border:2px solid #a855f7;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(168,85,247,0.7);cursor:pointer;"><span style="color:#c084fc;font-size:12px;">📹</span></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// Architecture Stubs: Predictive Fleet Staging Risk Hotspots
const predictiveRiskHotspots = [
  { id: 'PRED-01', name: 'Commercial Surge Zone', coords: [12.9735, 77.5968] as [number, number], radius: 600, riskScore: 0.94, suggestedStaging: 'Unit KA-01-AE-1001' },
  { id: 'PRED-02', name: 'Evening Arterial Trauma Cluster', coords: [12.9655, 77.6015] as [number, number], radius: 480, riskScore: 0.78, suggestedStaging: 'Unit KA-01-AE-1002' },
  { id: 'PRED-03', name: 'Central Sector High-Acuity Hub', coords: [12.9812, 77.5877] as [number, number], radius: 520, riskScore: 0.85, suggestedStaging: 'Unit KA-01-AE-1003' },
];

interface MapViewProps {
  ambulances: Ambulance[];
  emergencies: Emergency[];
  hospitals: Hospital[];
  dispatches: Dispatch[];
  activeSimulations: string[];
  selectedEmergency: Emergency | null;
  activeMissionDispatch?: Dispatch | null;
  missionTelemetry?: {
    maneuver?: string;
    etaRemaining?: number;
    roadWaypoints?: [number, number][];
  };
  onSelectEmergency: (e: Emergency) => void;
  onMapClick?: (lat: number, lon: number) => void;
  onStopSimulation?: (dispatchId: string) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function FitBoundsController({
  trigger,
  ambulances,
  emergencies,
}: {
  trigger: number;
  ambulances: Ambulance[];
  emergencies: Emergency[];
}) {
  const map = useMap();

  useEffect(() => {
    if (trigger === 0) return;
    const points: [number, number][] = [];
    ambulances.forEach((a) => points.push([a.latitude, a.longitude]));
    emergencies
      .filter((e) => !['COMPLETED', 'CANCELLED'].includes(e.status))
      .forEach((e) => points.push([e.latitude, e.longitude]));

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 1.2 });
    }
  }, [trigger, map, ambulances, emergencies]);

  return null;
}

function MapResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [map]);
  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  ambulances,
  emergencies,
  hospitals,
  dispatches,
  activeSimulations,
  selectedEmergency,
  activeMissionDispatch,
  missionTelemetry,
  onSelectEmergency,
  onMapClick,
  onStopSimulation,
}) => {
  const [mapLayer, setMapLayer] = useState<MapTileLayer>('DARK');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0);

  // Tactical Entity Visibility Filters
  const [showFleet, setShowFleet] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showCctv, setShowCctv] = useState(false);
  const [trafficSeverity, setTrafficSeverity] = useState<'CRITICAL' | 'MODERATE' | 'CLEAR'>('CRITICAL');
  const [selectedCctvCamera, setSelectedCctvCamera] = useState<any>(null);

  const defaultCenter: [number, number] = [12.9716, 77.5946];

  const activeEmergencies = emergencies.filter(
    (e) => !['COMPLETED', 'CANCELLED'].includes(e.status)
  );

  const activeDispatches = dispatches.filter(
    (d) => !['COMPLETED', 'CANCELLED'].includes(d.status)
  );

  // Authenticated or Watermark-Free Map Layer Resolution
  const mapApiKey = ((import.meta as any).env?.VITE_MAP_API_KEY as string) || '';
  let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  let attribution = '&copy; OpenStreetMap contributors (Watermark-Free)';

  if (mapLayer === 'DARK') {
    if (mapApiKey) {
      tileUrl = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${mapApiKey}`;
      attribution = '&copy; CARTO &copy; OpenStreetMap (Authenticated)';
    } else {
      // Safe, zero-watermark dark tiles via Carto rastertiles or OpenStreetMap inverted
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png';
      attribution = '&copy; CARTO &copy; OpenStreetMap';
    }
  } else if (mapLayer === 'OSM') {
    tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    attribution = '&copy; OpenStreetMap contributors (100% Free • No API Key Required)';
  } else if (mapLayer === 'STREETS') {
    tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    attribution = '&copy; OpenStreetMap contributors';
  } else if (mapLayer === 'SATELLITE') {
    tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    attribution = '&copy; Esri World Imagery';
  }

  // Active mission ambulance and target for HUD
  const activeAmbulance = activeMissionDispatch
    ? ambulances.find((a) => a.id === activeMissionDispatch.ambulanceId)
    : null;
  const activeEm = activeMissionDispatch
    ? emergencies.find((e) => e.id === activeMissionDispatch.emergencyId)
    : undefined;
  const activeHosp = activeMissionDispatch?.hospitalId
    ? hospitals.find((h) => h.id === activeMissionDispatch.hospitalId)
    : undefined;

  return (
    <div className="map-wrapper">
      {/* Tactical Map Floating Command Toolbar */}
      <div className="map-command-toolbar">
        {/* Fit Bounds / Recenter Fleet */}
        <button
          className="map-tool-btn"
          onClick={() => setFitTrigger((prev) => prev + 1)}
          title="Fit bounds around all active vehicles and emergency scenes"
        >
          <Crosshair size={14} className="text-sky" />
          <span>Fit Extents</span>
        </button>

        {/* Entity Filters with Enhanced Touch Target Padding */}
        <div className="entity-filters">
          <button
            className={`filter-pill ${showIncidents ? 'active-red' : ''}`}
            onClick={() => setShowIncidents(!showIncidents)}
            title="Toggle Emergency Incident Markers"
          >
            <MapPin size={12} />
            <span>Incidents ({activeEmergencies.length})</span>
          </button>

          <button
            className={`filter-pill ${showFleet ? 'active-emerald' : ''}`}
            onClick={() => setShowFleet(!showFleet)}
            title="Toggle Fleet Ambulance Markers"
          >
            <Shield size={12} />
            <span>Fleet ({ambulances.length})</span>
          </button>

          <button
            className={`filter-pill ${showHospitals ? 'active-sky' : ''}`}
            onClick={() => setShowHospitals(!showHospitals)}
            title="Toggle Regional Hospital Markers"
          >
            <Building2 size={12} />
            <span>Hospitals ({hospitals.length})</span>
          </button>

          <button
            className={`filter-pill ${showTraffic ? 'active-amber' : ''}`}
            onClick={() => setShowTraffic(!showTraffic)}
            title="Toggle Real-Time Traffic Arterial Overlays"
          >
            <Activity size={12} />
            <span>Traffic</span>
          </button>

          <button
            className={`filter-pill ${showHeatmap ? 'active-rose' : ''}`}
            onClick={() => setShowHeatmap(!showHeatmap)}
            title="Toggle AI Predictive Fleet Staging Risk Clusters"
          >
            <Flame size={12} />
            <span>Heatmap ({predictiveRiskHotspots.length})</span>
          </button>

          <button
            className={`filter-pill ${showCctv ? 'active-purple' : ''}`}
            onClick={() => setShowCctv(!showCctv)}
            title="Toggle Live City CCTV Junction Camera Markers"
          >
            <Video size={12} />
            <span>CCTV ({cctvCameras.length})</span>
          </button>
        </div>

        {/* Map Layer Switcher */}
        <div className="map-layer-dropdown-container">
          <button
            className="map-tool-btn layer-btn"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="Switch Map Basemap Style"
          >
            <Layers size={14} />
            <span>{mapLayer}</span>
          </button>

          {showLayerMenu && (
            <div className="layer-dropdown">
              <button
                className={`layer-option ${mapLayer === 'DARK' ? 'active' : ''}`}
                onClick={() => { setMapLayer('DARK'); setShowLayerMenu(false); }}
              >
                <strong>Dark CAD Ops {mapApiKey ? '✓ Auth' : ''}</strong>
                <small>High contrast emergency operations</small>
              </button>
              <button
                className={`layer-option ${mapLayer === 'OSM' ? 'active' : ''}`}
                onClick={() => { setMapLayer('OSM'); setShowLayerMenu(false); }}
              >
                <strong>OpenStreetMap Clean</strong>
                <small>100% Free · No API Key Required</small>
              </button>
              <button
                className={`layer-option ${mapLayer === 'STREETS' ? 'active' : ''}`}
                onClick={() => { setMapLayer('STREETS'); setShowLayerMenu(false); }}
              >
                <strong>Street Navigation</strong>
                <small>Detailed street labels and road grid</small>
              </button>
              <button
                className={`layer-option ${mapLayer === 'SATELLITE' ? 'active' : ''}`}
                onClick={() => { setMapLayer('SATELLITE'); setShowLayerMenu(false); }}
              >
                <strong>Satellite Imagery</strong>
                <small>Photorealistic aerial photography</small>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Reticle Watermark */}
      <div className="map-hud-watermark">
        <span>SECTOR 4 · BENGALURU METRO · 12.9716°N 77.5946°E · LIVE CAD TELEMETRY</span>
      </div>

      {/* Map Click Help Banner */}
      <div className="map-click-hint">
        <MapPin size={11} className="text-amber" />
        <span>Click anywhere on map to intake incident at coordinates</span>
      </div>

      {/* Real-Time Dynamic Traffic Alert HUD Banner */}
      {showTraffic && (
        <div className={`traffic-reroute-banner ${trafficSeverity === 'CRITICAL' ? 'severe' : trafficSeverity === 'MODERATE' ? 'moderate' : 'clear'}`}>
          <div className="flex items-center gap-2">
            {trafficSeverity === 'CRITICAL' && <span className="live-dot-red-pulse"></span>}
            {trafficSeverity === 'MODERATE' && <span className="live-dot-amber"></span>}
            {trafficSeverity === 'CLEAR' && <span className="live-dot-green"></span>}

            <strong style={{ letterSpacing: '0.03em' }}>
              {trafficSeverity === 'CRITICAL' && 'CRITICAL ARTERIAL BLOCKAGE:'}
              {trafficSeverity === 'MODERATE' && 'DYNAMIC ARTERIAL REROUTING:'}
              {trafficSeverity === 'CLEAR' && 'TRAFFIC CORRIDORS NOMINAL:'}
            </strong>

            <span>
              {trafficSeverity === 'CRITICAL' && 'Severe gridlock on MG Road Corridor (+8.5m). Automated Green-Wave Preemption Active.'}
              {trafficSeverity === 'MODERATE' && 'Moderate congestion on Richmond Road (+2.4m). Routing via secondary arterial bypass.'}
              {trafficSeverity === 'CLEAR' && 'Traffic flowing smoothly across all city sectors. Preemption in standby.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="traffic-toggle-cycle-btn"
              onClick={() => {
                setTrafficSeverity((prev) =>
                  prev === 'CRITICAL' ? 'MODERATE' : prev === 'MODERATE' ? 'CLEAR' : 'CRITICAL'
                );
              }}
              title="Click to simulate and test city-wide traffic severity alerts"
            >
              <Activity size={10} />
              <span>Simulate: {trafficSeverity}</span>
            </button>

            <div className="weather-hud-pill">
              <span>27°C MONSOON · ROAD: WET (0.85x SPEED)</span>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={
          selectedEmergency
            ? [selectedEmergency.latitude, selectedEmergency.longitude]
            : defaultCenter
        }
        zoom={13}
        scrollWheelZoom={true}
        className={`leaflet-container ${mapLayer === 'DARK' && !mapApiKey ? 'tactical-dark-tiles' : ''}`}
      >
        <TileLayer attribution={attribution} url={tileUrl} maxZoom={19} />

        <MapClickHandler onMapClick={onMapClick} />
        <FitBoundsController
          trigger={fitTrigger}
          ambulances={ambulances}
          emergencies={emergencies}
        />
        <MapResizeWatcher />

        {/* Real-time Traffic Corridors Overlay */}
        {showTraffic && trafficCorridors.map((corridor, idx) => (
          <Polyline
            key={`traffic-${idx}`}
            positions={corridor.coords}
            pathOptions={{
              color: corridor.color,
              weight: 6,
              opacity: 0.75,
              dashArray: corridor.level === 'HEAVY' ? '4, 8' : undefined,
            }}
          >
            <Tooltip sticky>
              <strong>{corridor.name}</strong>: {corridor.level} CONGESTION
            </Tooltip>
          </Polyline>
        ))}

        {/* Smart Traffic Signal Preemption Markers */}
        {preemptionPoints.map((sig) => (
          <Marker
            key={sig.id}
            position={sig.coords}
            icon={trafficSignalIcon}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <div className="text-xs font-bold text-emerald">
                {sig.name}
              </div>
            </Tooltip>
          </Marker>
        ))}

        {/* Predictive Staging Hotspot Circles (Future Architecture Stub) */}
        {showHeatmap && predictiveRiskHotspots.map((spot) => (
          <Circle
            key={spot.id}
            center={spot.coords}
            radius={spot.radius}
            pathOptions={{
              color: '#f43f5e',
              fillColor: '#f43f5e',
              fillOpacity: 0.22,
              weight: 2,
              dashArray: '4, 6',
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <div style={{ fontSize: '11px', color: '#fff', background: '#090d16', padding: '4px 8px', borderRadius: '4px' }}>
                <strong style={{ color: '#fb7185' }}>PREDICTIVE STAGING: {spot.name}</strong><br />
                Risk Index: <strong>{(spot.riskScore * 100).toFixed(0)}%</strong><br />
                Recommended Pre-Position: <strong>{spot.suggestedStaging}</strong>
              </div>
            </Tooltip>
          </Circle>
        ))}

        {/* Live CCTV Junction Camera Markers (Future Architecture Stub) */}
        {showCctv && cctvCameras.map((cam) => (
          <Marker
            key={cam.id}
            position={cam.coords}
            icon={cctvCameraIcon}
            eventHandlers={{
              click: () => setSelectedCctvCamera(cam),
            }}
          >
            <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#c084fc' }}>
                📹 {cam.id}: {cam.name} (Click to View Live Feed)
              </div>
            </Tooltip>
          </Marker>
        ))}

        {/* High-Contrast Dual-Layer Neon Road Routing Polylines */}
        {showRoutes && activeDispatches.map((dispatch) => {
          const amb = ambulances.find((a) => a.id === dispatch.ambulanceId);
          const em = emergencies.find((e) => e.id === dispatch.emergencyId);
          const hosp = dispatch.hospitalId
            ? hospitals.find((h) => h.id === dispatch.hospitalId)
            : null;

          if (!amb || !em) return null;

          const isSim = activeSimulations.includes(dispatch.id);
          const isTransportingToHospital = ['EN_ROUTE_TO_HOSPITAL', 'ARRIVED_AT_HOSPITAL'].includes(dispatch.status);

          // Use real road geometry coordinates if telemetry has them, else direct
          let points: [number, number][] = [];
          if (missionTelemetry?.roadWaypoints && missionTelemetry.roadWaypoints.length > 0 && activeMissionDispatch?.id === dispatch.id) {
            points = missionTelemetry.roadWaypoints;
          } else {
            points = [
              [amb.latitude, amb.longitude],
              [em.latitude, em.longitude],
            ];
            if (hosp && isTransportingToHospital) {
              points.push([hosp.latitude, hosp.longitude]);
            }
          }

          const coreColor = isTransportingToHospital ? '#facc15' : isSim ? '#00f5ff' : '#38bdf8';
          const glowColor = isTransportingToHospital ? '#f59e0b' : '#00f5ff';

          return (
            <React.Fragment key={`route-group-${dispatch.id}`}>
              {/* Outer Translucent Glowing Neon Halo */}
              <Polyline
                positions={points}
                pathOptions={{
                  color: glowColor,
                  weight: 12,
                  opacity: 0.30,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Inner High-Contrast Core Neon Trajectory */}
              <Polyline
                positions={points}
                pathOptions={{
                  color: coreColor,
                  weight: 6,
                  opacity: 0.98,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: isSim ? '8, 12' : undefined,
                }}
              >
                <Tooltip sticky>
                  <strong>Priority Emergency Route</strong>: {amb.registrationNumber} → {em.type} ({dispatch.status})
                </Tooltip>
              </Polyline>
            </React.Fragment>
          );
        })}

        {/* Hospitals */}
        {showHospitals && hospitals.map((h) => (
          <Marker
            key={`hosp-${h.id}`}
            position={[h.latitude, h.longitude]}
            icon={getHospitalIcon(h)}
          >
            <Popup className="custom-popup">
              <div className="popup-card">
                <div className="popup-badge bg-sky">HOSPITAL FACILITY</div>
                <h3>{h.name}</h3>
                <p className="popup-address">{h.address}</p>
                <div className="popup-chips">
                  {h.emergencyDepartment && <span className="chip">24/7 ED</span>}
                  {h.icuAvailable && <span className="chip">ICU</span>}
                  {h.cardiacServices && <span className="chip">CARDIAC</span>}
                  {h.pediatricServices && <span className="chip">PEDIATRIC</span>}
                </div>
                <div className="popup-meta">
                  Status: <strong>{h.status}</strong>
                  <br />
                  Emergency Line: {h.phone}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Emergencies */}
        {showIncidents && activeEmergencies.map((em) => (
          <Marker
            key={`em-${em.id}`}
            position={[em.latitude, em.longitude]}
            icon={getEmergencyIcon(em)}
            eventHandlers={{
              click: () => onSelectEmergency(em),
            }}
          >
            <Popup className="custom-popup">
              <div className="popup-card">
                <div className={`popup-badge ${em.priority === 'CRITICAL' ? 'bg-red' : 'bg-amber'}`}>
                  {em.priority} EMERGENCY
                </div>
                <h3>{em.type}</h3>
                <p className="popup-address">{em.address}</p>
                <div className="popup-meta">
                  Caller: <strong>{em.callerName}</strong> ({em.phone})
                  <br />
                  Patients: <strong>{em.patientCount}</strong> | Status: <strong>{em.status}</strong>
                </div>
                {em.description && <p className="popup-desc">{em.description}</p>}
                {em.status === 'PENDING_DISPATCH' && (
                  <button
                    className="btn btn-sm btn-primary mt-2 w-full"
                    onClick={() => onSelectEmergency(em)}
                  >
                    Select for Dispatch
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Ambulances */}
        {showFleet && ambulances.map((amb) => {
          const isSim = activeSimulations.some((simId) => {
            const d = dispatches.find((disp) => disp.id === simId);
            return d?.ambulanceId === amb.id;
          });

          return (
            <Marker
              key={`amb-${amb.id}`}
              position={[amb.latitude, amb.longitude]}
              icon={getAmbulanceIcon(amb, isSim)}
            >
              <Popup className="custom-popup">
                <div className="popup-card">
                  <div className="popup-badge bg-emerald">AMBULANCE {amb.type}</div>
                  <h3>{amb.registrationNumber}</h3>
                  <div className="popup-meta">
                    Status: <strong className="text-emerald">{amb.status.replace(/_/g, ' ')}</strong>
                    <br />
                    Driver: <strong>{amb.driverName || 'N/A'}</strong> | EMT: <strong>{amb.emtName || 'N/A'}</strong>
                    <br />
                    Speed: <strong>{amb.speed} km/h</strong> | Heading: <strong>{amb.heading}°</strong>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Real-time Turn-by-Turn Mission HUD Overlay */}
      {activeMissionDispatch && activeAmbulance && (
        <MissionHUD
          dispatch={activeMissionDispatch}
          ambulance={activeAmbulance}
          emergency={activeEm}
          hospital={activeHosp}
          maneuver={missionTelemetry?.maneuver}
          etaRemaining={missionTelemetry?.etaRemaining}
          isSimulating={activeSimulations.includes(activeMissionDispatch.id)}
          onStopSimulation={() => onStopSimulation && onStopSimulation(activeMissionDispatch.id)}
        />
      )}

      {/* Live CCTV Video Feed Modal (Architecture Stub) */}
      {selectedCctvCamera && (
        <div className="cctv-modal-overlay" onClick={() => setSelectedCctvCamera(null)}>
          <div className="cctv-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={16} style={{ color: '#c084fc' }} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                  TRAFFIC CCTV FEED · {selectedCctvCamera.id}
                </span>
                <span style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  LIVE 30 FPS
                </span>
              </div>
              <button
                onClick={() => setSelectedCctvCamera(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="cctv-video-sim">
              <div className="cctv-scanline"></div>
              {/* Simulated camera HUD overlay */}
              <div style={{ position: 'absolute', top: 12, left: 16, color: '#38bdf8', fontFamily: 'monospace', fontSize: '11px', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                CAMERA: {selectedCctvCamera.name.toUpperCase()}<br />
                LAT/LON: {selectedCctvCamera.coords[0].toFixed(4)}°N, {selectedCctvCamera.coords[1].toFixed(4)}°E<br />
                ENCRYPTION: AES-256 (MUNICIPAL HIGHWAY AUTHORITY)
              </div>
              <div style={{ position: 'absolute', bottom: 12, right: 16, color: '#34d399', fontFamily: 'monospace', fontSize: '11px', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                STATUS: {selectedCctvCamera.trafficStatus} · PREEMPTION: ARMED
              </div>
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', zIndex: 2 }}>
                <Video size={48} style={{ margin: '0 auto 12px', opacity: 0.6, color: '#c084fc' }} />
                <p style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc' }}>{selectedCctvCamera.name}</p>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Real-time Optical Flow Telemetry Active · Scene Safety Clearance: NOMINAL</p>
              </div>
            </div>

            <div style={{ padding: '12px 18px', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
              <span>Optical Density: 24 vehicles/min · Preemption Green Corridor: STANDBY</span>
              <button
                className="traffic-toggle-cycle-btn"
                onClick={() => setSelectedCctvCamera(null)}
              >
                Close Camera HUD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
