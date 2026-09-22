# AEGIS DISPATCH

Full-stack, real-time emergency medical dispatch command & control console prototype.

---

## What is Included

- **Backend (Spring Boot 3.5 / Java 21)**:
  - Spring Web, Spring WebSocket, Spring Data JPA, Actuator.
  - Multi-database support:
    - **Zero-Setup Embedded Database (Default)**: Embedded H2 database running in PostgreSQL compatibility mode with deterministic seed data loaded automatically. Zero external dependencies required.
    - **PostgreSQL / PostGIS (Docker Profile)**: Enabled via `--spring.profiles.active=postgres` or `docker compose up -d`.
  - Multi-factor candidate ranking engine (ETA, capabilities, distance, availability, traffic).
  - Real-time **GPS Route Simulation Engine**: interpolates ambulance telemetry en route to scene or hospital and streams `LOCATION_UPDATED` WebSocket events every 1.5 seconds.
  - Complete 11-step emergency response lifecycle management.
  - Permanent audit logging table and REST API.

- **Frontend (React 18 + Vite + TypeScript)**:
  - High-performance interactive **Leaflet Map**:
    - Animated directional vehicle markers color-coded by operational status.
    - Pulsing incident pins categorized by priority (Critical, High, Medium, Low).
    - Hospital pins with clinical capability badges (24/7 ED, ICU, Cardiac, Pediatric).
    - Dynamic route polylines connecting ambulance, incident, and destination hospital.
  - **Incident Queue**: Filterable by status (Pending, Active, Resolved) and priority.
  - **Dispatch Recommendation Modal**: Algorithmically ranked fleet units with detailed score breakdowns.
  - **Mission Operations Center**: Step-by-step lifecycle actions (Accept, En Route, Arrived, Patient Onboard, Hospital Selection, Handover, Complete) with one-click **GPS Simulation**.
  - **Incident Intake Modal**: Quick reporting form with one-click emergency scenario presets.
  - **Audit & Live Feed Drawer**: Real-time WebSocket event ticker and permanent audit trail inspector.

- **One-Click Launchers**:
  - `start-all.bat`: Launches backend, frontend, and opens browser console at `http://localhost:5173`.
  - `start-backend.bat`: Launches Spring Boot backend on `http://localhost:8080`.
  - `start-frontend.bat`: Launches Vite frontend development server on `http://localhost:5173`.

---

## Quick Start (One-Click)

Simply double-click **`start-all.bat`** in the project root:
- Backend starts at **`http://localhost:8080`**
- Frontend console opens at **`http://localhost:5173`**

---

## Manual Start

### Backend
```bash
cd backend
mvn spring-boot:run
```
- Health Check: `http://localhost:8080/actuator/health`
- Live Dashboard: `http://localhost:8080/api/dashboard`
- WebSocket Gateway: `ws://localhost:8080/ws/live`

*(Optional) To use PostgreSQL via Docker instead of the embedded database:*
```bash
docker compose up -d
mvn spring-boot:run -Dspring-boot.run.profiles=postgres
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## Complete 11-Step Demo Scenario

1. **Select Incident**: Click on the **CRITICAL ACCIDENT** in the Emergency Queue.
2. **Review Candidates**: The recommendation modal displays ambulances ranked by ETA, distance, capabilities, and score.
3. **Assign Ambulance**: Click **Assign & Dispatch** on unit **`KA-01-AE-1001`**.
4. **Accept Dispatch**: In the Active Missions panel, click **`4. Accept Dispatch`**.
5. **Mark En Route**: Click **`5. Mark En Route`**.
6. **Live GPS Simulation (Step 11)**: Click **`11. Start GPS Simulation`** and watch unit `KA-01-AE-1001` move in real time across the Leaflet map towards the accident scene!
7. **Arrive at Scene**: Once at destination, status updates to **`ARRIVED_AT_SCENE`** (or click **`6. Arrived at Scene`**).
8. **Patient Onboard**: Click **`7. Patient Onboard`**.
9. **Assign Hospital**: Click **`Assign Destination Hospital`** and select **`Aegis City General`**.
10. **Depart for Hospital**: Click **`8. Depart for Hospital`** (and optionally click GPS simulation to watch it drive to the hospital).
11. **Handover & Complete**: Click **`9. Arrived at Hospital`**, followed by **`10. Complete Handover`**. Unit returns to `AVAILABLE` status.

---

## REST & WebSocket APIs

- `GET /api/dashboard` - Complete system overview (emergencies, fleet, hospitals, dispatches).
- `GET /api/emergencies/{id}/candidates` - Algorithmically ranked ambulance units.
- `POST /api/emergencies` - Report and ingest new emergency incidents.
- `POST /api/dispatches` - Dispatch an ambulance to an incident.
- `POST /api/dispatches/{id}/status` - Advance lifecycle status.
- `POST /api/dispatches/{id}/hospital` - Assign receiving hospital.
- `POST /api/simulation/start/{dispatchId}` - Start real-time GPS waypoint simulation.
- `POST /api/simulation/stop/{dispatchId}` - Stop running GPS simulation.
- `POST /api/ambulances/{id}/location` - Manual GPS location telemetry update.
- `GET /api/audit` - Inspect permanent system audit logs.
- `GET /actuator/health` - Service health monitor.
- `WebSocket: ws://localhost:8080/ws/live` - Real-time event and location broadcast feed.
