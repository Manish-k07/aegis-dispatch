import L from 'leaflet';
import { Ambulance, Emergency, Hospital } from '../types';

/**
 * Material Design 3 Map Marker Generator
 * - Distinct shapes:
 *   - Incidents: Teardrop pin with alert icon & priority callout
 *   - Ambulances: Circle with vehicle icon, heading direction arrow, & unit ID callout
 *   - Hospitals: High-contrast healthcare shield/square with cross & bed availability callout
 */

export function getAmbulanceIcon(ambulance: Ambulance, isSimulating: boolean = false) {
  const statusUpper = (ambulance.status || '').toUpperCase();
  const isAvailable = statusUpper === 'AVAILABLE';
  const isOOS = statusUpper === 'OUT_OF_SERVICE';
  const color = isAvailable ? '#188038' : isOOS ? '#70757a' : '#1A73E8';
  const heading = ambulance.heading || 0;
  const isMoving = isSimulating || ambulance.speed > 0;
  const statusLabel = isAvailable ? 'Avail' : isOOS ? 'OOS' : 'En route';

  const html = `
    <div class="m3-marker-container m3-amb-marker" title="Unit ${ambulance.registrationNumber} (${ambulance.status})">
      <div class="m3-heading-arrow" style="transform: rotate(${heading}deg);">
        <svg viewBox="0 0 10 10" width="10" height="10">
          <polygon points="5,0 10,10 0,10" fill="${color}" />
        </svg>
      </div>
      <div class="m3-marker-pin m3-pin-circle" style="border: 2px solid ${color}; background-color: var(--md-sys-color-surface);">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="${color}">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7h2c0 1.1.9 2 2 2s2-.9 2-2h6c0 1.1.9 2 2 2s2-.9 2-2zM7 17c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm10 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zM7 10h4v2H7v-2zm2-2h2v4H9V8z"/>
        </svg>
      </div>
      <span class="m3-marker-callout m3-unit-callout m3-mono">${ambulance.registrationNumber} · ${statusLabel}</span>
    </div>
  `;

  return L.divIcon({
    className: 'm3-leaflet-div-icon',
    html,
    iconSize: [36, 44],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export function getEmergencyIcon(emergency: Emergency, isSelected: boolean = false) {
  const p = (emergency.priority || 'MEDIUM').toUpperCase();
  const isCritical = p === 'CRITICAL';
  const isHigh = p === 'HIGH';
  const color = isCritical ? '#D93025' : isHigh ? '#E37400' : '#1A73E8';

  const html = `
    <div class="m3-marker-container m3-incident-marker ${isSelected ? 'is-selected' : ''}" title="${emergency.type} (${emergency.priority})">
      <div class="m3-marker-pin m3-pin-teardrop" style="background-color: ${color}; border: 2px solid #FFFFFF;">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="#FFFFFF">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
      </div>
      <span class="m3-marker-callout m3-incident-callout m3-mono" style="border-color: ${color};">
        ${emergency.type} · ${p}
      </span>
    </div>
  `;

  return L.divIcon({
    className: 'm3-leaflet-div-icon',
    html,
    iconSize: [36, 48],
    iconAnchor: [18, 28],
    popupAnchor: [0, -28],
  });
}

export function getHospitalIcon(hospital: Hospital) {
  const isAvailable = (hospital.status || '').toUpperCase() === 'AVAILABLE';
  const color = isAvailable ? '#1A73E8' : '#E37400';
  const availableBeds = hospital.availableBeds ?? 0;

  const html = `
    <div class="m3-marker-container m3-hospital-marker" title="${hospital.name} (${availableBeds} beds available)">
      <div class="m3-marker-pin m3-pin-hospital" style="background-color: ${color}; border: 2px solid #FFFFFF;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#FFFFFF">
          <path d="M19 10.5h-5.5V5c0-.55-.45-1-1-1h-1c-.55 0-1 .45-1 1v5.5H5c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h5.5V19c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-5.5H19c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1z"/>
        </svg>
      </div>
      <span class="m3-marker-callout m3-hospital-callout">
        ${hospital.name} (${availableBeds} beds)
      </span>
    </div>
  `;

  return L.divIcon({
    className: 'm3-leaflet-div-icon',
    html,
    iconSize: [36, 44],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}
