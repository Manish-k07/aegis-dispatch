import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Icon } from './common/Icon';
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
  fullHeight?: boolean;
}

// Controller component to ensure Leaflet renders tiles and updates size immediately
function MapResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    const container = map.getContainer();
    if (container) observer.observe(container);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      observer.disconnect();
    };
  }, [map]);
  return null;
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

// Generate realistic road waypoints following street grid corridors (perpendicular avenue turns)
function generateRoadWaypoints(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): [number, number][] {
  const points: [number, number][] = [];
  points.push([startLat, startLon]);

  const latDiff = endLat - startLat;
  const lonDiff = endLon - startLon;

  // Midpoint road intersection corner
  const cornerLat = startLat;
  const cornerLon = startLon + lonDiff * 0.7;

  // Leg 1: along starting avenue
  const leg1Steps = 4;
  for (let i = 1; i <= leg1Steps; i++) {
    const f = i / leg1Steps;
    points.push([startLat, startLon + (cornerLon - startLon) * f]);
  }

  // Turn along North-South cross avenue
  const corner2Lat = endLat;
  const leg2Steps = 4;
  for (let i = 1; i <= leg2Steps; i++) {
    const f = i / leg2Steps;
    points.push([cornerLat + (corner2Lat - cornerLat) * f, cornerLon]);
  }

  // Leg 3: to destination entrance
  const leg3Steps = 4;
  for (let i = 1; i <= leg3Steps; i++) {
    const f = i / leg3Steps;
    points.push([endLat, cornerLon + (endLon - cornerLon) * f]);
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
  fullHeight = false,
}) => {
  const [mapStyle, setMapStyle] = useState<'STREETS' | 'TERRAIN' | 'SATELLITE'>('STREETS');
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
        hospital.longitude
      );
    }

    if (dispatch && emergency) {
      return generateRoadWaypoints(
        ambulance.latitude,
        ambulance.longitude,
        emergency.latitude,
        emergency.longitude
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

  const { tileUrl, attribution, maxNativeZoom } = useMemo(() => {
    if (mapStyle === 'TERRAIN') {
      return {
        tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri World Topo Map &copy; OpenStreetMap contributors',
        maxNativeZoom: 19,
      };
    }
    if (mapStyle === 'SATELLITE') {
      return {
        tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri World Imagery',
        maxNativeZoom: 19,
      };
    }
    // Clean OpenStreetMap tiles (standard across project)
    return {
      tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxNativeZoom: 19,
    };
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

  // Determine turn maneuver icon
  const maneuverIconName = useMemo(() => {
    const text = (missionTelemetry?.maneuver || '').toLowerCase();
    if (text.includes('right')) return 'turn_right';
    if (text.includes('left')) return 'turn_left';
    return 'straight';
  }, [missionTelemetry?.maneuver]);

  return (
    <div
      className={`ambulance-route-map-wrapper ${fullHeight ? 'full-height' : 'operator-compact'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: fullHeight ? '520px' : '400px',
        backgroundColor: '#1a1c1e',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.1))',
      }}
    >
      {/* 1. OPERATOR MODE: Clean Non-Overlapping Header Strip ABOVE Map */}
      {!fullHeight && (
        <div className="amb-operator-hud-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div className="maneuver-icon-box">
              <Icon name={maneuverIconName} size={20} />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div className="maneuver-main" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {missionTelemetry?.maneuver ||
                  (isEnRouteToHospital
                    ? `Transporting patient to ${hospital?.name || 'Receiving ED'}`
                    : emergency
                    ? `Proceed to ${emergency.address} (${emergency.type})`
                    : 'Unit Standby · Ready for CAD dispatch')}
              </div>
              <div className="maneuver-sub">
                <span>Speed: <strong>{ambulance.speed} km/h</strong></span>
                <span className="dot-sep">·</span>
                <span>Heading: <strong>{ambulance.heading || 0}°</strong></span>
                {dispatch && (
                  <>
                    <span className="dot-sep">·</span>
                    <span style={{ color: 'var(--md-sys-color-success)', fontWeight: 600 }}>
                      ETA: {missionTelemetry?.etaRemaining ? `${missionTelemetry.etaRemaining} min` : '4.2 min'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Map Action Controls (Inline in Header, NOT overlapping the map) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              className={`amb-map-btn ${followUnit ? 'active' : ''}`}
              onClick={handleRecenter}
              title="Center on ambulance"
            >
              <Icon name="my_location" size={15} />
              <span>Follow</span>
            </button>

            {dispatch && (
              <button
                type="button"
                className="amb-map-btn"
                onClick={handleFitRoute}
                title="Fit entire route"
              >
                <Icon name="crop_free" size={15} />
                <span>Route</span>
              </button>
            )}

            <div className="amb-map-style-toggle">
              <button
                type="button"
                className={`amb-style-btn ${mapStyle === 'STREETS' ? 'active' : ''}`}
                onClick={() => setMapStyle('STREETS')}
                title="OpenStreetMap Street theme"
              >
                Street
              </button>
              <button
                type="button"
                className={`amb-style-btn ${mapStyle === 'TERRAIN' ? 'active' : ''}`}
                onClick={() => setMapStyle('TERRAIN')}
                title="Topographic terrain"
              >
                Terrain
              </button>
              <button
                type="button"
                className={`amb-style-btn ${mapStyle === 'SATELLITE' ? 'active' : ''}`}
                onClick={() => setMapStyle('SATELLITE')}
                title="Satellite view"
              >
                Sat
              </button>
            </div>

            <button
              type="button"
              className={`amb-map-btn ${showV2X ? 'active' : ''}`}
              onClick={() => setShowV2X(!showV2X)}
              title="Toggle V2X Traffic Light Preemption Markers"
            >
              <Icon name="bolt" size={15} style={{ color: showV2X ? 'var(--md-sys-color-success)' : undefined }} />
              <span>V2X Green Wave</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. DRIVER MODE: Dedicated Navigation & Telemetry Toolbar Strip ABOVE the Map */}
      {fullHeight && (
        <div className="amb-driver-nav-bar">
          <div className="driver-nav-left">
            <div className="maneuver-icon-box">
              <Icon name={maneuverIconName} size={22} />
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
                    <span style={{ color: 'var(--md-sys-color-success)', fontWeight: 600 }}>Priority Route Preempted</span>
                    <span className="dot-sep">·</span>
                    <span>Target: {isEnRouteToHospital ? hospital?.name : emergency?.address}</span>
                  </>
                ) : (
                  <span>GPS Telemetry Active · Monitoring Sector</span>
                )}
              </div>
            </div>
          </div>

          <div className="driver-nav-right">
            <div className="nav-stat-chip">
              <span className="stat-label">SPEED</span>
              <span className="stat-val" style={{ color: 'var(--md-sys-color-primary)' }}>
                {ambulance.speed} <small>km/h</small>
              </span>
            </div>

            <div className="nav-stat-chip">
              <span className="stat-label">HEADING</span>
              <span className="stat-val" style={{ color: 'var(--md-sys-color-warning)' }}>
                {ambulance.heading || 0}°
              </span>
            </div>

            {dispatch && (
              <div className="nav-stat-chip eta-chip">
                <span className="stat-label">ETA</span>
                <span className="stat-val" style={{ color: 'var(--md-sys-color-success)' }}>
                  {missionTelemetry?.etaRemaining ? `${missionTelemetry.etaRemaining} min` : '4.2 min'}
                </span>
              </div>
            )}

            {dispatch && onToggleSimulation && (
              <button
                type="button"
                className={`btn btn-sm ${isSimulating ? 'btn-sim-active' : 'btn-sim'} nav-sim-btn`}
                onClick={() => onToggleSimulation(dispatch.id)}
                title={isSimulating ? 'Pause GPS Drive' : 'Engage Road GPS'}
              >
                <Icon name={isSimulating ? 'pause' : 'play_arrow'} size={15} />
                <span>{isSimulating ? 'Pause GPS' : 'Drive GPS'}</span>
              </button>
            )}

            <div className="amb-bar-divider" />

            {/* Map Action Controls integrated cleanly into header strip */}
            <button
              type="button"
              className={`amb-map-btn ${followUnit ? 'active' : ''}`}
              onClick={handleRecenter}
              title="Center map on ambulance"
            >
              <Icon name="my_location" size={15} />
              <span>Follow Unit</span>
            </button>

            {dispatch && (
              <button
                type="button"
                className="amb-map-btn"
                onClick={handleFitRoute}
                title="Fit view to entire emergency route"
              >
                <Icon name="crop_free" size={15} />
                <span>Route View</span>
              </button>
            )}

            <div className="amb-map-style-toggle">
              <button
                type="button"
                className={`amb-style-btn ${mapStyle === 'STREETS' ? 'active' : ''}`}
                onClick={() => setMapStyle('STREETS')}
                title="OpenStreetMap Street View"
              >
                Street
              </button>
              <button
                type="button"
                className={`amb-style-btn ${mapStyle === 'TERRAIN' ? 'active' : ''}`}
                onClick={() => setMapStyle('TERRAIN')}
                title="Topographic terrain"
              >
                Terrain
              </button>
              <button
                type="button"
                className={`amb-style-btn ${mapStyle === 'SATELLITE' ? 'active' : ''}`}
                onClick={() => setMapStyle('SATELLITE')}
                title="Satellite Aerial View"
              >
                Sat
              </button>
            </div>

            <button
              type="button"
              className={`amb-map-btn ${showV2X ? 'active' : ''}`}
              onClick={() => setShowV2X(!showV2X)}
              title="Toggle V2X Traffic Light Preemption Markers"
            >
              <Icon name="bolt" size={15} style={{ color: showV2X ? 'var(--md-sys-color-success)' : undefined }} />
              <span>V2X Green Wave</span>
            </button>
          </div>
        </div>
      )}

      {/* Map Content Container (100% Height, No Blank Gaps) */}
      <div
        className="amb-map-canvas-container"
        style={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          position: 'relative',
          backgroundColor: '#1a1c1e',
          overflow: 'hidden',
        }}
      >
        {/* Embedded Leaflet Map */}
        <MapContainer
          center={ambCoords}
          zoom={15}
          zoomControl={false}
          scrollWheelZoom={true}
          className="leaflet-container amb-leaflet-container"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 32,
            width: '100%',
            height: 'calc(100% - 32px)',
            background: '#1a1c1e',
          }}
        >
          <MapResizeWatcher />
          <MapCameraController
            center={ambCoords}
            followUnit={followUnit}
            fitBoundsTarget={fitBoundsTrigger}
          />

          <TileLayer
            key={tileUrl}
            attribution={attribution}
            url={tileUrl}
            maxZoom={19}
            maxNativeZoom={maxNativeZoom}
          />

          {/* Active Emergency Route Polyline */}
          {routeWaypoints.length > 1 && (
            <>
              {/* Route glow / halo */}
              <Polyline
                positions={routeWaypoints}
                pathOptions={{
                  color: isEnRouteToHospital ? '#188038' : '#1A73E8',
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
                  color: isEnRouteToHospital ? '#188038' : '#1A73E8',
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
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--md-sys-color-primary)' }}>
                  Unit {ambulance.registrationNumber} ({ambulance.type})
                </div>
                <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '4px' }}>
                  Driver: <strong>{ambulance.driverName || 'Arun Kumar'}</strong><br />
                  EMT: <strong>{ambulance.emtName || 'Meena R'}</strong><br />
                  Status: <strong>{ambulance.status}</strong><br />
                  Speed: <strong>{ambulance.speed} km/h</strong> · Heading: <strong>{ambulance.heading || 0}°</strong>
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
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--md-sys-color-error)' }}>
                    {emergency.type} ({emergency.priority})
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '4px' }}>
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
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--md-sys-color-primary)' }}>
                    {hospital.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '4px' }}>
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
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="#188038">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                    </div>
                  `,
                  iconSize: [26, 26],
                  iconAnchor: [13, 13],
                })}
              >
                <Tooltip direction="right" offset={[10, 0]}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#188038' }}>{sig.name} (PREEMPTED)</span>
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
    </div>
  );
};
