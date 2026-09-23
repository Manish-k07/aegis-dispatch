# Security Policy • Aegis Dispatch CAD

Aegis Dispatch Pro CAD is engineered for mission-critical emergency medical dispatch and public safety operations where system availability, data confidentiality, and telemetry integrity are non-negotiable.

---

## 1. Supported Versions

| Version | Release Date | Security Support Status |
| :--- | :--- | :--- |
| **v2.5 Pro** | September 2026 | Full Active Security Support |
| **v2.0** | Earlier | Maintenance & Critical Fixes |
| **< v2.0** | Legacy | End of Life (Upgrade Mandatory) |

---

## 2. Reporting a Vulnerability

We welcome coordinated vulnerability disclosures from security researchers, emergency communications engineers, and public safety personnel.

### Reporting Channels
- **Security Team Email:** `security@aegisdispatch.internal`
- **GitHub Security Advisory:** Submit a private advisory via `https://github.com/Manish-k07/aegis-dispatch/security/advisories/new`

### When reporting, please provide:
1. Detailed description of the vulnerability (e.g. CWE categorization, potential impact).
2. Proof of Concept (PoC) scripts, cURL commands, or step-by-step reproduction instructions.
3. Affected components (Backend REST, WebSocket gateway, Frontend UI, Database schema).
4. Proposed mitigation or patch if available.

### Disclosure Timeline:
- **Initial Response:** Within 24 hours.
- **Triage & Severity Assessment:** Within 48 hours.
- **Remediation & Patch Release:** 1 to 5 business days depending on CVSS severity.

---

## 3. Security Architecture & Controls

### 3.1 Defense-in-Depth Implementation
- **HTTP Security Headers:** Every HTTP response carries `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and restrictive `Content-Security-Policy`.
- **CORS Origin Isolation:** Centralized `CorsConfig` enforces explicit allowed origin matching (`app.cors-allowed-origins`), eliminating wildcard origin leakage with credentials.
- **WebSocket Protection:** WebSocket gateway `/ws/live` validates connection origin against permitted deployment domains.
- **Zero Information Disclosure:** System backup endpoints (`/api/system/save`, `/api/system/files`) sanitize filesystem paths to prevent revealing server host directory topologies.
- **Exception Shielding:** `GlobalExceptionHandler` intercepts server errors, providing structured error responses while suppressing stack traces and framework internals.
- **Input Coordinate & Payload Bounds:** All emergency inputs and vehicle locations undergo geographic boundary checks (latitude $[-90, 90]$, longitude $[-180, 180]$) and string length clamps to prevent memory exhaustion attacks.
- **Container Hardening:** Backend Dockerfile runs under an unprivileged `spring:spring` user with read-only root options and non-root execution.
