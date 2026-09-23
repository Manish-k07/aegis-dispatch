const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
const envApiUrl = metaEnv?.VITE_API_URL;
const envWsUrl = metaEnv?.VITE_WS_URL;

const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const port = typeof window !== 'undefined' ? window.location.port : '';

// When running Vite dev server (port 5173), API is on backend port 8080.
// In Netlify / unified production builds, uses VITE_API_URL or same-origin.
const isViteDev = port === '5173';
const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
const wsProtocol = protocol === 'https' ? 'wss' : 'ws';

export const API_BASE = envApiUrl
  ? envApiUrl
  : isViteDev
  ? `http://${hostname}:8080/api`
  : `${browserOrigin}/api`;

export const WS_URL = envWsUrl
  ? envWsUrl
  : isViteDev
  ? `ws://${hostname}:8080/ws/live`
  : `${wsProtocol}://${typeof window !== 'undefined' ? window.location.host : 'localhost'}/ws/live`;
