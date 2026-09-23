const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';

const isProductionHost =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
const wsProtocol = protocol === 'https' ? 'wss' : 'ws';

export const API_BASE = isProductionHost
  ? `${browserOrigin}/api`
  : `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8080/api`;

export const WS_URL = isProductionHost
  ? `${wsProtocol}://${typeof window !== 'undefined' ? window.location.host : 'localhost'}/ws/live`
  : `ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8080/ws/live`;
