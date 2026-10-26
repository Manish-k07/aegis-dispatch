import {
  DataSource,
  ConnectionStatus,
  Unsubscribe,
  RouteDetails,
  V2xCorridorData,
} from '../services/DataSource';
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
import { INITIAL_DEMO_DATA, INITIAL_DEMO_AUDIT_LOGS } from './demoData';

const DEMO_STORAGE_KEY = 'aegis.demo.dashboard';
const DEMO_AUDIT_KEY = 'aegis.demo.audit';
const DEMO_AUTH_KEY = 'aegis.demo.auth_session';

export class DemoDataSource implements DataSource {
  readonly mode = 'DEMO' as const;

  private eventListeners: Set<(event: any) => void> = new Set();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private simulationInterval: any = null;
  private telemetryInterval: any = null;
  private isDestroyed = false;

  constructor() {
    this.ensureInitialized();
    this.startTelemetryLoop();
  }

  private ensureInitialized() {
    try {
      if (!localStorage.getItem(DEMO_STORAGE_KEY)) {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DATA));
      }
      if (!localStorage.getItem(DEMO_AUDIT_KEY)) {
        localStorage.setItem(DEMO_AUDIT_KEY, JSON.stringify(INITIAL_DEMO_AUDIT_LOGS));
      }
    } catch {}
  }

  private getStoredData(): DashboardData {
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
  }

  private saveStoredData(data: DashboardData) {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  private getStoredAudit(): AuditLog[] {
    try {
      const raw = localStorage.getItem(DEMO_AUDIT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return JSON.parse(JSON.stringify(INITIAL_DEMO_AUDIT_LOGS));
  }

  private saveStoredAudit(logs: AuditLog[]) {
    try {
      localStorage.setItem(DEMO_AUDIT_KEY, JSON.stringify(logs.slice(0, 100)));
    } catch {}
  }

  private emit(event: any) {
    if (this.isDestroyed) return;
    this.eventListeners.forEach((l) => {
      try {
        l(event);
      } catch {}
    });
  }

  private logAudit(actor: string, action: string, entityType: string, entityId?: string, metadata?: string) {
    const logs = this.getStoredAudit();
    const newLog: AuditLog = {
      id: Date.now(),
      actor,
      action,
      entityType,
      entityId,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.saveStoredAudit([newLog, ...logs]);
  }

  private startTelemetryLoop() {
    // Pulse subtle speed and telemetry ping every 5s in demo
    this.telemetryInterval = setInterval(() => {
      if (this.isDestroyed) return;
      this.emit({ event: 'TELEMETRY_PING', time: new Date().toISOString() });
    }, 5000);
  }

  getConnectionStatus(): ConnectionStatus {
    return 'CONNECTED';
  }

  subscribeToEvents(listener: (event: any) => void): Unsubscribe {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  subscribeToConnectionStatus(listener: (status: ConnectionStatus) => void): Unsubscribe {
    this.statusListeners.add(listener);
    listener('CONNECTED');
    return () => this.statusListeners.delete(listener);
  }

  async login(body: {
    role: string;
    badgeNumber?: string;
    pin?: string;
    ambulanceId?: string;
    hospitalId?: string;
  }): Promise<AuthSession> {
    const role = (body.role || '').toUpperCase();
    const badge = (body.badgeNumber || '').trim().toUpperCase();
    const pin = (body.pin || '').trim();

    let valid = false;
    let userLabel = 'Demo User';
    let subLabel = 'Demo Mode Console';
    let ambulanceId = body.ambulanceId;
    let hospitalId = body.hospitalId;

    if (role === 'DISPATCHER') {
      const validBadges = ['DISPATCH-01', 'CAD-001', 'DISPATCHER', 'ADMIN'];
      const validPins = ['Dispatch@2026', 'Aegis@2026', '1120', '1234'];
      valid = (validBadges.includes(badge) || badge === 'DISPATCH-01') && validPins.includes(pin);
      userLabel = 'A. Sharma (DISPATCHER)';
      subLabel = 'Demo Central CAD Console';
    } else if (role === 'DRIVER' || role === 'PARAMEDIC') {
      const validBadges = ['MEDIC-101', 'MEDIC-01', 'DRIVER', 'DRIVER-01'];
      const validPins = ['4321', 'Medic@2026', '1120'];
      valid = (validBadges.includes(badge) || badge.includes('MEDIC')) && validPins.includes(pin);
      userLabel = 'Paramedic R. Deshmukh';
      subLabel = 'Unit KA-01-AE-1001 (ALS)';
      ambulanceId = ambulanceId || '20000000-0000-0000-0000-000000000001';
    } else if (role === 'HOSPITAL') {
      const validBadges = ['HOSP-101', 'HOSP-201', 'HOSP-301', 'HOSPITAL', 'HOSP-1'];
      const validPins = ['Hospital@2001', 'Hospital@2026', '2001', '1120'];
      valid = (validBadges.includes(badge) || badge.startsWith('HOSP')) && validPins.includes(pin);
      userLabel = 'Dr. S. Kulkarni (ED Director)';
      subLabel = 'Aegis City General Emergency Dept';
      hospitalId = hospitalId || '10000000-0000-0000-0000-000000000001';
    } else if (role === 'CITIZEN') {
      const cleanPhone = (body.badgeNumber || '').replace(/[^0-9]/g, '').slice(-10);
      valid = (cleanPhone === '9845012345' || badge === 'CITIZEN') && (pin === 'Citizen@2026' || pin === '1120' || pin === 'password123');
      userLabel = 'Priya Sharma';
      subLabel = 'Citizen Profile · Blood: O+';
    }

    if (!valid) {
      throw new Error('Invalid demo credentials. Please check demo account list in Demo Mode modal.');
    }

    const session: AuthSession = {
      role: (role === 'PARAMEDIC' ? 'DRIVER' : role) as any,
      userLabel,
      subLabel,
      ambulanceId,
      hospitalId,
      dispatcherBadge: badge,
      citizenProfile: role === 'CITIZEN' ? {
        id: 'cit-priya-01',
        name: 'Priya Sharma',
        gender: 'FEMALE',
        age: 29,
        phone: '+91 98450 12345',
        email: 'priya.sharma@example.com',
        bloodGroup: 'O+',
        diseases: ['Severe asthma'],
        allergies: ['Penicillin / amoxicillin'],
        emergencyContactName: 'Amit Patel (Spouse)',
        emergencyContactPhone: '+91 98450 99887',
      } : undefined,
      loginTime: new Date().toISOString(),
    };

    try {
      localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(session));
    } catch {}

    return session;
  }

  async registerCitizen(body: any): Promise<AuthSession> {
    const session: AuthSession = {
      role: 'CITIZEN',
      userLabel: body.name,
      subLabel: `Citizen Profile · Blood: ${body.bloodGroup || 'O+'}`,
      citizenProfile: {
        id: `cit-demo-${Date.now()}`,
        name: body.name,
        gender: body.gender || 'PREFER_NOT_TO_SAY',
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
    try {
      localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(session));
    } catch {}
    return session;
  }

  async getDashboard(): Promise<DashboardData> {
    return this.getStoredData();
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return this.getStoredAudit();
  }

  async createEmergency(em: Partial<Emergency>): Promise<Emergency> {
    const data = this.getStoredData();
    const id = `emg-demo-${Date.now()}`;
    const newEmergency: Emergency = {
      id,
      callerName: em.callerName || 'Citizen',
      phone: em.phone || '9845012345',
      type: em.type || 'CARDIAC',
      patientCount: em.patientCount || 1,
      priority: em.priority || 'CRITICAL',
      description: em.description || 'Simulated Emergency Call',
      latitude: em.latitude || 12.9716,
      longitude: em.longitude || 77.5946,
      address: em.address || 'Demo Location, Bengaluru',
      status: 'PENDING_DISPATCH',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.emergencies = [newEmergency, ...(data.emergencies || [])];
    this.saveStoredData(data);
    this.logAudit(newEmergency.callerName, 'EMERGENCY_CREATED', 'EMERGENCY', id, `Priority: ${newEmergency.priority}`);
    this.emit({ event: 'NEW_EMERGENCY', id, priority: newEmergency.priority, type: newEmergency.type });
    return newEmergency;
  }

  async updateEmergencyStatus(id: string, status: string, actor = 'Demo Operator'): Promise<Emergency> {
    const data = this.getStoredData();
    let updated: Emergency | null = null;
    data.emergencies = data.emergencies.map((e) => {
      if (e.id === id) {
        updated = { ...e, status: status as any, updatedAt: new Date().toISOString() };
        return updated;
      }
      return e;
    });

    if (status === 'CANCELLED') {
      data.dispatches = data.dispatches.map((d) => {
        if (d.emergencyId === id) {
          data.ambulances = data.ambulances.map((a) =>
            a.id === d.ambulanceId ? { ...a, status: 'AVAILABLE', speed: 0 } : a
          );
          return { ...d, status: 'CANCELLED' };
        }
        return d;
      });
    }

    this.saveStoredData(data);
    this.logAudit(actor, 'STATUS_CHANGED', 'EMERGENCY', id, `Status: ${status}`);
    this.emit({ event: 'EMERGENCY_UPDATED', id, status });
    return updated || ({} as Emergency);
  }

  async getCandidates(emergencyId: string): Promise<Candidate[]> {
    const data = this.getStoredData();
    const em = data.emergencies.find((e) => e.id === emergencyId);
    return data.ambulances.map((amb, index) => {
      const dist = 1.8 + index * 1.2;
      const eta = Math.round(dist * 2.2);
      return {
        ambulance: amb,
        distanceKm: Number(dist.toFixed(2)),
        etaMinutes: eta,
        capabilityScore: amb.type === 'ALS' ? 95 : 80,
        score: Math.max(50, 98 - index * 12),
        waypoints: [
          [amb.latitude, amb.longitude],
          [em ? em.latitude : 12.9716, em ? em.longitude : 77.5946],
        ],
      };
    });
  }

  async autoAssign(emergencyId: string, dispatcher = 'Demo AI Auto-Dispatcher'): Promise<{ dispatch: Dispatch }> {
    const data = this.getStoredData();
    const em = data.emergencies.find((e) => e.id === emergencyId);
    const available = data.ambulances.find((a) => a.status === 'AVAILABLE') || data.ambulances[0];

    const dispatch = await this.createDispatch(emergencyId, available.id, dispatcher);
    return { dispatch };
  }

  async createDispatch(emergencyId: string, ambulanceId: string, dispatcher = 'Demo Commander'): Promise<Dispatch> {
    const data = this.getStoredData();
    const id = `disp-demo-${Date.now()}`;
    const newDispatch: Dispatch = {
      id,
      emergencyId,
      ambulanceId,
      dispatcherName: dispatcher,
      status: 'DISPATCHED',
      distanceKm: 2.4,
      etaMinutes: 6,
      score: 94,
      hospitalId: data.hospitals[0]?.id,
      assignedAt: new Date().toISOString(),
    };

    data.dispatches = [newDispatch, ...(data.dispatches || [])];
    data.emergencies = data.emergencies.map((e) =>
      e.id === emergencyId ? { ...e, status: 'DISPATCHED', updatedAt: new Date().toISOString() } : e
    );
    data.ambulances = data.ambulances.map((a) =>
      a.id === ambulanceId ? { ...a, status: 'DISPATCHED', speed: 38 } : a
    );

    this.saveStoredData(data);
    this.logAudit(dispatcher, 'DISPATCH_ASSIGNED', 'DISPATCH', id, `Unit: ${ambulanceId}`);
    this.emit({ event: 'AMBULANCE_ASSIGNED', dispatchId: id, emergencyId, ambulanceId });
    return newDispatch;
  }

  async advanceDispatchStatus(dispatchId: string, status: string, actor = 'Demo Paramedic'): Promise<Dispatch> {
    const data = this.getStoredData();
    let updated: Dispatch | null = null;
    let ambId = '';

    data.dispatches = data.dispatches.map((d) => {
      if (d.id === dispatchId) {
        ambId = d.ambulanceId;
        updated = { ...d, status };
        if (status === 'COMPLETED' || status === 'CANCELLED') {
          updated.completedAt = new Date().toISOString();
        }
        return updated;
      }
      return d;
    });

    if (ambId) {
      data.ambulances = data.ambulances.map((a) => {
        if (a.id === ambId) {
          if (status === 'COMPLETED' || status === 'CANCELLED') {
            return { ...a, status: 'AVAILABLE', speed: 0 };
          }
          if (status === 'ARRIVED_AT_SCENE' || status === 'ARRIVED_AT_HOSPITAL') {
            return { ...a, status: status as any, speed: 0 };
          }
          return { ...a, status: status as any, speed: 45 };
        }
        return a;
      });
    }

    this.saveStoredData(data);
    this.logAudit(actor, 'STATUS_ADVANCED', 'DISPATCH', dispatchId, `Status: ${status}`);
    this.emit({ event: 'STATUS_UPDATED', dispatchId, status });
    return updated || ({} as Dispatch);
  }

  async reassignHospital(dispatchId: string, hospitalId: string): Promise<Dispatch> {
    const data = this.getStoredData();
    let updated: Dispatch | null = null;
    data.dispatches = data.dispatches.map((d) => {
      if (d.id === dispatchId) {
        updated = { ...d, hospitalId };
        return updated;
      }
      return d;
    });
    this.saveStoredData(data);
    this.logAudit('Demo Dispatcher', 'HOSPITAL_REASSIGNED', 'DISPATCH', dispatchId, `Hospital: ${hospitalId}`);
    this.emit({ event: 'HOSPITAL_UPDATED', dispatchId, hospitalId });
    return updated || ({} as Dispatch);
  }

  async getRoute(dispatchId: string): Promise<RouteDetails | null> {
    const data = this.getStoredData();
    const disp = data.dispatches.find((d) => d.id === dispatchId);
    const amb = disp ? data.ambulances.find((a) => a.id === disp.ambulanceId) : null;
    const em = disp ? data.emergencies.find((e) => e.id === disp.emergencyId) : null;

    const startLat = amb?.latitude || 12.9710;
    const startLon = amb?.longitude || 77.5930;
    const endLat = em?.latitude || 12.9719;
    const endLon = em?.longitude || 77.5949;

    return {
      distanceKm: 2.1,
      etaMinutes: 5,
      waypoints: [
        [startLat, startLon],
        [startLat + 0.002, startLon + 0.001],
        [startLat + 0.004, startLon + 0.003],
        [endLat, endLon],
      ],
      maneuvers: [
        { instruction: 'Head north on 100ft arterial road', distanceMeters: 450, location: [startLat, startLon] },
        { instruction: 'Turn right toward emergency scene', distanceMeters: 300, location: [endLat, endLon] },
      ],
    };
  }

  async streamVitals(dispatchId: string, vitals: PatientVitals): Promise<void> {
    this.emit({ event: 'VITALS_UPDATED', dispatchId, vitals });
  }

  async updateHospitalCapacity(hospitalId: string, capacity: Partial<Hospital>): Promise<Hospital> {
    const data = this.getStoredData();
    let updated: Hospital | null = null;
    data.hospitals = data.hospitals.map((h) => {
      if (h.id === hospitalId) {
        updated = { ...h, ...capacity };
        return updated;
      }
      return h;
    });
    this.saveStoredData(data);
    this.logAudit('Demo ED Staff', 'CAPACITY_UPDATED', 'HOSPITAL', hospitalId, `Beds: ${capacity.availableBeds}`);
    this.emit({ event: 'HOSPITAL_CAPACITY_UPDATED', hospitalId, ...capacity });
    return updated || ({} as Hospital);
  }

  async updateAmbulanceLocation(ambulanceId: string, latitude: number, longitude: number, speed = 0, heading = 0): Promise<void> {
    const data = this.getStoredData();
    data.ambulances = data.ambulances.map((a) =>
      a.id === ambulanceId ? { ...a, latitude, longitude, speed, heading, lastLocationAt: new Date().toISOString() } : a
    );
    this.saveStoredData(data);
    this.emit({ event: 'LOCATION_UPDATED', ambulanceId, latitude, longitude, speed, heading });
  }

  async startSimulation(dispatchId: string): Promise<void> {
    const data = this.getStoredData();
    if (!data.activeSimulations) data.activeSimulations = [];
    if (!data.activeSimulations.includes(dispatchId)) {
      data.activeSimulations.push(dispatchId);
    }
    this.saveStoredData(data);

    if (this.simulationInterval) clearInterval(this.simulationInterval);
    this.simulationInterval = setInterval(() => {
      if (this.isDestroyed) return;
      const d = this.getStoredData();
      d.ambulances = d.ambulances.map((a) => ({
        ...a,
        latitude: a.latitude + (Math.random() - 0.5) * 0.0005,
        longitude: a.longitude + (Math.random() - 0.5) * 0.0005,
        speed: 35 + Math.floor(Math.random() * 15),
      }));
      this.saveStoredData(d);
      this.emit({ event: 'SIMULATION_TICK', dispatchId });
    }, 1500);

    this.emit({ event: 'SIMULATION_STARTED', dispatchId });
  }

  async stopSimulation(dispatchId: string): Promise<void> {
    const data = this.getStoredData();
    data.activeSimulations = (data.activeSimulations || []).filter((id) => id !== dispatchId);
    this.saveStoredData(data);
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.emit({ event: 'SIMULATION_STOPPED', dispatchId });
  }

  async resetSimulation(): Promise<void> {
    this.saveStoredData(JSON.parse(JSON.stringify(INITIAL_DEMO_DATA)));
    this.saveStoredAudit(JSON.parse(JSON.stringify(INITIAL_DEMO_AUDIT_LOGS)));
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.emit({ event: 'DATABASE_RESET' });
  }

  async aiChat(message: string): Promise<{ reply: string; actionExecuted?: string }> {
    const lower = message.toLowerCase();
    if (lower.includes('auto assign') || lower.includes('dispatch next') || lower.includes('closest')) {
      const data = this.getStoredData();
      const pending = data.emergencies.find((e) => e.status === 'PENDING_DISPATCH');
      if (pending) {
        await this.autoAssign(pending.id);
        return { reply: `[DEMO AI]: Auto-dispatched closest unit to ${pending.callerName} (${pending.type})`, actionExecuted: 'DISPATCH_ASSIGNED' };
      }
      return { reply: '[DEMO AI]: Queue clear. No pending calls awaiting dispatch in demo queue.', actionExecuted: 'NONE' };
    }
    return {
      reply: `[DEMO AI Assistant]: Tactical telemetry nominal. All simulated units tracking within SLA.`,
      actionExecuted: 'NONE',
    };
  }

  async aiTriage(description: string, type = 'ACCIDENT'): Promise<TriageAssessment> {
    const lower = description.toLowerCase();
    if (lower.includes('chest') || lower.includes('cardiac') || lower.includes('heart')) {
      return {
        priority: 'CRITICAL',
        esiLevel: 'Level 1 - Resuscitation',
        suggestedType: 'CARDIAC',
        requiredUnit: 'ALS Resuscitation Unit',
        protocolChecklist: [
          'Acquire 12-lead ECG & transmit to receiving ED',
          'Chew 325mg Aspirin if non-allergic',
          'Establish bilateral IV lines',
          'Pre-alert Hospital Cardiac Cath Lab',
        ],
      };
    }
    return {
      priority: 'HIGH',
      esiLevel: 'Level 2 - Emergent',
      suggestedType: type,
      requiredUnit: 'ALS Emergency Unit',
      protocolChecklist: [
        'Continuous SpO2 & vital monitoring',
        'Direct pressure & hemorrhage control if bleeding',
        'Rapid trauma assessment',
      ],
    };
  }

  async getV2xCorridor(): Promise<V2xCorridorData> {
    return {
      corridorActive: true,
      preemptionProtocol: 'Simulated DSRC / C-V2X (IEEE 1609)',
      activeIntersections: [
        { id: 'SIG-101', name: 'Brigade Rd & Residency Rd Junction', state: 'GREEN_PREEMPTED', distanceM: 180, countdownS: 24 },
        { id: 'SIG-102', name: 'Richmond Circle Flyover Approach', state: 'GREEN_REQUESTED', distanceM: 460, countdownS: 45 },
        { id: 'SIG-103', name: 'Koramangala 80ft Intermediate Light', state: 'STANDBY', distanceM: 920, countdownS: 90 },
      ],
    };
  }

  getAnalyticsExportCsvUrl(): string {
    return 'data:text/csv;charset=utf-8,id,actor,action,timestamp\n1,Demo Dispatcher,SIMULATION_EXPORT,' + encodeURIComponent(new Date().toISOString());
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
    this.eventListeners.clear();
    this.statusListeners.clear();
  }
}
