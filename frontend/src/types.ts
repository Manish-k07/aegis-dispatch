export interface Emergency {
  id: string;
  callerName: string;
  phone: string;
  type: 'ACCIDENT' | 'CARDIAC' | 'BREATHING' | 'TRAUMA' | 'PEDIATRIC' | 'MATERNITY' | string;
  patientCount: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description?: string;
  latitude: number;
  longitude: number;
  address: string;
  status:
    | 'CREATED'
    | 'PENDING_DISPATCH'
    | 'DISPATCHED'
    | 'AMBULANCE_ACCEPTED'
    | 'EN_ROUTE_TO_SCENE'
    | 'ARRIVED_AT_SCENE'
    | 'PATIENT_ONBOARD'
    | 'EN_ROUTE_TO_HOSPITAL'
    | 'ARRIVED_AT_HOSPITAL'
    | 'PATIENT_HANDED_OVER'
    | 'COMPLETED'
    | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface Ambulance {
  id: string;
  registrationNumber: string;
  type: 'ALS' | 'BLS' | string;
  status:
    | 'AVAILABLE'
    | 'RESERVED'
    | 'DISPATCHED'
    | 'EN_ROUTE_TO_PATIENT'
    | 'ARRIVED_AT_SCENE'
    | 'PATIENT_ONBOARD'
    | 'EN_ROUTE_TO_HOSPITAL'
    | 'AT_HOSPITAL'
    | 'OUT_OF_SERVICE';
  driverName?: string;
  emtName?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  lastLocationAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'AVAILABLE' | 'LIMITED_CAPACITY' | 'FULL' | string;
  emergencyDepartment: boolean;
  icuAvailable: boolean;
  cardiacServices: boolean;
  pediatricServices: boolean;
  maternityServices: boolean;
  totalBeds?: number;
  availableBeds?: number;
  icuBedsTotal?: number;
  icuBedsAvailable?: number;
  traumaBaysTotal?: number;
  traumaBaysAvailable?: number;
  cathLabOperational?: boolean;
  demoData?: boolean;
}

export interface Dispatch {
  id: string;
  emergencyId: string;
  ambulanceId: string;
  dispatcherName: string;
  status: string;
  distanceKm: number;
  etaMinutes: number;
  score: number;
  hospitalId?: string;
  assignedAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export interface Candidate {
  ambulance: Ambulance;
  distanceKm: number;
  etaMinutes: number;
  capabilityScore: number;
  score: number;
  waypoints?: [number, number][];
}

export interface AuditLog {
  id: number;
  actor: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousState?: string;
  newState?: string;
  metadata?: string;
  createdAt: string;
}

export interface DashboardData {
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  dispatches: Dispatch[];
  activeSimulations?: string[];
}

export type UserRole = 'DISPATCHER' | 'DRIVER' | 'HOSPITAL';

export interface PatientVitals {
  heartRate: number;
  bloodPressureSys: number;
  bloodPressureDia: number;
  spO2: number;
  respiratoryRate: number;
  temperature: number;
  gcs: number;
  conditionSummary: string;
}

export interface TrafficPreemptionSignal {
  id: string;
  intersection: string;
  state: 'GREEN_PREEMPTED' | 'CLEARING' | 'NORMAL';
  distanceMeters: number;
  countdownSec: number;
}

export interface MaintenanceDiagnostic {
  ambulanceId: string;
  registrationNumber: string;
  fuelOrBatteryPercent: number;
  isElectric: boolean;
  odometerKm: number;
  oxygenTankPsi: number;
  defibrillatorStatus: string;
  nextServiceDueKm: number;
  alert?: string;
}

export interface WeatherReport {
  location: string;
  condition: string;
  tempC: number;
  roadCondition: 'DRY' | 'WET' | 'WATERLOGGED';
  speedMultiplier: number;
  windKmh: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  time: string;
  actionExecuted?: string;
  data?: any;
}

export interface TriageAssessment {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  esiLevel: string;
  suggestedType: string;
  requiredUnit: string;
  protocolChecklist: string[];
}

export interface SavedFileInfo {
  fileName: string;
  category: 'LATEST_SNAPSHOT' | 'HISTORICAL_BACKUP';
  path: string;
  sizeBytes: number;
  sizeFormatted: string;
  lastModified: string;
}

export interface SaveResult {
  status: string;
  message: string;
  snapshotFile: string;
  backupFile: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  timestamp: string;
  recordsSaved: {
    emergencies: number;
    dispatches: number;
    ambulances: number;
    hospitals: number;
    auditLogs: number;
  };
}

