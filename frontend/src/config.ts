const envApiUrl = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || '';
const envWsUrl = (import.meta as any).env?.VITE_WS_URL || '';

const isDev = (import.meta as any).env?.DEV;
const isSameOriginBackend = typeof window !== 'undefined' && (window.location.port === '8080' || window.location.pathname.startsWith('/actuator'));

// In dev mode, Vite proxy routes /api and /ws to http://localhost:8080 without requiring any config.
// In production builds, base URL comes ONLY from VITE_API_BASE_URL (or same-origin port 8080 backend).
export const API_BASE = envApiUrl
  ? envApiUrl.replace(/\/+$/, '')
  : isDev || isSameOriginBackend
  ? '/api'
  : '';

export const WS_URL = envWsUrl
  ? envWsUrl
  : isDev || isSameOriginBackend
  ? `${typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${typeof window !== 'undefined' ? window.location.host : 'localhost:5173'}/ws/live`
  : API_BASE
  ? `${API_BASE.replace(/^http/, 'ws')}/ws/live`
  : '';

// A frontend-only deploy (e.g. Netlify) with empty VITE_API_BASE_URL at build time must show "Backend not configured"
export const IS_BACKEND_CONFIGURED = Boolean(envApiUrl || isDev || isSameOriginBackend);

// Control whether the Demo mode toggle button is shown (VITE_ENABLE_DEMO_BUTTON, default true)
export const ENABLE_DEMO_BUTTON = (import.meta as any).env?.VITE_ENABLE_DEMO_BUTTON !== 'false';
