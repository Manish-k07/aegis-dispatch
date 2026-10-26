import React, { useState, useEffect } from 'react';
import { Card, Button, Stack, Icon } from './common';
import { API_BASE } from '../config';

interface BackendUnreachableScreenProps {
  onRetry: () => Promise<boolean>;
  onOpenDemo: () => void;
}

export const BackendUnreachableScreen: React.FC<BackendUnreachableScreenProps> = ({
  onRetry,
  onOpenDemo,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(8);
  const [retryAttempt, setRetryAttempt] = useState(1);

  // Auto-retry with backoff timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerRetry();
          return Math.min(60, 5 * retryAttempt);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [retryAttempt]);

  const triggerRetry = async () => {
    setIsRetrying(true);
    try {
      const ok = await onRetry();
      if (!ok) {
        setRetryAttempt((a) => a + 1);
        setCountdown(Math.min(60, 5 * (retryAttempt + 1)));
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const serverUrl = API_BASE || (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:8080/api');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--md-sys-color-background)',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <Card
        padding={24}
        style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          boxShadow: 'var(--md-sys-elevation-level2)',
          border: '1px solid var(--md-sys-color-outline-variant)',
        }}
      >
        <Stack gap={20} align="center">
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '32px',
              backgroundColor: 'var(--md-sys-color-error-container)',
              color: 'var(--md-sys-color-error)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="cloud_off" size={36} />
          </div>

          <Stack gap={8} align="center">
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--md-sys-color-text)',
                margin: 0,
              }}
            >
              Can't reach the Aegis server
            </h1>
            <p
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: 'var(--md-sys-color-text-secondary)',
                margin: 0,
              }}
            >
              The real backend is currently unreachable. Live mode does not silently fall back to synthetic data.
            </p>
          </Stack>

          <div
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'var(--md-ref-typeface-mono, monospace)',
              color: 'var(--md-sys-color-text-secondary)',
              wordBreak: 'break-all',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            Server URL: <strong>{serverUrl}</strong>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-muted)' }}>
            Automatic retry in <strong>{countdown}s</strong> (Attempt #{retryAttempt})
          </div>

          <Stack gap={12} fullWidth>
            <Button
              variant="filled"
              size="large"
              fullWidth
              icon="refresh"
              isLoading={isRetrying}
              onClick={triggerRetry}
            >
              Retry connection
            </Button>

            <Button
              variant="text"
              size="standard"
              fullWidth
              icon="play_circle"
              onClick={onOpenDemo}
            >
              Open demo mode (in-browser synthetic simulation)
            </Button>
          </Stack>
        </Stack>
      </Card>
    </div>
  );
};
