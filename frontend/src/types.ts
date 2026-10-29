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
  otherTypeDescription?: string;
  typeOther?: string;
  cancelReasonCode?: string;
  cancelReasonText?: string;
  cancelReason?: string;
  cancelNote?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  sosTriggeredAt?: string;
  locationAccuracy?: number;
  locationAccuracyM?: number;
  locationSource?: string;
  sosSource?: string;
  deviceInfo?: any;
  deviceContext?: any;
}

export interface SosDeviceContext {
  capturedAt: string;
  timeZone: string;
  deviceTime: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  positionTimestamp?: number;
  batteryLevel?: number;
  batteryCharging?: boolean;
  onLine?: boolean;
  connectionType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  userAgent?: string;
  platform?: string;
  language?: string;
  screenResolution?: string;
  isTouch?: boolean;
  orientation?: string;
  geolocationPermission?: string;
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
  designatedEdPhone?: string;
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

export type UserRole = 'DISPATCHER' | 'DRIVER' | 'PARAMEDIC' | 'HOSPITAL' | 'HOSPITAL_STAFF' | 'CITIZEN' | 'ADMIN' | null;

export interface CitizenProfile {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  age: number;
  phone: string;
  email?: string;
  diseases: string[];
  allergies: string[];
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  registeredAt?: string;
  dob?: string;
  address?: string;
  homeAddress?: string;
  landmark?: string;
  emergencyContacts?: Array<{ name: string; relationship: string; phone: string }>;
  medications?: string[];
  chronicConditions?: string[];
  pastSurgeries?: string[];
  disabilityNeeds?: string;
  pregnancyStatus?: string;
  insuranceProvider?: string;
  insuranceId?: string;
  doctorName?: string;
  doctorPhone?: string;
  otherMedicalNotes?: string;
  medicalNotes?: string;
  profileComplete?: boolean;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  updatedAt?: string;
  version?: number;
}

export interface AuthSession {
  role: 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN';
  userLabel: string;
  subLabel?: string;
  ambulanceId?: string;
  hospitalId?: string;
  dispatcherBadge?: string;
  citizenProfile?: CitizenProfile;
  loginTime: string;
  profileComplete?: boolean;
  updatedAt?: string;
}

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
  tirePressurePsi: number;
  engineTemperatureC: number;
  batteryHealthPercent: number;
  brakePadWearPercent: number;
  oilLifePercent: number;
  defLevelPercent: number;
  transmissionTempC: number;
  alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  name: string;
}

export interface TriageAssessment {
  acuity?: 'CRITICAL' | 'EMERGENCY' | 'URGENT' | 'STANDARD' | 'NON_URGENT';
  category?: 'CARDIAC' | 'TRAUMA' | 'RESPIRATORY' | 'NEUROLOGICAL' | 'PEDIATRIC' | 'GENERAL';
  confidenceScore?: number;
  recommendedCareLevel?: 'ALS' | 'BLS' | 'MICU';
  suggestedAction?: string;
  differentialDiagnoses?: string[];
  timestamp?: string;
  priority?: string;
  esiLevel?: string;
  suggestedType?: string;
  requiredUnit?: string;
  protocolChecklist?: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  time?: string;
  timestamp?: string;
  actionExecuted?: string;
  data?: any;
}
