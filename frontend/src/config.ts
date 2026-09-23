const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const port = typeof window !== 'undefined' ? window.location.port : '';

// When running Vite dev server (port 5173), API is on backend port 8080.
// In unified production builds (Cloud Run, Docker Nginx, Port 80/443), API is same-origin.
const isViteDev = port === '5173';
const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
const wsProtocol = protocol === 'https' ? 'wss' : 'ws';

export const API_BASE = isViteDev
  ? `http://${hostname}:8080/api`
  : `${browserOrigin}/api`;

export const WS_URL = isViteDev
  ? `ws://${hostname}:8080/ws/live`
  : `${wsProtocol}://${typeof window !== 'undefined' ? window.location.host : 'localhost'}/ws/live`;
