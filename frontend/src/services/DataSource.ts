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

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'OFFLINE';

export type Unsubscribe = () => void;

export interface RouteDetails {
  distanceKm: number;
  etaMinutes: number;
  waypoints: [number, number][];
  maneuvers?: Array<{
    instruction: string;
    distanceMeters: number;
    location: [number, number];
  }>;
}

export interface V2xCorridorData {
  corridorActive: boolean;
  preemptionProtocol?: string;
  activeIntersections: Array<{
    id: string;
    name: string;
    state: string;
    distanceM?: number;
    countdownS?: number;
  }>;
}

export interface DataSource {
  readonly mode: 'LIVE' | 'DEMO';

  // Realtime & Connectivity
  getConnectionStatus(): ConnectionStatus;
  subscribeToEvents(listener: (event: any) => void): Unsubscribe;
  subscribeToConnectionStatus(listener: (status: ConnectionStatus) => void): Unsubscribe;

  // Authentication
  login(body: {
    role: string;
    badgeNumber?: string;
    pin?: string;
    ambulanceId?: string;
    hospitalId?: string;
  }): Promise<AuthSession>;

  registerCitizen(body: {
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
  }): Promise<AuthSession>;

  changePassword?(oldPassword: string, newPassword: string): Promise<void>;

  // Dashboard & State
  getDashboard(): Promise<DashboardData>;
  getAuditLogs(): Promise<AuditLog[]>;

  // Incidents
  createEmergency(emergency: Partial<Emergency>): Promise<Emergency>;
  updateEmergencyStatus(id: string, status: string, actor?: string): Promise<Emergency>;
  getCandidates(emergencyId: string): Promise<Candidate[]>;
  autoAssign(emergencyId: string, dispatcher?: string): Promise<{ dispatch: Dispatch }>;

  // Dispatches
  createDispatch(emergencyId: string, ambulanceId: string, dispatcher?: string): Promise<Dispatch>;
  advanceDispatchStatus(dispatchId: string, status: string, actor?: string): Promise<Dispatch>;
  reassignHospital(dispatchId: string, hospitalId: string): Promise<Dispatch>;
  getRoute(dispatchId: string): Promise<RouteDetails | null>;
  streamVitals(dispatchId: string, vitals: PatientVitals): Promise<void>;

  // Hospital Capacity
  updateHospitalCapacity(hospitalId: string, capacity: Partial<Hospital>): Promise<Hospital>;

  // Telemetry
  updateAmbulanceLocation(ambulanceId: string, latitude: number, longitude: number, speed?: number, heading?: number): Promise<void>;

  // Simulation controls (Demo mode or dev testing)
  startSimulation(dispatchId: string): Promise<void>;
  stopSimulation(dispatchId: string): Promise<void>;
  resetSimulation(): Promise<void>;

  // AI & Triage
  aiChat(message: string): Promise<{ reply: string; actionExecuted?: string }>;
  aiTriage(description: string, type?: string): Promise<TriageAssessment>;

  // V2X Grid
  getV2xCorridor(): Promise<V2xCorridorData>;

  // Analytics Export
  getAnalyticsExportCsvUrl(): string;

  // Cleanup
  destroy(): void;
}
