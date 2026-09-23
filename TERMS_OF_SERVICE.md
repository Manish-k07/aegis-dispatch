# Aegis Dispatch CAD • Terms & Conditions of Service

**Effective Date:** September 23, 2026  
**Product:** Aegis Dispatch Pro CAD Platform (v2.5)  
**Target Operating Environment:** Public Safety Answering Points (PSAP), Emergency Medical Services (EMS), 911/112 Call Centers, and Hospital Emergency Departments.

---

## 1. Acceptance of Terms & Operating Authority
By accessing, deploying, or operating the Aegis Dispatch CAD platform ("Platform"), you acknowledge that you are an authorized emergency communications officer, certified emergency medical dispatcher (EMD), licensed paramedic/EMT, or authorized healthcare triage director. Unauthorized access or intentional transmission of fictitious emergency dispatches is strictly prohibited and subject to civil penalties and criminal prosecution under emergency communications statutes.

---

## 2. Dispatch Decision Support & AI Algorithmic Oversight

### 2.1 Decision Support Mandate
The autonomous dispatch engine, candidate scoring formulas, and AI clinical triage assistant are deployed strictly as **assistive clinical and operational decision-support systems**. 

### 2.2 Human-in-the-Loop Authority
- The licensed human emergency dispatcher or supervising EMS commander retains absolute authority, accountability, and responsibility for all vehicle dispatches, mutual aid requests, and emergency incident closures.
- Operators must review automated triage priority scores (Critical, High, Medium, Low) and auto-dispatch allocations against actual field circumstances before executing high-risk decisions.
- Emergency operators retain the unilateral ability to override or reassign any automated recommendation at any point in the dispatch lifecycle.

---

## 3. Emergency Vehicle Telematics & Traffic Preemption Limitations

### 3.1 Roadway Guidance & Map Tiles
Turn-by-turn guidance, distance estimations, and route waypoints generated through Open Source Routing Machine (OSRM) and OpenStreetMap tiles represent real-time computational models. Emergency vehicle drivers must at all times prioritize:
- Physical roadway conditions, weather hazards, and construction detours.
- Jurisdictional emergency vehicle codes, right-of-way legislation, and audible/visual siren safety protocols.
- Visual confirmation of traffic clear paths before entering controlled intersections.

### 3.2 Smart Traffic Signal Preemption
Smart traffic signal preemption status indicators represent simulated or connected municipal transit broadcasts. Aegis Dispatch CAD does not guarantee physical green wave signal changes and assumes no liability for roadway intersection collisions.

---

## 4. Availability, Service Level Agreements (SLA), and Emergency Fail-Safe Protocols

### 4.1 Target Availability
Aegis Dispatch Pro CAD is engineered to target 99.99% operational uptime across its distributed backend services and WebSocket telemetry channels.

### 4.2 Mandatory Terrestrial Fallback Protocols
In the event of an unplanned network partition, cloud outage, or terminal hardware failure:
1. Dispatchers and field crews must transition immediately to certified terrestrial two-way radio channels (P25 / VHF / UHF).
2. Incident details, timestamps, and hospital destinations must be hand-logged or relayed via voice dispatch until primary CAD connectivity is restored.
3. Upon reconnection, offline incident snapshots must be synchronized using the Platform's server snapshot restoration features.

---

## 5. Security Obligations & Prohibited Conduct
All operators agree to uphold the following zero-trust operational mandates:
- Never disclose, share, or transfer operator login credentials or Mobile Data Terminal access tokens.
- Maintain workstations in secure, physical access-controlled dispatch control rooms or locked vehicle cabs.
- Never export patient health records or CAD state files to personal storage media or unauthorized networks.
- Refrain from reverse-engineering, decompiling, or probing the system for security vulnerabilities without prior written authorization from the municipal oversight authority.

---

## 6. Audit Trails & Evidentiary Discovery
All system interactions—including call intake, call modifications, dispatcher assignments, status updates, voice transmissions, and database resets—are written immutably to the CAD Audit Log (`/api/system/files` and `/api/dashboard`). By using the Platform, operators acknowledge that all actions are recorded and subject to subpoena, judicial discovery, and internal EMS clinical performance reviews.

---

## 7. Limitation of Liability & Indemnification
To the maximum extent permitted by emergency communications statutes and sovereign immunity laws:
- Neither the software developers, contributors, nor distributing organizations shall be liable for indirect, incidental, punitive, or consequential damages resulting from telecommunication carrier outages, satellite GPS degradation, or dispatch decisions executed during crisis events.
- Deploying agencies are responsible for maintaining secondary power generators, redundant ISP uplinks, and continuous staff emergency training.

---

## 8. Governing Law & Jurisdiction
These Terms and Conditions shall be governed by and construed in accordance with the laws of the operating jurisdiction and national public safety telecommunications frameworks.

For questions regarding these operating terms:  
`legal@aegisdispatch.internal`
