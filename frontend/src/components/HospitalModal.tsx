import React from 'react';
import { X, Hospital as HospitalIcon, Phone, MapPin, CheckCircle } from 'lucide-react';
import { Hospital, Dispatch } from '../types';

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
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <HospitalIcon className="text-sky" size={20} />
            <h2>Select Destination Hospital</h2>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-subtitle mb-3">
            Choose an emergency receiving facility with appropriate clinical capabilities.
          </p>

          <div className="hospitals-list">
            {hospitals.map((hosp) => {
              const isSelected = dispatch.hospitalId === hosp.id;
              const isAvailable = hosp.status === 'AVAILABLE';

              return (
                <div
                  key={hosp.id}
                  className={`hospital-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="hospital-card-header">
                    <div>
                      <strong>{hosp.name}</strong>
                      <span className={`status-pill ${isAvailable ? 'ok' : 'busy'}`}>
                        {hosp.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="hospital-details">
                    <div className="detail-item">
                      <MapPin size={12} />
                      <span>{hosp.address}</span>
                    </div>
                    <div className="detail-item">
                      <Phone size={12} />
                      <span>{hosp.phone}</span>
                    </div>
                  </div>

                  <div className="capability-badges">
                    {hosp.emergencyDepartment && <span className="chip">24/7 ED</span>}
                    {hosp.icuAvailable && <span className="chip">ICU</span>}
                    {hosp.cardiacServices && <span className="chip">CARDIAC</span>}
                    {hosp.pediatricServices && <span className="chip">PEDIATRIC</span>}
                    {hosp.maternityServices && <span className="chip">MATERNITY</span>}
                  </div>

                  <button
                    className={`btn btn-sm ${isSelected ? 'btn-outline-sky' : 'btn-primary'} mt-2 w-full`}
                    onClick={() => onSelectHospital(hosp)}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle size={14} />
                        <span>Currently Assigned</span>
                      </>
                    ) : (
                      <span>Assign Facility</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
