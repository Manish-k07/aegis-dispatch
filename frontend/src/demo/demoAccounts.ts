export interface DemoAccount {
  id: string;
  role: 'DISPATCHER' | 'PARAMEDIC' | 'HOSPITAL_STAFF' | 'CITIZEN';
  portalTab: 'DISPATCHER' | 'DRIVER' | 'HOSPITAL' | 'CITIZEN';
  displayName: string;
  loginIdentifier: string; // badge, staff ID, or phone
  loginSecret: string; // PIN or password
  identifierLabel: string;
  secretLabel: string;
  whatToTry: string;
  // Paramedic specific
  unitId?: string;
  unitRegistration?: string;
  crewPartner?: string;
  // Hospital specific
  facilityId?: string;
  facilityName?: string;
  // Citizen specific
  hasFilledProfile?: boolean;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  // 1. Dispatchers
  {
    id: 'demo-disp-01',
    role: 'DISPATCHER',
    portalTab: 'DISPATCHER',
    displayName: 'Anand Sharma (Lead CAD)',
    loginIdentifier: 'DISPATCH-01',
    loginSecret: 'Dispatch@2026',
    identifierLabel: 'Badge ID',
    secretLabel: 'Security PIN',
    whatToTry: 'Review pending critical 112 calls, trigger auto-dispatch, and inspect live GPS telemetry.',
  },
  {
    id: 'demo-disp-02',
    role: 'DISPATCHER',
    portalTab: 'DISPATCHER',
    displayName: 'Deepa Menon (Tactical CAD)',
    loginIdentifier: 'CAD-001',
    loginSecret: 'Dispatch@2026',
    identifierLabel: 'Badge ID',
    secretLabel: 'Security PIN',
    whatToTry: 'Test manual unit assignment and monitor multi-unit tactical road queues.',
  },

  // 2. Paramedics (One per demo vehicle unit)
  {
    id: 'demo-med-101',
    role: 'PARAMEDIC',
    portalTab: 'DRIVER',
    displayName: 'R. Deshmukh',
    loginIdentifier: 'MEDIC-101',
    loginSecret: 'Medic@2026',
    identifierLabel: 'Staff ID',
    secretLabel: 'Security PIN',
    unitId: '20000000-0000-0000-0000-000000000001',
    unitRegistration: 'KA-01-AE-1001 (ALS)',
    crewPartner: 'Dr. A. Verma',
    whatToTry: 'Follow turn-by-turn OSRM routing, stream live patient vitals, and simulate STEMI pre-alert.',
  },
  {
    id: 'demo-med-102',
    role: 'PARAMEDIC',
    portalTab: 'DRIVER',
    displayName: 'S. Roy',
    loginIdentifier: 'MEDIC-102',
    loginSecret: 'Medic@2026',
    identifierLabel: 'Staff ID',
    secretLabel: 'Security PIN',
    unitId: '20000000-0000-0000-0000-000000000002',
    unitRegistration: 'KA-01-AE-1002 (BLS)',
    crewPartner: 'P. Nair',
    whatToTry: 'Acknowledge assigned BLS transport mission and update vehicle transit status.',
  },
  {
    id: 'demo-med-103',
    role: 'PARAMEDIC',
    portalTab: 'DRIVER',
    displayName: 'M. Khan',
    loginIdentifier: 'MEDIC-103',
    loginSecret: 'Medic@2026',
    identifierLabel: 'Staff ID',
    secretLabel: 'Security PIN',
    unitId: '20000000-0000-0000-0000-000000000003',
    unitRegistration: 'KA-01-AE-1003 (ALS)',
    crewPartner: 'S. Patel',
    whatToTry: 'Test ALS trauma resuscitation workflow and broadcast hospital pre-arrival alert.',
  },
  {
    id: 'demo-med-104',
    role: 'PARAMEDIC',
    portalTab: 'DRIVER',
    displayName: 'K. Swamy',
    loginIdentifier: 'MEDIC-104',
    loginSecret: 'Medic@2026',
    identifierLabel: 'Staff ID',
    secretLabel: 'Security PIN',
    unitId: '20000000-0000-0000-0000-000000000004',
    unitRegistration: 'KA-01-AE-1004 (BLS)',
    crewPartner: 'V. Rao',
    whatToTry: 'Observe unit in scheduled out-of-service maintenance and request return to service.',
  },

  // 3. Hospital Staff (One per demo hospital facility)
  {
    id: 'demo-hosp-101',
    role: 'HOSPITAL_STAFF',
    portalTab: 'HOSPITAL',
    displayName: 'Dr. V. Rao (Chief Medical Officer)',
    loginIdentifier: 'HOSP-101',
    loginSecret: 'Hosp@2026',
    identifierLabel: 'Facility Badge',
    secretLabel: 'Security PIN',
    facilityId: '10000000-0000-0000-0000-000000000001',
    facilityName: 'Aegis City General (Level 1 Trauma)',
    whatToTry: 'Manage available trauma bays, monitor inbound telemetry, and complete patient handover.',
  },
  {
    id: 'demo-hosp-201',
    role: 'HOSPITAL_STAFF',
    portalTab: 'HOSPITAL',
    displayName: 'Dr. S. Nair (ED Director)',
    loginIdentifier: 'HOSP-201',
    loginSecret: 'Hosp@2026',
    identifierLabel: 'Facility Badge',
    secretLabel: 'Security PIN',
    facilityId: '10000000-0000-0000-0000-000000000002',
    facilityName: 'Metro Trauma Centre',
    whatToTry: 'Observe incoming neuro/trauma cases and toggle ICU bed diversion availability.',
  },
  {
    id: 'demo-hosp-301',
    role: 'HOSPITAL_STAFF',
    portalTab: 'HOSPITAL',
    displayName: 'Dr. A. Desai (Triage Lead)',
    loginIdentifier: 'HOSP-301',
    loginSecret: 'Hosp@2026',
    identifierLabel: 'Facility Badge',
    secretLabel: 'Security PIN',
    facilityId: '10000000-0000-0000-0000-000000000003',
    facilityName: 'Southside Community Hospital',
    whatToTry: 'Review limited-capacity warnings and pediatric ED admissions.',
  },

  // 4. Citizens
  {
    id: 'demo-cit-01',
    role: 'CITIZEN',
    portalTab: 'CITIZEN',
    displayName: 'Priya Sharma (Filled Profile)',
    loginIdentifier: '9845012345',
    loginSecret: 'CitizenPass123!',
    identifierLabel: 'Mobile Phone',
    secretLabel: 'Password',
    hasFilledProfile: true,
    whatToTry: 'Test one-tap SOS with pre-configured severe asthma, penicillin allergy, and emergency contact.',
  },
  {
    id: 'demo-cit-02',
    role: 'CITIZEN',
    portalTab: 'CITIZEN',
    displayName: 'Rahul Verma (Empty Profile)',
    loginIdentifier: '9845099999',
    loginSecret: 'CitizenPass123!',
    identifierLabel: 'Mobile Phone',
    secretLabel: 'Password',
    hasFilledProfile: false,
    whatToTry: 'Experience first-time citizen intake flow with clean health profile and new medical condition onboarding.',
  },
];
