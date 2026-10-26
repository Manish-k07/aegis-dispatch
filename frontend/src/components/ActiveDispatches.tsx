import React from 'react';
import { Dispatch, Emergency, Ambulance, Hospital } from '../types';
import { Icon } from './common/Icon';
import { Button } from './common/Button';
import { Chip } from './common/Chip';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="near_me" size={18} style={{ color: 'var(--md-sys-color-primary)' }} />
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
            Active response missions
          </h2>
        </div>
        <Chip label={activeList.length.toString()} size="small" />
      </div>

      <div className="dispatch-missions-list">
        {activeList.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '13px' }}>
            No active response missions.
          </div>
        ) : (
          activeList.map((disp) => {
            const em = emergencies.find((e) => e.id === disp.emergencyId);
            const amb = ambulances.find((a) => a.id === disp.ambulanceId);
            const hosp = disp.hospitalId ? hospitals.find((h) => h.id === disp.hospitalId) : null;
            const isSimulating = activeSimulations.includes(disp.id);

            // Determine next lifecycle step and label
            let nextAction: { label: string; status: string; variant?: 'filled' | 'outlined' | 'tonal' } | null = null;

            switch (disp.status) {
              case 'DISPATCHED':
                nextAction = { label: 'Accept dispatch', status: 'AMBULANCE_ACCEPTED' };
                break;
              case 'AMBULANCE_ACCEPTED':
                nextAction = { label: 'Mark en route', status: 'EN_ROUTE_TO_SCENE' };
                break;
              case 'EN_ROUTE_TO_SCENE':
                nextAction = { label: 'Arrived at scene', status: 'ARRIVED_AT_SCENE' };
                break;
              case 'ARRIVED_AT_SCENE':
                nextAction = { label: 'Patient onboard', status: 'PATIENT_ONBOARD' };
                break;
              case 'PATIENT_ONBOARD':
                nextAction = { label: 'Depart for hospital', status: 'EN_ROUTE_TO_HOSPITAL' };
                break;
              case 'EN_ROUTE_TO_HOSPITAL':
                nextAction = { label: 'Arrived at hospital', status: 'ARRIVED_AT_HOSPITAL' };
                break;
              case 'ARRIVED_AT_HOSPITAL':
                nextAction = { label: 'Complete handover', status: 'COMPLETED', variant: 'filled' };
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
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `1px solid ${isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)'}`,
                  backgroundColor: isSelected
                    ? 'var(--md-sys-color-surface-container-high)'
                    : 'var(--md-sys-color-surface)',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--md-sys-color-surface-container-high)',
                        color: 'var(--md-sys-color-on-surface-variant)',
                        fontWeight: 500,
                        textTransform: 'capitalize',
                      }}
                    >
                      {disp.status.toLowerCase().replace(/_/g, ' ')}
                    </span>
                    <strong
                      style={{
                        fontFamily: 'Roboto Mono, monospace',
                        fontSize: '13px',
                        color: 'var(--md-sys-color-on-surface)',
                      }}
                    >
                      {amb?.registrationNumber || 'Ambulance'}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      ({amb?.type})
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-warning)', fontWeight: 600 }}>
                    ETA: {disp.etaMinutes} min
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--md-sys-color-on-surface)' }}>
                    <Icon name="location_on" size={16} style={{ color: '#D93025', flexShrink: 0 }} />
                    <span>
                      <strong>{em?.type}:</strong> {em?.address}
                    </span>
                  </div>

                  {hosp ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--md-sys-color-primary)' }}>
                      <Icon name="local_hospital" size={16} style={{ flexShrink: 0 }} />
                      <span>
                        Destination: <strong>{hosp.name}</strong>
                      </span>
                    </div>
                  ) : (
                    ['ARRIVED_AT_SCENE', 'PATIENT_ONBOARD', 'EN_ROUTE_TO_HOSPITAL'].includes(disp.status) && (
                      <div style={{ marginTop: '4px' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenHospitalModal(disp);
                          }}
                          startIcon={<Icon name="local_hospital" size={14} />}
                        >
                          Assign destination hospital
                        </Button>
                      </div>
                    )
                  )}
                </div>

                {/* Simulation & Lifecycle Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Button
                    variant={isSimulating ? 'tonal' : 'outlined'}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSimulation(disp.id);
                    }}
                    startIcon={<Icon name={isSimulating ? 'stop' : 'play_arrow'} size={14} />}
                  >
                    {isSimulating ? 'Simulating GPS (stop)' : 'Simulate GPS'}
                  </Button>

                  {nextAction && (
                    <Button
                      variant={nextAction.variant || 'filled'}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdvanceStatus(disp, nextAction!.status);
                      }}
                      endIcon={<Icon name="arrow_forward" size={14} />}
                    >
                      {nextAction.label}
                    </Button>
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
