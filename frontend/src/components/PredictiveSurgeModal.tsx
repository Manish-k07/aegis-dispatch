import React, { useState } from 'react';
import {
  TrendingUp,
  MapPin,
  Clock,
  Zap,
  CheckCircle2,
  X,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface PredictiveSurgeModalProps {
  onClose: () => void;
  onExecutePreposition: (unit: string, targetSector: string) => void;
}

export const PredictiveSurgeModal: React.FC<PredictiveSurgeModalProps> = ({
  onClose,
  onExecutePreposition,
}) => {
  const [executed, setExecuted] = useState(false);

  const zones = [
    {
      sector: 'Sector 2: Indiranagar & 100ft Road Corridor',
      surgeRisk: '88% PROBABILITY (PEAK)',
      timeWindow: '18:00 – 21:30 Rush Hour',
      factors: 'High vehicular density, rain-slicked road surfaces, metro crossing bottleneck',
      historicalIncidents: '4.2 calls / hour (accidents, trauma)',
      recommendedUnit: 'KA-01-AE-1002 (BLS)',
      action: 'Pre-position from Richmond to CMH Road Junction',
      projectedSavings: '3.4 min reduction in response latency',
    },
    {
      sector: 'Sector 1: Koramangala 4th & 5th Block',
      surgeRisk: '72% PROBABILITY (HIGH)',
      timeWindow: '19:00 – 23:00 Evening',
      factors: 'Commercial district foot traffic & multi-lane arterial intersections',
      historicalIncidents: '2.8 calls / hour (pedestrian, cardiac)',
      recommendedUnit: 'KA-01-AE-1003 (ALS)',
      action: 'Pre-position from Cunningham to Sony World Signal',
      projectedSavings: '2.9 min reduction in response latency',
    },
    {
      sector: 'Sector 4: Central MG Road & Brigade Junction',
      surgeRisk: '45% PROBABILITY (MODERATE)',
      timeWindow: 'Current Operational Window',
      factors: 'Central Metro district; unit KA-01-AE-1001 currently on station',
      historicalIncidents: '1.9 calls / hour',
      recommendedUnit: 'KA-01-AE-1001 (ALS)',
      action: 'Hold station at Aegis Medical Hub',
      projectedSavings: 'Optimal baseline coverage maintained',
    },
  ];

  const handleExecute = (unit: string, sector: string) => {
    onExecutePreposition(unit, sector);
    setExecuted(true);
    setTimeout(() => {
      setExecuted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog predictive-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-sky" size={20} />
            <div>
              <h2>Predictive CAD Resource Allocation & Demand Surge Engine</h2>
              <p className="modal-subtitle">AI spatial-temporal models forecast emergency call densities to dynamically pre-position ready fleet units.</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="predictive-zones-list">
            {zones.map((zone, idx) => (
              <div key={idx} className="predictive-zone-card">
                <div className="zone-header">
                  <div>
                    <h3 className="zone-name">{zone.sector}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-xs text-secondary">
                        <Clock size={12} />
                        {zone.timeWindow}
                      </span>
                      <span className="dot-sep">·</span>
                      <span className="text-xs text-muted">Density: {zone.historicalIncidents}</span>
                    </div>
                  </div>
                  <span className={`priority-tag ${idx === 0 ? 'critical' : idx === 1 ? 'high' : 'medium'}`}>
                    {zone.surgeRisk}
                  </span>
                </div>

                <div className="zone-body mt-2">
                  <p className="text-secondary text-xs">{zone.factors}</p>

                  <div className="recommendation-box mt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-amber" />
                        <span className="text-xs font-bold text-primary">AI Pre-Position Directive:</span>
                      </div>
                      <span className="text-xs font-bold text-emerald">{zone.projectedSavings}</span>
                    </div>
                    <div className="recommendation-text mt-1">
                      Assign <strong>{zone.recommendedUnit}</strong>: {zone.action}
                    </div>

                    <button
                      className="btn btn-sm btn-primary mt-2"
                      onClick={() => handleExecute(zone.recommendedUnit, zone.sector)}
                      disabled={idx === 2}
                    >
                      <ArrowRight size={13} />
                      <span>{idx === 2 ? 'Station Held' : 'Execute Pre-Position Directive'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {executed && (
            <div className="stream-success-pill mt-3">
              <CheckCircle2 size={16} className="text-emerald" />
              <span>Pre-positioning directive dispatched over MDT to vehicle crew!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
