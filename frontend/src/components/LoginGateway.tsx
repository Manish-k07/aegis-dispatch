import React, { useState } from 'react';
import { Ambulance, Hospital, AuthSession, CitizenProfile } from '../types';
import { API_BASE } from '../config';
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

export type DepartmentalTerminal = 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN';

interface LoginGatewayProps {
  ambulances: Ambulance[];
  hospitals: Hospital[];
  onLogin: (session: AuthSession) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

interface RegisteredCitizenAccount {
  loginId: string;
  password: string;
  profile: CitizenProfile;
}

export const LoginGateway: React.FC<LoginGatewayProps> = ({
  ambulances,
  hospitals,
  onLogin,
  theme = 'light',
  onToggleTheme,
}) => {
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [activeTerminal, setActiveTerminal] = useState<DepartmentalTerminal>('DISPATCHER');

  // Input states (all start empty - NO prefilled secrets)
  const [dispatcherBadge, setDispatcherBadge] = useState('');
  const [dispatcherPin, setDispatcherPin] = useState('');
  const [showDispatcherPin, setShowDispatcherPin] = useState(false);
  const [dispatcherError, setDispatcherError] = useState<string | null>(null);

  const [driverCallSign, setDriverCallSign] = useState(ambulances[0]?.id || '');
  const [driverBadge, setDriverBadge] = useState('');
  const [driverPin, setDriverPin] = useState('');
  const [showDriverPin, setShowDriverPin] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);

  const [hospitalFacilityCode, setHospitalFacilityCode] = useState(hospitals[0]?.id || '');
  const [hospitalStaffBadge, setHospitalStaffBadge] = useState('');
  const [hospitalPin, setHospitalPin] = useState('');
  const [showHospitalPin, setShowHospitalPin] = useState(false);
  const [hospitalError, setHospitalError] = useState<string | null>(null);

  const [citizenLoginId, setCitizenLoginId] = useState('');
  const [citizenPassword, setCitizenPassword] = useState('');
  const [showCitizenPassword, setShowCitizenPassword] = useState(false);
  const [citizenLoginError, setCitizenLoginError] = useState<string | null>(null);

  const [citizenMode, setCitizenMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [registrationSuccessMsg, setRegistrationSuccessMsg] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Demo helper: only rendered when VITE_DEMO_MODE=true or ?demo=1
  const isDemo = typeof window !== 'undefined' && (
    (import.meta as any).env?.VITE_DEMO_MODE === 'true' ||
    window.location.search.includes('demo=1')
  );

  const handleSelectTerminal = (terminal: DepartmentalTerminal) => {
    setActiveTerminal(terminal);
    setDispatcherError(null);
    setDriverError(null);
    setHospitalError(null);
    setCitizenLoginError(null);
    setRegistrationSuccessMsg(null);
    setRegError(null);
  };

  // Dispatcher submit
  const handleDispatcherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatcherError(null);
    const badge = dispatcherBadge.trim().toUpperCase();
    const pin = dispatcherPin.trim();

    if (!badge || !pin) {
      setDispatcherError('Please enter both your badge number and security PIN.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'DISPATCHER',
          badgeNumber: badge,
          pin: pin,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setDispatcherError(errJson.error || 'Authentication failed. Invalid badge number or security PIN.');
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      setIsLoading(false);
      onLogin({
        role: 'DISPATCHER',
        userLabel: data.userLabel || badge,
        subLabel: data.subLabel || 'Central CAD Console',
        loginTime: new Date().toISOString(),
      });
    } catch {
      // Offline fallback: ONLY accept valid demo credentials, reject everything else
      setIsLoading(false);
      const isDemoValid = (badge === 'CAD-042' || badge === 'CAD-011' || badge === 'DISP-901') && pin === '1120';
      if (isDemoValid) {
        onLogin({
          role: 'DISPATCHER',
          userLabel: badge === 'CAD-011' ? 'K. Raman' : 'A. Sharma',
          subLabel: `Central CAD Console · ${badge}`,
          loginTime: new Date().toISOString(),
        });
      } else {
        setDispatcherError('Authentication failed. Invalid badge number or security PIN.');
      }
    }
  };

  // Paramedic / Responder submit
  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverError(null);
    const vehicleId = driverCallSign.trim();
    const badge = driverBadge.trim().toUpperCase();
    const pin = driverPin.trim();

    if (!vehicleId || !badge || !pin) {
      setDriverError('Please fill in vehicle, paramedic badge ID, and ignition PIN.');
      return;
    }

    const matchedAmb = ambulances.find((a) => a.id === vehicleId) || ambulances[0];

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'DRIVER',
          badgeNumber: badge,
          pin: pin,
          vehicleId: matchedAmb?.registrationNumber || vehicleId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setDriverError(errJson.error || 'Authentication rejected. Invalid credentials.');
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      setIsLoading(false);
      onLogin({
        role: 'DRIVER',
        userLabel: data.userLabel || `${badge} · ${matchedAmb.registrationNumber}`,
        subLabel: data.subLabel || `${matchedAmb.type} Mobile Data Terminal`,
        ambulanceId: data.unitId || matchedAmb.id,
        loginTime: new Date().toISOString(),
      });
    } catch {
      // Offline fallback: ONLY accept valid demo credentials
      setIsLoading(false);
      const isDemoValid = (badge === 'MED-702' || badge === 'PM-402') && pin === '1001';
      if (isDemoValid) {
        onLogin({
          role: 'DRIVER',
          userLabel: `R. Rao · ${matchedAmb.registrationNumber}`,
          subLabel: `${matchedAmb.type} Mobile Data Terminal`,
          ambulanceId: matchedAmb.id,
          loginTime: new Date().toISOString(),
        });
      } else {
        setDriverError('Authentication rejected. Invalid paramedic credentials.');
      }
    }
  };

  // Hospital ED submit
  const handleHospitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHospitalError(null);
    const facilityId = hospitalFacilityCode.trim();
    const badge = hospitalStaffBadge.trim().toUpperCase();
    const pin = hospitalPin.trim();

    if (!facilityId || !badge || !pin) {
      setHospitalError('Please select facility, badge ID, and security PIN.');
      return;
    }

    const matchedHosp = hospitals.find((h) => h.id === facilityId) || hospitals[0];

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'HOSPITAL',
          badgeNumber: badge,
          pin: pin,
          hospitalId: facilityId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setHospitalError(errJson.error || 'Access denied. Invalid facility credentials.');
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      setIsLoading(false);
      onLogin({
        role: 'HOSPITAL',
        userLabel: data.userLabel || matchedHosp.name,
        subLabel: data.subLabel || `Emergency Department · ${badge}`,
        hospitalId: data.hospitalId || matchedHosp.id,
        loginTime: new Date().toISOString(),
      });
    } catch {
      // Offline fallback: ONLY accept valid demo credentials
      setIsLoading(false);
      const isDemoValid = (badge === 'RN-402' || badge === 'NURSE-12' || badge === 'DR-201') && pin === '2001';
      if (isDemoValid) {
        onLogin({
          role: 'HOSPITAL',
          userLabel: matchedHosp.name,
          subLabel: `Emergency Department · ${badge}`,
          hospitalId: matchedHosp.id,
          loginTime: new Date().toISOString(),
        });
      } else {
        setHospitalError('Access denied. Invalid facility credentials.');
      }
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

    const cleanDigits = input.replace(/[^0-9]/g, '').slice(-10);

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'CITIZEN',
          badgeNumber: cleanDigits,
          pin: password,
        }),
      });

      if (!res.ok) {
        // Also check if locally registered account exists
        let registeredList: RegisteredCitizenAccount[] = [];
        try {
          const saved = localStorage.getItem('aegis_registered_citizens');
          if (saved) registeredList = JSON.parse(saved);
        } catch {}

        const found = registeredList.find(
          (acc) => acc.loginId.replace(/[^0-9]/g, '').slice(-10) === cleanDigits && acc.password === password
        );

        if (found) {
          setIsLoading(false);
          onLogin({
            role: 'CITIZEN',
            userLabel: found.profile.name,
            subLabel: `Citizen Profile · Blood: ${found.profile.bloodGroup || 'O+'}`,
            citizenProfile: found.profile,
            loginTime: new Date().toISOString(),
          });
          return;
        }

        const errJson = await res.json().catch(() => ({}));
        setCitizenLoginError(errJson.error || 'Invalid phone number or password. Access denied.');
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      setIsLoading(false);
      const defaultProfile: CitizenProfile = data.citizenProfile ? {
        id: 'cit-priya-01',
        name: (data.citizenProfile.name as string) || data.userLabel,
        gender: (data.citizenProfile.gender as any) || 'FEMALE',
        age: Number(data.citizenProfile.age) || 29,
        phone: (data.citizenProfile.phone as string) || `+91 ${cleanDigits}`,
        email: 'priya.sharma@example.com',
        diseases: (data.citizenProfile.diseases as string[]) || ['Severe asthma'],
        allergies: (data.citizenProfile.allergies as string[]) || ['Penicillin / amoxicillin'],
        bloodGroup: (data.citizenProfile.bloodGroup as any) || 'O+',
        emergencyContactName: (data.citizenProfile.emergencyContactName as string) || 'Amit Patel (Spouse)',
        emergencyContactPhone: (data.citizenProfile.emergencyContactPhone as string) || '+91 98450 99887',
      } : {
        id: 'cit-priya-01',
        name: data.userLabel,
        gender: 'FEMALE',
        age: 29,
        phone: `+91 ${cleanDigits}`,
        email: 'priya.sharma@example.com',
        diseases: ['Severe asthma'],
        allergies: ['Penicillin / amoxicillin'],
        bloodGroup: 'O+',
        emergencyContactName: 'Amit Patel (Spouse)',
        emergencyContactPhone: '+91 98450 99887',
      };

      onLogin({
        role: 'CITIZEN',
        userLabel: data.userLabel,
        subLabel: data.subLabel || `Citizen Profile · Blood: ${defaultProfile.bloodGroup}`,
        citizenProfile: defaultProfile,
        loginTime: new Date().toISOString(),
      });
    } catch {
      setIsLoading(false);
      // Offline fallback: check registered accounts or demo user
      let registeredList: RegisteredCitizenAccount[] = [];
      try {
        const saved = localStorage.getItem('aegis_registered_citizens');
        if (saved) registeredList = JSON.parse(saved);
      } catch {}

      const found = registeredList.find(
        (acc) => acc.loginId.replace(/[^0-9]/g, '').slice(-10) === cleanDigits && acc.password === password
      );

      if (found) {
        onLogin({
          role: 'CITIZEN',
          userLabel: found.profile.name,
          subLabel: `Citizen Profile · Blood: ${found.profile.bloodGroup || 'O+'}`,
          citizenProfile: found.profile,
          loginTime: new Date().toISOString(),
        });
        return;
      }

      if (cleanDigits === '9845012345' && (password === '1120' || password === 'password123')) {
        const defaultProfile: CitizenProfile = {
          id: 'cit-priya-01',
          name: 'Priya Sharma',
          gender: 'FEMALE',
          age: 29,
          phone: `+91 98450 12345`,
          email: 'priya.sharma@example.com',
          diseases: ['Severe asthma'],
          allergies: ['Penicillin / amoxicillin'],
          bloodGroup: 'O+',
          emergencyContactName: 'Amit Patel (Spouse)',
          emergencyContactPhone: '+91 98450 99887',
        };
        onLogin({
          role: 'CITIZEN',
          userLabel: defaultProfile.name,
          subLabel: `Citizen Profile · Blood: ${defaultProfile.bloodGroup}`,
          citizenProfile: defaultProfile,
          loginTime: new Date().toISOString(),
        });
      } else {
        setCitizenLoginError('Invalid phone number or password. Access denied.');
      }
    }
  };

  // Citizen Register submit
  const handleCitizenRegisterSubmit = (e: React.FormEvent) => {
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
    if (pwd.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }
    if (pwd !== confirmPwd) {
      setRegError('Passwords do not match. Please re-enter.');
      return;
    }

    const newProfile: CitizenProfile = {
      id: `cit-${Date.now().toString().slice(-6)}`,
      name: name,
      gender: 'PREFER_NOT_TO_SAY',
      age: 28,
      phone: `+91 ${cleanPhoneDigits}`,
      diseases: ['None / healthy'],
      allergies: ['No known allergies (NKDA)'],
      bloodGroup: 'O+',
      registeredAt: new Date().toISOString(),
    };

    const newAccount: RegisteredCitizenAccount = {
      loginId: `+91 ${cleanPhoneDigits}`,
      password: pwd,
      profile: newProfile,
    };

    let accounts: RegisteredCitizenAccount[] = [];
    try {
      const saved = localStorage.getItem('aegis_registered_citizens');
      if (saved) accounts = JSON.parse(saved);
    } catch {}

    const updated = [newAccount, ...accounts.filter(a => a.loginId !== newAccount.loginId)];
    try {
      localStorage.setItem('aegis_registered_citizens', JSON.stringify(updated));
    } catch {}

    setCitizenLoginId(`+91 ${cleanPhoneDigits}`);
    setCitizenPassword(pwd);
    setCitizenMode('LOGIN');
    setRegistrationSuccessMsg('Registration successful. Sign in with your phone number and password.');
  };

  // Segmented control tabs with exact new names
  const portalTabs = [
    { id: 'DISPATCHER', label: 'Dispatch', icon: 'shield' },
    { id: 'DRIVER', label: 'Responder', icon: 'ambulance' },
    { id: 'HOSPITAL', label: 'Hospital', icon: 'local_hospital' },
    { id: 'CITIZEN', label: 'SOS', icon: 'emergency' },
  ];

  const vehicleOptions = ambulances.map((a) => ({
    value: a.id,
    label: `${a.registrationNumber} (${a.type})`,
    sublabel: a.driverName ? `Crew: ${a.driverName}` : undefined,
    icon: 'ambulance',
  }));

  const hospitalOptions = hospitals.map((h) => ({
    value: h.id,
    label: h.name,
    sublabel: h.address,
    icon: 'local_hospital',
  }));

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
      {/* Top-Right Theme Toggle & Quick Credentials */}
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
        <button
          type="button"
          onClick={() => setShowCredentialsModal(true)}
          style={{
            height: '36px',
            padding: '0 12px',
            borderRadius: '18px',
            border: '1px solid var(--md-sys-color-outline)',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            color: 'var(--md-sys-color-primary)',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: 'var(--elevation-1)',
          }}
        >
          <Icon name="key" size={16} />
          <span>Demo Credentials</span>
        </button>

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

      {/* Demo Credentials Quick Reference Modal */}
      {showCredentialsModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setShowCredentialsModal(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', width: '92%' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="key" size={20} style={{ color: 'var(--md-sys-color-primary)' }} />
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                  All Gateway Login Credentials
                </h2>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowCredentialsModal(false)}
                aria-label="Close credentials dialog"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
                <div style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: '4px' }}>
                  1. Central CAD Dispatcher
                </div>
                <div style={{ color: 'var(--md-sys-color-text-secondary)', marginBottom: '6px' }}>
                  Badge ID: <code style={{ fontWeight: 600, color: 'var(--md-sys-color-text)' }}>CAD-042</code> (or <code>CAD-011</code>, <code>DISP-901</code>) &bull; PIN: <code style={{ fontWeight: 600, color: 'var(--md-sys-color-text)' }}>1120</code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTerminal('DISPATCHER');
                    setDispatcherBadge('CAD-042');
                    setDispatcherPin('1120');
                    setShowCredentialsModal(false);
                  }}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid var(--md-sys-color-primary)',
                    backgroundColor: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Fill Dispatcher Credentials
                </button>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
                <div style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: '4px' }}>
                  2. Paramedic / MDT Responder
                </div>
                <div style={{ color: 'var(--md-sys-color-text-secondary)', marginBottom: '6px' }}>
                  Ambulance: <code style={{ fontWeight: 600, color: 'var(--md-sys-color-text)' }}>KA-01-AE-1001</code> &bull; Badge ID: <code style={{ fontWeight: 600, color: 'var(--md-sys-color-text)' }}>MED-702</code> (or <code>PM-402</code>) &bull; PIN: <code style={{ fontWeight: 600, color: 'var(--md-sys-color-text)' }}>1001</code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTerminal('DRIVER');
                    setDriverCallSign(ambulances[0]?.id || 'amb-1');
                    setDriverBadge('MED-702');
                    setDriverPin('1001');
                    setShowCredentialsModal(false);
                  }}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid var(--md-sys-color-primary)',
                    backgroundColor: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Fill Paramedic Credentials
                </button>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
                <div style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: '4px' }}>
                  3. Hospital Emergency Department
                </div>
                <div style={{ color: 'var(--md-sys-color-text-secondary)', marginBottom: '6px' }}>
                  Facility: <code style={{ fontWeight: 600, color: 'var(--md-sys-color-text)' }}>Demo City Hospital</code> &bull; Badge ID: <code style={{ fontWeight: 600, color: 'var(--md-sys-color-text)' }}>RN-402</code> (or <code>NURSE-12</code>) &bull; PIN: <code style={{ fontWeight: 600, color: 'var(--md-sys-color-text)' }}>2001</code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTerminal('HOSPITAL');
                    setHospitalFacilityCode(hospitals[0]?.id || 'hosp-1');
                    setHospitalStaffBadge('RN-402');
                    setHospitalPin('2001');
                    setShowCredentialsModal(false);
                  }}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid var(--md-sys-color-primary)',
                    backgroundColor: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Fill Hospital Credentials
                </button>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-surface-container)' }}>
                <div style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: '4px' }}>
                  4. Citizen SOS Portal
                </div>
                <div style={{ color: 'var(--md-sys-color-text-secondary)', marginBottom: '6px' }}>
                  Mobile Number: <code style={{ fontWeight: 600, color: 'var(--md-sys-color-text)' }}>9845012345</code> &bull; Password: <code style={{ fontWeight: 600, color: 'var(--md-sys-color-text)' }}>password123</code>
                  <br />
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>(Or click Register to sign up with any phone number instantly)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTerminal('CITIZEN');
                    setCitizenMode('LOGIN');
                    setCitizenLoginId('9845012345');
                    setCitizenPassword('password123');
                    setShowCredentialsModal(false);
                  }}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid var(--md-sys-color-primary)',
                    backgroundColor: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Fill Citizen Credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <PageContainer maxWidth={440} padding={0}>
        <Stack gap={24} fullWidth align="center">
          {/* Header */}
          <Stack gap={8} fullWidth align="center" style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="shield" size={24} />
            </div>
            <h1
              className="m3-page-title"
              style={{ fontSize: '24px', lineHeight: '32px', fontWeight: 600, margin: 0 }}
            >
              Aegis
            </h1>
            <p
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: 'var(--md-sys-color-text-secondary)',
                margin: 0,
              }}
            >
              Emergency response and coordination system
            </p>
          </Stack>

          {/* Main Card */}
          <Card padding={24} style={{ width: '100%' }}>
            <Stack gap={20} fullWidth>
              {/* Segmented Control (48px height, selected = primary-container) */}
              <div
                role="tablist"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  borderRadius: '24px',
                  padding: '4px',
                  gap: '4px',
                  height: '48px',
                  boxSizing: 'border-box',
                }}
              >
                {portalTabs.map((tab) => {
                  const isSelected = activeTerminal === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => handleSelectTerminal(tab.id as DepartmentalTerminal)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        height: '40px',
                        borderRadius: '20px',
                        border: 'none',
                        backgroundColor: isSelected
                          ? 'var(--md-sys-color-primary-container)'
                          : 'transparent',
                        color: isSelected
                          ? 'var(--md-sys-color-on-primary-container)'
                          : 'var(--md-sys-color-text-secondary)',
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'background-color 150ms ease, color 150ms ease',
                        fontFamily: 'inherit',
                        padding: '0 4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Icon
                        name={tab.icon}
                        size={18}
                        style={{
                          color: isSelected ? 'var(--md-sys-color-primary)' : 'inherit',
                        }}
                      />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 1. DISPATCH TERMINAL */}
              {activeTerminal === 'DISPATCHER' && (
                <form onSubmit={handleDispatcherSubmit}>
                  <Stack gap={16} fullWidth>
                    <Stack gap={4}>
                      <Row gap={8}>
                        <Icon name="support_agent" size={20} style={{ color: 'var(--md-sys-color-primary)' }} />
                        <h2 style={{ fontSize: '16px', lineHeight: '24px', fontWeight: 500, margin: 0 }}>
                          Dispatch console
                        </h2>
                      </Row>
                      <p style={{ fontSize: '13px', lineHeight: '18px', color: 'var(--md-sys-color-text-secondary)', margin: 0 }}>
                        Sign in with your dispatcher badge and PIN
                      </p>
                    </Stack>

                    <Field
                      label="Dispatcher badge ID"
                      placeholder="e.g. DISP-901"
                      value={dispatcherBadge}
                      onChange={(e) => setDispatcherBadge(e.target.value)}
                      leadingIcon="badge"
                      required
                    />

                    <Field
                      label="CAD security PIN"
                      type={showDispatcherPin ? 'text' : 'password'}
                      placeholder="Enter security PIN"
                      value={dispatcherPin}
                      onChange={(e) => setDispatcherPin(e.target.value)}
                      leadingIcon="lock"
                      trailingIcon={showDispatcherPin ? 'visibility_off' : 'visibility'}
                      onTrailingIconClick={() => setShowDispatcherPin(!showDispatcherPin)}
                      required
                    />

                    {dispatcherError && (
                      <div
                        role="alert"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--md-sys-color-error-container)',
                          color: 'var(--md-sys-color-error)',
                          fontSize: '13px',
                        }}
                      >
                        <Icon name="error" size={18} />
                        <span>{dispatcherError}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="filled"
                      size="large"
                      fullWidth
                      disabled={isLoading || !dispatcherBadge.trim() || !dispatcherPin.trim()}
                      isLoading={isLoading}
                    >
                      Sign in to CAD
                    </Button>
                  </Stack>
                </form>
              )}

              {/* 2. RESPONDER TERMINAL */}
              {activeTerminal === 'DRIVER' && (
                <form onSubmit={handleDriverSubmit}>
                  <Stack gap={16} fullWidth>
                    <Stack gap={4}>
                      <Row gap={8}>
                        <Icon name="ambulance" size={20} style={{ color: 'var(--md-sys-color-primary)' }} />
                        <h2 style={{ fontSize: '16px', lineHeight: '24px', fontWeight: 500, margin: 0 }}>
                          Responder terminal
                        </h2>
                      </Row>
                      <p style={{ fontSize: '13px', lineHeight: '18px', color: 'var(--md-sys-color-text-secondary)', margin: 0 }}>
                        Select vehicle unit and enter driver ignition PIN
                      </p>
                    </Stack>

                    <Select
                      label="Vehicle unit"
                      value={driverCallSign}
                      onChange={(val) => setDriverCallSign(val)}
                      options={vehicleOptions}
                      leadingIcon="ambulance"
                    />

                    <Field
                      label="Paramedic badge ID"
                      placeholder="e.g. PM-402"
                      value={driverBadge}
                      onChange={(e) => setDriverBadge(e.target.value)}
                      leadingIcon="badge"
                      required
                    />

                    <Field
                      label="Vehicle ignition PIN"
                      type={showDriverPin ? 'text' : 'password'}
                      placeholder="Enter 4-digit ignition PIN"
                      value={driverPin}
                      onChange={(e) => setDriverPin(e.target.value)}
                      leadingIcon="lock"
                      trailingIcon={showDriverPin ? 'visibility_off' : 'visibility'}
                      onTrailingIconClick={() => setShowDriverPin(!showDriverPin)}
                      required
                    />

                    {driverError && (
                      <div
                        role="alert"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--md-sys-color-error-container)',
                          color: 'var(--md-sys-color-error)',
                          fontSize: '13px',
                        }}
                      >
                        <Icon name="error" size={18} />
                        <span>{driverError}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="filled"
                      size="large"
                      fullWidth
                      disabled={isLoading || !driverBadge.trim() || !driverPin.trim()}
                      isLoading={isLoading}
                    >
                      Sign in to MDT
                    </Button>
                  </Stack>
                </form>
              )}

              {/* 3. HOSPITAL TERMINAL */}
              {activeTerminal === 'HOSPITAL' && (
                <form onSubmit={handleHospitalSubmit}>
                  <Stack gap={16} fullWidth>
                    <Stack gap={4}>
                      <Row gap={8}>
                        <Icon name="local_hospital" size={20} style={{ color: 'var(--md-sys-color-primary)' }} />
                        <h2 style={{ fontSize: '16px', lineHeight: '24px', fontWeight: 500, margin: 0 }}>
                          Hospital receiving
                        </h2>
                      </Row>
                      <p style={{ fontSize: '13px', lineHeight: '18px', color: 'var(--md-sys-color-text-secondary)', margin: 0 }}>
                        Select facility and enter staff authorization PIN
                      </p>
                    </Stack>

                    <Select
                      label="Hospital facility"
                      value={hospitalFacilityCode}
                      onChange={(val) => setHospitalFacilityCode(val)}
                      options={hospitalOptions}
                      leadingIcon="local_hospital"
                    />

                    <Field
                      label="Staff badge ID"
                      placeholder="e.g. NURSE-12"
                      value={hospitalStaffBadge}
                      onChange={(e) => setHospitalStaffBadge(e.target.value)}
                      leadingIcon="badge"
                      required
                    />

                    <Field
                      label="Facility security PIN"
                      type={showHospitalPin ? 'text' : 'password'}
                      placeholder="Enter facility PIN"
                      value={hospitalPin}
                      onChange={(e) => setHospitalPin(e.target.value)}
                      leadingIcon="lock"
                      trailingIcon={showHospitalPin ? 'visibility_off' : 'visibility'}
                      onTrailingIconClick={() => setShowHospitalPin(!showHospitalPin)}
                      required
                    />

                    {hospitalError && (
                      <div
                        role="alert"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--md-sys-color-error-container)',
                          color: 'var(--md-sys-color-error)',
                          fontSize: '13px',
                        }}
                      >
                        <Icon name="error" size={18} />
                        <span>{hospitalError}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="filled"
                      size="large"
                      fullWidth
                      disabled={isLoading || !hospitalStaffBadge.trim() || !hospitalPin.trim()}
                      isLoading={isLoading}
                    >
                      Sign in to Hospital ED
                    </Button>
                  </Stack>
                </form>
              )}

              {/* 4. CITIZEN / SOS TERMINAL */}
              {activeTerminal === 'CITIZEN' && (
                <>
                  {citizenMode === 'LOGIN' ? (
                    <form onSubmit={handleCitizenLoginSubmit}>
                      <Stack gap={16} fullWidth>
                        <Stack gap={4}>
                          <Row gap={8}>
                            <Icon name="emergency" size={20} style={{ color: '#D93025' }} />
                            <h2 style={{ fontSize: '16px', lineHeight: '24px', fontWeight: 500, margin: 0 }}>
                              Citizen portal
                            </h2>
                          </Row>
                          <p style={{ fontSize: '13px', lineHeight: '18px', color: 'var(--md-sys-color-text-secondary)', margin: 0 }}>
                            Sign in with your mobile number and password
                          </p>
                        </Stack>

                        {registrationSuccessMsg && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--md-sys-color-success-container)',
                              color: 'var(--md-sys-color-success)',
                              fontSize: '13px',
                            }}
                          >
                            <Icon name="check_circle" size={18} />
                            <span>{registrationSuccessMsg}</span>
                          </div>
                        )}

                        <Field
                          label="Mobile phone number"
                          type="tel"
                          placeholder="e.g. +91 98450 12345"
                          value={citizenLoginId}
                          onChange={(e) => setCitizenLoginId(e.target.value)}
                          leadingIcon="phone"
                          required
                        />

                        <Field
                          label="Account password"
                          type={showCitizenPassword ? 'text' : 'password'}
                          placeholder="Enter password"
                          value={citizenPassword}
                          onChange={(e) => setCitizenPassword(e.target.value)}
                          leadingIcon="lock"
                          trailingIcon={showCitizenPassword ? 'visibility_off' : 'visibility'}
                          onTrailingIconClick={() => setShowCitizenPassword(!showCitizenPassword)}
                          required
                        />

                        {citizenLoginError && (
                          <div
                            role="alert"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--md-sys-color-error-container)',
                              color: 'var(--md-sys-color-error)',
                              fontSize: '13px',
                            }}
                          >
                            <Icon name="error" size={18} />
                            <span>{citizenLoginError}</span>
                          </div>
                        )}

                        <Button
                          type="submit"
                          variant="filled"
                          size="large"
                          fullWidth
                          disabled={isLoading || !citizenLoginId.trim() || !citizenPassword.trim()}
                          isLoading={isLoading}
                        >
                          Sign in
                        </Button>

                        <div style={{ textAlign: 'center', paddingTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setCitizenMode('REGISTER');
                              setCitizenLoginError(null);
                              setRegistrationSuccessMsg(null);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--md-sys-color-primary)',
                              fontSize: '13px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              textDecoration: 'underline',
                            }}
                          >
                            New user? Register citizen profile
                          </button>
                        </div>
                      </Stack>
                    </form>
                  ) : (
                    <form onSubmit={handleCitizenRegisterSubmit}>
                      <Stack gap={16} fullWidth>
                        <Stack gap={4}>
                          <Row gap={8}>
                            <Icon name="person_add" size={20} style={{ color: 'var(--md-sys-color-primary)' }} />
                            <h2 style={{ fontSize: '16px', lineHeight: '24px', fontWeight: 500, margin: 0 }}>
                              Create citizen profile
                            </h2>
                          </Row>
                          <p style={{ fontSize: '13px', lineHeight: '18px', color: 'var(--md-sys-color-text-secondary)', margin: 0 }}>
                            Enter your name, mobile number, and password
                          </p>
                        </Stack>

                        <Field
                          label="Full legal name"
                          placeholder="e.g. Rahul Sharma"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          leadingIcon="person"
                          required
                        />

                        <Field
                          label="Mobile phone number"
                          type="tel"
                          placeholder="e.g. 9845012345"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          leadingIcon="phone"
                          required
                        />

                        <Field
                          label="New password"
                          type="password"
                          placeholder="At least 6 characters"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          leadingIcon="lock"
                          required
                        />

                        <Field
                          label="Confirm password"
                          type="password"
                          placeholder="Re-enter password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          leadingIcon="lock"
                          required
                        />

                        {regError && (
                          <div
                            role="alert"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--md-sys-color-error-container)',
                              color: 'var(--md-sys-color-error)',
                              fontSize: '13px',
                            }}
                          >
                            <Icon name="error" size={18} />
                            <span>{regError}</span>
                          </div>
                        )}

                        <Button
                          type="submit"
                          variant="filled"
                          size="large"
                          fullWidth
                          disabled={!regName.trim() || !regPhone.trim() || !regPassword.trim() || !regConfirmPassword.trim()}
                        >
                          Register and proceed to sign in
                        </Button>

                        <div style={{ textAlign: 'center', paddingTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setCitizenMode('LOGIN');
                              setRegError(null);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--md-sys-color-primary)',
                              fontSize: '13px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              textDecoration: 'underline',
                            }}
                          >
                            Already registered? Return to sign in
                          </button>
                        </div>
                      </Stack>
                    </form>
                  )}
                </>
              )}
            </Stack>
          </Card>

          {/* Dev Demo Credentials Collapsed Helper (rendered only when VITE_DEMO_MODE=true or ?demo=1) */}
          {isDemo && (
            <details
              style={{
                width: '100%',
                fontSize: '12px',
                color: 'var(--md-sys-color-text-secondary)',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                border: '1px solid var(--md-sys-color-outline)',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              <summary style={{ fontWeight: 500 }}>
                Demo credentials guide
              </summary>
              <div style={{ paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Dispatch:</strong> Badge: <code>DISP-901</code> | PIN: <code>1120</code></div>
                <div><strong>Responder:</strong> Unit: <code>KA-01-AE-1001</code> | Badge: <code>PM-402</code> | PIN: <code>1001</code></div>
                <div><strong>Hospital:</strong> Facility: Select hospital | Badge: <code>NURSE-12</code> | PIN: <code>2001</code></div>
                <div><strong>Citizen:</strong> Phone: <code>9845012345</code> | Password: <code>password123</code></div>
              </div>
            </details>
          )}
        </Stack>
      </PageContainer>
    </div>
  );
};
