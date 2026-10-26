import React, { useEffect } from 'react';
import { Emergency, Candidate } from '../types';
import { Dialog, Button, Icon } from './common';

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
    <Dialog
      isOpen={true}
      onClose={onClose}
      title="Dispatch Recommendation Engine"
      icon="smart_toy"
      maxWidth="720px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'var(--md-sys-color-error-container)',
                color: 'var(--md-sys-color-on-error-container)',
              }}
            >
              {emergency.priority}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
              {emergency.type} incident
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
            {emergency.address}
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--md-sys-color-text-secondary)', fontSize: '13px' }}>
            Evaluating nearest available fleet &amp; capability algorithms...
          </div>
        ) : candidates.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--md-sys-color-warning)', fontSize: '13px' }}>
            <p style={{ margin: 0, fontWeight: 500 }}>No available ambulances match the current response criteria.</p>
            <small style={{ color: 'var(--md-sys-color-text-secondary)' }}>All fleet units may currently be deployed or out of service.</small>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                fontSize: '12px',
                color: 'var(--md-sys-color-text-secondary)',
              }}
            >
              <Icon name="award_star" size={16} style={{ color: 'var(--md-sys-color-warning)', flexShrink: 0 }} />
              <span>
                Candidates ranked by weighted multi-criteria AI score (True Road ETA 35%, Clinical Capabilities 30%, Distance 15%, Availability 10%, Speed 10%).
              </span>
            </div>

            {candidates.map((cand, index) => {
              const isBest = index === 0;
              const matchPct = cand.score <= 1.0 ? Math.round(cand.score * 100) : Math.min(100, Math.round(cand.score));

              return (
                <div
                  key={cand.ambulance.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: isBest ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container)',
                    border: '1px solid',
                    borderColor: isBest ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--md-sys-color-surface)',
                        textAlign: 'center',
                        border: '1px solid var(--md-sys-color-outline-variant)',
                      }}
                    >
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--md-sys-color-primary)', lineHeight: 1 }}>
                        {matchPct}%
                      </div>
                      <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--md-sys-color-text-secondary)', marginTop: '2px' }}>
                        MATCH
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--md-sys-font-mono, monospace)', fontWeight: 700, fontSize: '14px', color: 'var(--md-sys-color-text)' }}>
                          {cand.ambulance.registrationNumber}
                        </span>
                        <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'var(--md-sys-color-surface)', border: '1px solid var(--md-sys-color-outline)' }}>
                          {cand.ambulance.type}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '2px' }}>
                        Driver: {cand.ambulance.driverName || 'Paramedic'} &bull; ETA: <strong style={{ color: 'var(--md-sys-color-warning)' }}>{cand.etaMinutes} min</strong> ({cand.distanceKm} km)
                      </div>
                    </div>
                  </div>

                  <Button
                    variant={isBest ? 'filled' : 'outlined'}
                    size="standard"
                    icon="check"
                    onClick={() => onAssign(cand)}
                  >
                    Assign &amp; Dispatch
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
