import React from 'react';
import { Card, Button, Stack, Icon } from './common';

interface BackendNotConfiguredScreenProps {
  onOpenDemo: () => void;
}

export const BackendNotConfiguredScreen: React.FC<BackendNotConfiguredScreenProps> = ({
  onOpenDemo,
}) => {
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
              backgroundColor: 'var(--md-sys-color-warning-container)',
              color: 'var(--md-sys-color-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="dns" size={36} />
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
              Backend not configured
            </h1>
            <p
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: 'var(--md-sys-color-text-secondary)',
                margin: 0,
              }}
            >
              This is a static frontend deployment without an API backend configured. The app requires <strong>VITE_API_BASE_URL</strong> to operate in Live Mode.
            </p>
          </Stack>

          <div
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              textAlign: 'left',
              color: 'var(--md-sys-color-text-secondary)',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            To connect to a live backend, provide environment variables at build or runtime:
            <pre style={{ margin: '8px 0 0', fontFamily: 'monospace', color: 'var(--md-sys-color-primary)' }}>
              VITE_API_BASE_URL=https://api.yourdomain.com/api
              VITE_WS_URL=wss://api.yourdomain.com/ws/live
            </pre>
          </div>

          <Button
            variant="filled"
            size="large"
            fullWidth
            icon="play_circle"
            onClick={onOpenDemo}
          >
            Open demo mode (in-browser simulator)
          </Button>
        </Stack>
      </Card>
    </div>
  );
};
