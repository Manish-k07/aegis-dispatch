import React, { useState, useEffect, useRef } from 'react';
import { Ambulance, Hospital, AuthSession } from '../types';
import { ENABLE_DEMO_BUTTON } from '../config';
import { BRAND_CONFIG } from '../brand';
import { useMode } from '../services/ModeProvider';
import { DemoModeModal } from './DemoModeModal';
import { LegalModal } from './LegalModal';
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
    icon: 'person',
    heading: 'Citizen sign in',
    helper: 'Request help and manage your medical profile.',
    apiRole: 'CITIZEN',
  },
  {
    id: 'DISPATCHER',
    label: 'Dispatcher',
    icon: 'cad_operator',
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
export const sanitizeIndianPhone = (raw: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  const noDelims = trimmed.replace(/[\s\-\(\)\.]/g, '');
  const strippedPrefix = noDelims.replace(/^(\+91|91)/, '').replace(/^0/, '');
  const digits = strippedPrefix.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// Separate Form Components (State & Autofill Isolation)
// ---------------------------------------------------------------------------

interface FormSubmitProps {
  onSuccess: (session: AuthSession) => void;
  dataSource: any;
  initialIdentifier?: string;
  initialSecret?: string;
}

const CitizenPhoneOtpForm: React.FC<FormSubmitProps> = ({
  onSuccess,
  dataSource,
  initialIdentifier = '',
}) => {
  const [phone, setPhone] = useState(initialIdentifier);
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialIdentifier) setPhone(initialIdentifier);
  }, [initialIdentifier]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    setError(null);
    const cleanPhone = sanitizeIndianPhone(phone);
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setPhone(cleanPhone);
    setIsLoading(true);
    try {
      const res = dataSource.requestCitizenOtp
        ? await dataSource.requestCitizenOtp(cleanPhone)
        : await dataSource.sendOtp(cleanPhone);
      setOtpSent(true);
      setResendCooldown(res?.resendInSeconds || 30);
      setInfo(res?.devOtp ? `Verification code: ${res.devOtp}` : (res?.message || 'OTP sent successfully.'));
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otpSent) {
      await handleSendOtp();
      return;
    }
    const cleanOtp = otp.trim();
    if (cleanOtp.length < 4) {
      setError('Please enter the verification OTP.');
      return;
    }
    setIsLoading(true);
    try {
      const res = dataSource.verifyCitizenOtp
        ? await dataSource.verifyCitizenOtp({ phone: phone.trim(), otp: cleanOtp })
        : await dataSource.verifyOtp(phone.trim(), cleanOtp);

      if (res && res.status === 'NEW_USER') {
        if (dataSource.registerCitizenWithOtp && res.registrationToken) {
          const session = await dataSource.registerCitizenWithOtp({
            registrationToken: res.registrationToken,
            fullName: 'Citizen',
          });
          onSuccess(session);
        } else if (dataSource.registerCitizen) {
          const session = await dataSource.registerCitizen({
            name: 'Citizen',
            phone: phone.trim(),
            password: 'AutoGeneratedPassword123!',
            registrationToken: res.registrationToken,
          });
          onSuccess(session);
        } else {
          onSuccess(res.session || res);
        }
      } else {
        onSuccess(res.session || res);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError('Please enter your full legal name.');
      return;
    }
    setIsLoading(true);
    try {
      if (dataSource.registerCitizenWithOtp && registrationToken) {
        const session = await dataSource.registerCitizenWithOtp({
          registrationToken,
          fullName: fullName.trim(),
        });
        onSuccess(session);
      } else {
        const session = await dataSource.registerCitizen({
          name: fullName.trim(),
          phone: phone.trim(),
          password: 'AutoGeneratedPassword123!',
          registrationToken: registrationToken || undefined,
        });
        onSuccess(session);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (registrationToken) {
    return (
      <form onSubmit={handleCompleteNewUser} id="citizen-new-user-form">
        <Stack gap={14}>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon name="verified" size={16} />
            <span>Mobile phone {phone} verified. Please complete your registration.</span>
          </div>

          <Field
            id="citizen-new-fullname"
            name="citizen_new_fullname"
            label="Full Legal Name"
            placeholder="e.g. Rahul Sharma"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoFocus
          />

          <Button
            type="submit"
            variant="filled"
            disabled={isLoading}
            style={{ height: '44px', marginTop: '4px' }}
          >
            {isLoading ? 'Creating account...' : 'Create Citizen Account'}
          </Button>
        </Stack>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOtp} id="citizen-otp-form">
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
        {successMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon name="check_circle" size={16} />
            <span>{successMsg}</span>
          </div>
        )}
        {info && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon name="check_circle" size={16} />
            <span>{info}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Field
              id="citizen-otp-phone"
              name="citizen_otp_phone"
              label="Mobile Phone Number"
              placeholder="e.g. 9845012345"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={otpSent}
              required
              autoFocus
            />
          </div>
          {!otpSent && (
            <Button
              type="button"
              variant="outlined"
              onClick={handleSendOtp}
              disabled={isLoading}
              style={{ marginTop: '2px', height: '44px', whiteSpace: 'nowrap' }}
            >
              {isLoading ? 'Sending...' : 'Get OTP'}
            </Button>
          )}
        </div>

        {otpSent && (
          <>
            <Field
              id="citizen-otp-code"
              name="citizen_otp_code"
              label="Verification Code (OTP)"
              placeholder="Enter 6-digit OTP (e.g. 1120)"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              autoFocus
              helperText="For testing or demo, enter 1120"
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                }}
              >
                Change Number
              </Button>
              {resendCooldown > 0 ? (
                <span style={{ fontSize: '12px', alignSelf: 'center', color: 'var(--md-sys-color-text-secondary)' }}>
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <Button
                  type="button"
                  variant="text"
                  size="small"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                >
                  Resend OTP
                </Button>
              )}
              <Button
                type="submit"
                variant="filled"
                disabled={isLoading}
                style={{ flex: 1, height: '44px' }}
              >
                {isLoading ? 'Verifying...' : 'Verify & Continue'}
              </Button>
            </div>
          </>
        )}
      </Stack>
    </form>
  );
};

const CitizenGoogleAuth: React.FC<FormSubmitProps> = ({ onSuccess, dataSource }) => {
  const [googleStep, setGoogleStep] = useState<'IDLE' | 'EMAIL_VERIFY'>('IDLE');
  const [verificationToken, setVerificationToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<{ otp: boolean; google: boolean; emailOtp: boolean }>({
    otp: true,
    google: true,
    emailOtp: true,
  });

  useEffect(() => {
    if (dataSource.getAuthProviders) {
      dataSource.getAuthProviders().then((res: any) => {
        if (res) setProviders(res);
      }).catch(() => {});
    }
  }, [dataSource]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleGoogleSignIn = async (token = 'demo-google-token') => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await dataSource.loginWithGoogle(token);
      if (res && res.status === 'EMAIL_VERIFICATION_REQUIRED') {
        setVerificationToken(res.verificationToken);
        setMaskedEmail(res.maskedEmail || 'your Gmail address');
        setCooldown(60);
        setGoogleStep('EMAIL_VERIFY');
        setInfo(`A 6-digit verification code was sent to ${res.maskedEmail || 'your email'}.`);
      } else if (res && res.status === 'NEW_USER') {
        const regRes = await dataSource.registerCitizenWithGoogle({
          registrationToken: res.registrationToken,
          fullName: 'Google Citizen',
        });
        onSuccess(regRes);
      } else {
        onSuccess(res.session || res);
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = dataSource.resendGoogleEmailOtp
        ? await dataSource.resendGoogleEmailOtp(verificationToken)
        : { resendInSeconds: 60, message: 'Code resent' };
      setCooldown(res.resendInSeconds || 60);
      setInfo(res.message || 'A fresh verification code has been dispatched.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanOtp = emailOtp.trim();
    if (cleanOtp.length < 4) {
      setError('Please enter the 6-digit email verification code.');
      return;
    }
    setIsLoading(true);
    try {
      const res = dataSource.verifyGoogleEmail
        ? await dataSource.verifyGoogleEmail(verificationToken, cleanOtp)
        : await dataSource.completeGoogleRegistration({ registrationTicket: verificationToken, otp: cleanOtp, phone: '9845012345' });

      if (res && res.status === 'NEW_USER') {
        // Complete new citizen registration with Google
        const regRes = await dataSource.registerCitizenWithGoogle({
          registrationToken: res.registrationToken,
          fullName: 'Google Citizen',
        });
        onSuccess(regRes);
      } else {
        onSuccess(res.session || res);
      }
    } catch (err: any) {
      setError(err.message || 'Email verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!providers.google || !providers.emailOtp) {
    return null;
  }

  if (googleStep === 'EMAIL_VERIFY') {
    return (
      <form onSubmit={handleVerifyEmailOtp} style={{ marginTop: '12px' }} id="google-email-verify-form">
        <Stack gap={14}>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Icon name="mark_email_read" size={18} style={{ color: 'var(--md-sys-color-primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Verify Your Email</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
              We've dispatched a 6-digit verification code to <strong style={{ color: 'var(--md-sys-color-text)' }}>{maskedEmail}</strong>.
            </div>
          </div>

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

          {info && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Icon name="check_circle" size={16} />
              <span>{info}</span>
            </div>
          )}

          <Field
            id="google-email-otp"
            name="google_email_otp"
            label="6-Digit Email Code"
            placeholder="e.g. 123456"
            type="text"
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value)}
            required
            autoFocus
            helperText="Check your inbox (or simulated logs for local dev)"
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="button"
              variant="text"
              size="small"
              onClick={() => setGoogleStep('IDLE')}
            >
              Cancel
            </Button>
            {cooldown > 0 ? (
              <span style={{ fontSize: '12px', alignSelf: 'center', color: 'var(--md-sys-color-text-secondary)' }}>
                Resend in {cooldown}s
              </span>
            ) : (
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={handleResendEmailOtp}
                disabled={isLoading}
              >
                Resend Code
              </Button>
            )}
            <Button
              type="submit"
              variant="filled"
              disabled={isLoading}
              style={{ flex: 1, height: '44px' }}
            >
              {isLoading ? 'Verifying...' : 'Verify & Continue'}
            </Button>
          </div>
        </Stack>
      </form>
    );
  }

  return (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
      {error && (
        <div
          style={{
            marginBottom: '10px',
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          type="button"
          id="btn-google-signin"
          onClick={() => handleGoogleSignIn('new-google-user-token')}
          style={{
            height: '42px',
            borderRadius: '8px',
            border: '1px solid var(--md-sys-color-outline)',
            backgroundColor: 'var(--md-sys-color-surface)',
            color: 'var(--md-sys-color-on-surface)',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span>Sign in with Google</span>
        </button>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            id="btn-google-demo-existing"
            onClick={() => handleGoogleSignIn('existing-priya-token')}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px dashed var(--md-sys-color-outline-variant)',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              color: 'var(--md-sys-color-text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Google (Existing: Priya)
          </button>
          <button
            type="button"
            id="btn-google-demo-new"
            onClick={() => handleGoogleSignIn('new-google-user-token')}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px dashed var(--md-sys-color-outline-variant)',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              color: 'var(--md-sys-color-text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Google (New Citizen)
          </button>
        </div>
      </div>
    </div>
  );
};


const CitizenForgotPasswordForm: React.FC<{
  onCancel: () => void;
  onSuccess: (phone: string) => void;
  dataSource: any;
}> = ({ onCancel, onSuccess, dataSource }) => {
  const [step, setStep] = useState<'PHONE' | 'VERIFY'>('PHONE');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanPhone = sanitizeIndianPhone(phone);
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile phone number.');
      return;
    }
    setPhone(cleanPhone);
    setIsLoading(true);
    try {
      const res = dataSource.requestCitizenOtp
        ? await dataSource.requestCitizenOtp(cleanPhone)
        : await dataSource.sendOtp(cleanPhone);
      setStep('VERIFY');
      setResendCooldown(res?.resendInSeconds || 30);
      setInfo(res?.devOtp ? `Verification code: ${res.devOtp}` : (res?.message || 'Verification code sent.'));
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanOtp = otp.trim();
    const cleanPwd = newPassword.trim();
    if (cleanOtp.length < 4) {
      setError('Please enter the verification code.');
      return;
    }
    if (cleanPwd.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (cleanPwd !== confirmPassword.trim()) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await dataSource.resetPassword({
        phone: phone.trim(),
        otp: cleanOtp,
        newPassword: cleanPwd,
      });
      onSuccess(phone);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="lock_reset" size={20} style={{ color: 'var(--md-sys-color-primary)' }} />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Reset Your Password</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{ background: 'none', border: 'none', color: 'var(--md-sys-color-primary)', fontSize: '12px', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-error)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Icon name="error" size={16} />
          <span>{error}</span>
        </div>
      )}

      {info && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Icon name="check_circle" size={16} />
          <span>{info}</span>
        </div>
      )}

      {step === 'PHONE' ? (
        <form onSubmit={handleSendOtp}>
          <Stack gap={14}>
            <Field
              id="citizen-reset-phone"
              name="citizen_reset_phone"
              label="Registered Mobile Phone"
              placeholder="e.g. 9845012345"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
            />
            <Button type="submit" variant="filled" disabled={isLoading} style={{ height: '44px', marginTop: '4px' }}>
              {isLoading ? 'Sending Code...' : 'Get Verification Code'}
            </Button>
          </Stack>
        </form>
      ) : (
        <form onSubmit={handleResetPassword}>
          <Stack gap={14}>
            <Field
              id="citizen-reset-otp"
              name="citizen_reset_otp"
              label="Verification Code (OTP)"
              placeholder="6-digit code"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              autoFocus
            />
            <Field
              id="citizen-reset-new-pwd"
              name="citizen_reset_new_pwd"
              label="New Password"
              placeholder="Minimum 6 characters"
              type="password"
              showPasswordToggle
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Field
              id="citizen-reset-confirm-pwd"
              name="citizen_reset_confirm_pwd"
              label="Confirm New Password"
              placeholder="Re-enter new password"
              type="password"
              showPasswordToggle
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="filled" disabled={isLoading} style={{ height: '44px', marginTop: '4px' }}>
              {isLoading ? 'Updating Password...' : 'Reset Password'}
            </Button>
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={resendCooldown > 0 || isLoading}
                style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? 'var(--md-sys-color-text-muted)' : 'var(--md-sys-color-primary)', fontSize: '12px', cursor: resendCooldown > 0 ? 'default' : 'pointer' }}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
          </Stack>
        </form>
      )}
    </div>
  );
};

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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  if (isForgotPassword) {
    return (
      <CitizenForgotPasswordForm
        dataSource={dataSource}
        onCancel={() => setIsForgotPassword(false)}
        onSuccess={(resetPhone) => {
          setIsForgotPassword(false);
          setPhone(resetPhone);
          setSuccessMsg('Password reset successfully. Please sign in with your new password.');
        }}
      />
    );
  }

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
        {successMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon name="check_circle" size={16} />
            <span>{successMsg}</span>
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
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (pasted) {
              e.preventDefault();
              setPhone(sanitizeIndianPhone(pasted));
            }
          }}
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px' }}>
          <button
            type="button"
            onClick={() => setIsForgotPassword(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--md-sys-color-primary)',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '2px 0',
              textDecoration: 'none',
            }}
          >
            Forgot password?
          </button>
        </div>

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
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'DETAILS'>('PHONE');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const cleanPhone = sanitizeIndianPhone(phone);
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setPhone(cleanPhone);
    setIsLoading(true);
    try {
      const res = dataSource.requestCitizenOtp
        ? await dataSource.requestCitizenOtp(cleanPhone)
        : await dataSource.sendOtp(cleanPhone);
      setStep('OTP');
      setResendCooldown(res?.resendInSeconds || 30);
      setInfo(res?.devOtp ? `Verification code: ${res.devOtp}` : (res?.message || 'Verification code sent to phone.'));
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanOtp = otp.trim();
    if (cleanOtp.length < 4) {
      setError('Please enter the OTP verification code.');
      return;
    }
    setIsLoading(true);
    try {
      const res = dataSource.verifyCitizenOtp
        ? await dataSource.verifyCitizenOtp({ phone: phone.trim(), otp: cleanOtp })
        : await dataSource.verifyOtp(phone.trim(), cleanOtp);

      if (res && res.status === 'NEW_USER') {
        setRegistrationToken(res.registrationToken);
        setStep('DETAILS');
        setInfo('Phone verified. Create your password and enter your full name.');
      } else {
        // Returning user - logged in
        onSuccess(res.session || res);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please check and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const cleanPwd = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!trimmedName) {
      setError('Please enter your full legal name.');
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
        phone: phone.trim(),
        password: cleanPwd,
        registrationToken: registrationToken || undefined,
      });
      setIsLoading(false);
      onSuccess(session);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Registration failed. An account may already exist with this number.');
    }
  };

  return (
    <div>
      {error && (
        <div
          style={{
            marginBottom: '10px',
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

      {info && (
        <div
          style={{
            marginBottom: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: 'var(--md-sys-color-primary-container)',
            color: 'var(--md-sys-color-on-primary-container)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icon name="check_circle" size={16} />
          <span>{info}</span>
        </div>
      )}

      {step === 'PHONE' && (
        <form onSubmit={handleSendPhoneOtp}>
          <Stack gap={14}>
            <Field
              id="citizen-reg-phone"
              name="citizen_reg_phone"
              label="Mobile Phone Number"
              placeholder="10-digit mobile number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (pasted) {
                  e.preventDefault();
                  setPhone(sanitizeIndianPhone(pasted));
                }
              }}
              autoComplete="tel"
              required
              autoFocus
              helperText="SMS verification is mandatory before registration"
            />
            <Button
              type="submit"
              variant="filled"
              disabled={isLoading}
              style={{ height: '44px', marginTop: '4px' }}
            >
              {isLoading ? 'Sending SMS OTP...' : 'Get Verification Code'}
            </Button>
          </Stack>
        </form>
      )}

      {step === 'OTP' && (
        <form onSubmit={handleVerifyPhoneOtp}>
          <Stack gap={14}>
            <Field
              id="citizen-reg-otp"
              name="citizen_reg_otp"
              label="Enter SMS Verification Code"
              placeholder="Enter 6-digit code (e.g. 1120)"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              autoFocus
              helperText="For demo/testing, use 1120"
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={() => setStep('PHONE')}
              >
                Change Number
              </Button>
              {resendCooldown > 0 ? (
                <span style={{ fontSize: '12px', alignSelf: 'center', color: 'var(--md-sys-color-text-secondary)' }}>
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <Button
                  type="button"
                  variant="text"
                  size="small"
                  onClick={handleSendPhoneOtp}
                  disabled={isLoading}
                >
                  Resend Code
                </Button>
              )}
              <Button
                type="submit"
                variant="filled"
                disabled={isLoading}
                style={{ flex: 1, height: '44px' }}
              >
                {isLoading ? 'Verifying...' : 'Verify Phone'}
              </Button>
            </div>
          </Stack>
        </form>
      )}

      {step === 'DETAILS' && (
        <form onSubmit={handleCreateAccount}>
          <Stack gap={14}>
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
      )}
    </div>
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
  const [showLegalModal, setShowLegalModal] = useState<'privacy' | 'terms' | 'emergency' | null>(null);

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

  const [citizenMode, setCitizenMode] = useState<'OTP' | 'PASSWORD' | 'REGISTER'>('OTP');

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
      setCitizenMode('PASSWORD');
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
                          id="citizen-tab-otp"
                          onClick={() => setCitizenMode('OTP')}
                          style={{
                            flex: 1,
                            padding: '8px',
                            border: 'none',
                            borderRadius: '8px',
                            backgroundColor:
                              citizenMode === 'OTP'
                                ? 'var(--md-sys-color-primary-container)'
                                : 'transparent',
                            color:
                              citizenMode === 'OTP'
                                ? 'var(--md-sys-color-on-primary-container)'
                                : 'var(--md-sys-color-text-secondary)',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Phone OTP
                        </button>
                        <button
                          type="button"
                          id="citizen-tab-password"
                          onClick={() => setCitizenMode('PASSWORD')}
                          style={{
                            flex: 1,
                            padding: '8px',
                            border: 'none',
                            borderRadius: '8px',
                            backgroundColor:
                              citizenMode === 'PASSWORD'
                                ? 'var(--md-sys-color-primary-container)'
                                : 'transparent',
                            color:
                              citizenMode === 'PASSWORD'
                                ? 'var(--md-sys-color-on-primary-container)'
                                : 'var(--md-sys-color-text-secondary)',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Password
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

                      {citizenMode === 'OTP' ? (
                        <CitizenPhoneOtpForm
                          onSuccess={onLogin}
                          dataSource={dataSource}
                          initialIdentifier={
                            filledCredentials?.role === 'CITIZEN'
                              ? filledCredentials.identifier
                              : ''
                          }
                        />
                      ) : citizenMode === 'PASSWORD' ? (
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
                      <CitizenGoogleAuth
                        onSuccess={onLogin}
                        dataSource={dataSource}
                      />
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

          {/* Legal & Policy Links */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', marginTop: '4px' }}>
            <button type="button" onClick={() => setShowLegalModal('privacy')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</button>
            <span>•</span>
            <button type="button" onClick={() => setShowLegalModal('terms')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</button>
            <span>•</span>
            <button type="button" onClick={() => setShowLegalModal('emergency')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>Emergency Notice</button>
          </div>

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

      {/* Legal Disclosures Modal */}
      <LegalModal
        isOpen={!!showLegalModal}
        initialTab={showLegalModal || 'privacy'}
        onClose={() => setShowLegalModal(null)}
      />

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
