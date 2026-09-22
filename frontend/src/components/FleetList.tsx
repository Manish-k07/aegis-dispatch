import React, { useState } from 'react';
import { Truck, Navigation, Gauge, BatteryCharging, Shield, Activity } from 'lucide-react';
import { Ambulance } from '../types';

interface FleetListProps {
  ambulances: Ambulance[];
  searchQuery?: string;
}

export const FleetList: React.FC<FleetListProps> = ({ ambulances, searchQuery = '' }) => {
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'MISSION' | 'ALS' | 'BLS'>('ALL');

  const filtered = ambulances.filter((amb) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        amb.registrationNumber.toLowerCase().includes(q) ||
        (amb.driverName && amb.driverName.toLowerCase().includes(q)) ||
        (amb.emtName && amb.emtName.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (filter === 'AVAILABLE') return amb.status === 'AVAILABLE';
    if (filter === 'MISSION') return amb.status !== 'AVAILABLE' && amb.status !== 'OUT_OF_SERVICE';
    if (filter === 'ALS') return amb.type === 'ALS';
    if (filter === 'BLS') return amb.type === 'BLS';
    return true;
  });

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-emerald" />
          <h2>Emergency Fleet Status</h2>
        </div>
        <span className="badge-count text-emerald">{ambulances.length} Units</span>
      </div>

      <div className="filter-tabs">
        {(['ALL', 'AVAILABLE', 'MISSION', 'ALS', 'BLS'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="fleet-list">
        {filtered.length === 0 ? (
          <div className="empty-state">No ambulances match the active filter.</div>
        ) : (
          filtered.map((amb) => {
            let statusClass = 'status-available';
            if (['EN_ROUTE_TO_PATIENT', 'EN_ROUTE_TO_HOSPITAL'].includes(amb.status)) {
              statusClass = 'status-enroute';
            } else if (['DISPATCHED', 'ARRIVED_AT_SCENE', 'PATIENT_ONBOARD'].includes(amb.status)) {
              statusClass = 'status-busy';
            } else if (amb.status === 'AT_HOSPITAL') {
              statusClass = 'status-hospital';
            } else if (amb.status === 'OUT_OF_SERVICE') {
              statusClass = 'status-oos';
            }

            const isALS = amb.type === 'ALS';

            return (
              <div key={amb.id} className="fleet-card">
                <div className="fleet-card-header">
                  <div className="flex items-center gap-2">
                    <div className={`vehicle-indicator ${statusClass}`}></div>
                    <strong>{amb.registrationNumber}</strong>
                    <span className={`candidate-type-badge ${isALS ? 'badge-als' : 'badge-bls'}`}>
                      {amb.type}
                    </span>
                  </div>
                  <span className={`status-pill ${statusClass}`}>{amb.status.replace(/_/g, ' ')}</span>
                </div>

                <div className="fleet-crew text-secondary text-xs mt-1">
                  <span>Driver: <strong>{amb.driverName || 'N/A'}</strong></span> · <span>EMT: <strong>{amb.emtName || 'N/A'}</strong></span>
                </div>

                {/* Capabilities */}
                <div className="fleet-capabilities mt-1 flex gap-1 flex-wrap">
                  {isALS ? (
                    <>
                      <span className="chip chip-als">DEFIBRILLATOR</span>
                      <span className="chip chip-als">VENTILATOR</span>
                      <span className="chip chip-als">IV ACCESS</span>
                    </>
                  ) : (
                    <>
                      <span className="chip chip-bls">O2 THERAPY</span>
                      <span className="chip chip-bls">FIRST AID</span>
                      <span className="chip chip-bls">STRETCHER</span>
                    </>
                  )}
                </div>

                <div className="fleet-footer mt-2 flex items-center justify-between">
                  <div className="fleet-telemetry">
                    <div className="telemetry-item">
                      <Gauge size={12} />
                      <span>{amb.speed} km/h</span>
                    </div>
                    <div className="telemetry-item">
                      <Navigation size={12} />
                      <span>{amb.heading}°</span>
                    </div>
                  </div>

                  <div className="fleet-readiness text-xs flex items-center gap-1 text-emerald">
                    <BatteryCharging size={13} />
                    <span>98% Ready</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
