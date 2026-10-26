import React, { useState, useEffect, useRef } from 'react';
import { DashboardData, UserRole, AuthSession } from '../types';
import { Icon } from './common/Icon';
import { Button } from './common/Button';
import { IconButton } from './common/IconButton';
import { Switch } from './common/Switch';
import { MenuPopover } from './common/MenuPopover';
import { Row } from './common/Row';
import { Dialog } from './common/Dialog';

interface NavbarProps {
  data: DashboardData;
  isConnected: boolean;
  isAudioEnabled: boolean;
  currentRole: UserRole;
  authSession?: AuthSession | null;
  onLogout?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onToggleAudio: () => void;
  onOpenNewEmergency: () => void;
  onAutoAssignNext?: () => void;
  autoDispatchEnabled?: boolean;
  onToggleAutoDispatch?: (enabled: boolean) => void;
  onExportData?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  data,
  isConnected,
  isAudioEnabled,
  currentRole,
  authSession,
  onLogout,
  searchQuery = '',
  onSearchChange,
  onToggleAudio,
  onOpenNewEmergency,
  onAutoAssignNext,
  autoDispatchEnabled = false,
  onToggleAutoDispatch,
  onExportData,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const overflowAnchorRef = useRef<HTMLButtonElement>(null);
  const userMenuAnchorRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format user display name in Title Case
  const formatUserName = (raw?: string | null) => {
    if (!raw) return 'Chief Dispatcher';
    // Remove badges like (Chief Dispatcher) or extract clean name
    const clean = raw.split('(')[0].replace(/Officer\s*/i, '').trim();
    if (!clean || clean.toUpperCase() === 'DFGG') return 'Alex Rivera';
    // Title Case
    return clean
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const displayName = formatUserName(authSession?.userLabel);

  return (
    <>
      <header
        className="m3-cad-header"
        style={{
          height: '64px',
          width: '100%',
          maxWidth: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxSizing: 'border-box',
          backgroundColor: 'var(--md-sys-color-surface)',
          borderBottom: '1px solid var(--md-sys-color-outline)',
          flexShrink: 0,
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        {/* Left: 32px logo, "Aegis Dispatch", small "Prototype" chip */}
        <Row gap={8} align="center" style={{ flexShrink: 0 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="shield" size={20} />
          </div>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 500,
              color: 'var(--md-sys-color-text)',
              whiteSpace: 'nowrap',
            }}
          >
            Aegis Dispatch
          </span>
          <span
            className="m3-hide-mobile"
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-surface-variant)',
              color: 'var(--md-sys-color-on-surface-variant)',
              fontWeight: 500,
              marginLeft: '8px',
            }}
          >
            Prototype
          </span>
        </Row>

        {/* Center: Search field (360-480px, 40px tall, full-pill, outlined) */}
        {onSearchChange && currentRole === 'DISPATCHER' && (
          <div
            className="m3-hide-tablet"
            style={{
              width: '100%',
              maxWidth: '440px',
              height: '40px',
              borderRadius: '20px',
              border: '1px solid var(--md-sys-color-outline)',
              backgroundColor: 'var(--md-sys-color-surface-high)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              boxSizing: 'border-box',
              gap: '8px',
              margin: '0 16px',
            }}
          >
            <Icon name="search" size={20} style={{ color: 'var(--md-sys-color-text-secondary)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search incidents, units, hospitals"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '14px',
                color: 'var(--md-sys-color-text)',
                fontFamily: 'inherit',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--md-sys-color-text-secondary)',
                }}
                aria-label="Clear search"
              >
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        )}

        {/* Right side controls */}
        <Row gap={8} align="center" style={{ flexShrink: 0 }}>
          {/* Connection chip: "Live" + subtle pulsing 6px dot */}
          <div
            className="m3-hide-tablet"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '16px',
              backgroundColor: 'var(--md-sys-color-surface-variant)',
              fontSize: '12px',
              color: 'var(--md-sys-color-text)',
              userSelect: 'none',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isConnected ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-error)',
                display: 'inline-block',
              }}
            />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>

          {/* Clock: hh:mm:ss in tabular numerals (Roboto, not mono) */}
          <div
            className="m3-hide-mobile"
            style={{
              fontSize: '14px',
              fontFeatureSettings: '"tnum"',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--md-sys-color-text-secondary)',
              userSelect: 'none',
              minWidth: '60px',
              textAlign: 'center',
            }}
          >
            {currentTime || '00:00:00'}
          </div>

          {/* Theme toggle */}
          {onToggleTheme && (
            <IconButton
              icon={theme === 'dark' ? 'light_mode' : 'dark_mode'}
              size="standard"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            />
          )}

          {/* Auto-dispatch toggle (Switch with label, default OFF) */}
          {currentRole === 'DISPATCHER' && onToggleAutoDispatch && (
            <div className="m3-hide-tablet">
              <Switch
                checked={autoDispatchEnabled}
                onChange={onToggleAutoDispatch}
                label="Auto-dispatch"
              />
            </div>
          )}

          {/* "New incident" filled button (40px, primary) */}
          {currentRole === 'DISPATCHER' && (
            <Button
              variant="filled"
              size="standard"
              icon="add"
              onClick={onOpenNewEmergency}
              style={{ height: '40px' }}
            >
              <span className="m3-hide-mobile">New incident</span>
            </Button>
          )}

          {/* User avatar with chevron */}
          <div style={{ position: 'relative' }}>
            <button
              ref={userMenuAnchorRef}
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '20px',
                color: 'var(--md-sys-color-text)',
                backgroundColor: isUserMenuOpen ? 'var(--md-sys-color-surface-variant)' : 'transparent',
              }}
              aria-label="User account menu"
              aria-expanded={isUserMenuOpen}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--md-sys-color-primary-container)',
                  color: 'var(--md-sys-color-on-primary-container)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {displayName.charAt(0)}
              </div>
              <Icon name="expand_more" size={18} />
            </button>

            <MenuPopover
              isOpen={isUserMenuOpen}
              anchorRef={userMenuAnchorRef}
              onClose={() => setIsUserMenuOpen(false)}
              width={200}
            >
              <div style={{ padding: '8px 16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--md-sys-color-text)' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                  Dispatcher
                </div>
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--md-sys-color-outline)', margin: '4px 0' }} />
              {onLogout && (
                <button
                  type="button"
                  className="m3-menu-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    color: 'var(--md-sys-color-error)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Icon name="logout" size={20} />
                  <span>Sign out</span>
                </button>
              )}
            </MenuPopover>
          </div>

          {/* Overflow ⋮ IconButton: MenuPopover with AT MOST 5 items */}
          <div style={{ position: 'relative' }}>
            <IconButton
              icon="more_vert"
              size="standard"
              onClick={() => setIsOverflowOpen(!isOverflowOpen)}
              aria-label="More options"
            />

            <MenuPopover
              isOpen={isOverflowOpen}
              anchorRef={overflowAnchorRef}
              onClose={() => setIsOverflowOpen(false)}
              width={200}
            >
            {/* 1. Export analytics (CSV) */}
            <button
              type="button"
              className="m3-menu-item"
              onClick={() => {
                setIsOverflowOpen(false);
                if (onExportData) onExportData();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                color: 'var(--md-sys-color-text)',
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon name="file_download" size={20} />
              <span>Export analytics (CSV)</span>
            </button>

            {/* 2. Mute alerts */}
            <button
              type="button"
              className="m3-menu-item"
              onClick={() => {
                setIsOverflowOpen(false);
                onToggleAudio();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                color: 'var(--md-sys-color-text)',
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon name={isAudioEnabled ? 'volume_off' : 'volume_up'} size={20} />
              <span>{isAudioEnabled ? 'Mute alerts' : 'Unmute alerts'}</span>
            </button>

            {/* 3. About / Prototype */}
            <button
              type="button"
              className="m3-menu-item"
              onClick={() => {
                setIsOverflowOpen(false);
                setIsAboutOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                color: 'var(--md-sys-color-text)',
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon name="info" size={20} />
              <span>About / Prototype</span>
            </button>

            {/* 5. Sign out */}
            {onLogout && (
              <>
                <div style={{ height: '1px', backgroundColor: 'var(--md-sys-color-outline)', margin: '4px 0' }} />
                <button
                  type="button"
                  className="m3-menu-item"
                  onClick={() => {
                    setIsOverflowOpen(false);
                    onLogout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    color: 'var(--md-sys-color-error)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Icon name="logout" size={20} />
                  <span>Sign out</span>
                </button>
              </>
            )}
          </MenuPopover>
        </div>
      </Row>
      </header>

      {/* About Dialog */}
      <Dialog
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        title="About Aegis Dispatch"
        confirmLabel="Close"
        onConfirm={() => setIsAboutOpen(false)}
      >
        <div style={{ fontSize: '14px', lineHeight: '20px', color: 'var(--md-sys-color-text-secondary)' }}>
          <p style={{ marginTop: 0 }}>
            Aegis is an emergency response and dispatch coordination prototype built on Google Material Design 3.
          </p>
          <p>
            It provides unified real-time dispatch management, paramedic vehicle routing, hospital emergency department coordination, and citizen assistance.
          </p>
        </div>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="CAD Terminal Settings"
        confirmLabel="Save"
        onConfirm={() => setIsSettingsOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--md-sys-color-text)' }}>Audible dispatch chimes</div>
              <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>Play sound on new high-priority incidents</div>
            </div>
            <Switch checked={isAudioEnabled} onChange={onToggleAudio} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--md-sys-color-text)' }}>Automatic dispatch suggestions</div>
              <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>Highlight best-fit units using OSRM travel time</div>
            </div>
            <Switch
              checked={autoDispatchEnabled}
              onChange={(c) => onToggleAutoDispatch && onToggleAutoDispatch(c)}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
};
