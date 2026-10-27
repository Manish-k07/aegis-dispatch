import React, { useState, useEffect } from 'react';
import { Ambulance, Hospital, AuthSession, CitizenProfile } from '../types';
import { ENABLE_DEMO_BUTTON } from '../config';
import { useMode } from '../services/ModeProvider';
import { DemoModeModal } from './DemoModeModal';
import { DemoBarChip } from './DemoBarChip';
import {
  PageContainer,
  Stack,
  Row,
  Card,
  Field,
  Select,
  Button,
  Icon,
} from './common';

export type DepartmentalTerminal = 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN' | 'ADMIN';

interface LoginGatewayProps {
  ambulances: Ambulance[];
  hospitals: Hospital[];
  onLogin: (session: AuthSession) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const LoginGateway: React.FC<LoginGatewayProps> = ({
  ambulances,
  hospitals,
  onLogin,
  theme = 'light',
  onToggleTheme,
}) => {
  const { mode, dataSource, setMode } = useMode();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [activeTerminal, setActiveTerminal] = useState<DepartmentalTerminal>('DISPATCHER');

  // Input states
  const [dispatcherBadge, setDispatcherBadge] = useState('');
  const [dispatcherPin, setDispatcherPin] = useState('');
  const [dispatcherError, setDispatcherError] = useState<string | null>(null);

  const [driverBadge, setDriverBadge] = useState('');
  const [driverPin, setDriverPin] = useState('');
  const [driverError, setDriverError] = useState<string | null>(null);

  const [hospitalStaffBadge, setHospitalStaffBadge] = useState('');
  const [hospitalPin, setHospitalPin] = useState('');
  const [hospitalError, setHospitalError] = useState<string | null>(null);

  const [citizenLoginId, setCitizenLoginId] = useState('');
  const [citizenPassword, setCitizenPassword] = useState('');
  const [citizenLoginError, setCitizenLoginError] = useState<string | null>(null);

  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [citizenMode, setCitizenMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [registrationSuccessMsg, setRegistrationSuccessMsg] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const handleSelectTerminal = (terminal: DepartmentalTerminal) => {
    setActiveTerminal(terminal);
    setDispatcherError(null);
    setDriverError(null);
    setHospitalError(null);
    setCitizenLoginError(null);
    setAdminError(null);
    setRegistrationSuccessMsg(null);
    setRegError(null);
  };

  // Dispatcher submit
  const handleDispatcherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatcherError(null);
    const badge = dispatcherBadge.trim();
    const pin = dispatcherPin.trim();

    if (!badge || !pin) {
      setDispatcherError('Please enter both your badge number and security PIN.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await dataSource.login({
        role: 'DISPATCHER',
        badgeNumber: badge,
        pin: pin,
      });
      setIsLoading(false);
      onLogin(session);
    } catch (err: any) {
      setIsLoading(false);
      setDispatcherError(err.message || 'Authentication failed. Invalid badge number or security PIN.');
    }
  };

  // Paramedic / Responder submit
  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverError(null);
    const badge = driverBadge.trim();
    const pin = driverPin.trim();

    if (!badge || !pin) {
      setDriverError('Please fill in paramedic badge ID and security PIN.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await dataSource.login({
        role: 'DRIVER',
        badgeNumber: badge,
        pin: pin,
      });
      setIsLoading(false);
      onLogin(session);
    } catch (err: any) {
      setIsLoading(false);
      setDriverError(err.message || 'Authentication rejected. Invalid credentials.');
    }
  };

  // Hospital ED submit
  const handleHospitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHospitalError(null);
    const badge = hospitalStaffBadge.trim();
    const pin = hospitalPin.trim();

    if (!badge || !pin) {
      setHospitalError('Please enter medical staff badge ID and security PIN.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await dataSource.login({
        role: 'HOSPITAL',
        badgeNumber: badge,
        pin: pin,
      });
      setIsLoading(false);
      onLogin(session);
    } catch (err: any) {
      setIsLoading(false);
      setHospitalError(err.message || 'Access denied. Invalid facility credentials.');
    }
  };

  // Citizen Login submit
  const handleCitizenLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCitizenLoginError(null);
    const input = citizenLoginId.trim();
    const password = citizenPassword.trim();

    if (!input || !password) {
      setCitizenLoginError('Please enter your mobile phone number and password.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await dataSource.login({
        role: 'CITIZEN',
        badgeNumber: input,
        pin: password,
      });
      setIsLoading(false);
      onLogin(session);
    } catch (err: any) {
      setIsLoading(false);
      setCitizenLoginError(err.message || 'Invalid phone number or password. Access denied.');
    }
  };

  // Admin Login submit
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    const user = adminUsername.trim();
    const pass = adminPassword.trim();

    if (!user || !pass) {
      setAdminError('Please enter administrator username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await dataSource.login({
        role: 'ADMIN',
        badgeNumber: user,
        pin: pass,
      });
      setIsLoading(false);
      onLogin(session);
    } catch (err: any) {
      setIsLoading(false);
      setAdminError(err.message || 'Administrator authentication failed. Access denied.');
    }
  };

  // Citizen Register submit
  const handleCitizenRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    const name = regName.trim();
    const phone = regPhone.trim();
    const pwd = regPassword.trim();
    const confirmPwd = regConfirmPassword.trim();

    if (!name) {
      setRegError('Please enter your full name.');
      return;
    }
    const cleanPhoneDigits = phone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhoneDigits.length < 10) {
      setRegError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (pwd.length < 4) {
      setRegError('Password must be at least 4 characters long.');
      return;
    }
    if (pwd !== confirmPwd) {
      setRegError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await dataSource.registerCitizen({
        name,
        phone: `+91 ${cleanPhoneDigits}`,
        password: pwd,
      });
      setIsLoading(false);
      onLogin(session);
    } catch (err: any) {
      setIsLoading(false);
      setRegError(err.message || 'Registration failed. An account may already exist with this number.');
    }
  };

  const handleEnterDemo = (role: 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN') => {
    setMode('DEMO', true, role);
  };

  const handleFillForm = (
    terminalRole: 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN',
    identifier: string,
    secret: string
  ) => {
    handleSelectTerminal(terminalRole);
    if (terminalRole === 'DISPATCHER') {
      setDispatcherBadge(identifier);
      setDispatcherPin(secret);
    } else if (terminalRole === 'DRIVER') {
      setDriverBadge(identifier);
      setDriverPin(secret);
    } else if (terminalRole === 'HOSPITAL') {
      setHospitalStaffBadge(identifier);
      setHospitalPin(secret);
    } else if (terminalRole === 'CITIZEN') {
      setCitizenMode('LOGIN');
      setCitizenLoginId(identifier);
      setCitizenPassword(secret);
    }
  };

  const handleSignInDirect = (account: any) => {
    setMode('DEMO', true, account.portalTab);
  };

  const terminalTabs: { id: DepartmentalTerminal; label: string; icon: string }[] = [
    { id: 'DISPATCHER', label: 'CAD Dispatch', icon: 'shield' },
    { id: 'DRIVER', label: 'Responder (MDT)', icon: 'ambulance' },
    { id: 'HOSPITAL', label: 'Hospital ED', icon: 'local_hospital' },
    { id: 'CITIZEN', label: 'Citizen SOS', icon: 'emergency' },
    { id: 'ADMIN', label: 'System Admin', icon: 'settings' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--md-sys-color-background)',
        padding: '16px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Top-Right Theme Toggle & Demo Chip */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 100,
        }}
      >
        {mode === 'DEMO' && <DemoBarChip />}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '18px',
              border: '1px solid var(--md-sys-color-outline)',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              color: 'var(--md-sys-color-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--elevation-1)',
            }}
          >
            <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={18} />
          </button>
        )}
      </div>

      <PageContainer maxWidth="480px">
        <Stack gap={24} align="center">
          {/* Header Brand */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
                marginBottom: '12px',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              <Icon name="shield" size={32} />
            </div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--md-sys-color-text)',
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              AEGIS DISPATCH
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--md-sys-color-text-secondary)',
                margin: '4px 0 0 0',
              }}
            >
              Emergency Command & Telematics Gateway
            </p>
          </div>

          {/* Main Card */}
          <Card padding={24} style={{ width: '100%', boxSizing: 'border-box' }}>
            <Stack gap={20}>
              {/* Tab Selector */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  borderRadius: '12px',
                  padding: '4px',
                  gap: '4px',
                  overflowX: 'auto',
                }}
              >
                {terminalTabs.map((tab) => {
                  const isActive = activeTerminal === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectTerminal(tab.id)}
                      style={{
                        flex: 1,
                        minWidth: '64px',
                        padding: '8px 4px',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: isActive
                          ? 'var(--md-sys-color-surface)'
                          : 'transparent',
                        color: isActive
                          ? 'var(--md-sys-color-primary)'
                          : 'var(--md-sys-color-text-secondary)',
                        fontSize: '11px',
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? 'var(--elevation-1)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'inherit',
                      }}
                    >
                      <Icon name={tab.icon} size={16} />
                      <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* DISPATCHER FORM */}
              {activeTerminal === 'DISPATCHER' && (
                <form onSubmit={handleDispatcherSubmit}>
                  <Stack gap={16}>
                    <div style={{ fontSize: '13px', color: 'var(--md-sys-color-text-secondary)', lineHeight: '18px' }}>
                      Sign in to the Central Computer-Aided Dispatch (CAD) console.
                    </div>

                    {dispatcherError && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--md-sys-color-error-container)',
                          color: 'var(--md-sys-color-error)',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Icon name="error" size={16} />
                        <span>{dispatcherError}</span>
                      </div>
                    )}

                    <Field
                      label="Dispatcher Badge / ID"
                      placeholder="e.g. DISPATCH-01"
                      value={dispatcherBadge}
                      onChange={(e) => setDispatcherBadge(e.target.value)}
                      autoComplete="username"
                      required
                      autoFocus
                    />

                    <Field
                      label="Security PIN / Password"
                      placeholder="Security PIN or Password"
                      type="password"
                      showPasswordToggle
                      value={dispatcherPin}
                      onChange={(e) => setDispatcherPin(e.target.value)}
                      autoComplete="current-password"
                      required
                    />

                    <Button
                      type="submit"
                      variant="filled"
                      disabled={isLoading}
                      style={{ height: '44px', marginTop: '4px' }}
                    >
                      {isLoading ? 'Verifying...' : 'Sign in as Dispatcher'}
                    </Button>
                  </Stack>
                </form>
              )}

              {/* RESPONDER (DRIVER) FORM */}
              {activeTerminal === 'DRIVER' && (
                <form onSubmit={handleDriverSubmit}>
                  <Stack gap={16}>
                    <div style={{ fontSize: '13px', color: 'var(--md-sys-color-text-secondary)', lineHeight: '18px' }}>
                      Sign in to the Mobile Data Terminal (MDT) bound to your ambulance unit.
                    </div>

                    {driverError && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--md-sys-color-error-container)',
                          color: 'var(--md-sys-color-error)',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Icon name="error" size={16} />
                        <span>{driverError}</span>
                      </div>
                    )}

                    <Field
                      label="Paramedic Staff Badge ID"
                      placeholder="e.g. MED-702"
                      value={driverBadge}
                      onChange={(e) => setDriverBadge(e.target.value)}
                      autoComplete="username"
                      required
                      autoFocus
                    />

                    <Field
                      label="Security PIN"
                      placeholder="Security PIN"
                      type="password"
                      showPasswordToggle
                      value={driverPin}
                      onChange={(e) => setDriverPin(e.target.value)}
                      autoComplete="current-password"
                      required
                    />

                    <Button
                      type="submit"
                      variant="filled"
                      disabled={isLoading}
                      style={{ height: '44px', marginTop: '4px' }}
                    >
                      {isLoading ? 'Verifying...' : 'Launch MDT Navigation'}
                    </Button>
                  </Stack>
                </form>
              )}

              {/* HOSPITAL ED FORM */}
              {activeTerminal === 'HOSPITAL' && (
                <form onSubmit={handleHospitalSubmit}>
                  <Stack gap={16}>
                    <div style={{ fontSize: '13px', color: 'var(--md-sys-color-text-secondary)', lineHeight: '18px' }}>
                      Sign in to the Emergency Department reception console.
                    </div>

                    {hospitalError && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--md-sys-color-error-container)',
                          color: 'var(--md-sys-color-error)',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Icon name="error" size={16} />
                        <span>{hospitalError}</span>
                      </div>
                    )}

                    <Field
                      label="Medical Staff Badge ID"
                      placeholder="e.g. HOSP-101"
                      value={hospitalStaffBadge}
                      onChange={(e) => setHospitalStaffBadge(e.target.value)}
                      autoComplete="username"
                      required
                      autoFocus
                    />

                    <Field
                      label="Staff Security PIN"
                      placeholder="Security PIN"
                      type="password"
                      showPasswordToggle
                      value={hospitalPin}
                      onChange={(e) => setHospitalPin(e.target.value)}
                      autoComplete="current-password"
                      required
                    />

                    <Button
                      type="submit"
                      variant="filled"
                      disabled={isLoading}
                      style={{ height: '44px', marginTop: '4px' }}
                    >
                      {isLoading ? 'Verifying...' : 'Sign in to Emergency Dept'}
                    </Button>
                  </Stack>
                </form>
              )}

              {/* CITIZEN SOS / REGISTER FORM */}
              {activeTerminal === 'CITIZEN' && (
                <>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setCitizenMode('LOGIN')}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: 'none',
                        borderRadius: '6px',
                        backgroundColor: citizenMode === 'LOGIN' ? 'var(--md-sys-color-primary-container)' : 'transparent',
                        color: citizenMode === 'LOGIN' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-text-secondary)',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setCitizenMode('REGISTER')}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: 'none',
                        borderRadius: '6px',
                        backgroundColor: citizenMode === 'REGISTER' ? 'var(--md-sys-color-primary-container)' : 'transparent',
                        color: citizenMode === 'REGISTER' ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-text-secondary)',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Self-Register
                    </button>
                  </div>

                  {citizenMode === 'LOGIN' ? (
                    <form onSubmit={handleCitizenLoginSubmit}>
                      <Stack gap={16}>
                        {citizenLoginError && (
                          <div
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--md-sys-color-error-container)',
                              color: 'var(--md-sys-color-error)',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <Icon name="error" size={16} />
                            <span>{citizenLoginError}</span>
                          </div>
                        )}

                        <Field
                          label="Mobile Phone Number"
                          placeholder="e.g. 9845012345"
                          type="tel"
                          value={citizenLoginId}
                          onChange={(e) => setCitizenLoginId(e.target.value)}
                          autoComplete="username"
                          required
                          autoFocus
                        />

                        <Field
                          label="Account Password"
                          placeholder="Account Password"
                          type="password"
                          showPasswordToggle
                          value={citizenPassword}
                          onChange={(e) => setCitizenPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                        />

                        <Button
                          type="submit"
                          variant="filled"
                          disabled={isLoading}
                          style={{ height: '44px', marginTop: '4px' }}
                        >
                          {isLoading ? 'Verifying...' : 'Sign in as Citizen'}
                        </Button>
                      </Stack>
                    </form>
                  ) : (
                    <form onSubmit={handleCitizenRegisterSubmit}>
                      <Stack gap={14}>
                        {regError && (
                          <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-error)', fontSize: '12px' }}>
                            {regError}
                          </div>
                        )}
                        <Field
                          label="Full Name"
                          placeholder="Full legal name"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          autoComplete="name"
                          required
                          autoFocus
                        />
                        <Field
                          label="Mobile Phone Number"
                          placeholder="10-digit mobile number"
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          autoComplete="tel"
                          required
                        />
                        <Field
                          label="Create Password"
                          placeholder="Minimum 4 characters"
                          type="password"
                          showPasswordToggle
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                        />
                        <Field
                          label="Confirm Password"
                          placeholder="Re-enter password to verify"
                          type="password"
                          showPasswordToggle
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                        />
                        <Button type="submit" variant="filled" disabled={isLoading} style={{ height: '44px', marginTop: '4px' }}>
                          {isLoading ? 'Creating account...' : 'Create Citizen Account'}
                        </Button>
                      </Stack>
                    </form>
                  )}
                </>
              )}

              {/* ADMIN FORM */}
              {activeTerminal === 'ADMIN' && (
                <form onSubmit={handleAdminSubmit}>
                  <Stack gap={16}>
                    <div style={{ fontSize: '13px', color: 'var(--md-sys-color-text-secondary)', lineHeight: '18px' }}>
                      Sign in to the Aegis System Administration Console.
                    </div>

                    {adminError && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--md-sys-color-error-container)',
                          color: 'var(--md-sys-color-error)',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Icon name="error" size={16} />
                        <span>{adminError}</span>
                      </div>
                    )}

                    <Field
                      label="Administrator Username"
                      placeholder="e.g. admin"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      autoComplete="username"
                      required
                      autoFocus
                    />

                    <Field
                      label="Administrator Password"
                      placeholder="Password"
                      type="password"
                      showPasswordToggle
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />

                    <Button
                      type="submit"
                      variant="filled"
                      disabled={isLoading}
                      style={{ height: '44px', marginTop: '4px' }}
                    >
                      {isLoading ? 'Verifying...' : 'Sign in as Administrator'}
                    </Button>
                  </Stack>
                </form>
              )}
            </Stack>
          </Card>

          {/* Outlined Demo Mode Button below the sign-in card */}
          {ENABLE_DEMO_BUTTON && (
            <Button
              variant="outlined"
              onClick={() => setShowDemoModal(true)}
              style={{
                width: '100%',
                height: '44px',
                justifyContent: 'center',
                gap: '8px',
                borderColor: 'var(--md-sys-color-outline)',
                color: 'var(--md-sys-color-primary)',
                fontWeight: 600,
              }}
            >
              <Icon name="play_arrow" size={18} />
              <span>Demo mode</span>
            </Button>
          )}
        </Stack>
      </PageContainer>

      {/* Demo Mode Selection Modal */}
      <DemoModeModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onEnterDemo={handleEnterDemo}
        onFillForm={handleFillForm}
        onSignInDirect={handleSignInDirect}
        selectedTabRole={activeTerminal === 'ADMIN' ? 'DISPATCHER' : activeTerminal}
      />
    </div>
  );
};
