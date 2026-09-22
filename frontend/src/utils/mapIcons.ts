import L from 'leaflet';
import { Ambulance, Emergency, Hospital } from '../types';

export function getAmbulanceIcon(ambulance: Ambulance, isSimulating: boolean = false) {
  let color = '#10b981'; // Available
  if (ambulance.status === 'EN_ROUTE_TO_PATIENT' || ambulance.status === 'EN_ROUTE_TO_HOSPITAL') {
    color = '#ef4444'; // En route
  } else if (ambulance.status === 'DISPATCHED' || ambulance.status === 'ARRIVED_AT_SCENE' || ambulance.status === 'PATIENT_ONBOARD') {
    color = '#f59e0b'; // Busy / on scene
  } else if (ambulance.status === 'AT_HOSPITAL') {
    color = '#0ea5e9'; // At hospital
  } else if (ambulance.status === 'OUT_OF_SERVICE') {
    color = '#64748b'; // Inactive
  }

  const isMoving = isSimulating || ambulance.speed > 0;
  const pulseClass = isMoving ? 'pulse-ambulance' : '';
  const heading = ambulance.heading || 0;

  const html = `
    <div class="ambulance-marker-container ${pulseClass}" style="--amb-color: ${color}">
      ${isMoving ? `
        <div class="ambulance-heading-pointer" style="transform: rotate(${heading}deg);">
          <div class="heading-arrow" style="border-bottom-color: ${color};"></div>
        </div>
      ` : ''}
      <div class="ambulance-pin" style="border-color: ${color};">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${color}" stroke-width="2.2">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7h2" stroke="${color}" fill="#0f172a" stroke-width="2"/>
          <circle cx="7" cy="17" r="2" fill="${color}"/>
          <circle cx="17" cy="17" r="2" fill="${color}"/>
          <path d="M7 10h4" stroke="${color}" stroke-width="2"/>
          <path d="M9 8v4" stroke="${color}" stroke-width="2"/>
        </svg>
      </div>
      <span class="amb-reg-tag" style="border-color: ${color}; color: #ffffff;">${ambulance.registrationNumber.split('-').pop()}</span>
    </div>
  `;

  return L.divIcon({
    className: 'custom-div-icon',
    html,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
}

export function getEmergencyIcon(emergency: Emergency) {
  const isCritical = emergency.priority === 'CRITICAL';
  const isHigh = emergency.priority === 'HIGH';
  const color = isCritical ? '#ef4444' : isHigh ? '#f97316' : '#eab308';

  const html = `
    <div class="emergency-marker-container ${isCritical ? 'pulse-critical' : ''}">
      ${isCritical ? '<div class="radar-ping-ring"></div>' : ''}
      <div class="emergency-pin" style="background: ${color}; box-shadow: 0 0 14px ${color}88;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2.5">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </div>
      <span class="emergency-type-tag">${emergency.type.substring(0, 4)}</span>
    </div>
  `;

  return L.divIcon({
    className: 'custom-div-icon',
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export function getHospitalIcon(hospital: Hospital) {
  const isAvailable = hospital.status === 'AVAILABLE';
  const color = isAvailable ? '#0284c7' : '#d97706';

  const html = `
    <div class="hospital-marker-container">
      <div class="hospital-pin" style="background: #0f172a; border-color: ${color}; box-shadow: 0 0 10px ${color}66;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="${color}" stroke="${color}" stroke-width="1.5">
          <path d="M12 4v16m-8-8h16" stroke-linecap="round" stroke-width="3.5" />
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-div-icon',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}
