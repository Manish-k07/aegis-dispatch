# AEGIS DISPATCH PRO CAD (v2.5)

[![CI/CD Pipeline](https://github.com/Manish-k07/aegis-dispatch/actions/workflows/deploy.yml/badge.svg)](https://github.com/Manish-k07/aegis-dispatch/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker: Deploy-Ready](https://img.shields.io/badge/Docker-Deploy--Ready-sky.svg)](docker-compose.yml)

Enterprise-grade, full-stack, real-time Computer-Aided Emergency Medical Dispatch (CAD) command & control platform. Engineered for 911/112 public safety answering points, paramedic ambulance fleets, regional hospital Emergency Departments (ED), and citizen emergency assistance.

---

## 🚀 Operating Modes: Live by Default vs. Explicit Demo

Aegis Dispatch Pro runs as a **real, fully-connected operational system by default**:
1. **LIVE Mode (Default)**:
   - Connects directly to the Spring Boot REST API and real-time STOMP/WebSocket channels.
   - Zero synthetic simulation, fake incidents, or mock vitals.
   - All state transitions persist in the relational database (`users`, `emergencies`, `ambulances`, `hospitals`, `dispatches`, `incident_events`).
   - If the backend is unreachable, the system displays a clear, actionable error state with exponential retry backoff and a secondary link to Demo mode. It **never silently falls back to fake data**.
2. **DEMO Mode (Explicit User Toggle Only)**:
   - Activated only when a user explicitly clicks the **"Demo mode"** button on the login screen or in the user avatar menu.
   - Runs a completely self-contained in-browser simulator (`frontend/src/demo/`) with zero calls to the production backend.
   - Features strict storage isolation under the `aegis.demo.*` namespace, ensuring demo sessions cannot access live JWT tokens or corrupt live data.
   - Distinct, persistent status bar chip: `Demo mode — synthetic data`.

---

## 🔒 Security, Authentication & Role Isolation

- **Role-Based Access Control (RBAC)**: Enforced via HMAC-SHA256 JWT tokens with roles `DISPATCHER`, `PARAMEDIC`, `HOSPITAL_STAFF`, `CITIZEN`, and `ADMIN`.
- **First-Run Administrator Bootstrap**: On an empty database, the backend automatically initializes a single root administrator account from `AEGIS_ADMIN_USERNAME` and `AEGIS_ADMIN_PASSWORD` (hashed with salt; forces password change on first sign-in).
- **Admin Management Console**: System administrators can provision dispatchers, bind paramedics to specific vehicle units, bind clinical staff to hospitals, and manage fleet assets.
- **Citizen Self-Registration**: Citizens can securely self-register with phone number and password to access their digital health profile and one-tap SOS dispatch.
- **Audit Logging**: Every incident dispatch, unit transit update, and hospital handover writes an immutable row into `incident_events` with actor ID and ISO timestamp.
- **CORS & Origin Hardening**: API endpoints and WebSocket endpoints strictly honor origins configured in `CORS_ORIGIN`.

---

## ⚙️ Environment Variables Reference

| Variable | Target Component | Default Value | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | Frontend | `/api` (or empty for proxy) | Base HTTP URL for REST endpoints (e.g. `http://localhost:8080/api`). |
| `VITE_WS_URL` | Frontend | `/ws` (or empty for proxy) | Base WebSocket/STOMP endpoint (e.g. `http://localhost:8080/ws`). |
| `VITE_ENABLE_DEMO_BUTTON` | Frontend | `true` | Controls visibility of the "Demo mode" toggle button. Set to `false` in production deployments to hide the demo launcher completely. |
| `CORS_ORIGIN` | Backend | `http://localhost:5173,http://localhost:8080` | Comma-separated list of permitted web origins for REST CORS and WebSocket handshakes. |
| `AEGIS_ADMIN_USERNAME` | Backend | `admin` | Username for the first-run system administrator account. |
| `AEGIS_ADMIN_PASSWORD` | Backend | `Admin@Aegis2026` | Initial password for the administrator account (never logged; hashed upon database insertion). |
| `OSRM_BASE_URL` | Backend | `https://router.project-osrm.org` | Road network routing engine URL with automatic straight-line distance fallback if unreachable. |
| `SPRING_PROFILES_ACTIVE` | Backend | `postgres` (or `default`) | Active Spring profile (`postgres` for production, `default` for embedded H2, `dev-seed` for local test rows). |
| `POSTGRES_DB` | Database | `aegis_dispatch` | PostgreSQL database name. |
| `POSTGRES_USER` | Database | `aegis` | PostgreSQL database user. |
| `POSTGRES_PASSWORD` | Database | `postgres` | PostgreSQL database password. |
| `DB_URL` | Backend | `jdbc:postgresql://postgres:5432/aegis_dispatch` | JDBC connection URL. |
| `DB_USER` | Backend | `aegis` | JDBC username. |
| `DB_PASSWORD` | Backend | `postgres` | JDBC password. |

---

## 🐳 Quickstart with Docker Compose

Deploy the complete multi-tier production stack (PostgreSQL + PostGIS, Spring Boot Backend, and Nginx + React Frontend) with health checks:

```bash
# 1. Clone the repository
git clone https://github.com/Manish-k07/aegis-dispatch.git
cd aegis-dispatch

# 2. Configure environment variables
cp .env.example .env

# 3. Launch the containerized production stack
docker compose up -d --build
```

### Access Points:
- **Web Interface:** [http://localhost:5173](http://localhost:5173) (or `http://localhost:80`)
- **Backend API Gateway:** [http://localhost:8080/api/dashboard](http://localhost:8080/api/dashboard)
- **Actuator Health Monitor:** [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
- **PostGIS Database:** `localhost:5432` (database: `aegis_dispatch`, user: `aegis`)

---

## 💻 Local Development Quickstart

### Option A: One-Click Launchers (Windows)
Double-click **`start-all.bat`** in the project root:
- Starts the Spring Boot backend on port `8080`.
- Waits for `/actuator/health` to report `UP` with database connectivity.
- Starts the Vite frontend on port `5173`.
- Automatically opens the browser to the live console.

### Option B: Linux / macOS Launcher
```bash
chmod +x start-all.sh
./start-all.sh
```

### Option C: Manual Start

#### 1. Backend (Spring Boot 3.5 / Java 21)
```bash
cd backend
mvn spring-boot:run
```
*To seed sample development accounts and units:*
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev-seed
```

#### 2. Frontend (React 18 / Vite / TypeScript)
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

---

## ⚡ Frontend-Only Deployments (Netlify)

For frontend-only static hosts (such as Netlify), define `VITE_API_BASE_URL` in the deployment settings pointing to your live backend API. If `VITE_API_BASE_URL` is unconfigured at build time, the frontend displays a clear **"Backend Not Configured"** screen rather than showing synthetic data.

1. Connect your repository to Netlify.
2. In Site Settings > Build & deploy > Environment variables, specify:
   - `VITE_API_BASE_URL`: `https://your-backend-domain.com/api`
   - `VITE_WS_URL`: `wss://your-backend-domain.com/ws`
   - `VITE_ENABLE_DEMO_BUTTON`: `true` (or `false` to disable demo mode)
3. Deploy!

---

## 🧪 Automated Testing

### Playwright End-to-End Suite
Runs full browser multi-context scenarios verifying Live mode, Demo mode isolation, unreachable backend screens, and cross-terminal incident dispatch:
```bash
cd frontend
npx playwright test e2e/live-and-demo-modes.spec.ts
```

### Backend JUnit Test Suite
Runs auth, RBAC, state machine, and administrator bootstrap tests:
```bash
cd backend
mvn test
```

---

## 🤝 Contributing & License
Pull requests and issues are welcome on [GitHub](https://github.com/Manish-k07/aegis-dispatch). Distributed under the MIT License.
