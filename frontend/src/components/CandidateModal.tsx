import React, { useEffect } from 'react';
import { X, Truck, Clock, Navigation, CheckCircle2, Award } from 'lucide-react';
import { Emergency, Candidate } from '../types';

interface CandidateModalProps {
  emergency: Emergency;
  candidates: Candidate[];
  isLoading: boolean;
  onClose: () => void;
  onAssign: (candidate: Candidate) => void;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({
  emergency,
  candidates,
  isLoading,
  onClose,
  onAssign,
}) => {
  // Support Escape to close and Enter to dispatch top candidate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !isLoading && candidates.length > 0) {
        onAssign(candidates[0]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, candidates, onClose, onAssign]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog candidate-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="flex items-center gap-2">
              <span className={`priority-tag ${emergency.priority.toLowerCase()}`}>
                {emergency.priority}
              </span>
              <h2>Dispatch Recommendation Engine</h2>
            </div>
            <p className="modal-subtitle">
              {emergency.type} incident at {emergency.address}
            </p>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <span>Evaluating nearest available fleet & capability algorithms…</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="empty-state text-amber">
              <p>No available ambulances match the current response criteria.</p>
              <small>All fleet units may currently be deployed or out of service.</small>
            </div>
          ) : (
            <div className="candidate-list">
              <div className="ranking-notice">
                <Award size={16} className="text-amber flex-shrink-0" />
                <span>
                  Candidates ranked by weighted multi-criteria AI score (True Road ETA 35%, Clinical Capabilities 30%, Distance 15%, Availability 10%, Speed 10%).
                </span>
              </div>

              {candidates.map((cand, index) => {
                const isBest = index === 0;
                const matchPct = cand.score <= 1.0 ? Math.round(cand.score * 100) : Math.min(100, Math.round(cand.score));

                return (
                  <div key={cand.ambulance.id} className={`candidate-card ${isBest ? 'best-match' : ''}`}>
                    <div className="candidate-rank-badge">
                      {isBest ? 'TOP RECOMMENDATION' : `#${index + 1}`}
                    </div>

                    <div className="candidate-main">
                      <div className="candidate-title">
                        <div className="match-score-badge">
                          <span className="match-score-num">{matchPct}%</span>
                          <span className="match-score-label">MATCH</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-primary text-sm">{cand.ambulance.registrationNumber}</strong>
                            <span className="candidate-type-badge">{cand.ambulance.type} UNIT</span>
                          </div>
                          <div className="candidate-crew">
                            Driver: <strong>{cand.ambulance.driverName || 'Driver'}</strong> · EMT: <strong>{cand.ambulance.emtName || 'EMT'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Tactical Metric Cards Grid */}
                      <div className="candidate-metrics-grid mt-2">
                        <div className="metric-box">
                          <div className="metric-box-label">
                            <Clock size={11} />
                            <span>Road ETA</span>
                          </div>
                          <strong className="metric-box-val text-amber">{cand.etaMinutes} min</strong>
                        </div>

                        <div className="metric-box">
                          <div className="metric-box-label">
                            <Navigation size={11} />
                            <span>Road Dist</span>
                          </div>
                          <strong className="metric-box-val">{cand.distanceKm} km</strong>
                        </div>

                        <div className="metric-box">
                          <div className="metric-box-label">
                            <CheckCircle2 size={11} />
                            <span>Clinical Fit</span>
                          </div>
                          <strong className="metric-box-val text-emerald">{(cand.capabilityScore * 100).toFixed(0)}%</strong>
                        </div>
                      </div>
                    </div>

                    <div className="candidate-action">
                      <button
                        className={`btn ${isBest ? 'btn-primary' : 'btn-outline'} btn-dispatch-candidate`}
                        onClick={() => onAssign(cand)}
                      >
                        <span>Assign & Dispatch</span>
                        <span className="key-hint">↵</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
