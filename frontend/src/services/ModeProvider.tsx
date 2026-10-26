import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { DataSource, ConnectionStatus } from './DataSource';
import { LiveDataSource } from './LiveDataSource';
import { DemoDataSource } from '../demo/DemoDataSource';
import { Dialog, Button, Stack, Row, Icon } from '../components/common';
import { API_BASE } from '../config';

export type AppMode = 'LIVE' | 'DEMO';

interface ModeContextType {
  mode: AppMode;
  dataSource: DataSource;
  connectionStatus: ConnectionStatus;
  isBackendReachable: boolean;
  checkBackendHealth: () => Promise<boolean>;
  setMode: (targetMode: AppMode, forceNoConfirm?: boolean, initialRole?: string) => void;
  exitDemo: () => void;
  requestModeSwitch: (targetMode: AppMode, initialRole?: string) => void;
}

const ModeContext = createContext<ModeContextType | null>(null);

export const useMode = (): ModeContextType => {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within a ModeProvider');
  return ctx;
};

const MODE_STORAGE_KEY = 'aegis.mode';

export const ModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mode defaults strictly to LIVE unless explicitly toggled by user
  const [mode, setModeState] = useState<AppMode>(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved === 'DEMO') return 'DEMO';
    } catch {}
    return 'LIVE';
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING');
  const [isBackendReachable, setIsBackendReachable] = useState<boolean>(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingTargetMode, setPendingTargetMode] = useState<AppMode | null>(null);
  const [pendingRole, setPendingRole] = useState<string | undefined>(undefined);

  // Active DataSource instance
  const dataSourceRef = useRef<DataSource | null>(null);

  if (!dataSourceRef.current || dataSourceRef.current.mode !== mode) {
    if (dataSourceRef.current) {
      dataSourceRef.current.destroy();
    }
    dataSourceRef.current = mode === 'DEMO' ? new DemoDataSource() : new LiveDataSource();
  }

  const currentDataSource = dataSourceRef.current;

  // Listen to connection status changes on active DataSource
  useEffect(() => {
    const unsub = currentDataSource.subscribeToConnectionStatus((status) => {
      setConnectionStatus(status);
      if (mode === 'LIVE') {
        if (status === 'OFFLINE') {
          setIsBackendReachable(false);
        }
      } else {
        setIsBackendReachable(true);
      }
    });
    return () => unsub();
  }, [currentDataSource, mode]);

  // Periodic health check in LIVE mode to quickly detect backend drops
  const checkBackendHealth = async (): Promise<boolean> => {
    if (mode === 'DEMO') return true;
    try {
      const url = `${API_BASE || ''}/dashboard`;
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      const reachable = res.ok;
      setIsBackendReachable(reachable);
      setConnectionStatus(reachable ? 'CONNECTED' : 'OFFLINE');
      return reachable;
    } catch {
      setIsBackendReachable(false);
      setConnectionStatus('OFFLINE');
      return false;
    }
  };

  useEffect(() => {
    if (mode === 'LIVE') {
      checkBackendHealth();
      const interval = setInterval(checkBackendHealth, 10000);
      return () => clearInterval(interval);
    }
  }, [mode]);

  const wipeDemoStorage = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('aegis.demo.')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  };

  const wipeLiveSession = () => {
    try {
      localStorage.removeItem('aegis.live.auth_session');
    } catch {}
  };

  const applyModeSwitch = async (targetMode: AppMode, roleToLogin?: string) => {
    if (dataSourceRef.current) {
      dataSourceRef.current.destroy();
      dataSourceRef.current = null;
    }

    if (targetMode === 'DEMO') {
      wipeLiveSession();
      try {
        localStorage.setItem(MODE_STORAGE_KEY, 'DEMO');
      } catch {}
      const demoDs = new DemoDataSource();
      dataSourceRef.current = demoDs;
      setIsBackendReachable(true);
      setConnectionStatus('CONNECTED');

      // Auto login in demo mode if a role was requested
      if (roleToLogin) {
        try {
          await demoDs.login({
            role: roleToLogin,
            badgeNumber: roleToLogin === 'CITIZEN' ? '9845012345' : roleToLogin === 'HOSPITAL' ? 'HOSP-101' : roleToLogin === 'DRIVER' ? 'MEDIC-101' : 'DISPATCH-01',
            pin: roleToLogin === 'CITIZEN' ? 'Citizen@2026' : roleToLogin === 'HOSPITAL' ? 'Hospital@2001' : roleToLogin === 'DRIVER' ? '4321' : 'Dispatch@2026'
          });
        } catch {}
      }
      setModeState('DEMO');
    } else {
      // Exiting demo -> Return to LIVE login screen
      wipeDemoStorage();
      try {
        localStorage.setItem(MODE_STORAGE_KEY, 'LIVE');
      } catch {}
      setModeState('LIVE');
      dataSourceRef.current = new LiveDataSource();
      checkBackendHealth();
    }
  };

  const requestModeSwitch = (targetMode: AppMode, initialRole?: string) => {
    if (targetMode === mode) return;
    setPendingTargetMode(targetMode);
    setPendingRole(initialRole);
    setIsConfirmOpen(true);
  };

  const exitDemo = () => {
    applyModeSwitch('LIVE');
  };

  const contextValue = useMemo<ModeContextType>(
    () => ({
      mode,
      dataSource: currentDataSource,
      connectionStatus,
      isBackendReachable,
      checkBackendHealth,
      setMode: (tMode, forceNoConfirm, initialRole) => {
        if (forceNoConfirm) {
          applyModeSwitch(tMode, initialRole);
        } else {
          requestModeSwitch(tMode, initialRole);
        }
      },
      exitDemo,
      requestModeSwitch,
    }),
    [mode, currentDataSource, connectionStatus, isBackendReachable]
  );

  return (
    <ModeContext.Provider value={contextValue}>
      {children}

      {/* Confirmation Dialog Before Switching Mode */}
      <Dialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setPendingTargetMode(null);
        }}
        title={pendingTargetMode === 'DEMO' ? 'Switch to Demo Mode?' : 'Exit Demo Mode?'}
        confirmLabel={pendingTargetMode === 'DEMO' ? 'Switch to demo' : 'Exit demo'}
        cancelLabel="Cancel"
        onConfirm={() => {
          if (pendingTargetMode) {
            applyModeSwitch(pendingTargetMode, pendingRole);
          }
          setIsConfirmOpen(false);
          setPendingTargetMode(null);
        }}
      >
        <Stack gap={12}>
          <Row gap={8}>
            <Icon name="info" size={20} style={{ color: 'var(--md-sys-color-warning)' }} />
            <div style={{ fontSize: '14px', lineHeight: '20px', color: 'var(--md-sys-color-text)' }}>
              {pendingTargetMode === 'DEMO'
                ? 'You will be signed out of the live session. Demo data is synthetic and is not saved to the live system.'
                : 'Exiting demo will return you to the live login screen and clear synthetic demo data.'}
            </div>
          </Row>
          <div style={{ fontSize: '13px', color: 'var(--md-sys-color-text-secondary)' }}>
            {pendingTargetMode === 'DEMO'
              ? 'No requests will be made to the live Aegis server while in Demo Mode.'
              : 'You will connect directly to the real Spring Boot backend in Live Mode.'}
          </div>
        </Stack>
      </Dialog>
    </ModeContext.Provider>
  );
};
