# Aegis Dispatch • Feature Matrix: Live vs. Demo Capabilities

Date: October 2026  
Architecture: Spring Boot 3.5 (Java 21) REST & STOMP / PostgreSQL + React 18 / Vite / TypeScript

---

## 1. Operating Mode Architecture Overview

| Dimension | LIVE Mode (System Default) | DEMO Mode (Explicit Toggle Only) |
|---|---|---|
| **Activation** | Default mode on boot, page load, and reload. | Explicit user button click on Login screen or Avatar dropdown. |
| **Data Source** | `LiveDataSource` via Spring Boot REST (`/api/*`) and STOMP WebSocket (`/ws`). | `DemoDataSource` in-browser simulator (`frontend/src/demo/`). Zero backend calls. |
| **Persistence** | Relational Database (PostgreSQL / H2). | Isolated in browser `aegis.demo.*` LocalStorage namespace. |
| **Storage Isolation** | Uses `aegis.live.*` storage keys. Demo tokens never read or write to live keys. | Uses `aegis.demo.*` storage keys. Wiped immediately upon exiting demo mode. |
| **UI Indicators** | No banners. Clean operational theme. Shows connection chip (`Connected` / `Reconnecting` / `Offline`). | Persistent slim chip in top bar: `Demo mode — synthetic data` with `Exit demo` button. |
| **Failure Handling** | If backend unreachable, shows full error screen with retry & backoff. **Never falls back silently to fake data.** | N/A (runs entirely client-side). |

---

## 2. Live vs. Demo Feature Comparison

### Central CAD Console
| Feature | LIVE Mode | DEMO Mode |
|---|---|---|
| **Incident Intake** | Real emergency calls submitted by Citizens or Dispatchers; validated and saved to `emergencies` table. | Pre-configured simulation emergency queue (`ACCIDENT`, `CARDIAC`, `BREATHING`). |
| **Multi-Factor Dispatch Recommendation** | Real OSRM road distance & duration calculations, vehicle clinical capability matching, and availability scoring. | Client-side ranking using geometric distance. |
| **Unit Assignment & State Machine** | Full server-side state machine with transitions logged to `incident_events` with actor ID and timestamp. | In-memory simulated transitions. |
| **Geospatial Map** | Real Leaflet GIS displaying live unit locations from paramedic GPS telemetry and real incident coordinates. | Simulated animated vehicle progression along pre-defined waypoints. |
| **Auto-Dispatch** | Configurable server-evaluated automatic dispatch for critical calls with full audit trail. | Client-side simulated dispatch. |
| **Hospital Trauma Bay Capacity** | Live hospital counters published by hospital staff through WebSocket broadcasts. | Static or timer-incremented bed counters. |

### Paramedic MDT Terminal
| Feature | LIVE Mode | DEMO Mode |
|---|---|---|
| **Authentication & Vehicle Binding** | Driver/Medic authenticated via JWT; bound to assigned vehicle registration. | Selectable demo responder profile (`Arun Kumar / KA-01-AE-1001`). |
| **Incident Navigation** | Real turn-by-turn route waypoints from OSRM with live ETA. | Simulated route rendering. |
| **Vehicle Telemetry & GPS** | Real device GPS telemetry debounced to 1 update every 3–5 seconds sent to `/api/ambulances/{id}/location`. | Automated timer-driven coordinate stepping along road route. |
| **Patient Vitals Entry** | Real clinical vitals recorded by medic, validated, and saved to database with timestamps. | Animated sinusoidal simulated ECG rhythm with triggerable ST-elevation STEMI demo button (labeled "Simulated"). |
| **Pre-Arrival Hospital Pre-Alert** | Sends real pre-alert notification with patient summary and vitals to target hospital ED. | Client-side toast notification. |

### Hospital Emergency Department (ED) Console
| Feature | LIVE Mode | DEMO Mode |
|---|---|---|
| **Facility Binding** | Staff authenticated via JWT; locked to assigned hospital facility. | Selectable demo facility (`Aegis City General`). |
| **Inbound Ambulances** | Live inbound vehicles carrying patients routed to this hospital, showing live paramedic vitals and ETA. | Simulated incoming ambulance queue. |
| **Patient Handover** | "Patient received" action triggers final state transition, writes to `incident_events`, and releases ambulance. | In-memory simulated handover. |
| **Bed & Trauma Bay Management** | Live counters (+ / -) updated in database and pushed immediately across all CAD terminals. | In-memory counter state. |
| **Facility Readiness Toggles** | Live switches for Cath Lab, Trauma Bay, and CT Scanner with staff update timestamp. | In-memory readiness state. |

### Citizen SOS Portal
| Feature | LIVE Mode | DEMO Mode |
|---|---|---|
| **Authentication** | Citizen self-registration with phone and hashed password; secure JWT session. | Pre-configured demo citizen (`Priya Sharma / 9845012345`). |
| **One-Tap SOS Dispatch** | Captures real HTML5 geolocation, reverses address, and posts incident to CAD queue within 1 second. | Generates demo incident in browser storage. |
| **Live Unit Tracking** | Real-time tracking of assigned ambulance en-route with live ETA updates via WebSocket. | Simulated tracking counter and route. |
| **Digital Health Profile** | Patient profile with medical conditions, allergies, and emergency contacts saved to database. | Pre-populated mock health profile. |
| **Emergency Guidance** | Web Audio API CPR metronome at 110 BPM and direct emergency hotline links. | Web Audio API CPR metronome at 110 BPM. |

### Administration & Security
| Feature | LIVE Mode | DEMO Mode |
|---|---|---|
| **System Administrator Console** | Full user management (`/api/admin/users`): create dispatchers, paramedics with unit binding, hospital staff with facility binding. | Disabled in demo mode. |
| **First-Run Bootstrap** | Automatic root admin account provisioning from `AEGIS_ADMIN_USERNAME` / `AEGIS_ADMIN_PASSWORD` on empty DB. | N/A. |
| **Rate Limiting** | Server-side IP rate limiting on login and citizen SOS endpoints. | N/A. |
| **CORS Isolation** | Restrictive origin checks driven by `CORS_ORIGIN`. | N/A (runs client-side). |

---

## 3. Roadmapped Future Modules

The following prototype concepts are documented in the project roadmap for future implementation:
- **Mass Casualty Incident (MCI) Triage Matrix**: START/SALT triage tag scanning and regional trauma distribution.
- **Drone First Responder (DFR)**: Autonomous UAV dispatch for pre-arrival AED / Narcan delivery.
- **Next-Gen 112 Video (WebRTC)**: Direct caller camera video stream ingestion for dispatcher-guided CPR.
- **Predictive Surge Staging**: Machine-learning driven ambulance prepositioning.
- **IoT Fleet Diagnostics**: Real-time vehicle OBD-II diagnostics and oxygen cylinder monitoring.
