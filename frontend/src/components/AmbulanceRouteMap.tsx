import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Navigation,
  Compass,
  MapPin,
  Building2,
  Play,
  Square,
  Crosshair,
  Layers,
  Zap,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  Maximize2,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Flame
} from 'lucide-react';
import { Ambulance, Dispatch, Emergency, Hospital } from '../types';
import { getAmbulanceIcon, getEmergencyIcon, getHospitalIcon } from '../utils/mapIcons';

interface AmbulanceRouteMapProps {
  ambulance: Ambulance;
  dispatch?: Dispatch | null;
  emergency?: Emergency | null;
  hospital?: Hospital | null;
  isSimulating: boolean;
  onToggleSimulation?: (dispatchId: string) => void;
  missionTelemetry?: {
    maneuver?: string;
    etaRemaining?: number;
    roadWaypoints?: [number, number][];
  };
}

// Controller component to handle map centering and auto-following
const MapCameraController: React.FC<{
  center: [number, number];
  followUnit: boolean;
  fitBoundsTarget?: [number, number][] | null;
}> = ({ center, followUnit, fitBoundsTarget }) => {
  const map = useMap();
  const prevCenterRef = useRef<[number, number]>(center);

  useEffect(() => {
    if (fitBoundsTarget && fitBoundsTarget.length >= 2) {
      const bounds = L.latLngBounds(fitBoundsTarget);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [fitBoundsTarget, map]);

  useEffect(() => {
    if (followUnit) {
      map.panTo(center, { animate: true, duration: 0.8 });
    }
    prevCenterRef.current = center;
  }, [center, followUnit, map]);

  return null;
};

// Generate realistic road waypoints
function generateRoadWaypoints(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  steps: number = 8
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const jitterLat = i > 0 && i < steps ? Math.sin(frac * Math.PI * 2) * 0.0018 : 0;
    const jitterLon = i > 0 && i < steps ? Math.cos(frac * Math.PI * 3) * 0.0015 : 0;
    points.push([
      startLat + (endLat - startLat) * frac + jitterLat,
      startLon + (endLon - startLon) * frac + jitterLon,
    ]);
  }
  return points;
}

export const AmbulanceRouteMap: React.FC<AmbulanceRouteMapProps> = ({
  ambulance,
  dispatch,
  emergency,
  hospital,
  isSimulating,
  onToggleSimulation,
  missionTelemetry,
}) => {
  const [mapStyle, setMapStyle] = useState<'DARK' | 'STREETS' | 'SATELLITE'>('DARK');
  const [followUnit, setFollowUnit] = useState<boolean>(true);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<[number, number][] | null>(null);
  const [showV2X, setShowV2X] = useState<boolean>(true);

  const ambCoords: [number, number] = [ambulance.latitude, ambulance.longitude];

  // Determine current active navigation route segment
  const isEnRouteToHospital = dispatch?.status === 'PATIENT_ONBOARD' || dispatch?.status === 'EN_ROUTE_TO_HOSPITAL';

  // Compute road route polyline
  const routeWaypoints = useMemo(() => {
    if (missionTelemetry?.roadWaypoints && missionTelemetry.roadWaypoints.length > 0) {
      return missionTelemetry.roadWaypoints;
    }

    if (dispatch && isEnRouteToHospital && hospital) {
      return generateRoadWaypoints(
        ambulance.latitude,
        ambulance.longitude,
        hospital.latitude,
        hospital.longitude,
        10
      );
    }

    if (dispatch && emergency) {
      return generateRoadWaypoints(
        ambulance.latitude,
        ambulance.longitude,
        emergency.latitude,
        emergency.longitude,
        10
      );
    }

    return [];
  }, [ambulance.latitude, ambulance.longitude, dispatch, isEnRouteToHospital, hospital, emergency, missionTelemetry]);

  // V2X signal coordinates along route
  const v2xSignals = useMemo(() => {
    if (routeWaypoints.length < 4) return [];
    const p1 = routeWaypoints[Math.floor(routeWaypoints.length * 0.3)];
    const p2 = routeWaypoints[Math.floor(routeWaypoints.length * 0.7)];
    return [
      { id: 'V2X-A', coords: p1, name: 'Signal #104 (Outer Ring)', state: 'GREEN_PREEMPTED' },
      { id: 'V2X-B', coords: p2, name: 'Signal #108 (Metro Junction)', state: 'GREEN_HOLD' },
    ];
  }, [routeWaypoints]);

  const tileUrl = useMemo(() => {
    if (mapStyle === 'SATELLITE') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    if (mapStyle === 'STREETS') {
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
    // CartoDB Dark Matter
    return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  }, [mapStyle]);

  const handleFitRoute = () => {
    const points: [number, number][] = [ambCoords];
    if (emergency) points.push([emergency.latitude, emergency.longitude]);
    if (hospital) points.push([hospital.latitude, hospital.longitude]);
    if (points.length >= 2) {
      setFollowUnit(false);
      setFitBoundsTrigger(points);
      setTimeout(() => setFitBoundsTrigger(null), 1000);
    }
  };

  const handleRecenter = () => {
    setFollowUnit(true);
  };

  // Determine turn maneuver icon and text
  const maneuverIcon = useMemo(() => {
    const text = (missionTelemetry?.maneuver || '').toLowerCase();
    if (text.includes('right')) return <CornerUpRight size={22} className="text-amber" />;
    if (text.includes('left')) return <CornerUpLeft size={22} className="text-amber" />;
    return <ArrowUp size={22} className="text-sky" />;
  }, [missionTelemetry?.maneuver]);

  return (
    <div className="ambulance-route-map-wrapper">
      {/* Turn-by-Turn Navigation HUD Overlay */}
      <div className="amb-nav-hud-overlay">
        <div className="nav-hud-left">
          <div className="maneuver-icon-box">
            {maneuverIcon}
          </div>
          <div className="maneuver-text-box">
            <div className="maneuver-main">
              {missionTelemetry?.maneuver ||
                (isEnRouteToHospital
                  ? `Transporting patient to ${hospital?.name || 'Receiving ED'}`
                  : emergency
                  ? `Proceed to ${emergency.address} (${emergency.type})`
                  : 'Unit Standby · Ready for CAD dispatch')}
            </div>
            <div className="maneuver-sub">
              {dispatch ? (
                <>
                  <span className="text-emerald font-bold">Priority Route Preempted</span>
                  <span className="dot-sep">·</span>
                  <span>Target: {isEnRouteToHospital ? hospital?.name : emergency?.address}</span>
                </>
              ) : (
                <span>GPS Telemetry Active · Monitoring Sector</span>
              )}
            </div>
          </div>
        </div>

        <div className="nav-hud-right">
          <div className="nav-stat-chip">
            <span className="stat-label">SPEED</span>
            <span className="stat-val text-sky">{ambulance.speed} <small>km/h</small></span>
          </div>

          <div className="nav-stat-chip">
            <span className="stat-label">HEADING</span>
            <span className="stat-val text-amber">{ambulance.heading || 0}°</span>
          </div>

          {dispatch && (
            <div className="nav-stat-chip eta-chip">
              <span className="stat-label">ETA</span>
              <span className="stat-val text-emerald">
                {missionTelemetry?.etaRemaining ? `${missionTelemetry.etaRemaining} min` : '4.2 min'}
              </span>
            </div>
          )}

          {dispatch && onToggleSimulation && (
            <button
              className={`btn btn-sm ${isSimulating ? 'btn-sim-active' : 'btn-sim'} nav-sim-btn`}
              onClick={() => onToggleSimulation(dispatch.id)}
              title={isSimulating ? 'Pause GPS Drive' : 'Engage Road GPS'}
            >
              {isSimulating ? <Square size={13} /> : <Play size={13} />}
              <span>{isSimulating ? 'Pause GPS' : 'Drive GPS'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Tactical Map Controls */}
      <div className="amb-map-controls">
        <button
          className={`amb-map-btn ${followUnit ? 'active' : ''}`}
          onClick={handleRecenter}
          title="Center map on ambulance"
        >
          <Crosshair size={15} />
          <span>Follow Unit</span>
        </button>

        {dispatch && (
          <button
            className="amb-map-btn"
            onClick={handleFitRoute}
            title="Fit view to entire emergency route"
          >
            <Maximize2 size={15} />
            <span>Route View</span>
          </button>
        )}

        <div className="amb-map-style-toggle">
          <button
            className={`amb-style-btn ${mapStyle === 'DARK' ? 'active' : ''}`}
            onClick={() => setMapStyle('DARK')}
            title="Tactical Dark Map"
          >
            Dark
          </button>
          <button
            className={`amb-style-btn ${mapStyle === 'STREETS' ? 'active' : ''}`}
            onClick={() => setMapStyle('STREETS')}
            title="OpenStreetMap Street View"
          >
            Street
          </button>
          <button
            className={`amb-style-btn ${mapStyle === 'SATELLITE' ? 'active' : ''}`}
            onClick={() => setMapStyle('SATELLITE')}
            title="Satellite Aerial View"
          >
            Sat
          </button>
        </div>

        <button
          className={`amb-map-btn ${showV2X ? 'active' : ''}`}
          onClick={() => setShowV2X(!showV2X)}
          title="Toggle V2X Traffic Light Preemption Markers"
        >
          <Zap size={15} className={showV2X ? 'text-emerald' : ''} />
          <span>V2X Green Wave</span>
        </button>
      </div>

      {/* Embedded Leaflet Map */}
      <MapContainer
        center={ambCoords}
        zoom={15}
        scrollWheelZoom={true}
        className="amb-leaflet-container"
      >
        <MapCameraController
          center={ambCoords}
          followUnit={followUnit}
          fitBoundsTarget={fitBoundsTrigger}
        />

        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> | Aegis Dispatch'
          url={tileUrl}
        />

        {/* Active Emergency Route Polyline */}
        {routeWaypoints.length > 1 && (
          <>
            {/* Route glow / halo */}
            <Polyline
              positions={routeWaypoints}
              pathOptions={{
                color: isEnRouteToHospital ? '#10b981' : '#38bdf8',
                weight: 9,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Solid route line */}
            <Polyline
              positions={routeWaypoints}
              pathOptions={{
                color: isEnRouteToHospital ? '#34d399' : '#0284c7',
                weight: 5,
                dashArray: isSimulating ? '10, 10' : undefined,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* Ambulance Vehicle Marker */}
        <Marker
          position={ambCoords}
          icon={getAmbulanceIcon(ambulance, isSimulating)}
        >
          <Popup>
            <div className="popup-box">
              <div className="font-bold text-sm text-emerald">
                Unit {ambulance.registrationNumber} ({ambulance.type})
              </div>
              <div className="text-xs text-secondary mt-1">
                Driver: <strong>{ambulance.driverName || 'Arun Kumar'}</strong><br />
                EMT: <strong>{ambulance.emtName || 'Meena R'}</strong><br />
                Status: <span className="status-pill ok">{ambulance.status}</span><br />
                Speed: <strong>{ambulance.speed} km/h</strong> · Heading: <strong>{ambulance.heading}°</strong>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Emergency Incident Marker (if active) */}
        {emergency && (
          <Marker
            position={[emergency.latitude, emergency.longitude]}
            icon={getEmergencyIcon(emergency, true)}
          >
            <Popup>
              <div className="popup-box">
                <div className="font-bold text-sm text-red">
                  INCIDENT: {emergency.type} ({emergency.priority})
                </div>
                <div className="text-xs text-secondary mt-1">
                  <strong>Location:</strong> {emergency.address}<br />
                  <strong>Caller:</strong> {emergency.callerName} ({emergency.phone})<br />
                  <strong>Status:</strong> {emergency.status}
                </div>
              </div>
            </Popup>
            <Tooltip permanent direction="top" offset={[0, -20]} className="tactical-map-tooltip">
              <span>{emergency.type} INCIDENT</span>
            </Tooltip>
          </Marker>
        )}

        {/* Destination Hospital Marker (if active) */}
        {hospital && (
          <Marker
            position={[hospital.latitude, hospital.longitude]}
            icon={getHospitalIcon(hospital)}
          >
            <Popup>
              <div className="popup-box">
                <div className="font-bold text-sm text-sky">
                  {hospital.name}
                </div>
                <div className="text-xs text-secondary mt-1">
                  <strong>Address:</strong> {hospital.address}<br />
                  <strong>ED Phone:</strong> {hospital.designatedEdPhone || hospital.phone}<br />
                  <strong>Trauma Bays:</strong> {hospital.traumaBaysAvailable ?? 4} available
                </div>
              </div>
            </Popup>
            <Tooltip permanent direction="top" offset={[0, -18]} className="tactical-map-tooltip hospital-tip">
              <span>{hospital.name}</span>
            </Tooltip>
          </Marker>
        )}

        {/* V2X Preempted Signal Markers */}
        {showV2X &&
          v2xSignals.map((sig) => (
            <Marker
              key={sig.id}
              position={sig.coords}
              icon={L.divIcon({
                className: 'v2x-signal-marker',
                html: `
                  <div class="v2x-marker-pin">
                    <span class="v2x-green-glow"></span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#34d399">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  </div>
                `,
                iconSize: [26, 26],
                iconAnchor: [13, 13],
              })}
            >
              <Tooltip direction="right" offset={[10, 0]}>
                <span className="text-xs font-bold text-emerald">{sig.name} (PREEMPTED)</span>
              </Tooltip>
            </Marker>
          ))}
      </MapContainer>

      {/* Bottom Map Legend Bar */}
      <div className="amb-map-legend-bar">
        <div className="legend-item">
          <span className="legend-dot amb-dot"></span>
          <span>Your Unit ({ambulance.registrationNumber})</span>
        </div>
        {emergency && (
          <div className="legend-item">
            <span className="legend-dot incident-dot"></span>
            <span>Incident Scene ({emergency.type})</span>
          </div>
        )}
        {hospital && (
          <div className="legend-item">
            <span className="legend-dot hospital-dot"></span>
            <span>Destination Hospital ({hospital.name.split(' ')[0]})</span>
          </div>
        )}
        {showV2X && (
          <div className="legend-item">
            <span className="legend-dot v2x-dot"></span>
            <span>V2X Green Wave Preempted</span>
          </div>
        )}
      </div>
    </div>
  );
};
