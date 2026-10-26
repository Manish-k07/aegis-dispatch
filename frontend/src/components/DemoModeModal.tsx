import React, { useState } from 'react';
import { Dialog, Button, Stack, Row, Icon, StatusChip } from './common';

export interface DemoModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterDemo: (role: 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN') => void;
  selectedTabRole?: 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN';
}

export const DemoModeModal: React.FC<DemoModeModalProps> = ({
  isOpen,
  onClose,
  onEnterDemo,
  selectedTabRole = 'DISPATCHER',
}) => {
  const [chosenRole, setChosenRole] = useState<'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN'>(selectedTabRole);

  const demoAccounts = [
    {
      role: 'DISPATCHER' as const,
      title: 'CAD Dispatcher',
      icon: 'shield',
      badge: 'DISPATCH-01',
      pin: 'Dispatch@2026',
      description: 'Central emergency queue, GPS fleet tracking & auto-assign',
    },
    {
      role: 'DRIVER' as const,
      title: 'Paramedic / Driver',
      icon: 'ambulance',
      badge: 'MEDIC-101',
      pin: '4321',
      description: 'Mobile Data Terminal (MDT) with turn-by-turn routing & vitals',
    },
    {
      role: 'HOSPITAL' as const,
      title: 'Hospital Emergency Dept',
      icon: 'local_hospital',
      badge: 'HOSP-101',
      pin: 'Hospital@2001',
      description: 'Aegis City General ED with bed steppers & live inbound telemetry',
    },
    {
      role: 'CITIZEN' as const,
      title: 'Citizen / Patient',
      icon: 'emergency',
      badge: '9845012345',
      pin: 'Citizen@2026',
      description: 'Instant 1-tap SOS, automated triage & ambulance tracking',
    },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Demo Mode Simulator"
      confirmLabel="Enter demo mode"
      cancelLabel="Cancel"
      onConfirm={() => {
        onEnterDemo(chosenRole);
        onClose();
      }}
    >
      <Stack gap={16}>
        <div style={{ fontSize: '13px', lineHeight: '18px', color: 'var(--md-sys-color-text-secondary)' }}>
          Demo mode runs an <strong>in-browser synthetic simulation</strong> with simulated ambulances, incidents, and telemetry. No network calls are made to the live backend server.
        </div>

        <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--md-sys-color-text-muted)' }}>
          Select Demo Persona to Sign In:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
          {demoAccounts.map((acc) => {
            const isSelected = chosenRole === acc.role;
            return (
              <div
                key={acc.role}
                onClick={() => setChosenRole(acc.role)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `1px solid ${isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'}`,
                  backgroundColor: isSelected ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface)',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container)',
                      color: isSelected ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={acc.icon} size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                      {acc.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)' }}>
                      ID: <code style={{ fontFamily: 'monospace' }}>{acc.badge}</code> • PIN: <code style={{ fontFamily: 'monospace' }}>{acc.pin}</code>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <StatusChip tone="info" label="Selected" size="small" />
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'var(--md-sys-color-warning-container)',
            color: 'var(--md-sys-color-warning)',
            borderRadius: '8px',
            fontSize: '11px',
            lineHeight: '15px',
          }}
        >
          <strong>Notice:</strong> Demo credentials work ONLY in Demo Mode and are validated locally in-browser. They will be rejected as unauthorized in Live Mode.
        </div>
      </Stack>
    </Dialog>
  );
};
