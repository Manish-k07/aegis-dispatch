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
  CitizenProfile,
} from '../types';

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'OFFLINE';

export type Unsubscribe = () => void;

export class ProfileConflictError extends Error {
  readonly currentProfile: CitizenProfile;
  constructor(message: string, currentProfile: CitizenProfile) {
    super(message);
    this.name = 'ProfileConflictError';
    this.currentProfile = currentProfile;
  }
}

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
    name?: string;
    fullName?: string;
    phone?: string;
    password: string;
    registrationToken?: string;
    medicalProfile?: Partial<CitizenProfile>;
    profile?: Partial<CitizenProfile>;
    age?: number;
    gender?: string;
    bloodGroup?: string;
    diseases?: string[];
    allergies?: string[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }): Promise<AuthSession>;

  changePassword?(oldPassword: string, newPassword: string): Promise<void>;

  // Citizen OTP & Google Authentication (Part 1, 2, 4)
  requestCitizenOtp?(phone: string): Promise<{ resendInSeconds: number; devOtp?: string }>;
  verifyCitizenOtp?(body: { phone: string; otp: string; name?: string }): Promise<AuthSession | { status: 'NEW_USER'; registrationToken: string }>;
  registerCitizenWithOtp?(body: { registrationToken: string; fullName: string; profile?: Partial<CitizenProfile> }): Promise<AuthSession>;

  loginWithGoogle?(idToken: string): Promise<
    | AuthSession
    | { status: 'EMAIL_VERIFICATION_REQUIRED'; verificationToken: string; maskedEmail: string }
    | { status: 'NEW_USER'; registrationToken: string }
  >;
  verifyGoogleEmail?(verificationToken: string, otp: string): Promise<AuthSession | { status: 'NEW_USER'; registrationToken: string }>;
  resendGoogleEmailOtp?(verificationToken: string): Promise<{ resendInSeconds: number; devOtp?: string; message: string }>;
  registerCitizenWithGoogle?(body: { registrationToken: string; phone?: string; otp?: string; fullName?: string; profile?: Partial<CitizenProfile> }): Promise<AuthSession>;
  completeGoogleRegistration?(data: { registrationTicket?: string; registrationToken?: string; phone?: string; otp?: string; fullName?: string }): Promise<AuthSession>;

  sendOtp?(phone: string): Promise<{ success?: boolean; status?: string; message: string }>;
  verifyOtp?(phone: string, otp: string): Promise<any>;

  // Citizen Profile (Single Source of Truth - Part 3)
  getCitizenProfile?(): Promise<CitizenProfile>;
  updateCitizenProfile?(profile: Partial<CitizenProfile>, expectedVersion?: number): Promise<CitizenProfile>;

  // Cancellation with reason (Part 2 F3)
  cancelEmergency?(id: string, reason: any, reasonText?: string): Promise<Emergency>;

  // Dashboard & State
  getDashboard(): Promise<DashboardData>;
  getAuditLogs(): Promise<AuditLog[]>;

  // Incidents
  createEmergency(emergency: Partial<Emergency>): Promise<Emergency>;
  updateEmergencyStatus(id: string, status: string, actor?: string, cancelInfo?: { cancelReason?: string; cancelNote?: string }): Promise<Emergency>;
  getCandidates(emergencyId: string): Promise<Candidate[]>;
  autoAssign(emergencyId: string, dispatcher?: string): Promise<{ dispatch: Dispatch }>;

  // Dispatches
  createDispatch(emergencyId: string, ambulanceId: string, dispatcher?: string): Promise<Dispatch>;
  advanceDispatchStatus(dispatchId: string, status: string, actor?: string, cancelInfo?: { cancelReason?: string; cancelNote?: string }): Promise<Dispatch>;
  reassignHospital(dispatchId: string, hospitalId: string): Promise<Dispatch>;
  getRoute(dispatchId: string): Promise<RouteDetails | null>;
  streamVitals(dispatchId: string, vitals: PatientVitals): Promise<void>;

  // Hospital ED Operations
  updateHospitalCapacity(hospitalId: string, capacity: Partial<Hospital>): Promise<Hospital>;

  // Telemetry & Corridor
  getV2xCorridor(): Promise<V2xCorridorData>;
  simulatePreemption?(intersectionId: string): Promise<void>;

  // Simulation
  startSimulation(dispatchId: string): Promise<void>;
  stopSimulation(dispatchId: string): Promise<void>;
  resetSimulation(): Promise<void>;

  // Cleanup
  getAnalyticsExportCsvUrl?(): string;
  destroy(): void;
}
