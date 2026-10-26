import React from 'react';
import { Dialog, Button, Stack, Row, Icon } from './common';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="About Aegis Dispatch"
      confirmLabel="Close"
      onConfirm={onClose}
    >
      <Stack gap={16}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="shield" size={22} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
              Aegis Computer-Aided Dispatch & First Responder Platform
            </div>
            <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
              Version 2.0 • Full-Stack Open CAD System
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--md-sys-color-error-container)',
            color: 'var(--md-sys-color-error)',
            fontSize: '12px',
            lineHeight: '18px',
          }}
        >
          <strong>Regulatory & Safety Disclaimer:</strong> This software is an engineering reference implementation and is NOT certified as a medical device or emergency dispatch system under FDA, CE, CDSCO, or municipal standards. It is not affiliated with, endorsed by, or operated on behalf of any government agency, 911/112 authority, or public emergency service.
        </div>

        <Stack gap={6}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--md-sys-color-text-muted)' }}>
            Data Stored & Processed:
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', lineHeight: '18px', color: 'var(--md-sys-color-text-secondary)' }}>
            <li>Emergency incident records (caller name, phone, address, coordinates, triage priority)</li>
            <li>Ambulance fleet status, license registrations, and live GPS coordinates</li>
            <li>Hospital facility capacity, emergency department diversion states, bed counts</li>
            <li>Clinical vitals transmitted by field paramedics during active missions</li>
            <li>Immutable audit event log tracking all state transitions with actor IDs and timestamps</li>
          </ul>
        </Stack>
      </Stack>
    </Dialog>
  );
};
