import React, { useState, useEffect, useRef } from 'react';
import { DashboardData, UserRole, AuthSession } from '../types';
import { Icon } from './common/Icon';
import { Button } from './common/Button';
import { IconButton } from './common/IconButton';
import { Switch } from './common/Switch';
import { MenuPopover } from './common/MenuPopover';
import { Dialog } from './common/Dialog';
import { Tooltip } from './common/Tooltip';
import { formatTime } from '../utils/time';

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
  const [currentTime, setCurrentTime] = useState<string>(() => formatTime(new Date()));
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const userMenuAnchorRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(formatTime(new Date()));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format user display name in Title Case
  const formatUserName = (raw?: string | null) => {
    if (!raw) return 'Chief Dispatcher';
    const clean = raw.split('(')[0].replace(/Officer\s*/i, '').trim();
    if (!clean || clean.toUpperCase() === 'DFGG') return 'Alex Rivera';
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
          display: 'grid',
          gridTemplateColumns: 'auto minmax(240px, 1fr) auto',
          alignItems: 'center',
          padding: '0 16px',
          boxSizing: 'border-box',
          backgroundColor: 'var(--md-sys-color-surface)',
          borderBottom: '1px solid var(--md-sys-color-outline)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1000,
          overflow: 'visible',
        }}
      >
        {/* Left: 32px logo + "Aegis Dispatch" + small "Prototype" chip (8px gap) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
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
              fontSize: '11px',
              lineHeight: '14px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline)',
              color: 'var(--md-sys-color-text-secondary)',
              fontWeight: 500,
              marginLeft: '8px',
            }}
          >
            Prototype
          </span>
        </div>

        {/* Center: Search field (360-560px, 40px tall, full-pill, centered in column) */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px', width: '100%', boxSizing: 'border-box' }}>
          {onSearchChange && currentRole === 'DISPATCHER' && (
            <div
              className="m3-hide-tablet"
              style={{
                width: '100%',
                maxWidth: '560px',
                height: '40px',
                borderRadius: '20px',
                border: '1px solid var(--md-sys-color-outline)',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                boxSizing: 'border-box',
                gap: '8px',
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
        </div>

        {/* Right cluster: 12px gaps, ALL controls 40px tall, vertically centered on midline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end', flexShrink: 0 }}>
          {/* Status chip: dot + "Live" + clock as ONE unified chip with a divider */}
          <div
            className="m3-hide-tablet"
            style={{
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 12px',
              borderRadius: '20px',
              border: '1px solid var(--md-sys-color-outline)',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              fontSize: '13px',
              color: 'var(--md-sys-color-text)',
              userSelect: 'none',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isConnected ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-error)',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 600 }}>{isConnected ? 'Live' : 'Offline'}</span>
            <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--md-sys-color-outline)' }} />
            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--md-sys-color-text-secondary)' }}>
              {currentTime}
            </span>
          </div>

          {/* Auto-dispatch: switch with label inside one 40px tonal container */}
          {currentRole === 'DISPATCHER' && onToggleAutoDispatch && (
            <div
              className="m3-hide-tablet"
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                borderRadius: '20px',
                border: '1px solid var(--md-sys-color-outline)',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                boxSizing: 'border-box',
              }}
            >
              <Switch
                checked={autoDispatchEnabled}
                onChange={onToggleAutoDispatch}
                label="Auto-dispatch"
              />
            </div>
          )}

          {/* "New incident" filled button (40px, solid primary) */}
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

          {/* Theme icon button 40x40 with tooltip */}
          {onToggleTheme && (
            <Tooltip content={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
              <IconButton
                icon={theme === 'dark' ? 'light_mode' : 'dark_mode'}
                size="standard"
                onClick={onToggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                style={{ width: '40px', height: '40px' }}
              />
            </Tooltip>
          )}

          {/* User avatar menu: avatar + chevron, 40px tall (merges overflow items) */}
          <div style={{ position: 'relative' }}>
            <button
              ref={userMenuAnchorRef}
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: '1px solid var(--md-sys-color-outline)',
                cursor: 'pointer',
                padding: '0 10px 0 4px',
                borderRadius: '20px',
                color: 'var(--md-sys-color-text)',
                backgroundColor: isUserMenuOpen ? 'var(--md-sys-color-surface-container)' : 'transparent',
                boxSizing: 'border-box',
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
                  fontSize: '13px',
                  fontWeight: 600,
                  flexShrink: 0,
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
              width={220}
            >
              {/* Header: User initials / display name + role */}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                  Chief Dispatcher · CAD
                </div>
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--md-sys-color-outline-variant)', margin: '4px 0' }} />

              {/* 1. Export analytics (CSV) */}
              {onExportData && (
                <button
                  type="button"
                  className="m3-menu-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onExportData();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
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
              )}

              {/* 2. Mute / Unmute alerts */}
              <button
                type="button"
                className="m3-menu-item"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onToggleAudio();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
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
                  setIsUserMenuOpen(false);
                  setIsAboutOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
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

              {/* 4. Log out */}
              {onLogout && (
                <>
                  <div style={{ height: '1px', backgroundColor: 'var(--md-sys-color-outline-variant)', margin: '4px 0' }} />
                  <button
                    type="button"
                    className="m3-menu-item m3-menu-item-logout"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'none',
                      color: 'var(--md-sys-color-error)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Icon name="logout" size={20} />
                    <span>Log out</span>
                  </button>
                </>
              )}
            </MenuPopover>
          </div>
        </div>
      </header>

      {/* About / Prototype Dialog */}
      <Dialog
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        title="About Aegis Dispatch"
        confirmLabel="Close"
        onConfirm={() => setIsAboutOpen(false)}
      >
        <div style={{ fontSize: '14px', lineHeight: '20px', color: 'var(--md-sys-color-text-secondary)' }}>
          <p style={{ marginTop: 0 }}>
            Aegis is an emergency medical response and dispatch coordination prototype built on Google Material Design 3.
          </p>
          <p>
            It provides unified real-time dispatch management, paramedic vehicle routing, hospital emergency department coordination, and citizen assistance.
          </p>
        </div>
      </Dialog>
    </>
  );
};
