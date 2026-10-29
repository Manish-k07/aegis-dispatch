import React, { useState, useEffect, useRef } from 'react';
import { DEMO_ACCOUNTS, DemoAccount } from '../demo/demoAccounts';
import { Icon } from './common';

export interface DemoModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFillForm?: (role: 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN', identifier: string, secret: string) => void;
  onSignInDirect?: (account: DemoAccount) => void;
  onEnterDemo: (role: 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN') => void;
  selectedTabRole?: 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN';
  triggerElement?: HTMLElement | null;
}

export const DemoModeModal: React.FC<DemoModeModalProps> = ({
  isOpen,
  onClose,
  onFillForm,
  onSignInDirect,
  onEnterDemo,
  selectedTabRole = 'DISPATCHER',
  triggerElement,
}) => {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN'>('ALL');
  const [showConfirmLayer, setShowConfirmLayer] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<DemoAccount | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  // Esc key closes top layer or whole dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConfirmLayer) {
          e.stopPropagation();
          setShowConfirmLayer(false);
          setPendingAccount(null);
        } else {
          onClose();
          if (triggerElement) {
            triggerElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showConfirmLayer, onClose, triggerElement]);

  // Focus trap for Layer 1 & Layer 2
  useEffect(() => {
    if (!isOpen) return;
    if (showConfirmLayer && confirmRef.current) {
      confirmRef.current.focus();
    } else if (dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen, showConfirmLayer]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const text = DEMO_ACCOUNTS.map(a =>
      `[${a.role}] ${a.displayName}\n  ${a.identifierLabel}: ${a.loginIdentifier}\n  ${a.secretLabel}: ${a.loginSecret}\n  Hint: ${a.whatToTry}`
    ).join('\n\n');
    handleCopy(text, 'ALL');
  };

  const togglePasswordVisibility = (accId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [accId]: !prev[accId] }));
  };

  const handleInitiateDirectSignIn = (acc: DemoAccount) => {
    setPendingAccount(acc);
    setShowConfirmLayer(true);
  };

  const handleInitiateEnterDemo = () => {
    // Find first account for selected tab role
    const acc = DEMO_ACCOUNTS.find(a => a.portalTab === selectedTabRole) || DEMO_ACCOUNTS[0];
    setPendingAccount(acc);
    setShowConfirmLayer(true);
  };

  const handleConfirmSwitch = () => {
    setShowConfirmLayer(false);
    if (pendingAccount) {
      if (onSignInDirect) {
        onSignInDirect(pendingAccount);
      } else {
        onEnterDemo(pendingAccount.portalTab);
      }
    } else {
      onEnterDemo(selectedTabRole);
    }
    onClose();
  };

  const filteredAccounts = DEMO_ACCOUNTS.filter(a => {
    if (selectedRoleFilter === 'ALL') return true;
    return a.portalTab === selectedRoleFilter;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'DISPATCHER': return 'cad_operator';
      case 'PARAMEDIC': return 'ambulance';
      case 'HOSPITAL_STAFF': return 'local_hospital';
      case 'CITIZEN': return 'person';
      default: return 'person';
    }
  };

  return (
    <div
      className="m3-dialog-scrim"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      {/* LAYER 1: Main Stacked Modal Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-dialog-title"
        tabIndex={-1}
        className="demo-stacked-modal"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          backgroundColor: 'var(--md-sys-color-surface, #1e293b)',
          color: 'var(--md-sys-color-text, #f8fafc)',
          borderRadius: '24px',
          border: '1px solid var(--md-sys-color-outline-variant, #334155)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--md-sys-color-outline-variant, #334155)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--md-sys-color-primary-container, #0284c7)',
                  color: 'var(--md-sys-color-on-primary-container, #ffffff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="play_arrow" size={22} />
              </div>
              <h2 id="demo-dialog-title" style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
                Demo mode
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--md-sys-color-text-secondary, #94a3b8)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: '18px', color: 'var(--md-sys-color-text-secondary, #94a3b8)' }}>
            Synthetic data. Nothing here is saved to the live system. These logins work only in demo mode. <strong>Do not use demo mode to report a real emergency.</strong>
          </p>

          {/* Segmented Role Filter */}
          <div
            role="tablist"
            aria-label="Role Filter"
            style={{
              display: 'flex',
              gap: '6px',
              marginTop: '16px',
              padding: '4px',
              backgroundColor: 'var(--md-sys-color-surface-container-high, #0f172a)',
              borderRadius: '12px',
              overflowX: 'auto',
            }}
          >
            {[
              { id: 'ALL', label: 'All' },
              { id: 'DISPATCHER', label: 'Dispatcher' },
              { id: 'DRIVER', label: 'Responder' },
              { id: 'HOSPITAL', label: 'Hospital' },
              { id: 'CITIZEN', label: 'Citizen' },
            ].map(tab => {
              const active = selectedRoleFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedRoleFilter(tab.id as any)}
                  style={{
                    flex: 1,
                    minWidth: '70px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: active ? 'var(--md-sys-color-primary, #0284c7)' : 'transparent',
                    color: active ? '#ffffff' : 'var(--md-sys-color-text-secondary, #94a3b8)',
                    transition: 'all 120ms ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Stack of Cards */}
        <div
          style={{
            padding: '20px 28px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {filteredAccounts.map(acc => {
            const isPasswordVisible = !!visiblePasswords[acc.id];
            const isIdCopied = copiedId === `${acc.id}-id`;
            const isSecretCopied = copiedId === `${acc.id}-secret`;

            return (
              <div
                key={acc.id}
                style={{
                  borderRadius: '16px',
                  border: '1px solid var(--md-sys-color-outline-variant, #334155)',
                  backgroundColor: 'var(--md-sys-color-surface-container, #1e293b)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--md-sys-color-primary-container, #0284c7)',
                        color: 'var(--md-sys-color-on-primary-container, #ffffff)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={getRoleIcon(acc.role)} size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-text, #f8fafc)' }}>
                        {acc.displayName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary, #94a3b8)' }}>
                        Portal: {acc.portalTab} {acc.unitRegistration ? `• ${acc.unitRegistration}` : ''} {acc.facilityName ? `• ${acc.facilityName}` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ID & Password Two-Row Layout */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    backgroundColor: 'var(--md-sys-color-surface-container-high, #0f172a)',
                    padding: '10px 14px',
                    borderRadius: '10px',
                  }}
                >
                  {/* Identifier */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-text-muted, #64748b)' }}>
                      {acc.identifierLabel}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'monospace' }}>
                        {acc.loginIdentifier}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(acc.loginIdentifier, `${acc.id}-id`)}
                        title="Copy to clipboard"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isIdCopied ? 'var(--md-sys-color-primary, #0284c7)' : 'var(--md-sys-color-text-secondary, #94a3b8)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Icon name={isIdCopied ? 'check' : 'content_copy'} size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Secret */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-text-muted, #64748b)' }}>
                      {acc.secretLabel}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'monospace' }}>
                        {isPasswordVisible ? acc.loginSecret : '••••••••'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(acc.id)}
                          title={isPasswordVisible ? 'Hide' : 'Show'}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--md-sys-color-text-secondary, #94a3b8)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Icon name={isPasswordVisible ? 'visibility_off' : 'visibility'} size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(acc.loginSecret, `${acc.id}-secret`)}
                          title="Copy to clipboard"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isSecretCopied ? 'var(--md-sys-color-primary, #0284c7)' : 'var(--md-sys-color-text-secondary, #94a3b8)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Icon name={isSecretCopied ? 'check' : 'content_copy'} size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* What to try hint */}
                <div style={{ fontSize: '12px', lineHeight: '16px', color: 'var(--md-sys-color-text-secondary, #94a3b8)' }}>
                  💡 <strong>Try this:</strong> {acc.whatToTry}
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {onFillForm && (
                    <button
                      type="button"
                      onClick={() => {
                        onFillForm(acc.portalTab, acc.loginIdentifier, acc.loginSecret);
                        onClose();
                      }}
                      style={{
                        flex: 1,
                        minHeight: '44px',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--md-sys-color-outline, #475569)',
                        backgroundColor: 'transparent',
                        color: 'var(--md-sys-color-text, #f8fafc)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Icon name="edit_note" size={16} />
                      Fill login form
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleInitiateDirectSignIn(acc)}
                    style={{
                      flex: 1,
                      minHeight: '44px',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: 'var(--md-sys-color-primary, #0284c7)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Icon name="login" size={16} />
                    Sign in as this user
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--md-sys-color-outline-variant, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handleCopyAll}
              style={{
                background: 'none',
                border: 'none',
                color: copiedId === 'ALL' ? 'var(--md-sys-color-primary, #0284c7)' : 'var(--md-sys-color-text-secondary, #94a3b8)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Icon name={copiedId === 'ALL' ? 'check' : 'content_copy'} size={15} />
              {copiedId === 'ALL' ? 'Copied all logins' : 'Copy all logins'}
            </button>
            <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-muted, #64748b)', display: 'flex', gap: '8px' }}>
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Terms</a>
              <span>•</span>
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy</a>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                minHeight: '44px',
                padding: '8px 18px',
                borderRadius: '10px',
                border: '1px solid var(--md-sys-color-outline, #475569)',
                backgroundColor: 'transparent',
                color: 'var(--md-sys-color-text, #f8fafc)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleInitiateEnterDemo}
              style={{
                minHeight: '44px',
                padding: '8px 20px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'var(--md-sys-color-primary, #0284c7)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Icon name="play_arrow" size={18} />
              Enter demo mode
            </button>
          </div>
        </div>
      </div>

      {/* LAYER 2: Confirmation Card Stacked Above Layer 1 */}
      {showConfirmLayer && (
        <div
          ref={confirmRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-switch-title"
          tabIndex={-1}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            outline: 'none',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: 'var(--md-sys-color-surface, #1e293b)',
              color: 'var(--md-sys-color-text, #f8fafc)',
              borderRadius: '20px',
              border: '1px solid var(--md-sys-color-outline, #475569)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--md-sys-color-warning-container, #854d0e)',
                  color: 'var(--md-sys-color-warning, #fef08a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="warning" size={24} />
              </div>
              <h3 id="confirm-switch-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
                Switch to demo mode?
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '13px', lineHeight: '20px', color: 'var(--md-sys-color-text-secondary, #94a3b8)' }}>
              You will be signed out of any active live session. Demo data is <strong>synthetic</strong> and is not saved to the live operational database.
            </p>

            {pendingAccount && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--md-sys-color-surface-container-high, #0f172a)',
                  fontSize: '12px',
                }}
              >
                Signing in as: <strong>{pendingAccount.displayName}</strong> ({pendingAccount.portalTab})
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmLayer(false);
                  setPendingAccount(null);
                }}
                style={{
                  minHeight: '44px',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--md-sys-color-outline, #475569)',
                  backgroundColor: 'transparent',
                  color: 'var(--md-sys-color-text, #f8fafc)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitch}
                style={{
                  minHeight: '44px',
                  padding: '8px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'var(--md-sys-color-primary, #0284c7)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Continue to Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
