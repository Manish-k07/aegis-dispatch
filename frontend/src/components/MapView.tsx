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
  Camera,
  Flame,
  AlertTriangle,
  CheckCircle2,
  X,
  Compass,
  CornerDownRight
} from 'lucide-react';
import { Ambulance, Emergency, Hospital, Dispatch } from '../types';
import { getAmbulanceIcon, getEmergencyIcon, getHospitalIcon } from '../utils/mapIcons';
import { MissionHUD } from './MissionHUD';
import { FilterChip, Tooltip as M3Tooltip, Icon } from './common';

export type MapTileLayer = 'OSM_CLEAN' | 'SATELLITE' | 'TERRAIN';

const trafficCorridors: { name: string; level: 'HEAVY' | 'MODERATE' | 'CLEAR'; color: string; coords: [number, number][] }[] = [
  {
    name: 'MG Road Corridor',
    level: 'HEAVY',
    color: '#f28b82',
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
    color: '#8ab4f8',
    coords: [
      [12.9710, 77.6050],
      [12.9680, 77.6020],
      [12.9640, 77.5990],
    ],
  },
  {
    name: 'Koramangala 80ft Road Corridor',
    level: 'CLEAR',
    color: '#81c995',
    coords: [
      [12.9340, 77.6180],
      [12.9380, 77.6220],
      [12.9450, 77.6280],
    ],
  },
  {
    name: 'Cubbon Park Transit Loop',
    level: 'CLEAR',
    color: '#81c995',
    coords: [
      [12.9760, 77.5900],
      [12.9800, 77.5880],
      [12.9850, 77.5850],
    ],
  },
];

const cctvJunctions = [
  { id: 'CAM-01', name: 'Brigade Road Junction', coords: [12.9738, 77.6074] as [number, number], density: 'HEAVY', fps: 30, speedAvg: '18 km/h' },
  { id: 'CAM-02', name: 'Richmond Circle Flyover', coords: [12.9655, 77.6015] as [number, number], density: 'MODERATE', fps: 28, speedAvg: '34 km/h' },
  { id: 'CAM-03', name: 'Koramangala 80ft Junction', coords: [12.9352, 77.6245] as [number, number], density: 'FLOWING', fps: 30, speedAvg: '48 km/h' },
  { id: 'CAM-04', name: 'Cubbon Park North Gate', coords: [12.9780, 77.5910] as [number, number], density: 'CLEAR', fps: 30, speedAvg: '52 km/h' },
];

const stagingHeatZones = [
  { id: 'ZONE-1', name: 'Indiranagar High Risk Hub', coords: [12.9784, 77.6408] as [number, number], riskPct: 88, recommended: 'ALS Unit Pre-position' },
  { id: 'ZONE-2', name: 'Koramangala Commercial District', coords: [12.9352, 77.6245] as [number, number], riskPct: 72, recommended: 'BLS Unit Staged' },
  { id: 'ZONE-3', name: 'MG Road Central Cluster', coords: [12.9733, 77.6170] as [number, number], riskPct: 45, recommended: 'Sector Coverage Nominal' },
];

const trafficSignalIcon = L.divIcon({
  className: 'traffic-signal-marker',
  html: `<div class="traffic-signal-dot"><span class="signal-inner-glow"></span></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const cctvIcon = L.divIcon({
  className: 'cctv-camera-marker',
  html: `<div class="cctv-cam-pin"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8ab4f8" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

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
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 350);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer1);
      clearTimeout(timer2);
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
  const [mapLayer, setMapLayer] = useState<MapTileLayer>('OSM_CLEAN');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0);

  // Tactical Entity Visibility Filters
  const [showFleet, setShowFleet] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  const [showStaging, setShowStaging] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Live CCTV Modal state
  const [activeCctv, setActiveCctv] = useState<typeof cctvJunctions[0] | null>(null);

  // Dynamic Traffic Severity State
  const [trafficSeverity, setTrafficSeverity] = useState<'CRITICAL' | 'MODERATE' | 'CLEAR'>('CRITICAL');
  const [rerouteActive, setRerouteActive] = useState(false);

  const defaultCenter: [number, number] = [12.9716, 77.5946];

  const activeEmergencies = emergencies.filter(
    (e) => !['COMPLETED', 'CANCELLED'].includes(e.status)
  );

  const activeDispatches = dispatches.filter(
    (d) => !['COMPLETED', 'CANCELLED'].includes(d.status)
  );

  // Clean Watermark-Free OpenStreetMap & Satellite Layers (No Carto or Dark/Street)
  let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  let attribution = '&copy; OpenStreetMap contributors';

  if (mapLayer === 'SATELLITE') {
    tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    attribution = '&copy; Esri World Imagery';
  } else if (mapLayer === 'TERRAIN') {
    tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
    attribution = '&copy; OpenTopoMap contributors';
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

  const handleApplyReroute = () => {
    setRerouteActive(true);
    setTrafficSeverity('CLEAR');
    setTimeout(() => {
      setRerouteActive(false);
    }, 15000);
  };

  return (
    <div className="map-wrapper">
      {/* M3 Map Layer & Entity Filter Chips (Top-Left) */}
      {/* Top-Left: M3 Filter Chips (12px inset) */}
      <div
        className="m3-map-layer-chips"
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 1000,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          maxWidth: 'calc(100% - 140px)',
        }}
      >
        <FilterChip
          label="Incidents"
          count={activeEmergencies.length}
          selected={showIncidents}
          onClick={() => setShowIncidents(!showIncidents)}
          icon="report_problem"
        />
        <FilterChip
          label="Units"
          count={ambulances.length}
          selected={showFleet}
          onClick={() => setShowFleet(!showFleet)}
          icon="ambulance"
        />
        <FilterChip
          label="Hospitals"
          count={hospitals.length}
          selected={showHospitals}
          onClick={() => setShowHospitals(!showHospitals)}
          icon="local_hospital"
        />
        <FilterChip
          label="Traffic"
          selected={showTraffic}
          onClick={() => setShowTraffic(!showTraffic)}
          icon="traffic"
        />
      </div>

      {/* Top-Right Stacked Control Group: Basemap + Fit (12px inset) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ position: 'relative' }}>
          <M3Tooltip content="Change map layer">
            <button
              type="button"
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              aria-label="Change map layer"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'var(--md-sys-color-surface)',
                border: '1px solid var(--md-sys-color-outline)',
                color: 'var(--md-sys-color-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'var(--elevation-1)',
              }}
            >
              <Icon name="layers" size={20} />
            </button>
          </M3Tooltip>

          {showLayerMenu && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                backgroundColor: 'var(--md-sys-color-surface)',
                border: '1px solid var(--md-sys-color-outline)',
                borderRadius: '8px',
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                minWidth: '180px',
                boxShadow: 'var(--elevation-2)',
                zIndex: 1001,
              }}
            >
              <button
                type="button"
                className={`m3-menu-item ${mapLayer === 'OSM_CLEAN' ? 'is-active' : ''}`}
                onClick={() => { setMapLayer('OSM_CLEAN'); setShowLayerMenu(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: 'none',
                  background: mapLayer === 'OSM_CLEAN' ? 'var(--md-sys-color-primary-container)' : 'transparent',
                  color: mapLayer === 'OSM_CLEAN' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-text)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <Icon name="map" size={18} />
                <span>OpenStreetMap</span>
              </button>
              <button
                type="button"
                className={`m3-menu-item ${mapLayer === 'SATELLITE' ? 'is-active' : ''}`}
                onClick={() => { setMapLayer('SATELLITE'); setShowLayerMenu(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: 'none',
                  background: mapLayer === 'SATELLITE' ? 'var(--md-sys-color-primary-container)' : 'transparent',
                  color: mapLayer === 'SATELLITE' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-text)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <Icon name="satellite_alt" size={18} />
                <span>Satellite imagery</span>
              </button>
              <button
                type="button"
                className={`m3-menu-item ${mapLayer === 'TERRAIN' ? 'is-active' : ''}`}
                onClick={() => { setMapLayer('TERRAIN'); setShowLayerMenu(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: 'none',
                  background: mapLayer === 'TERRAIN' ? 'var(--md-sys-color-primary-container)' : 'transparent',
                  color: mapLayer === 'TERRAIN' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-text)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <Icon name="terrain" size={18} />
                <span>Topographic terrain</span>
              </button>
            </div>
          )}
        </div>

        <M3Tooltip content="Fit map to active markers">
          <button
            type="button"
            onClick={() => setFitTrigger((prev) => prev + 1)}
            aria-label="Fit map to active markers"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-surface)',
              border: '1px solid var(--md-sys-color-outline)',
              color: 'var(--md-sys-color-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--elevation-1)',
            }}
          >
            <Icon name="crop_free" size={20} />
          </button>
        </M3Tooltip>
      </div>

      {/* Bottom-Left: Collapsible Legend Card (12px inset) */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          zIndex: 1000,
        }}
      >
        {isLegendOpen ? (
          <div
            style={{
              backgroundColor: 'var(--md-sys-color-surface)',
              border: '1px solid var(--md-sys-color-outline)',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: 'var(--elevation-2)',
              fontSize: '12px',
              color: 'var(--md-sys-color-text)',
              minWidth: '180px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Map Legend</span>
              <button
                type="button"
                onClick={() => setIsLegendOpen(false)}
                aria-label="Collapse map legend"
                className="btn-collapse"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: 'var(--md-sys-color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Icon name="expand_more" size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--md-sys-color-error)' }} />
                <span>Critical incident</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--md-sys-color-warning)' }} />
                <span>High priority incident</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--md-sys-color-success)' }} />
                <span>Available unit</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--md-sys-color-primary)' }} />
                <span>Active dispatch</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', border: '1px solid var(--md-sys-color-primary)' }} />
                <span>Hospital facility</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsLegendOpen(true)}
            aria-label="Open map legend"
            className="btn-collapse"
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '16px',
              backgroundColor: 'var(--md-sys-color-surface)',
              border: '1px solid var(--md-sys-color-outline)',
              color: 'var(--md-sys-color-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              boxShadow: 'var(--elevation-1)',
            }}
          >
            <Icon name="info" size={16} />
            <span>Legend</span>
          </button>
        )}
      </div>

      <MapContainer
        zoomControl={false}
        center={
          selectedEmergency
            ? [selectedEmergency.latitude, selectedEmergency.longitude]
            : defaultCenter
        }
        zoom={13}
        scrollWheelZoom={true}
        className="leaflet-container"
      >
        <TileLayer attribution={attribution} url={tileUrl} maxZoom={19} />

        <MapClickHandler onMapClick={onMapClick} />
        <FitBoundsController
          trigger={fitTrigger}
          ambulances={ambulances}
          emergencies={emergencies}
        />
        <MapResizeWatcher />

        {/* Predictive Staging Heatmap Overlay */}
        {showStaging &&
          stagingHeatZones.map((zone) => (
            <React.Fragment key={zone.id}>
              <Circle
                center={zone.coords}
                radius={zone.riskPct * 12}
                pathOptions={{
                  color: zone.riskPct > 75 ? '#ef4444' : '#f59e0b',
                  fillColor: zone.riskPct > 75 ? '#ef4444' : '#f59e0b',
                  fillOpacity: 0.18,
                  weight: 2,
                  dashArray: '4, 6',
                }}
              >
                <Tooltip permanent direction="top" className="staging-tooltip">
                  <strong>{zone.name}</strong>
                  <br />
                  Incident Risk: <span style={{ color: '#f87171' }}>{zone.riskPct}%</span>
                  <br />
                  <small>{zone.recommended}</small>
                </Tooltip>
              </Circle>
            </React.Fragment>
          ))}

        {/* Real-time Traffic Corridors */}
        {showTraffic &&
          trafficCorridors.map((corridor, idx) => (
            <Polyline
              key={`corridor-${idx}`}
              positions={corridor.coords}
              pathOptions={{
                color: corridor.color,
                weight: 6,
                opacity: 0.65,
                lineCap: 'round',
              }}
            >
              <Tooltip sticky>
                Arterial Flow: {corridor.name} ({corridor.level})
              </Tooltip>
            </Polyline>
          ))}

        {/* Live CCTV Traffic Cameras on Junctions */}
        {cctvJunctions.map((cam) => (
          <Marker
            key={cam.id}
            position={cam.coords}
            icon={cctvIcon}
            eventHandlers={{
              click: () => setActiveCctv(cam),
            }}
          >
            <Tooltip direction="top">
              <span>{cam.name} · Click for Live Video Feed</span>
            </Tooltip>
          </Marker>
        ))}

        {/* High-Contrast Dual-Layer Neon Road Routing Polylines */}
        {showRoutes &&
          activeDispatches.map((dispatch) => {
            const amb = ambulances.find((a) => a.id === dispatch.ambulanceId);
            const em = emergencies.find((e) => e.id === dispatch.emergencyId);
            const hosp = dispatch.hospitalId
              ? hospitals.find((h) => h.id === dispatch.hospitalId)
              : null;

            if (!amb || !em) return null;

            const isSim = activeSimulations.includes(dispatch.id);
            const isToHospital = ['EN_ROUTE_TO_HOSPITAL', 'ARRIVED_AT_HOSPITAL'].includes(dispatch.status);

            let points: [number, number][] = [];
            if (
              missionTelemetry?.roadWaypoints &&
              missionTelemetry.roadWaypoints.length > 0 &&
              activeMissionDispatch?.id === dispatch.id
            ) {
              points = missionTelemetry.roadWaypoints;
            } else {
              points = [
                [amb.latitude, amb.longitude],
                [em.latitude, em.longitude],
              ];
              if (hosp && isToHospital) {
                points.push([hosp.latitude, hosp.longitude]);
              }
            }

            const haloColor = isToHospital ? '#f59e0b' : '#00f5ff';
            const coreColor = isToHospital ? '#fbbf24' : '#38bdf8';

            return (
              <React.Fragment key={`neon-route-${dispatch.id}`}>
                {/* 1. Outer Translucent Glow Halo Layer */}
                <Polyline
                  positions={points}
                  pathOptions={{
                    color: haloColor,
                    weight: 12,
                    opacity: 0.35,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />

                {/* 2. Inner High-Contrast Saturated Core Line */}
                <Polyline
                  positions={points}
                  pathOptions={{
                    color: coreColor,
                    weight: 6,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                    dashArray: isSim ? '8, 10' : undefined,
                  }}
                >
                  <Tooltip sticky>
                    High-Voltage Dispatch Route: {amb.registrationNumber} → {em.type} ({dispatch.status})
                  </Tooltip>
                </Polyline>
              </React.Fragment>
            );
          })}

        {/* Hospitals */}
        {showHospitals &&
          hospitals.map((h) => (
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
                    {h.icuAvailable && <span className="chip">ICU ({h.icuBedsAvailable ?? 5} Avail)</span>}
                    {h.cathLabOperational && <span className="chip chip-als">CATH LAB</span>}
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '6px', color: '#94a3b8' }}>
                    ER Beds: <strong>{h.availableBeds ?? 30} / {h.totalBeds ?? 120}</strong>
                    <br />
                    ED Phone: <strong>{h.phone}</strong>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Emergencies */}
        {showIncidents &&
          activeEmergencies.map((em) => (
            <Marker
              key={`em-${em.id}`}
              position={[em.latitude, em.longitude]}
              icon={getEmergencyIcon(em, selectedEmergency?.id === em.id)}
            >
              <Popup className="custom-popup">
                <div className="popup-card">
                  <div className="popup-badge bg-red">EMERGENCY INCIDENT</div>
                  <h3>{em.type}</h3>
                  <p className="popup-address">{em.address}</p>
                  <p className="popup-caller">
                    Caller: {em.callerName} ({em.phone}) · Priority: <strong>{em.priority}</strong>
                  </p>
                  {selectedEmergency?.id !== em.id && (
                    <button
                      className="btn btn-xs btn-primary mt-2"
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
        {showFleet &&
          ambulances.map((amb) => {
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

      {/* Simulated Live CCTV Traffic Camera Feed Modal */}
      {activeCctv && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '560px',
              width: '92%',
              background: 'rgba(11, 15, 25, 0.98)',
              border: '1px solid #38bdf8',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(56, 189, 248, 0.1)',
                borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={16} className="text-sky" />
                <strong style={{ color: '#f8fafc', fontSize: '14px' }}>
                  LIVE JUNCTION CCTV · {activeCctv.id}
                </strong>
                <span className="live-dot-red animate-pulse" style={{ width: '8px', height: '8px' }}></span>
              </div>
              <button
                className="btn-icon"
                onClick={() => setActiveCctv(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Simulated Live Video Screen */}
            <div
              style={{
                position: 'relative',
                height: '240px',
                background: 'var(--md-sys-color-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {/* Scanlines Effect */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'transparent',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ textAlign: 'center', zIndex: 2 }}>
                <Camera size={44} style={{ color: 'rgba(56, 189, 248, 0.35)', margin: '0 auto 8px auto' }} />
                <div style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 600, letterSpacing: '1px' }}>
                  {activeCctv.name.toUpperCase()}
                </div>
                <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                  LIVE STREAM · 1080p · {activeCctv.fps} FPS · ENCRYPTED WSS FEED
                </div>
              </div>

              {/* HUD Telemetry Overlay on Video */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '12px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#34d399',
                  background: 'rgba(0, 0, 0, 0.6)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                }}
              >
                REC ● {new Date().toLocaleTimeString()}
              </div>

              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '12px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#fbbf24',
                  background: 'rgba(0, 0, 0, 0.6)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                }}
              >
                DENSITY: {activeCctv.density} · SPD: {activeCctv.speedAvg}
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#94a3b8',
                background: 'rgba(0, 0, 0, 0.3)',
              }}
            >
              <span>Automated Scene Assessment: <strong>Corridor Clear for Inbound EMS</strong></span>
              <button className="btn btn-xs btn-outline" onClick={() => setActiveCctv(null)}>
                Dismiss Feed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
