import React, { useEffect } from 'react';
import { Hospital, Dispatch } from '../types';
import { Dialog, Button, Icon } from './common';

interface HospitalModalProps {
  dispatch: Dispatch;
  hospitals: Hospital[];
  onClose: () => void;
  onSelectHospital: (hospital: Hospital) => void;
}

export const HospitalModal: React.FC<HospitalModalProps> = ({
  dispatch,
  hospitals,
  onClose,
  onSelectHospital,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title="Select Destination Hospital"
      icon="local_hospital"
      maxWidth="640px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--md-sys-color-text-secondary)' }}>
          Choose an emergency receiving facility with appropriate clinical capabilities.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {hospitals.map((hosp) => {
            const isSelected = dispatch.hospitalId === hosp.id;
            const isAvailable = hosp.status === 'AVAILABLE';

            return (
              <div
                key={hosp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  backgroundColor: isSelected ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container)',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--md-sys-color-text)' }}>{hosp.name}</strong>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: isAvailable ? 'var(--md-sys-color-success-container)' : 'var(--md-sys-color-warning-container)',
                        color: isAvailable ? 'var(--md-sys-color-on-success-container)' : 'var(--md-sys-color-on-warning-container)',
                        fontWeight: 600,
                      }}
                    >
                      {hosp.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '2px' }}>
                    {hosp.address} &bull; ER Beds: <strong>{hosp.availableBeds ?? 30} / {hosp.totalBeds ?? 120}</strong>
                  </div>
                </div>

                <Button
                  variant={isSelected ? 'filled' : 'outlined'}
                  size="standard"
                  icon="local_hospital"
                  onClick={() => onSelectHospital(hosp)}
                >
                  {isSelected ? 'Selected' : 'Direct Transport'}
                </Button>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
