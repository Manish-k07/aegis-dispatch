import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './common';

export interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms' | 'emergency';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'emergency'>(initialTab);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--md-sys-color-surface, #FFFFFF)',
          color: 'var(--md-sys-color-text, #202124)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--md-sys-color-outline-variant, #E8EAED)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="verified_user" size={24} style={{ color: 'var(--md-sys-color-primary, #1A73E8)' }} />
            <h2 id="legal-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              Legal Disclosures & Policies
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--md-sys-color-text-secondary, #5F6368)',
            }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--md-sys-color-outline-variant, #E8EAED)',
            backgroundColor: 'var(--md-sys-color-surface-container, #F1F3F4)',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'privacy'}
            onClick={() => setActiveTab('privacy')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: activeTab === 'privacy' ? 'var(--md-sys-color-surface, #FFFFFF)' : 'transparent',
              borderBottom: activeTab === 'privacy' ? '2px solid var(--md-sys-color-primary, #1A73E8)' : '2px solid transparent',
              color: activeTab === 'privacy' ? 'var(--md-sys-color-primary, #1A73E8)' : 'var(--md-sys-color-text-secondary, #5F6368)',
              fontWeight: activeTab === 'privacy' ? 600 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Icon name="shield" size={16} />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'terms'}
            onClick={() => setActiveTab('terms')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: activeTab === 'terms' ? 'var(--md-sys-color-surface, #FFFFFF)' : 'transparent',
              borderBottom: activeTab === 'terms' ? '2px solid var(--md-sys-color-primary, #1A73E8)' : '2px solid transparent',
              color: activeTab === 'terms' ? 'var(--md-sys-color-primary, #1A73E8)' : 'var(--md-sys-color-text-secondary, #5F6368)',
              fontWeight: activeTab === 'terms' ? 600 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Icon name="gavel" size={16} />
            <span>Terms of Service</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'emergency'}
            onClick={() => setActiveTab('emergency')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: activeTab === 'emergency' ? 'var(--md-sys-color-surface, #FFFFFF)' : 'transparent',
              borderBottom: activeTab === 'emergency' ? '2px solid var(--md-sys-color-emergency, #D93025)' : '2px solid transparent',
              color: activeTab === 'emergency' ? 'var(--md-sys-color-emergency, #D93025)' : 'var(--md-sys-color-text-secondary, #5F6368)',
              fontWeight: activeTab === 'emergency' ? 600 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Icon name="emergency" size={16} />
            <span>Emergency Notice</span>
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            fontSize: '13px',
            lineHeight: '20px',
            color: 'var(--md-sys-color-text, #202124)',
          }}
        >
          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--md-sys-color-primary-container, #E8F0FE)',
                  color: 'var(--md-sys-color-on-primary-container, #174EA6)',
                  fontWeight: 500,
                }}
              >
                Compliance Notice: Formulated in accordance with the Digital Personal Data Protection Act, 2023 and healthcare data confidentiality standards.
              </div>
              <h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600 }}>1. Data We Collect</h3>
              <p style={{ margin: 0 }}>
                We collect personal information necessary for emergency response dispatch: legal name, verified mobile phone number, email address, incident GPS location telemetry, and elective emergency health details (blood group, allergies, current medications, chronic illnesses, and designated emergency contacts).
              </p>
              <h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600 }}>2. Purpose of Collection & Strict Use</h3>
              <p style={{ margin: 0 }}>
                Health profile and location data are strictly utilized to coordinate life-saving triage, ambulance dispatch, paramedic pre-arrival treatment, and receiving hospital emergency department handover. We never sell, monetize, or disclose your personal or medical information to commercial third parties.
              </p>
              <h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600 }}>3. Data Storage & Security Standards</h3>
              <p style={{ margin: 0 }}>
                All sensitive data in transit is encrypted using modern cryptographic protocols. Password hashes are salted and hashed with SHA-256. Audit access logs track medical profile reads with role-based authentication.
              </p>
              <h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600 }}>4. Citizen Rights</h3>
              <p style={{ margin: 0 }}>
                Under applicable data protection laws, you maintain the right to view, correct, update, or request erasure of your optional medical profile information through your citizen dashboard at any time.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600 }}>1. Acceptance of Terms</h3>
              <p style={{ margin: 0 }}>
                By accessing or registering with Aegis Dispatch, you agree to comply with these Terms of Service. These terms govern the use of the emergency dispatch software platform by citizens, responders, dispatchers, and healthcare facilities.
              </p>
              <h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600 }}>2. Permitted Use & Incident Reporting</h3>
              <p style={{ margin: 0 }}>
                Aegis Dispatch must only be used for bona fide medical emergencies, casualty incidents, and certified dispatch operations. Submitting fraudulent, prank, or false emergency calls is strictly prohibited and constitutes an offence under applicable emergency response laws.
              </p>
              <h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600 }}>3. Service Availability & ETA Disclaimer</h3>
              <p style={{ margin: 0 }}>
                Estimated arrival times (ETAs) and vehicle routing are generated based on real-time road telemetry, traffic conditions, and vehicle availability. While the system optimizes ambulance routing, Aegis Dispatch cannot guarantee absolute response times in severe congestion or weather events.
              </p>
              <h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600 }}>4. Limitation of Liability</h3>
              <p style={{ margin: 0 }}>
                Aegis Dispatch provides dispatch coordination software. Emergency treatment remains the professional medical responsibility of attending certified healthcare practitioners and paramedics.
              </p>
            </div>
          )}

          {activeTab === 'emergency' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--md-sys-color-error-container, #FCE8E6)',
                  color: 'var(--md-sys-color-on-error-container, #C5221F)',
                  fontWeight: 600,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <Icon name="warning" size={22} style={{ color: 'var(--md-sys-color-emergency, #D93025)', flexShrink: 0 }} />
                <div>
                  CRITICAL NOTICE: For immediate life-threatening situations (cardiac arrest, unconsciousness, severe hemorrhage, traumatic injury), ALWAYS directly dial National Emergency Services at <strong>112</strong> or <strong>108</strong> without delay.
                </div>
              </div>

              <h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600 }}>Supplemental Digital Dispatch Notice</h3>
              <p style={{ margin: 0 }}>
                Aegis Dispatch operates as an integrated Computer-Aided Dispatch (CAD) and patient pre-arrival telemetry platform. It assists field units and receiving trauma centers with real-time vitals and digital navigation.
              </p>
              <p style={{ margin: 0 }}>
                Digital dispatch transmissions require working cellular connectivity or data networks. If your mobile device experiences network loss, switch to direct voice calling immediately via 112 or 108.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--md-sys-color-outline-variant, #E8EAED)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'var(--md-sys-color-surface-container, #F1F3F4)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--md-sys-color-primary, #1A73E8)',
              color: '#FFFFFF',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
