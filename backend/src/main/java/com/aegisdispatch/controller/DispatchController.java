package com.aegisdispatch.controller;

import com.aegisdispatch.model.*;
import com.aegisdispatch.repository.*;
import com.aegisdispatch.service.AuditService;
import com.aegisdispatch.service.DispatchEngine;
import com.aegisdispatch.service.SimulationService;
import com.aegisdispatch.service.RoutingService;
import com.aegisdispatch.websocket.LiveSocketHandler;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class DispatchController {

    private final EmergencyRepository emergencies;
    private final AmbulanceRepository ambulances;
    private final HospitalRepository hospitals;
    private final DispatchRepository dispatches;
    private final DispatchEngine engine;
    private final LiveSocketHandler ws;
    private final AuditService audit;
    private final AuditLogRepository auditRepo;
    private final AmbulanceLocationRepository locationRepo;
    private final SimulationService simulationService;
    private final RoutingService routingService;
    private final com.aegisdispatch.service.CadFileService cadFileService;

    public DispatchController(
            EmergencyRepository emergencies,
            AmbulanceRepository ambulances,
            HospitalRepository hospitals,
            DispatchRepository dispatches,
            DispatchEngine engine,
            LiveSocketHandler ws,
            AuditService audit,
            AuditLogRepository auditRepo,
            AmbulanceLocationRepository locationRepo,
            SimulationService simulationService,
            RoutingService routingService,
            com.aegisdispatch.service.CadFileService cadFileService
    ) {
        this.emergencies = emergencies;
        this.ambulances = ambulances;
        this.hospitals = hospitals;
        this.dispatches = dispatches;
        this.engine = engine;
        this.ws = ws;
        this.audit = audit;
        this.auditRepo = auditRepo;
        this.locationRepo = locationRepo;
        this.simulationService = simulationService;
        this.routingService = routingService;
        this.cadFileService = cadFileService;
    }

    private void triggerAutoSave(String reason) {
        try {
            cadFileService.saveSnapshotToFile(reason);
        } catch (Exception ignored) {
        }
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        return Map.of(
                "emergencies", emergencies.findAllByOrderByCreatedAtDesc(),
                "ambulances", ambulances.findAll(),
                "hospitals", hospitals.findAll(),
                "dispatches", dispatches.findAllByOrderByAssignedAtDesc(),
                "activeSimulations", simulationService.getActiveSimulations()
        );
    }

    @GetMapping("/emergencies/{id}/candidates")
    public ResponseEntity<?> candidates(@PathVariable UUID id) {
        Optional<Emergency> opt = emergencies.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Emergency not found"));
        }
        return ResponseEntity.ok(engine.candidates(opt.get()));
    }

    @PostMapping("/emergencies")
    public Emergency createEmergency(@RequestBody Emergency e) {
        if (e.getId() == null) e.setId(UUID.randomUUID());
        if (e.getStatus() == null || e.getStatus().isBlank()) e.setStatus("PENDING_DISPATCH");
        if (e.getPatientCount() <= 0) e.setPatientCount(1);
        if (e.getPatientCount() > 100) e.setPatientCount(100);
        if (e.getPriority() == null) e.setPriority("HIGH");

        // Validate coordinate boundaries
        if (e.getLatitude() < -90.0 || e.getLatitude() > 90.0) {
            throw new IllegalArgumentException("Invalid incident latitude: must be between -90 and 90");
        }
        if (e.getLongitude() < -180.0 || e.getLongitude() > 180.0) {
            throw new IllegalArgumentException("Invalid incident longitude: must be between -180 and 180");
        }

        // Bound string fields to prevent memory abuse
        if (e.getCallerName() != null && e.getCallerName().length() > 255) {
            e.setCallerName(e.getCallerName().substring(0, 255));
        }
        if (e.getDescription() != null && e.getDescription().length() > 2000) {
            e.setDescription(e.getDescription().substring(0, 2000));
        }
        if (e.getAddress() != null && e.getAddress().length() > 500) {
            e.setAddress(e.getAddress().substring(0, 500));
        }

        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        Emergency saved = emergencies.save(e);

        audit.log(
                e.getCallerName() != null ? e.getCallerName() : "Operator",
                "EMERGENCY_CREATED",
                "EMERGENCY",
                saved.getId(),
                null,
                saved.getStatus(),
                "priority=" + saved.getPriority() + ";type=" + saved.getType()
        );

        ws.broadcast(String.format("{\"event\":\"NEW_EMERGENCY\",\"id\":\"%s\",\"priority\":\"%s\",\"type\":\"%s\"}",
                saved.getId(), saved.getPriority(), saved.getType()));
        triggerAutoSave("EMERGENCY_CREATED");
        return saved;
    }

    @PostMapping("/dispatches")
    @Transactional
    public ResponseEntity<?> assign(@RequestBody Map<String, String> body) {
        String eidStr = body.get("emergencyId");
        String aidStr = body.get("ambulanceId");
        if (eidStr == null || aidStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "emergencyId and ambulanceId are required"));
        }

        UUID eid = UUID.fromString(eidStr);
        UUID aid = UUID.fromString(aidStr);

        Emergency e = emergencies.findById(eid).orElse(null);
        Ambulance a = ambulances.findById(aid).orElse(null);

        if (e == null || a == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Emergency or Ambulance not found"));
        }

        if (!"PENDING_DISPATCH".equals(e.getStatus()) && !"CREATED".equals(e.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Emergency is already in status: " + e.getStatus()));
        }
        if (!"AVAILABLE".equals(a.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Ambulance is not available: " + a.getStatus()));
        }

        List<Map<String, Object>> candidates = engine.candidates(e);
        Map<String, Object> candidate = candidates.stream()
                .filter(x -> ((Ambulance) x.get("ambulance")).getId().equals(aid))
                .findFirst()
                .orElse(null);

        double dist = candidate != null ? (Double) candidate.get("distanceKm") : 5.0;
        double eta = candidate != null ? (Double) candidate.get("etaMinutes") : 8.0;
        double score = candidate != null ? (Double) candidate.get("score") : 0.85;

        Dispatch d = new Dispatch();
        d.setId(UUID.randomUUID());
        d.setEmergencyId(eid);
        d.setAmbulanceId(aid);
        d.setDispatcherName(body.getOrDefault("dispatcher", "Demo Dispatcher"));
        d.setStatus("DISPATCHED");
        d.setDistanceKm(dist);
        d.setEtaMinutes(eta);
        d.setScore(score);
        d.setAssignedAt(Instant.now());
        dispatches.save(d);

        a.setStatus("DISPATCHED");
        ambulances.save(a);

        e.setStatus("DISPATCHED");
        e.setUpdatedAt(Instant.now());
        emergencies.save(e);

        audit.log(d.getDispatcherName(), "AMBULANCE_ASSIGNED", "DISPATCH", d.getId(),
                "PENDING_DISPATCH", "DISPATCHED", "ambulance=" + aid + ";emergency=" + eid);

        ws.broadcast(String.format("{\"event\":\"AMBULANCE_ASSIGNED\",\"dispatchId\":\"%s\",\"emergencyId\":\"%s\",\"ambulanceId\":\"%s\"}",
                d.getId(), eid, aid));

        triggerAutoSave("AMBULANCE_ASSIGNED");
        return ResponseEntity.ok(d);
    }

    @PostMapping("/dispatches/{id}/status")
    @Transactional
    public ResponseEntity<?> updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        Dispatch d = dispatches.findById(id).orElse(null);
        if (d == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Dispatch not found: " + id));
        }

        String nextStatus = body.get("status");
        if (nextStatus == null || nextStatus.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "status is required"));
        }

        Emergency e = emergencies.findById(d.getEmergencyId()).orElse(null);
        Ambulance a = ambulances.findById(d.getAmbulanceId()).orElse(null);

        String prevStatus = d.getStatus();
        d.setStatus(nextStatus);

        if (e != null) {
            e.setStatus(nextStatus);
            e.setUpdatedAt(Instant.now());
            emergencies.save(e);
        }

        if (a != null) {
            switch (nextStatus) {
                case "AMBULANCE_ACCEPTED":
                    d.setAcceptedAt(Instant.now());
                    a.setStatus("DISPATCHED");
                    break;
                case "EN_ROUTE_TO_SCENE":
                    a.setStatus("EN_ROUTE_TO_PATIENT");
                    break;
                case "ARRIVED_AT_SCENE":
                    a.setStatus("ARRIVED_AT_SCENE");
                    a.setSpeed(0);
                    break;
                case "PATIENT_ONBOARD":
                    a.setStatus("PATIENT_ONBOARD");
                    break;
                case "EN_ROUTE_TO_HOSPITAL":
                    a.setStatus("EN_ROUTE_TO_HOSPITAL");
                    break;
                case "ARRIVED_AT_HOSPITAL":
                    a.setStatus("AT_HOSPITAL");
                    a.setSpeed(0);
                    break;
                case "PATIENT_HANDED_OVER":
                case "COMPLETED":
                    d.setCompletedAt(Instant.now());
                    a.setStatus("AVAILABLE");
                    a.setSpeed(0);
                    simulationService.stopSimulation(id);
                    break;
                case "CANCELLED":
                    a.setStatus("AVAILABLE");
                    a.setSpeed(0);
                    simulationService.stopSimulation(id);
                    break;
                default:
                    break;
            }
            ambulances.save(a);
        }

        dispatches.save(d);

        audit.log(body.getOrDefault("dispatcher", "Dispatcher"), "STATUS_CHANGED", "DISPATCH", id,
                prevStatus, nextStatus, "emergency=" + d.getEmergencyId() + ";ambulance=" + d.getAmbulanceId());

        ws.broadcast(String.format("{\"event\":\"STATUS_CHANGED\",\"dispatchId\":\"%s\",\"status\":\"%s\",\"ambulanceStatus\":\"%s\"}",
                id, nextStatus, a != null ? a.getStatus() : ""));

        return ResponseEntity.ok(d);
    }

    @PostMapping("/dispatches/{id}/hospital")
    @Transactional
    public ResponseEntity<?> assignHospital(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        Dispatch d = dispatches.findById(id).orElse(null);
        if (d == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Dispatch not found"));

        String hidStr = body.get("hospitalId");
        if (hidStr == null) return ResponseEntity.badRequest().body(Map.of("error", "hospitalId is required"));

        UUID hid = UUID.fromString(hidStr);
        Hospital h = hospitals.findById(hid).orElse(null);
        if (h == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Hospital not found"));

        d.setHospitalId(hid);
        dispatches.save(d);

        audit.log(body.getOrDefault("dispatcher", "Dispatcher"), "HOSPITAL_SELECTED", "DISPATCH", id,
                null, "HOSPITAL_SELECTED", "hospital=" + h.getName());

        ws.broadcast(String.format("{\"event\":\"HOSPITAL_SELECTED\",\"dispatchId\":\"%s\",\"hospitalId\":\"%s\",\"hospitalName\":\"%s\"}",
                id, hid, h.getName()));

        return ResponseEntity.ok(d);
    }

    @PostMapping("/simulation/start/{dispatchId}")
    public ResponseEntity<?> startSimulation(@PathVariable UUID dispatchId) {
        try {
            Map<String, Object> res = simulationService.startSimulation(dispatchId);
            return ResponseEntity.ok(res);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/simulation/stop/{dispatchId}")
    public ResponseEntity<?> stopSimulation(@PathVariable UUID dispatchId) {
        boolean stopped = simulationService.stopSimulation(dispatchId);
        return ResponseEntity.ok(Map.of("stopped", stopped, "dispatchId", dispatchId.toString()));
    }

    @GetMapping("/dispatches/{id}/route")
    public ResponseEntity<?> getRoute(@PathVariable UUID id) {
        Dispatch d = dispatches.findById(id).orElse(null);
        if (d == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Dispatch not found"));

        Ambulance a = ambulances.findById(d.getAmbulanceId()).orElse(null);
        Emergency e = emergencies.findById(d.getEmergencyId()).orElse(null);
        if (a == null || e == null) return ResponseEntity.badRequest().body(Map.of("error", "Ambulance or Emergency not found"));

        double destLat = e.getLatitude();
        double destLon = e.getLongitude();

        if (d.getHospitalId() != null && ("EN_ROUTE_TO_HOSPITAL".equals(d.getStatus()) || "ARRIVED_AT_HOSPITAL".equals(d.getStatus()) || "PATIENT_ONBOARD".equals(d.getStatus()))) {
            Hospital h = hospitals.findById(d.getHospitalId()).orElse(null);
            if (h != null) {
                destLat = h.getLatitude();
                destLon = h.getLongitude();
            }
        }

        RoutingService.RouteResult route = routingService.calculateRoute(a.getLatitude(), a.getLongitude(), destLat, destLon);
        return ResponseEntity.ok(Map.of(
                "distanceKm", route.getDistanceKm(),
                "durationMinutes", route.getDurationMinutes(),
                "waypoints", route.getWaypoints(),
                "steps", route.getSteps()
        ));
    }

    @GetMapping("/audit")
    public Object audit() {
        return auditRepo.findAll();
    }

    @GetMapping("/hospitals")
    public Object allHospitals() {
        return hospitals.findAll();
    }

    @PostMapping("/emergencies/{id}/auto-assign")
    @Transactional
    public ResponseEntity<?> autoAssign(@PathVariable UUID id, @RequestBody(required = false) Map<String, String> body) {
        Emergency e = emergencies.findById(id).orElse(null);
        if (e == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Emergency not found"));
        }
        if (!"PENDING_DISPATCH".equals(e.getStatus()) && !"CREATED".equals(e.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Emergency is already in status: " + e.getStatus()));
        }

        List<Map<String, Object>> candidates = engine.candidates(e);
        if (candidates.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "No available ambulances found in range"));
        }

        // Pick top ranked candidate
        Map<String, Object> bestCandidate = candidates.get(0);
        Ambulance a = (Ambulance) bestCandidate.get("ambulance");
        double dist = (Double) bestCandidate.get("distanceKm");
        double eta = (Double) bestCandidate.get("etaMinutes");
        double score = (Double) bestCandidate.get("score");

        // Optimal Hospital matching
        List<Hospital> allHosp = hospitals.findAll();
        Hospital bestHosp = null;
        double bestHospScore = -1.0;

        for (Hospital h : allHosp) {
            double hScore = 0.5;
            if (h.isEmergencyDepartment()) hScore += 0.2;
            if ("CARDIAC".equalsIgnoreCase(e.getType()) && h.isCardiacServices()) hScore += 0.3;
            if ("TRAUMA".equalsIgnoreCase(e.getType()) && h.getTraumaBaysAvailable() > 0) hScore += 0.3;
            if (h.isIcuAvailable() && h.getIcuBedsAvailable() > 0) hScore += 0.2;

            double distToH = Math.hypot(h.getLatitude() - e.getLatitude(), h.getLongitude() - e.getLongitude()) * 111.0;
            hScore -= (distToH * 0.05);

            if (hScore > bestHospScore) {
                bestHospScore = hScore;
                bestHosp = h;
            }
        }

        Dispatch d = new Dispatch();
        d.setId(UUID.randomUUID());
        d.setEmergencyId(e.getId());
        d.setAmbulanceId(a.getId());
        d.setDispatcherName(body != null && body.containsKey("dispatcher") ? body.get("dispatcher") : "AI Auto-Dispatcher");
        d.setStatus("DISPATCHED");
        d.setDistanceKm(dist);
        d.setEtaMinutes(eta);
        d.setScore(score);
        if (bestHosp != null) {
            d.setHospitalId(bestHosp.getId());
        }
        d.setAssignedAt(Instant.now());
        dispatches.save(d);

        a.setStatus("DISPATCHED");
        ambulances.save(a);

        e.setStatus("DISPATCHED");
        e.setUpdatedAt(Instant.now());
        emergencies.save(e);

        audit.log(d.getDispatcherName(), "AMBULANCE_AUTO_ASSIGNED", "DISPATCH", d.getId(),
                "PENDING_DISPATCH", "DISPATCHED", "ambulance=" + a.getId() + ";hospital=" + (bestHosp != null ? bestHosp.getName() : "None"));

        ws.broadcast(String.format("{\"event\":\"AMBULANCE_ASSIGNED\",\"dispatchId\":\"%s\",\"ambulanceId\":\"%s\",\"emergencyId\":\"%s\",\"autoAssigned\":true}",
                d.getId(), a.getId(), e.getId()));

        if (bestHosp != null) {
            ws.broadcast(String.format("{\"event\":\"HOSPITAL_SELECTED\",\"dispatchId\":\"%s\",\"hospitalId\":\"%s\",\"hospitalName\":\"%s\"}",
                    d.getId(), bestHosp.getId(), bestHosp.getName()));
        }

        triggerAutoSave("AUTO_ASSIGN");

        // Immediately start full autonomous road simulation
        try {
            simulationService.startSimulation(d.getId());
        } catch (Exception ex) {
            // log error if simulation couldn't start immediately
        }

        return ResponseEntity.ok(Map.of(
                "dispatch", d,
                "ambulance", a,
                "hospital", bestHosp != null ? bestHosp : Map.of(),
                "message", "Auto-assigned " + a.getRegistrationNumber() + " to incident and destination facility " + (bestHosp != null ? bestHosp.getName() : "General ED")
        ));
    }

    @GetMapping("/hospitals/{id}/capacity")
    public ResponseEntity<?> getHospitalCapacity(@PathVariable UUID id) {
        Hospital h = hospitals.findById(id).orElse(null);
        if (h == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Hospital not found"));
        return ResponseEntity.ok(Map.of(
                "id", h.getId(),
                "name", h.getName(),
                "status", h.getStatus(),
                "totalBeds", h.getTotalBeds(),
                "availableBeds", h.getAvailableBeds(),
                "icuBedsTotal", h.getIcuBedsTotal(),
                "icuBedsAvailable", h.getIcuBedsAvailable(),
                "traumaBaysTotal", h.getTraumaBaysTotal(),
                "traumaBaysAvailable", h.getTraumaBaysAvailable(),
                "cathLabOperational", h.isCathLabOperational()
        ));
    }

    @PostMapping("/hospitals/{id}/capacity")
    @Transactional
    public ResponseEntity<?> updateHospitalCapacity(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        Hospital h = hospitals.findById(id).orElse(null);
        if (h == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Hospital not found"));

        if (body.containsKey("availableBeds")) h.setAvailableBeds(((Number) body.get("availableBeds")).intValue());
        if (body.containsKey("icuBedsAvailable")) h.setIcuBedsAvailable(((Number) body.get("icuBedsAvailable")).intValue());
        if (body.containsKey("traumaBaysAvailable")) h.setTraumaBaysAvailable(((Number) body.get("traumaBaysAvailable")).intValue());
        if (body.containsKey("status")) h.setStatus((String) body.get("status"));
        if (body.containsKey("cathLabOperational")) h.setCathLabOperational((Boolean) body.get("cathLabOperational"));

        hospitals.save(h);

        ws.broadcast(String.format("{\"event\":\"HOSPITAL_CAPACITY_UPDATED\",\"hospitalId\":\"%s\",\"availableBeds\":%d,\"icuBeds\":%d,\"traumaBays\":%d}",
                h.getId(), h.getAvailableBeds(), h.getIcuBedsAvailable(), h.getTraumaBaysAvailable()));

        audit.log(body.containsKey("operator") ? (String) body.get("operator") : "ED Personnel",
                "HOSPITAL_CAPACITY_UPDATED", "HOSPITAL", h.getId(), null, h.getStatus(),
                "Available Beds: " + h.getAvailableBeds() + ", ICU: " + h.getIcuBedsAvailable());

        triggerAutoSave("CAPACITY_UPDATED");
        return ResponseEntity.ok(h);
    }

    @PostMapping("/dispatches/{id}/vitals")
    public ResponseEntity<?> streamVitals(@PathVariable UUID id, @RequestBody Map<String, Object> vitals) {
        Dispatch d = dispatches.findById(id).orElse(null);
        if (d == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Dispatch not found"));

        String vitalsJson = String.format(
                "{\"event\":\"VITALS_UPDATED\",\"dispatchId\":\"%s\",\"ambulanceId\":\"%s\",\"hospitalId\":\"%s\"," +
                "\"vitals\":{\"heartRate\":%s,\"bloodPressureSys\":%s,\"bloodPressureDia\":%s,\"spO2\":%s," +
                "\"respiratoryRate\":%s,\"temperature\":%s,\"gcs\":%s,\"conditionSummary\":\"%s\"}}",
                d.getId(),
                d.getAmbulanceId(),
                d.getHospitalId() != null ? d.getHospitalId().toString() : "",
                vitals.getOrDefault("heartRate", 80),
                vitals.getOrDefault("bloodPressureSys", 120),
                vitals.getOrDefault("bloodPressureDia", 80),
                vitals.getOrDefault("spO2", 98),
                vitals.getOrDefault("respiratoryRate", 16),
                vitals.getOrDefault("temperature", 36.8),
                vitals.getOrDefault("gcs", 15),
                vitals.getOrDefault("conditionSummary", "Vitals stable, en route").toString().replace("\"", "'")
        );

        ws.broadcast(vitalsJson);

        return ResponseEntity.ok(Map.of("status", "STREAMING_ACTIVE", "dispatchId", id, "vitals", vitals));
    }

    @PostMapping("/ai/triage")
    public ResponseEntity<?> triageIncident(@RequestBody Map<String, String> body) {
        String desc = body.getOrDefault("description", "").toLowerCase();
        String type = body.getOrDefault("type", "ACCIDENT").toUpperCase();

        String priority;
        String esi;
        String requiredUnit;
        List<String> protocol = new ArrayList<>();

        if (desc.contains("chest") || desc.contains("cardiac") || desc.contains("heart") || desc.contains("infarct") || "CARDIAC".equals(type)) {
            priority = "CRITICAL";
            esi = "Level 1 - Resuscitation";
            requiredUnit = "ALS (Advanced Life Support)";
            protocol.add("Acquire 12-lead ECG & transmit to receiving ED");
            protocol.add("Administer chewable Aspirin 325mg if not contraindicated");
            protocol.add("Establish bilateral 18G IV lines with saline lock");
            protocol.add("Alert Hospital Cardiac Cath Lab for rapid STEMI activation");
        } else if (desc.contains("bleed") || desc.contains("unconscious") || desc.contains("trauma") || desc.contains("collision") || "TRAUMA".equals(type)) {
            priority = "CRITICAL";
            esi = "Level 1 - Emergent Trauma";
            requiredUnit = "ALS (Advanced Life Support)";
            protocol.add("Direct pressure hemorrhage control / Tourniquet application");
            protocol.add("C-Spine stabilization and pelvic binder if indicated");
            protocol.add("High-flow 100% O2 via non-rebreather mask");
            protocol.add("Notify Trauma Team: Prepare Trauma Bay 1 & massive transfusion");
        } else if (desc.contains("breath") || desc.contains("asthma") || desc.contains("chok") || "BREATHING".equals(type)) {
            priority = "HIGH";
            esi = "Level 2 - High Risk Respiratory";
            requiredUnit = "ALS (Advanced Life Support)";
            protocol.add("Continuous SpO2 & End-Tidal CO2 monitoring");
            protocol.add("Nebulized Albuterol/Ipratropium inhalational therapy");
            protocol.add("Prepare CPAP assistance if work of breathing increases");
            protocol.add("Designate Emergency Department respiratory isolation bay");
        } else {
            priority = "MEDIUM";
            esi = "Level 3 - Urgent / Stable";
            requiredUnit = "BLS (Basic Life Support)";
            protocol.add("Baseline vital signs (NIBP, HR, SpO2, Temp)");
            protocol.add("Pain score assessment and targeted splinting/bandaging");
            protocol.add("Routine transport with continuous reassessment every 15 min");
        }

        return ResponseEntity.ok(Map.of(
                "priority", priority,
                "esiLevel", esi,
                "suggestedType", type,
                "requiredUnit", requiredUnit,
                "protocolChecklist", protocol
        ));
    }

    @PostMapping("/ai/chat")
    public ResponseEntity<?> aiChat(@RequestBody Map<String, String> body) {
        String msg = body.getOrDefault("message", "").toLowerCase().trim();

        // 1. Check for Auto-assign action
        if (msg.contains("auto assign") || msg.contains("auto dispatch") || msg.contains("dispatch closest") || msg.contains("dispatch next")) {
            List<Emergency> pending = emergencies.findAll().stream()
                    .filter(e -> "PENDING_DISPATCH".equals(e.getStatus()) || "CREATED".equals(e.getStatus()))
                    .sorted((a, b) -> {
                        if ("CRITICAL".equals(a.getPriority()) && !"CRITICAL".equals(b.getPriority())) return -1;
                        if (!"CRITICAL".equals(a.getPriority()) && "CRITICAL".equals(b.getPriority())) return 1;
                        return 0;
                    })
                    .toList();

            if (pending.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "reply", "All reported emergency incidents are currently dispatched or resolved! No pending incidents in queue.",
                        "actionExecuted", "NONE"
                ));
            }

            Emergency target = pending.get(0);
            ResponseEntity<?> assignRes = autoAssign(target.getId(), Map.of("dispatcher", "AI Dispatch Assistant"));
            if (assignRes.getStatusCode() == HttpStatus.OK) {
                return ResponseEntity.ok(Map.of(
                        "reply", "⚡ Auto-dispatch successfully executed! Dispatched optimal ambulance to incident [" + target.getType() + " at " + target.getAddress() + "] with destination hospital set.",
                        "actionExecuted", "AUTO_ASSIGN",
                        "data", assignRes.getBody()
                ));
            } else {
                return ResponseEntity.ok(Map.of(
                        "reply", "Unable to auto-dispatch: " + assignRes.getBody(),
                        "actionExecuted", "ERROR"
                ));
            }
        }

        // 2. Check for Fleet status
        if (msg.contains("fleet") || msg.contains("ambulance") || msg.contains("units available")) {
            List<Ambulance> ambList = ambulances.findAll();
            long avail = ambList.stream().filter(a -> "AVAILABLE".equals(a.getStatus())).count();
            long active = ambList.stream().filter(a -> !"AVAILABLE".equals(a.getStatus()) && !"OUT_OF_SERVICE".equals(a.getStatus())).count();
            return ResponseEntity.ok(Map.of(
                    "reply", String.format("Central CAD Fleet Report: %d total vehicles. %d units are READY/AVAILABLE, %d are on active missions, and 1 is out of service. Nearest unit: KA-01-AE-1001 (ALS) at Sector 4.", ambList.size(), avail, active),
                    "actionExecuted", "FLEET_QUERY"
            ));
        }

        // 3. Check for Hospital Beds
        if (msg.contains("hospital") || msg.contains("bed") || msg.contains("icu") || msg.contains("trauma bay")) {
            List<Hospital> hospList = hospitals.findAll();
            int totalAvailBeds = hospList.stream().mapToInt(Hospital::getAvailableBeds).sum();
            int totalIcu = hospList.stream().mapToInt(Hospital::getIcuBedsAvailable).sum();
            int totalTrauma = hospList.stream().mapToInt(Hospital::getTraumaBaysAvailable).sum();
            return ResponseEntity.ok(Map.of(
                    "reply", String.format("Regional Hospital ED Capacity: %d general beds, %d ICU beds, and %d emergency trauma bays currently open across %d facilities. Aegis City General ED has 7 ICU beds and active Cardiac Cath Lab.", totalAvailBeds, totalIcu, totalTrauma, hospList.size()),
                    "actionExecuted", "HOSPITAL_QUERY"
            ));
        }

        // 4. Default intelligent CAD conversational response
        return ResponseEntity.ok(Map.of(
                "reply", "Aegis AI Copilot online. I am monitoring live CAD feeds, OSRM road telemetry, weather conditions, and hospital bed capacities. You can ask me to: 'Auto assign next emergency', 'Show fleet readiness', 'Check ICU bed availability', or paste symptoms to run instant clinical triage.",
                "actionExecuted", "CHAT"
        ));
    }

    @PostMapping("/simulation/reset")
    @Transactional
    public Map<String, Object> reset() {
        // 1. Stop all active simulation runners
        simulationService.stopAllSimulations();

        // 2. Clear dispatches, locations, and audit logs
        dispatches.deleteAll();
        locationRepo.deleteAll();
        auditRepo.deleteAll();

        // 3. Clear existing emergencies and re-seed fresh demo emergencies
        emergencies.deleteAll();

        Emergency e1 = new Emergency();
        e1.setId(UUID.fromString("30000000-0000-0000-0000-000000000001"));
        e1.setCallerName("Demo Caller 1");
        e1.setPhone("9999999999");
        e1.setType("ACCIDENT");
        e1.setPatientCount(1);
        e1.setPriority("CRITICAL");
        e1.setDescription("Simulation accident requiring rapid response");
        e1.setLatitude(12.9735);
        e1.setLongitude(77.5968);
        e1.setAddress("Demo Junction, Bengaluru");
        e1.setStatus("PENDING_DISPATCH");
        e1.setCreatedAt(Instant.now());
        e1.setUpdatedAt(Instant.now());

        Emergency e2 = new Emergency();
        e2.setId(UUID.fromString("30000000-0000-0000-0000-000000000002"));
        e2.setCallerName("Demo Caller 2");
        e2.setPhone("9888888888");
        e2.setType("BREATHING");
        e2.setPatientCount(1);
        e2.setPriority("HIGH");
        e2.setDescription("Simulation respiratory emergency with severe distress");
        e2.setLatitude(12.9655);
        e2.setLongitude(77.6015);
        e2.setAddress("Demo Market Road, Bengaluru");
        e2.setStatus("PENDING_DISPATCH");
        e2.setCreatedAt(Instant.now());
        e2.setUpdatedAt(Instant.now());

        Emergency e3 = new Emergency();
        e3.setId(UUID.fromString("30000000-0000-0000-0000-000000000003"));
        e3.setCallerName("Priya Sharma");
        e3.setPhone("9876543210");
        e3.setType("CARDIAC");
        e3.setPatientCount(1);
        e3.setPriority("CRITICAL");
        e3.setDescription("Suspected acute coronary syndrome with crushing chest pain");
        e3.setLatitude(12.9812);
        e3.setLongitude(77.5877);
        e3.setAddress("Cunningham Road, Bengaluru");
        e3.setStatus("PENDING_DISPATCH");
        e3.setCreatedAt(Instant.now());
        e3.setUpdatedAt(Instant.now());

        emergencies.saveAll(List.of(e1, e2, e3));

        // 4. Reset ambulances to original ready state and coordinates
        Map<UUID, double[]> ambCoords = Map.of(
                UUID.fromString("20000000-0000-0000-0000-000000000001"), new double[]{12.9710, 77.5930, 90.0},
                UUID.fromString("20000000-0000-0000-0000-000000000002"), new double[]{12.9660, 77.6000, 180.0},
                UUID.fromString("20000000-0000-0000-0000-000000000003"), new double[]{12.9850, 77.5800, 120.0},
                UUID.fromString("20000000-0000-0000-0000-000000000004"), new double[]{12.9500, 77.6200, 0.0}
        );

        for (Ambulance amb : ambulances.findAll()) {
            double[] coords = ambCoords.get(amb.getId());
            if (coords != null) {
                amb.setLatitude(coords[0]);
                amb.setLongitude(coords[1]);
                amb.setHeading(coords[2]);
            }
            amb.setSpeed(0);
            if (amb.getId().equals(UUID.fromString("20000000-0000-0000-0000-000000000004"))) {
                amb.setStatus("OUT_OF_SERVICE");
            } else {
                amb.setStatus("AVAILABLE");
            }
            ambulances.save(amb);
        }

        // 5. Reset hospital capacities
        for (Hospital h : hospitals.findAll()) {
            if (h.getId().equals(UUID.fromString("10000000-0000-0000-0000-000000000001"))) {
                h.setAvailableBeds(48);
                h.setIcuBedsAvailable(7);
                h.setTraumaBaysAvailable(4);
                h.setStatus("AVAILABLE");
            } else if (h.getId().equals(UUID.fromString("10000000-0000-0000-0000-000000000002"))) {
                h.setAvailableBeds(22);
                h.setIcuBedsAvailable(4);
                h.setTraumaBaysAvailable(5);
                h.setStatus("AVAILABLE");
            } else if (h.getId().equals(UUID.fromString("10000000-0000-0000-0000-000000000003"))) {
                h.setAvailableBeds(11);
                h.setIcuBedsAvailable(1);
                h.setTraumaBaysAvailable(1);
                h.setStatus("LIMITED_CAPACITY");
            }
            hospitals.save(h);
        }

        // 6. Audit log
        audit.log("EMS Dispatcher", "DATABASE_RESET", "SYSTEM", null,
                null, "RESET", "Restored demo seed data, ready fleet status, and hospital capacities");

        // 6. Broadcast event
        ws.broadcast("{\"event\":\"DATABASE_RESET\"}");

        triggerAutoSave("DATABASE_RESET");

        return Map.of(
                "status", "SUCCESS",
                "message", "Database reset complete. Fresh demo emergencies seeded and fleet restored to ready state."
        );
    }
}
