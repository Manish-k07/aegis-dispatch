import {
  DataSource,
  ConnectionStatus,
  Unsubscribe,
  RouteDetails,
  V2xCorridorData,
} from './DataSource';
import {
  DashboardData,
  Emergency,
  Candidate,
  Dispatch,
  Hospital,
  PatientVitals,
  AuditLog,
  AuthSession,
  TriageAssessment,
} from '../types';
import { API_BASE, WS_URL } from '../config';

export class LiveDataSource implements DataSource {
  readonly mode = 'LIVE' as const;

  private ws: WebSocket | null = null;
  private eventListeners: Set<(event: any) => void> = new Set();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private connectionStatus: ConnectionStatus = 'CONNECTING';
  private reconnectTimeout: any = null;
  private reconnectDelay = 1000;
  private isDestroyed = false;
  private lastSyncTime = 0;

  constructor() {
    this.connectWs();
  }

  private setStatus(status: ConnectionStatus) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusListeners.forEach((l) => {
        try {
          l(status);
        } catch {}
      });
    }
  }

  private connectWs() {
    if (this.isDestroyed || !WS_URL) {
      this.setStatus('OFFLINE');
      return;
    }

    try {
      this.setStatus(this.reconnectDelay > 1000 ? 'RECONNECTING' : 'CONNECTING');
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        if (this.isDestroyed) return;
        this.reconnectDelay = 1000;
        this.lastSyncTime = Date.now();
        this.setStatus('CONNECTED');
        this.broadcastEvent({
          event: 'GATEWAY_CONNECTED',
          message: 'Connected to Aegis Dispatch Live WebSocket Gateway',
          timestamp: new Date().toISOString(),
        });
      };

      this.ws.onmessage = (event) => {
        if (this.isDestroyed) return;
        this.lastSyncTime = Date.now();
        try {
          const payload = JSON.parse(event.data);
          this.broadcastEvent(payload);
        } catch {
          // ignore non-json
        }
      };

      this.ws.onerror = () => {
        if (this.isDestroyed) return;
        this.setStatus('RECONNECTING');
      };

      this.ws.onclose = () => {
        if (this.isDestroyed) return;
        this.setStatus('RECONNECTING');
        this.scheduleReconnect();
      };
    } catch {
      this.setStatus('OFFLINE');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isDestroyed) return;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
      this.connectWs();
    }, this.reconnectDelay);
  }

  private broadcastEvent(event: any) {
    this.eventListeners.forEach((l) => {
      try {
        l(event);
      } catch {}
    });
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    try {
      const token = localStorage.getItem('aegis.live.token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {}
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!API_BASE) {
      throw new Error("Backend not configured. Please set VITE_API_BASE_URL.");
    }
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers as Record<string, string>),
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.error || errorData.message || `Request failed with status ${res.status}`;
      const err = new Error(msg);
      (err as any).status = res.status;
      throw err;
    }

    this.lastSyncTime = Date.now();
    return res.json() as Promise<T>;
  }

  getConnectionStatus(): ConnectionStatus {
    // If last successful sync was more than 30s ago, cannot claim connected
    if (this.connectionStatus === 'CONNECTED' && Date.now() - this.lastSyncTime > 30000) {
      return 'RECONNECTING';
    }
    return this.connectionStatus;
  }

  subscribeToEvents(listener: (event: any) => void): Unsubscribe {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  subscribeToConnectionStatus(listener: (status: ConnectionStatus) => void): Unsubscribe {
    this.statusListeners.add(listener);
    listener(this.getConnectionStatus());
    return () => this.statusListeners.delete(listener);
  }

  async login(body: {
    role: string;
    badgeNumber?: string;
    pin?: string;
    ambulanceId?: string;
    hospitalId?: string;
  }): Promise<AuthSession> {
    const res = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const session: AuthSession = {
      role: res.role,
      userLabel: res.userLabel,
      subLabel: res.subLabel,
      ambulanceId: res.vehicleId,
      hospitalId: res.hospitalId,
      dispatcherBadge: body.badgeNumber,
      citizenProfile: res.citizenProfile,
      loginTime: new Date().toISOString(),
    };

    if (res.token) {
      try {
        localStorage.setItem('aegis.live.token', res.token);
      } catch {}
    }
    try {
      localStorage.setItem('aegis.live.auth_session', JSON.stringify(session));
    } catch {}

    return session;
  }

  async registerCitizen(body: {
    name: string;
    phone: string;
    password: string;
    age?: number;
    gender?: string;
    bloodGroup?: string;
    diseases?: string[];
    allergies?: string[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }): Promise<AuthSession> {
    const cleanPhone = body.phone.replace(/[^0-9]/g, '').slice(-10);
    const res = await this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        phone: cleanPhone,
        role: 'CITIZEN',
      }),
    });

    const session: AuthSession = {
      role: 'CITIZEN',
      userLabel: res.userLabel || body.name,
      subLabel: `Citizen Profile · Blood: ${body.bloodGroup || 'O+'}`,
      citizenProfile: {
        id: res.id || `cit-${cleanPhone}`,
        name: body.name,
        gender: (body.gender as any) || 'PREFER_NOT_TO_SAY',
        age: body.age || 30,
        phone: body.phone,
        bloodGroup: body.bloodGroup,
        diseases: body.diseases || [],
        allergies: body.allergies || [],
        emergencyContactName: body.emergencyContactName,
        emergencyContactPhone: body.emergencyContactPhone,
        registeredAt: new Date().toISOString(),
      },
      loginTime: new Date().toISOString(),
    };

    if (res.token) {
      try {
        localStorage.setItem('aegis.live.token', res.token);
      } catch {}
    }
    try {
      localStorage.setItem('aegis.live.auth_session', JSON.stringify(session));
    } catch {}

    return session;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  async getDashboard(): Promise<DashboardData> {
    return this.request<DashboardData>('/dashboard');
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return this.request<AuditLog[]>('/audit');
  }

  async createEmergency(emergency: Partial<Emergency>): Promise<Emergency> {
    return this.request<Emergency>('/emergencies', {
      method: 'POST',
      body: JSON.stringify(emergency),
    });
  }

  async updateEmergencyStatus(id: string, status: string, actor = 'Operator'): Promise<Emergency> {
    return this.request<Emergency>(`/emergencies/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, actor }),
    });
  }

  async getCandidates(emergencyId: string): Promise<Candidate[]> {
    return this.request<Candidate[]>(`/emergencies/${emergencyId}/candidates`);
  }

  async autoAssign(emergencyId: string, dispatcher = 'AI Auto-Dispatcher'): Promise<{ dispatch: Dispatch }> {
    return this.request<{ dispatch: Dispatch }>(`/emergencies/${emergencyId}/auto-assign`, {
      method: 'POST',
      body: JSON.stringify({ dispatcher }),
    });
  }

  async createDispatch(emergencyId: string, ambulanceId: string, dispatcher = 'EMS Commander'): Promise<Dispatch> {
    return this.request<Dispatch>('/dispatches', {
      method: 'POST',
      body: JSON.stringify({ emergencyId, ambulanceId, dispatcher }),
    });
  }

  async advanceDispatchStatus(dispatchId: string, status: string, actor = 'Paramedic'): Promise<Dispatch> {
    return this.request<Dispatch>(`/dispatches/${dispatchId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, dispatcher: actor }),
    });
  }

  async reassignHospital(dispatchId: string, hospitalId: string): Promise<Dispatch> {
    return this.request<Dispatch>(`/dispatches/${dispatchId}/hospital`, {
      method: 'POST',
      body: JSON.stringify({ hospitalId }),
    });
  }

  async getRoute(dispatchId: string): Promise<RouteDetails | null> {
    try {
      return await this.request<RouteDetails>(`/dispatches/${dispatchId}/route`);
    } catch {
      return null;
    }
  }

  async streamVitals(dispatchId: string, vitals: PatientVitals): Promise<void> {
    await this.request<void>(`/dispatches/${dispatchId}/vitals`, {
      method: 'POST',
      body: JSON.stringify(vitals),
    });
  }

  async updateHospitalCapacity(hospitalId: string, capacity: Partial<Hospital>): Promise<Hospital> {
    return this.request<Hospital>(`/hospitals/${hospitalId}/capacity`, {
      method: 'POST',
      body: JSON.stringify(capacity),
    });
  }

  async updateAmbulanceLocation(ambulanceId: string, latitude: number, longitude: number, speed = 0, heading = 0): Promise<void> {
    await this.request<void>(`/ambulances/${ambulanceId}/location`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, speed, heading }),
    });
  }

  async startSimulation(dispatchId: string): Promise<void> {
    await this.request<void>(`/simulation/start/${dispatchId}`, {
      method: 'POST',
    });
  }

  async stopSimulation(dispatchId: string): Promise<void> {
    await this.request<void>(`/simulation/stop/${dispatchId}`, {
      method: 'POST',
    });
  }

  async resetSimulation(): Promise<void> {
    await this.request<void>('/simulation/reset', {
      method: 'POST',
    });
  }

  async aiChat(message: string): Promise<{ reply: string; actionExecuted?: string }> {
    return this.request<{ reply: string; actionExecuted?: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async aiTriage(description: string, type = 'ACCIDENT'): Promise<TriageAssessment> {
    return this.request<TriageAssessment>('/ai/triage', {
      method: 'POST',
      body: JSON.stringify({ description, type }),
    });
  }

  async getV2xCorridor(): Promise<V2xCorridorData> {
    return this.request<V2xCorridorData>('/v2x/corridor');
  }

  getAnalyticsExportCsvUrl(): string {
    return `${API_BASE}/analytics/export.csv`;
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
    this.eventListeners.clear();
    this.statusListeners.clear();
  }
}
