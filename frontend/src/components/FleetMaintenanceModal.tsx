import React from 'react';
import { Ambulance, MaintenanceDiagnostic } from '../types';
import {
  Wrench,
  BatteryCharging,
  Fuel,
  Gauge,
  Activity,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldCheck,
  Calendar
} from 'lucide-react';

interface FleetMaintenanceModalProps {
  ambulances: Ambulance[];
  onClose: () => void;
}

export const FleetMaintenanceModal: React.FC<FleetMaintenanceModalProps> = ({
  ambulances,
  onClose,
}) => {
  const diagnostics: MaintenanceDiagnostic[] = [
    {
      ambulanceId: '20000000-0000-0000-0000-000000000001',
      registrationNumber: 'KA-01-AE-1001',
      fuelOrBatteryPercent: 88,
      isElectric: true,
      odometerKm: 34120,
      oxygenTankPsi: 1980,
      defibrillatorStatus: 'Pass (Tested 08:00)',
      nextServiceDueKm: 1880,
    },
    {
      ambulanceId: '20000000-0000-0000-0000-000000000002',
      registrationNumber: 'KA-01-AE-1002',
      fuelOrBatteryPercent: 74,
      isElectric: false,
      odometerKm: 58210,
      oxygenTankPsi: 1850,
      defibrillatorStatus: 'Pass (Tested 07:45)',
      nextServiceDueKm: 790,
    },
    {
      ambulanceId: '20000000-0000-0000-0000-000000000003',
      registrationNumber: 'KA-01-AE-1003',
      fuelOrBatteryPercent: 92,
      isElectric: true,
      odometerKm: 21950,
      oxygenTankPsi: 2050,
      defibrillatorStatus: 'Pass (Tested 08:15)',
      nextServiceDueKm: 3050,
    },
    {
      ambulanceId: '20000000-0000-0000-0000-000000000004',
      registrationNumber: 'KA-01-AE-1004',
      fuelOrBatteryPercent: 35,
      isElectric: false,
      odometerKm: 89400,
      oxygenTankPsi: 1200,
      defibrillatorStatus: 'Scheduled Calibration',
      nextServiceDueKm: 0,
      alert: 'Brake pads & Transmission maintenance in progress at central depot',
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog maintenance-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Wrench className="text-amber" size={20} />
            <div>
              <h2>Fleet Readiness & Preventative Maintenance Hub</h2>
              <p className="modal-subtitle">Real-time telemetry on fuel, oxygen cylinders, defibrillator tests, and service intervals.</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="maintenance-grid">
            {diagnostics.map((diag) => {
              const amb = ambulances.find((a) => a.id === diag.ambulanceId);
              const isOOS = amb?.status === 'OUT_OF_SERVICE';

              return (
                <div key={diag.ambulanceId} className={`maintenance-card ${isOOS ? 'oos' : 'operational'}`}>
                  <div className="maintenance-card-header">
                    <div>
                      <strong className="text-sm">{diag.registrationNumber}</strong>
                      <span className="candidate-type-badge ml-2">{amb?.type || 'ALS'} UNIT</span>
                    </div>
                    <span className={`status-pill ${isOOS ? 'busy' : 'ok'}`}>
                      {isOOS ? 'IN DEPOT' : 'MISSION READY'}
                    </span>
                  </div>

                  <div className="diagnostics-metrics-grid mt-2">
                    <div className="diag-box">
                      <div className="diag-label">
                        {diag.isElectric ? <BatteryCharging size={12} className="text-emerald" /> : <Fuel size={12} className="text-amber" />}
                        <span>{diag.isElectric ? 'EV Battery' : 'Fuel Level'}</span>
                      </div>
                      <strong className="diag-val">{diag.fuelOrBatteryPercent}%</strong>
                    </div>

                    <div className="diag-box">
                      <div className="diag-label">
                        <Gauge size={12} className="text-sky" />
                        <span>O2 Cylinder</span>
                      </div>
                      <strong className="diag-val text-sky">{diag.oxygenTankPsi} PSI</strong>
                    </div>

                    <div className="diag-box">
                      <div className="diag-label">
                        <Activity size={12} className="text-red" />
                        <span>Defibrillator</span>
                      </div>
                      <strong className="diag-val text-emerald">PASSED</strong>
                    </div>

                    <div className="diag-box">
                      <div className="diag-label">
                        <Calendar size={12} className="text-secondary" />
                        <span>Next Service</span>
                      </div>
                      <strong className="diag-val">{diag.nextServiceDueKm > 0 ? `${diag.nextServiceDueKm} km` : 'DUE NOW'}</strong>
                    </div>
                  </div>

                  {diag.alert ? (
                    <div className="diag-alert-bar mt-2">
                      <AlertTriangle size={13} className="text-amber flex-shrink-0" />
                      <span>{diag.alert}</span>
                    </div>
                  ) : (
                    <div className="diag-pass-bar mt-2">
                      <ShieldCheck size={13} className="text-emerald flex-shrink-0" />
                      <span>All mechanical systems, telemetry radios, and medical payloads verified.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
