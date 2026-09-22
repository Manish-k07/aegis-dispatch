// Dynamic API & WebSocket configuration for multi-device & LAN access
const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';

export const API_BASE = `http://${hostname}:8080/api`;
export const WS_URL = `ws://${hostname}:8080/ws/live`;
