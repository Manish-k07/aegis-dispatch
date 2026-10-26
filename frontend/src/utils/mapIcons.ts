import L from 'leaflet';
import { Ambulance, Emergency, Hospital } from '../types';

/**
 * Material Design 3 Map Marker Generator
 * - Distinct shapes:
 *   - Incidents: Teardrop pin with inner alert icon
 *   - Ambulances: Circle with vehicle icon and direction heading pointer
 *   - Hospitals: Rounded square with healthcare cross
 * - No glows, no gradients, no permanent label clutter
 */

export function getAmbulanceIcon(ambulance: Ambulance, isSimulating: boolean = false) {
  const isAvailable = ambulance.status === 'AVAILABLE';
  const color = isAvailable ? '#188038' : '#1A73E8'; // Google Green / Google Blue
  const heading = ambulance.heading || 0;
  const isMoving = isSimulating || ambulance.speed > 0;

  const html = `
    <div class="m3-marker-container m3-amb-marker" title="Unit ${ambulance.registrationNumber}">
      ${isMoving ? `
        <div class="m3-heading-arrow" style="transform: rotate(${heading}deg);">
          <svg viewBox="0 0 10 10" width="8" height="8">
            <polygon points="5,0 10,10 0,10" fill="${color}" />
          </svg>
        </div>
      ` : ''}
      <div class="m3-marker-pin m3-pin-circle" style="border: 2px solid ${color};">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="${color}">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7h2c0 1.1.9 2 2 2s2-.9 2-2h6c0 1.1.9 2 2 2s2-.9 2-2zM7 17c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm10 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zM7 10h4v2H7v-2zm2-2h2v4H9V8z"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'm3-leaflet-div-icon',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

export function getEmergencyIcon(emergency: Emergency, isSelected: boolean = false) {
  const isCritical = emergency.priority === 'CRITICAL';
  const isHigh = emergency.priority === 'HIGH';
  const color = isCritical ? '#D93025' : isHigh ? '#E37400' : '#1A73E8';

  const html = `
    <div class="m3-marker-container m3-incident-marker ${isSelected ? 'is-selected' : ''}" title="${emergency.type}">
      <div class="m3-marker-pin m3-pin-teardrop" style="background-color: ${color};">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="#FFFFFF">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
      </div>
      ${isSelected ? `<span class="m3-marker-label m3-mono">${emergency.type.substring(0, 4)}</span>` : ''}
    </div>
  `;

  return L.divIcon({
    className: 'm3-leaflet-div-icon',
    html,
    iconSize: [32, 36],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export function getHospitalIcon(hospital: Hospital) {
  const isAvailable = hospital.status === 'AVAILABLE';
  const color = isAvailable ? '#1A73E8' : '#E37400';

  const html = `
    <div class="m3-marker-container m3-hospital-marker" title="${hospital.name}">
      <div class="m3-marker-pin m3-pin-square" style="border: 2px solid ${color};">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="${color}">
          <path d="M19 10.5h-5.5V5c0-.55-.45-1-1-1h-1c-.55 0-1 .45-1 1v5.5H5c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h5.5V19c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-5.5H19c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1z"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'm3-leaflet-div-icon',
    html,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}
