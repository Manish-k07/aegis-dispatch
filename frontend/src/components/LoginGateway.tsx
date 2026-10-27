import React, { useState, useEffect, useRef } from 'react';
import { Ambulance, Hospital, AuthSession } from '../types';
import { ENABLE_DEMO_BUTTON } from '../config';
import { BRAND_CONFIG } from '../brand';
import { useMode } from '../services/ModeProvider';
import { DemoModeModal } from './DemoModeModal';
import { DemoBarChip } from './DemoBarChip';
import {
  PageContainer,
  Stack,
  Card,
  Field,
  Button,
  Icon,
} from './common';

export type ActiveRole = 'CITIZEN' | 'DISPATCHER' | 'RESPONDER' | 'HOSPITAL';

interface RoleTabDef {
  id: ActiveRole;
  label: string;
  icon: string;
  heading: string;
  helper: string;
  apiRole: 'CITIZEN' | 'DISPATCHER' | 'DRIVER' | 'HOSPITAL';
}

const ROLE_TABS: RoleTabDef[] = [
  {
    id: 'CITIZEN',
    label: 'Citizen',
    icon: 'emergency',
    heading: 'Citizen sign in',
    helper: 'Request help and manage your medical profile.',
    apiRole: 'CITIZEN',
  },
  {
    id: 'DISPATCHER',
    label: 'Dispatcher',
    icon: 'shield',
    heading: 'Dispatcher sign in',
    helper: 'Manage incoming emergencies and assign ambulances.',
    apiRole: 'DISPATCHER',
  },
  {
    id: 'RESPONDER',
    label: 'Responder',
    icon: 'ambulance',
    heading: 'Responder sign in',
    helper: 'Receive missions and update patient status.',
    apiRole: 'DRIVER',
  },
  {
    id: 'HOSPITAL',
    label: 'Hospital',
    icon: 'local_hospital',
    heading: 'Hospital sign in',
    helper: 'See inbound patients and update bed availability.',
    apiRole: 'HOSPITAL',
  },
];

interface LoginGatewayProps {
  ambulances: Ambulance[];
  hospitals: Hospital[];
  onLogin: (session: AuthSession) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

// ---------------------------------------------------------------------------
// Separate Form Components (State & Autofill Isolation)
// ---------------------------------------------------------------------------

interface FormSubmitProps {
  onSuccess: (session: AuthSession) => void;
  dataSource: any;
  initialIdentifier?: string;
  initialSecret?: string;
}

const CitizenLoginForm: React.FC<FormSubmitProps> = ({
  onSuccess,
  dataSource,
  initialIdentifier = '',
  initialSecret = '',
}) => {
  const [phone, setPhone] = useState(initialIdentifier);
  const [password, setPassword] = useState(initialSecret);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialIdentifier) setPhone(initialIdentifier);
    if (initialSecret) setPassword(initialSecret);
  }, [initialIdentifier, initialSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanPhone = phone.trim();
    const cleanPwd = password.trim();

    if (!cleanPhone || !cleanPwd) {
      setError('Please enter your mobile phone number and password.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await dataSource.login({
        role: 'CITIZEN',
        badgeNumber: cleanPhone,
        pin: cleanPwd,
      });
      setIsLoading(false);
      onSuccess(session);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Invalid phone number or password. Access denied.');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate={false}>
      <Stack gap={16}>
        {error && (
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
            <span>{error}</span>
          </div>
        )}

        <Field
          id="citizen-login-phone"
          name="citizen_phone"
          label="Mobile Phone Number"
          placeholder="e.g. 9845012345"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="username"
          required
          autoFocus
        />

        <Field
          id="citizen-login-password"
          name="citizen_password"
          label="Account Password"
          placeholder="Account Password"
          type="password"
          showPasswordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <Button
          type="submit"
          variant="filled"
          disabled={isLoading}
          style={{ height: '44px', marginTop: '4px' }}
        >
          {isLoading ? 'Verifying...' : 'Sign in'}
        </Button>
      </Stack>
    </form>
  );
};

const CitizenRegisterForm: React.FC<FormSubmitProps> = ({ onSuccess, dataSource }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const cleanPwd = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }
    const cleanPhoneDigits = trimmedPhone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhoneDigits.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (cleanPwd.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }
    if (cleanPwd !== cleanConfirm) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await dataSource.registerCitizen({
        name: trimmedName,
        phone: `+91 ${cleanPhoneDigits}`,
        password: cleanPwd,
      });
      setIsLoading(false);
      onSuccess(session);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Registration failed. An account may already exist with this number.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={14}>
        {error && (
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
            <span>{error}</span>
          </div>
        )}

        <Field
          id="citizen-reg-name"
          name="citizen_reg_name"
          label="Full Name"
          placeholder="Full legal name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          autoFocus
        />

        <Field
          id="citizen-reg-phone"
          name="citizen_reg_phone"
          label="Mobile Phone Number"
          placeholder="10-digit mobile number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          required
        />

        <Field
          id="citizen-reg-password"
          name="citizen_reg_password"
          label="Create Password"
          placeholder="Minimum 4 characters"
          type="password"
          showPasswordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <Field
          id="citizen-reg-confirm"
          name="citizen_reg_confirm"
          label="Confirm Password"
          placeholder="Re-enter password to verify"
          type="password"
          showPasswordToggle
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <Button
          type="submit"
          variant="filled"
          disabled={isLoading}
          style={{ height: '44px', marginTop: '4px' }}
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
      </Stack>
    </form>
  );
};

const DispatcherLoginForm: React.FC<FormSubmitProps> = ({
  onSuccess,
  dataSource,
  initialIdentifier = '',
  initialSecret = '',
}) => {
  const [badge, setBadge] = useState(initialIdentifier);
  const [pin, setPin] = useState(initialSecret);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialIdentifier) setBadge(initialIdentifier);
    if (initialSecret) setPin(initialSecret);
  }, [initialIdentifier, initialSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanBadge = badge.trim();
    const cleanPin = pin.trim();

    if (!cleanBadge || !cleanPin) {
      setError('Please enter both your badge number and security PIN.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await dataSource.login({
        role: 'DISPATCHER',
        badgeNumber: cleanBadge,
        pin: cleanPin,
      });
      setIsLoading(false);
      onSuccess(session);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Authentication failed. Invalid badge number or security PIN.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={16}>
        {error && (
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
            <span>{error}</span>
          </div>
        )}

        <Field
          id="dispatcher-badge-id"
          name="dispatcher_badge"
          label="Badge ID"
          placeholder="e.g. DISPATCH-01"
          value={badge}
          onChange={(e) => setBadge(e.target.value)}
          autoComplete="off"
          required
          autoFocus
        />

        <Field
          id="dispatcher-pin"
          name="dispatcher_pin"
          label="Security PIN"
          placeholder="Security PIN or Password"
          type="password"
          showPasswordToggle
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoComplete="off"
          required
        />

        <Button
          type="submit"
          variant="filled"
          disabled={isLoading}
          style={{ height: '44px', marginTop: '4px' }}
        >
          {isLoading ? 'Verifying...' : 'Sign in'}
        </Button>
      </Stack>
    </form>
  );
};

const ResponderLoginForm: React.FC<FormSubmitProps> = ({
  onSuccess,
  dataSource,
  initialIdentifier = '',
  initialSecret = '',
}) => {
  const [badge, setBadge] = useState(initialIdentifier);
  const [pin, setPin] = useState(initialSecret);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialIdentifier) setBadge(initialIdentifier);
    if (initialSecret) setPin(initialSecret);
  }, [initialIdentifier, initialSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanBadge = badge.trim();
    const cleanPin = pin.trim();

    if (!cleanBadge || !cleanPin) {
      setError('Please fill in paramedic badge ID and security PIN.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await dataSource.login({
        role: 'DRIVER',
        badgeNumber: cleanBadge,
        pin: cleanPin,
      });
      setIsLoading(false);
      onSuccess(session);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Authentication rejected. Invalid credentials.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={16}>
        {error && (
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
            <span>{error}</span>
          </div>
        )}

        <Field
          id="responder-badge-id"
          name="responder_badge"
          label="Badge ID"
          placeholder="e.g. MED-702"
          value={badge}
          onChange={(e) => setBadge(e.target.value)}
          autoComplete="off"
          required
          autoFocus
        />

        <Field
          id="responder-pin"
          name="responder_pin"
          label="Security PIN"
          placeholder="Security PIN"
          type="password"
          showPasswordToggle
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoComplete="off"
          required
        />

        <Button
          type="submit"
          variant="filled"
          disabled={isLoading}
          style={{ height: '44px', marginTop: '4px' }}
        >
          {isLoading ? 'Verifying...' : 'Sign in'}
        </Button>
      </Stack>
    </form>
  );
};

const HospitalLoginForm: React.FC<FormSubmitProps> = ({
  onSuccess,
  dataSource,
  initialIdentifier = '',
  initialSecret = '',
}) => {
  const [badge, setBadge] = useState(initialIdentifier);
  const [pin, setPin] = useState(initialSecret);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialIdentifier) setBadge(initialIdentifier);
    if (initialSecret) setPin(initialSecret);
  }, [initialIdentifier, initialSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanBadge = badge.trim();
    const cleanPin = pin.trim();

    if (!cleanBadge || !cleanPin) {
      setError('Please enter medical staff badge ID and security PIN.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await dataSource.login({
        role: 'HOSPITAL',
        badgeNumber: cleanBadge,
        pin: cleanPin,
      });
      setIsLoading(false);
      onSuccess(session);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Access denied. Invalid facility credentials.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={16}>
        {error && (
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
            <span>{error}</span>
          </div>
        )}

        <Field
          id="hospital-badge-id"
          name="hospital_badge"
          label="Badge ID"
          placeholder="e.g. HOSP-101"
          value={badge}
          onChange={(e) => setBadge(e.target.value)}
          autoComplete="off"
          required
          autoFocus
        />

        <Field
          id="hospital-pin"
          name="hospital_pin"
          label="Security PIN"
          placeholder="Security PIN"
          type="password"
          showPasswordToggle
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoComplete="off"
          required
        />

        <Button
          type="submit"
          variant="filled"
          disabled={isLoading}
          style={{ height: '44px', marginTop: '4px' }}
        >
          {isLoading ? 'Verifying...' : 'Sign in'}
        </Button>
      </Stack>
    </form>
  );
};

const AdminLoginForm: React.FC<FormSubmitProps> = ({ onSuccess, dataSource }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('Please enter administrator username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await dataSource.login({
        role: 'ADMIN',
        badgeNumber: cleanUser,
        pin: cleanPass,
      });
      setIsLoading(false);
      onSuccess(session);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Administrator authentication failed. Access denied.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={16}>
        {error && (
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
            <span>{error}</span>
          </div>
        )}

        <Field
          id="admin-login-username"
          name="admin_username"
          label="Administrator Username"
          placeholder="e.g. admin"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          autoFocus
        />

        <Field
          id="admin-login-password"
          name="admin_password"
          label="Administrator Password"
          placeholder="Password"
          type="password"
          showPasswordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <Button
          type="submit"
          variant="filled"
          disabled={isLoading}
          style={{ height: '44px', marginTop: '4px' }}
        >
          {isLoading ? 'Verifying...' : 'Sign in'}
        </Button>
      </Stack>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Main LoginGateway Component
// ---------------------------------------------------------------------------

export const LoginGateway: React.FC<LoginGatewayProps> = ({
  ambulances,
  hospitals,
  onLogin,
  theme = 'light',
  onToggleTheme,
}) => {
  const { mode, dataSource, setMode } = useMode();
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Determine whether we are at /admin/login route
  const [isAdminRoute, setIsAdminRoute] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname === '/admin/login';
  });

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminRoute(window.location.pathname === '/admin/login');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToAdminLogin = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/admin/login');
      setIsAdminRoute(true);
    }
  };

  const navigateToPortalLogin = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      setIsAdminRoute(false);
    }
  };

  // Remember last role on device; default to CITIZEN
  const [activeRole, setActiveRole] = useState<ActiveRole>(() => {
    try {
      const saved = localStorage.getItem('aegis_last_login_role');
      if (saved && ROLE_TABS.some((t) => t.id === saved)) {
        return saved as ActiveRole;
      }
    } catch {}
    return 'CITIZEN';
  });

  const [citizenMode, setCitizenMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Filled credentials from Demo Mode
  const [filledCredentials, setFilledCredentials] = useState<{
    role: ActiveRole;
    identifier: string;
    secret: string;
  } | null>(null);

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleSelectRole = (role: ActiveRole) => {
    setActiveRole(role);
    setFilledCredentials(null);
    try {
      localStorage.setItem('aegis_last_login_role', role);
    } catch {}
  };

  // Keyboard navigation for tablist
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % ROLE_TABS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + ROLE_TABS.length) % ROLE_TABS.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = ROLE_TABS.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    handleSelectRole(ROLE_TABS[nextIndex].id);
    setTimeout(() => {
      tabRefs.current[nextIndex]?.focus();
    }, 0);
  };

  const handleEnterDemo = (role: 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN') => {
    setMode('DEMO', true, role);
  };

  const handleFillForm = (
    terminalRole: 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN',
    identifier: string,
    secret: string
  ) => {
    const roleMapping: Record<string, ActiveRole> = {
      DISPATCHER: 'DISPATCHER',
      DRIVER: 'RESPONDER',
      HOSPITAL: 'HOSPITAL',
      CITIZEN: 'CITIZEN',
    };
    const target = roleMapping[terminalRole] || 'CITIZEN';
    handleSelectRole(target);
    if (target === 'CITIZEN') {
      setCitizenMode('LOGIN');
    }
    setFilledCredentials({
      role: target,
      identifier,
      secret,
    });
  };

  const handleSignInDirect = (account: any) => {
    setMode('DEMO', true, account.portalTab);
  };

  const currentTabDef = ROLE_TABS.find((t) => t.id === activeRole) || ROLE_TABS[0];

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

      <PageContainer maxWidth="480px" padding={0} className="m3-login-page-container">
        <Stack gap={24} align="center">
          {/* Header Brand */}
          <div
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                boxShadow: 'none',
              }}
            >
              <Icon name="shield" size={28} />
            </div>
            <h1
              style={{
                fontSize: '24px',
                lineHeight: '32px',
                fontWeight: 500,
                color: 'var(--md-sys-color-text)',
                margin: 0,
              }}
            >
              {BRAND_CONFIG.name}
            </h1>
            <p
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: 'var(--md-sys-color-text-secondary)',
                margin: '4px 0 0 0',
                textAlign: 'center',
              }}
            >
              {BRAND_CONFIG.tagline}
            </p>
          </div>

          {/* Main Card */}
          <Card padding={24} className="m3-login-card">
            <Stack gap={20}>
              {isAdminRoute ? (
                /* ADMINISTRATOR SIGN IN VIEW */
                <div id="login-panel-admin">
                  <Stack gap={16}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon name="admin_panel_settings" size={24} style={{ color: 'var(--md-sys-color-primary)' }} />
                      <h2
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: 'var(--md-sys-color-text)',
                          margin: 0,
                        }}
                      >
                        Administrator sign in
                      </h2>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        lineHeight: '18px',
                        color: 'var(--md-sys-color-text-secondary)',
                      }}
                    >
                      Sign in to the Aegis administration console.
                    </div>

                    <AdminLoginForm
                      onSuccess={onLogin}
                      dataSource={dataSource}
                    />
                  </Stack>
                </div>
              ) : (
                /* REGULAR 4-ROLE SIGN IN VIEW */
                <>
                  {/* Role Selector Tabs */}
                  <div
                    role="tablist"
                    aria-label="Role selector"
                    className="m3-login-tablist"
                  >
                    {ROLE_TABS.map((tab, idx) => {
                      const isActive = activeRole === tab.id;
                      return (
                        <button
                          key={tab.id}
                          ref={(el) => (tabRefs.current[idx] = el)}
                          role="tab"
                          id={`login-tab-${tab.id.toLowerCase()}`}
                          aria-selected={isActive}
                          aria-controls={`login-panel-${tab.id.toLowerCase()}`}
                          tabIndex={isActive ? 0 : -1}
                          type="button"
                          onClick={() => handleSelectRole(tab.id)}
                          onKeyDown={(e) => handleTabKeyDown(e, idx)}
                          className="m3-login-tab"
                        >
                          <Icon name={tab.icon} size={24} />
                          <span className="m3-login-tab-label">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Form Heading & One Helper Line */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon
                        name={currentTabDef.icon}
                        size={24}
                        style={{ color: 'var(--md-sys-color-primary)' }}
                      />
                      <h2
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: 'var(--md-sys-color-text)',
                          margin: 0,
                        }}
                      >
                        {activeRole === 'CITIZEN' && citizenMode === 'REGISTER'
                          ? 'Create citizen account'
                          : currentTabDef.heading}
                      </h2>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        lineHeight: '18px',
                        color: 'var(--md-sys-color-text-secondary)',
                        marginTop: '4px',
                      }}
                    >
                      {currentTabDef.helper}
                    </div>
                  </div>

                  {/* CITIZEN SOS / REGISTER */}
                  {activeRole === 'CITIZEN' && (
                    <div
                      role="tabpanel"
                      id="login-panel-citizen"
                      aria-labelledby="login-tab-citizen"
                    >
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <button
                          type="button"
                          onClick={() => setCitizenMode('LOGIN')}
                          style={{
                            flex: 1,
                            padding: '8px',
                            border: 'none',
                            borderRadius: '8px',
                            backgroundColor:
                              citizenMode === 'LOGIN'
                                ? 'var(--md-sys-color-primary-container)'
                                : 'transparent',
                            color:
                              citizenMode === 'LOGIN'
                                ? 'var(--md-sys-color-on-primary-container)'
                                : 'var(--md-sys-color-text-secondary)',
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
                            borderRadius: '8px',
                            backgroundColor:
                              citizenMode === 'REGISTER'
                                ? 'var(--md-sys-color-primary-container)'
                                : 'transparent',
                            color:
                              citizenMode === 'REGISTER'
                                ? 'var(--md-sys-color-on-primary-container)'
                                : 'var(--md-sys-color-text-secondary)',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Self-Register
                        </button>
                      </div>

                      {citizenMode === 'LOGIN' ? (
                        <CitizenLoginForm
                          onSuccess={onLogin}
                          dataSource={dataSource}
                          initialIdentifier={
                            filledCredentials?.role === 'CITIZEN'
                              ? filledCredentials.identifier
                              : ''
                          }
                          initialSecret={
                            filledCredentials?.role === 'CITIZEN'
                              ? filledCredentials.secret
                              : ''
                          }
                        />
                      ) : (
                        <CitizenRegisterForm
                          onSuccess={onLogin}
                          dataSource={dataSource}
                        />
                      )}
                    </div>
                  )}

                  {/* DISPATCHER */}
                  {activeRole === 'DISPATCHER' && (
                    <div
                      role="tabpanel"
                      id="login-panel-dispatcher"
                      aria-labelledby="login-tab-dispatcher"
                    >
                      <DispatcherLoginForm
                        onSuccess={onLogin}
                        dataSource={dataSource}
                        initialIdentifier={
                          filledCredentials?.role === 'DISPATCHER'
                            ? filledCredentials.identifier
                            : ''
                        }
                        initialSecret={
                          filledCredentials?.role === 'DISPATCHER'
                            ? filledCredentials.secret
                            : ''
                        }
                      />
                    </div>
                  )}

                  {/* RESPONDER */}
                  {activeRole === 'RESPONDER' && (
                    <div
                      role="tabpanel"
                      id="login-panel-responder"
                      aria-labelledby="login-tab-responder"
                    >
                      <ResponderLoginForm
                        onSuccess={onLogin}
                        dataSource={dataSource}
                        initialIdentifier={
                          filledCredentials?.role === 'RESPONDER'
                            ? filledCredentials.identifier
                            : ''
                        }
                        initialSecret={
                          filledCredentials?.role === 'RESPONDER'
                            ? filledCredentials.secret
                            : ''
                        }
                      />
                    </div>
                  )}

                  {/* HOSPITAL */}
                  {activeRole === 'HOSPITAL' && (
                    <div
                      role="tabpanel"
                      id="login-panel-hospital"
                      aria-labelledby="login-tab-hospital"
                    >
                      <HospitalLoginForm
                        onSuccess={onLogin}
                        dataSource={dataSource}
                        initialIdentifier={
                          filledCredentials?.role === 'HOSPITAL'
                            ? filledCredentials.identifier
                            : ''
                        }
                        initialSecret={
                          filledCredentials?.role === 'HOSPITAL'
                            ? filledCredentials.secret
                            : ''
                        }
                      />
                    </div>
                  )}
                </>
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

          {/* Page Footer Link */}
          <div style={{ textAlign: 'center', marginTop: '-8px' }}>
            {isAdminRoute ? (
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToPortalLogin();
                }}
                style={{
                  fontSize: '12px',
                  color: 'var(--md-sys-color-primary)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Icon name="arrow_back" size={14} />
                <span>Return to portal sign in</span>
              </a>
            ) : (
              <a
                href="/admin/login"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToAdminLogin();
                }}
                style={{
                  fontSize: '12px',
                  color: 'var(--md-sys-color-text-secondary)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                Administrator sign in
              </a>
            )}
          </div>
        </Stack>
      </PageContainer>

      {/* Demo Mode Selection Modal */}
      <DemoModeModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onEnterDemo={handleEnterDemo}
        onFillForm={handleFillForm}
        onSignInDirect={handleSignInDirect}
        selectedTabRole={currentTabDef.apiRole}
      />
    </div>
  );
};
