import React from 'react';
import {
  Activity,
  Play,
  Square,
  Hospital as HospitalIcon,
  ChevronRight,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { Dispatch, Emergency, Ambulance, Hospital } from '../types';

interface ActiveDispatchesProps {
  dispatches: Dispatch[];
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  activeSimulations: string[];
  selectedDispatchId?: string | null;
  searchQuery?: string;
  onSelectDispatch?: (dispatch: Dispatch) => void;
  onAdvanceStatus: (dispatch: Dispatch, nextStatus: string) => void;
  onOpenHospitalModal: (dispatch: Dispatch) => void;
  onToggleSimulation: (dispatchId: string) => void;
}

export const ActiveDispatches: React.FC<ActiveDispatchesProps> = ({
  dispatches,
  emergencies,
  ambulances,
  hospitals,
  activeSimulations,
  selectedDispatchId,
  searchQuery = '',
  onSelectDispatch,
  onAdvanceStatus,
  onOpenHospitalModal,
  onToggleSimulation,
}) => {
  const activeList = dispatches.filter((d) => {
    if (['COMPLETED', 'CANCELLED'].includes(d.status)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const amb = ambulances.find((a) => a.id === d.ambulanceId);
      const em = emergencies.find((e) => e.id === d.emergencyId);
      const match =
        (amb && amb.registrationNumber.toLowerCase().includes(q)) ||
        (em && (em.type.toLowerCase().includes(q) || em.address.toLowerCase().includes(q)));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-amber" />
          <h2>Active Response Missions</h2>
        </div>
        <span className="badge-count text-amber">{activeList.length}</span>
      </div>

      <div className="dispatch-missions-list">
        {activeList.length === 0 ? (
          <div className="empty-state">No active response missions.</div>
        ) : (
          activeList.map((disp) => {
            const em = emergencies.find((e) => e.id === disp.emergencyId);
            const amb = ambulances.find((a) => a.id === disp.ambulanceId);
            const hosp = disp.hospitalId ? hospitals.find((h) => h.id === disp.hospitalId) : null;
            const isSimulating = activeSimulations.includes(disp.id);

            // Determine next lifecycle step and label
            let nextAction: { label: string; status: string; variant?: string } | null = null;

            switch (disp.status) {
              case 'DISPATCHED':
                nextAction = { label: '4. Accept Dispatch', status: 'AMBULANCE_ACCEPTED' };
                break;
              case 'AMBULANCE_ACCEPTED':
                nextAction = { label: '5. Mark En Route', status: 'EN_ROUTE_TO_SCENE' };
                break;
              case 'EN_ROUTE_TO_SCENE':
                nextAction = { label: '6. Arrived at Scene', status: 'ARRIVED_AT_SCENE' };
                break;
              case 'ARRIVED_AT_SCENE':
                nextAction = { label: '7. Patient Onboard', status: 'PATIENT_ONBOARD' };
                break;
              case 'PATIENT_ONBOARD':
                nextAction = { label: '8. Depart for Hospital', status: 'EN_ROUTE_TO_HOSPITAL' };
                break;
              case 'EN_ROUTE_TO_HOSPITAL':
                nextAction = { label: '9. Arrived at Hospital', status: 'ARRIVED_AT_HOSPITAL' };
                break;
              case 'ARRIVED_AT_HOSPITAL':
                nextAction = { label: '10. Complete Handover', status: 'COMPLETED', variant: 'btn-success' };
                break;
              default:
                break;
            }

            const isSelected = selectedDispatchId === disp.id;

            return (
              <div
                key={disp.id}
                className={`mission-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectDispatch && onSelectDispatch(disp)}
              >
                <div className="mission-header">
                  <div>
                    <span className="mission-status-pill">{disp.status.replace(/_/g, ' ')}</span>
                    <strong className="mission-amb">{amb?.registrationNumber || 'Ambulance'}</strong>
                    <span className="text-secondary text-xs"> ({amb?.type})</span>
                  </div>
                  <div className="mission-eta">
                    ETA: <strong>{disp.etaMinutes}m</strong>
                  </div>
                </div>

                <div className="mission-body">
                  <div className="mission-incident">
                    <MapPin size={13} className="text-red" />
                    <span>
                      <strong>{em?.type}:</strong> {em?.address}
                    </span>
                  </div>

                  {hosp ? (
                    <div className="mission-hospital">
                      <HospitalIcon size={13} className="text-sky" />
                      <span>
                        Destination: <strong>{hosp.name}</strong>
                      </span>
                    </div>
                  ) : (
                    ['ARRIVED_AT_SCENE', 'PATIENT_ONBOARD', 'EN_ROUTE_TO_HOSPITAL'].includes(disp.status) && (
                      <button
                        className="btn btn-xs btn-outline-sky mt-1"
                        onClick={() => onOpenHospitalModal(disp)}
                      >
                        <HospitalIcon size={12} />
                        <span>Assign Destination Hospital</span>
                      </button>
                    )
                  )}
                </div>

                {/* Simulation Control */}
                <div className="simulation-bar">
                  <button
                    className={`btn btn-xs ${isSimulating ? 'btn-sim-active' : 'btn-sim'}`}
                    onClick={() => onToggleSimulation(disp.id)}
                    title={isSimulating ? 'Stop live GPS simulation' : 'Start live GPS simulation'}
                  >
                    {isSimulating ? (
                      <>
                        <Square size={12} />
                        <span>Simulating GPS… (Stop)</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} />
                        <span>11. Start GPS Simulation</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Step Actions */}
                <div className="mission-actions">
                  {nextAction && (
                    <button
                      className={`btn btn-sm ${nextAction.variant || 'btn-primary'} w-full`}
                      onClick={() => onAdvanceStatus(disp, nextAction!.status)}
                    >
                      <span>{nextAction.label}</span>
                      <ChevronRight size={14} />
                    </button>
                  )}

                  {disp.status === 'COMPLETED' && (
                    <div className="text-emerald text-xs flex items-center gap-1">
                      <CheckCircle size={14} />
                      <span>Mission successfully concluded</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
