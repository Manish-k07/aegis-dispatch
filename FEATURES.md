# Feature Audit & Implementation Status Matrix (Aegis 112 CAD / MDT / ED / Citizen)

Date: October 2026  
Status Legend:
- **Working end-to-end**: Functional across client, server, database, and real-time channels.
- **Partial**: Partially implemented; requires real server-side validation, database persistence, or protocol refinement.
- **UI-only mock**: Static mock/simulation without real operational backend backing; slated for cleanup, demo labelling, or removal.
- **Remove**: Non-functional mock with no architectural backing; removed from active UI and preserved in README Roadmap.

---

## 1. Central CAD Console

| Area / Feature | Component / Action | Current Status | Plan / Disposition |
|---|---|---|---|
| **Top App Bar Search** | Incident & address query filter | Partial | Enhance to search across incidents, units, and hospitals with unified results (Step 4). |
| **Top App Bar Audio** | Mute/unmute chime toggle | Working end-to-end | Keep. Plays priority dispatch chimes and SOS alerts. |
| **Connection Pill** | WebSocket / Server status indicator | Partial | Upgrade to auto-reconnect with exponential backoff and offline queue (Step 2). |
| **Clock Display** | 24-hour live UTC/Local clock | Working end-to-end | Keep. Standard M3 typography. |
| **Theme Toggle** | Light / Dark mode switcher | Working end-to-end | Keep. M3 design tokens. |
| **Auto-Dispatch Switch** | Auto-assign nearest available unit to critical queue | Partial | Convert to explicit switch (Default OFF). Only assigns top-ranked available unit for rule-meeting incidents, logs "Auto", and shows rationale (Step 4). |
| **New Incident Intake** | Manual CAD incident intake modal | Partial | Wire end-to-end with server validation, Geocoding, and duplicate checks (Step 4). |
| **AI Dispatch Copilot** | `AICopilotDrawer.tsx` | UI-only mock | Label "Simulated" for now. In Step 8, implement server-side gateway, mock provider, kill switch, PII redaction, and `<AiSuggestion>` advisory component. |
| **Fleet Diagnostics** | `FleetMaintenanceModal.tsx` | UI-only mock | **Remove**. No vehicle OBD-II telemetry backend planned. Document in README Roadmap. |
| **Predictive Surge Staging** | `PredictiveSurgeModal.tsx` | UI-only mock | **Remove**. Synthetic static sectors. Document in README Roadmap. |
| **Next-Gen 112 Video** | `NG911CallerVideoModal.tsx` | UI-only mock | **Remove**. Fake video stream overlay. Document in README Roadmap. |
| **V2X Green Wave Preemption** | `V2XPreemptionHUD.tsx` | UI-only mock | Keep as Demo behind `TrafficSignalProvider` interface with a visible "Simulated" chip (Step 7). |
| **MCI Triage Matrix** | `MciTriageModal.tsx` & top bar banner | UI-only mock | **Remove**. Static casualty tally. Document in README Roadmap. |
| **Drone First Responder** | `DroneDispatchModal.tsx` | UI-only mock | **Remove**. Simulated UAV payload drop. Document in README Roadmap. |
| **Clinical QA Compliance** | `ClinicalQaModal.tsx` | UI-only mock | **Remove**. Hardcoded AHA scorecards. Document in README Roadmap. |
| **Regional ED Capacity HUD** | `HospitalCapacityHUD.tsx` | Partial | **Remove modal**. Consolidate real bed counters into Hospital Dashboard and CAD Hospital tab (Steps 4 & 6). |
| **Privacy & Compliance Modal** | `LegalModal.tsx` | UI-only mock | **Remove**. Replace with neutral About/Prototype disclaimer dialog (Step 7). |
| **Save Snapshot to Disk** | `SaveToFileModal.tsx` / Overflow menu | Partial | **Remove**. Replace with CAD Analytics summary + CSV export (Step 4). |
| **Reset Simulation Data** | Overflow menu / `/system/reset` | Partial | Restrict to dev-only Demo Mode toggle (Step 7). |
| **Incident Queue Cards** | Review & Auto-assign buttons | Partial | "Review" opens detail drawer with timeline, patient info, assign/reassign, duplicate merge, and close disposition (Step 4). |
| **Active Missions List** | Status progression steps (1-10) | Partial | Replaced by strict server-side state machine with actor logging and real-time updates (Step 2). |
| **Fleet Board** | Ambulance unit cards, telemetry | Partial | Show status, last GPS ping age (flag stale > 60s), assigned crew (Step 4). |
| **Hospitals Board** | Hospital cards, bed counters | Partial | Show route ETA, bed availability, divert status, and recommendation reason (Step 4). |

---

## 2. Paramedic MDT Dashboard

| Feature / Control | Component / Action | Current Status | Plan / Disposition |
|---|---|---|---|
| **Vehicle Unit Lock** | MDT session vehicle binding | Partial | Enforce on server. Paramedic bound to assigned unit; cannot switch units without re-authenticating (Step 1). |
| **Mission Card** | Assigned incident details & dispatch status | Partial | Appears strictly for assigned unit; displays patient details, destination, OSRM turn-by-turn routing (Step 5). |
| **Status Progression** | En Route, On Scene, Transporting, At Hospital | Partial | Large touch buttons backed by server-side state machine; rejected on invalid transitions (Step 2 & Step 5). |
| **Turn-by-Turn Map** | `AmbulanceRouteMap.tsx` with OSM tiles | Working end-to-end | Keep. Real OSRM route waypoints, street names, and live distance/ETA. |
| **Follow Unit** | Map auto-pan toggle button | Working end-to-end | Keep. Keeps ambulance marker centered during transit. |
| **Simulated Vitals Monitor** | `MedicalMonitorWidget.tsx` | Partial | Save vitals to database with timestamps, trend sparkline, and out-of-range alerts (Step 5). |
| **Simulate ST-Elevation** | ECG STEMI trigger button | UI-only mock | Restrict to Demo Mode and label clearly as "Simulated" (Step 5 & Step 7). |
| **Broadcast Pre-Alert** | Hospital pre-arrival summary notification | Partial | One-tap pre-arrival summary (age, complaint, vitals, ETA); queued offline if disconnected (Step 5). |
| **Save MDT Log** | Top bar button | Partial | **Remove**. Replace with basic ePCR (complaint, interventions, medications with times) and PDF/print export (Step 5). |
| **GPS Telemetry Pings** | Live location updates | Partial | Debounce client-side GPS pings to 1 update per 3-5s (Step 5). |

---

## 3. Hospital Emergency Department Console

| Feature / Control | Component / Action | Current Status | Plan / Disposition |
|---|---|---|---|
| **Facility Lock** | Hospital session facility binding | Partial | Enforce on server. Staff locked to their facility; facility switcher only in dev mode (Step 1). |
| **Inbound Patients List** | Incoming ambulances and patient triage | Partial | Real-time inbound list from real incidents: ETA, patient summary, latest vitals, Accept / Request divert (Step 6). |
| **Patient Received** | Handover confirmation button | Partial | Closes transport leg, writes `incident_events`, and notifies CAD and MDT (Step 2 & Step 6). |
| **Bed & Bay Steppers** | ER, ICU, Trauma counters (+ / -) | Partial | Real-time optimistic update published to server and broadcast via WebSocket to CAD and Paramedics (Step 6). |
| **Department Readiness** | Cath Lab, CT Scanner, OR toggles | Partial | Live toggle switches saved to database with staff timestamp (Step 6). |
| **Save ED Log** | Top bar button | Partial | **Remove**. Replace with live Recent Activity Log of inbound and admitted patients (Step 6). |
| **Diversion Toggle** | Hospital diversion status switch | Partial | Real-time divert status with reason; updates CAD routing algorithm (Step 6). |

---

## 4. Citizen Emergency Portal

| Feature / Control | Component / Action | Current Status | Plan / Disposition |
|---|---|---|---|
| **One-Tap SOS Button** | Emergency medical assistance request | Partial | Add HTML5 high-accuracy Geolocation, reverse-geocoding, manual pin fallback, and coordinate transmission (Step 3). |
| **Safety Confirmation** | Confirm dialog & 5s Undo | Working end-to-end | Keep. Prevents accidental dispatches. Add cancellation with reason and false-alarm handling (Step 3). |
| **Emergency Tracking** | Live status, unit ETA, assigned ambulance | Partial | Live tracking with real-time updates from CAD/MDT, Web Share API link (Step 3). |
| **Third-Party SOS** | "Someone else needs help" mode | Missing / New | Implement short symptom checklist feeding rule-based priority config labeled "Decision support, not a medical diagnosis" (Step 3). |
| **Digital Health ID** | Allergies, conditions, next of kin | Partial | Full validation, multiple emergency contacts, consent line, and access logging (Step 3). |
| **CPR Metronome** | Audio beep & visual compression guide | Partial | Upgrade to real Web Audio API oscillator beep at 110 BPM, play/pause, prefers-reduced-motion support (Step 3). |
| **Emergency Hotlines** | 112, 108, 102, 100 direct links | Working end-to-end | Keep `tel:` buttons. Add offline caching via Service Worker (Step 3). |
| **i18n Localization** | Multi-language support | Missing / New | Implement `react-i18next` for English, Kannada, and Hindi (Step 3). |

---

## 5. Shared Login & Identity Gateway

| Feature / Control | Component / Action | Current Status | Plan / Disposition |
|---|---|---|---|
| **Credential Validation** | Server-side authentication | UI-only mock | Currently accepts any input. Enforce server-side validation with hashed credentials; reject invalid credentials with errors (Step 1). |
| **Role Enforcement** | Role permissions & data isolation | Partial | Server-side role authorization (`DISPATCHER`, `PARAMEDIC`, `HOSPITAL_STAFF`, `CITIZEN`). Enforce data isolation (Step 1). |
| **Operator Switcher** | Dropdowns to pick any ambulance/hospital | Partial | Remove from public view. Bind users strictly to their credentials. Dev-only switcher behind `VITE_DEMO_MODE` (Step 1). |
| **Session Inactivity Timeout**| Auto-lock shared terminal | Missing / New | 15-minute idle timeout on operational terminals; logout purges local storage (Step 1). |
| **Rate Limiting** | Endpoint brute-force protection | Missing / New | Rate-limit login and SOS endpoints on the server (Step 1). |
| **Demo Credentials Guide** | Evaluator credential drawer | Working end-to-end | Kept behind `?demo=1` / development flag (Step 1 & Step 7). |
