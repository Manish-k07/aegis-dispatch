package com.aegisdispatch.service;

import com.aegisdispatch.model.*;
import com.aegisdispatch.repository.*;
import com.aegisdispatch.websocket.LiveSocketHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

@Service
public class SimulationService {

    private static final Logger log = LoggerFactory.getLogger(SimulationService.class);

    private final AmbulanceRepository ambulanceRepository;
    private final EmergencyRepository emergencyRepository;
    private final DispatchRepository dispatchRepository;
    private final HospitalRepository hospitalRepository;
    private final AmbulanceLocationRepository locationRepository;
    private final LiveSocketHandler liveSocketHandler;
    private final AuditService auditService;
    private final RoutingService routingService;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    private final Map<UUID, ScheduledFuture<?>> activeSimulations = new ConcurrentHashMap<>();
    private final Map<UUID, RoutingService.RouteResult> activeRoutes = new ConcurrentHashMap<>();

    public SimulationService(
            AmbulanceRepository ambulanceRepository,
            EmergencyRepository emergencyRepository,
            DispatchRepository dispatchRepository,
            HospitalRepository hospitalRepository,
            AmbulanceLocationRepository locationRepository,
            LiveSocketHandler liveSocketHandler,
            AuditService auditService,
            RoutingService routingService
    ) {
        this.ambulanceRepository = ambulanceRepository;
        this.emergencyRepository = emergencyRepository;
        this.dispatchRepository = dispatchRepository;
        this.hospitalRepository = hospitalRepository;
        this.locationRepository = locationRepository;
        this.liveSocketHandler = liveSocketHandler;
        this.auditService = auditService;
        this.routingService = routingService;
    }

    public synchronized Map<String, Object> startSimulation(UUID dispatchId) {
        Dispatch dispatch = dispatchRepository.findById(dispatchId)
                .orElseThrow(() -> new IllegalArgumentException("Dispatch not found: " + dispatchId));

        Emergency emergency = emergencyRepository.findById(dispatch.getEmergencyId())
                .orElseThrow(() -> new IllegalArgumentException("Emergency not found: " + dispatch.getEmergencyId()));

        Ambulance ambulance = ambulanceRepository.findById(dispatch.getAmbulanceId())
                .orElseThrow(() -> new IllegalArgumentException("Ambulance not found: " + dispatch.getAmbulanceId()));

        stopSimulation(dispatchId);

        double targetLat;
        double targetLon;
        String phase;

        String emStatus = emergency.getStatus();
        if ("EN_ROUTE_TO_HOSPITAL".equals(emStatus) || "PATIENT_ONBOARD".equals(emStatus)) {
            Hospital targetHospital = null;
            if (dispatch.getHospitalId() != null) {
                targetHospital = hospitalRepository.findById(dispatch.getHospitalId()).orElse(null);
            }
            if (targetHospital == null) {
                List<Hospital> hospitals = hospitalRepository.findAll();
                if (!hospitals.isEmpty()) {
                    targetHospital = hospitals.get(0);
                    dispatch.setHospitalId(targetHospital.getId());
                    dispatchRepository.save(dispatch);
                }
            }
            if (targetHospital == null) {
                throw new IllegalStateException("No hospital available for transport");
            }
            targetLat = targetHospital.getLatitude();
            targetLon = targetHospital.getLongitude();
            phase = "HOSPITAL";

            if (!"EN_ROUTE_TO_HOSPITAL".equals(emStatus)) {
                emergency.setStatus("EN_ROUTE_TO_HOSPITAL");
                emergency.setUpdatedAt(Instant.now());
                emergencyRepository.save(emergency);
                dispatch.setStatus("EN_ROUTE_TO_HOSPITAL");
                dispatchRepository.save(dispatch);
            }
            ambulance.setStatus("EN_ROUTE_TO_HOSPITAL");
            ambulanceRepository.save(ambulance);

        } else {
            targetLat = emergency.getLatitude();
            targetLon = emergency.getLongitude();
            phase = "SCENE";

            emergency.setStatus("EN_ROUTE_TO_SCENE");
            emergency.setUpdatedAt(Instant.now());
            emergencyRepository.save(emergency);

            dispatch.setStatus("EN_ROUTE_TO_SCENE");
            dispatchRepository.save(dispatch);

            ambulance.setStatus("EN_ROUTE_TO_PATIENT");
            ambulanceRepository.save(ambulance);
        }

        // Calculate REAL ROAD ROUTE using OSRM
        final RoutingService.RouteResult route = routingService.calculateRoute(
                ambulance.getLatitude(), ambulance.getLongitude(),
                targetLat, targetLon
        );
        activeRoutes.put(dispatchId, route);

        auditService.log("Simulation Engine", "SIMULATION_STARTED", "DISPATCH", dispatchId,
                null, "SIMULATING_" + phase, "roadDistanceKm=" + route.getDistanceKm() + ";etaMin=" + route.getDurationMinutes());

        // Broadcast route established
        liveSocketHandler.broadcast(String.format(
                Locale.US,
                "{\"event\":\"SIMULATION_STARTED\",\"dispatchId\":\"%s\",\"ambulanceId\":\"%s\",\"phase\":\"%s\",\"distanceKm\":%.2f,\"etaMinutes\":%.1f}",
                dispatchId, ambulance.getId(), phase, route.getDistanceKm(), route.getDurationMinutes()
        ));

        // Resample waypoints along the road to have ~20 smooth steps
        final List<double[]> rawWaypoints = route.getWaypoints();
        final List<double[]> simulationPath = resampleWaypoints(rawWaypoints, 22);
        final UUID ambId = ambulance.getId();
        final String finalPhase = phase;
        final int totalSteps = simulationPath.size();

        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(new Runnable() {
            private int currentStep = 0;

            @Override
            public void run() {
                try {
                    currentStep++;
                    if (currentStep >= totalSteps) {
                        currentStep = totalSteps - 1;
                    }

                    double[] currentPoint = simulationPath.get(currentStep);
                    double lat = currentPoint[0];
                    double lon = currentPoint[1];

                    // Calculate heading based on next waypoint
                    double heading;
                    if (currentStep < totalSteps - 1) {
                        double[] nextPoint = simulationPath.get(currentStep + 1);
                        heading = calculateBearing(lat, lon, nextPoint[0], nextPoint[1]);
                    } else {
                        heading = ambulance.getHeading();
                    }

                    boolean isLastStep = (currentStep >= totalSteps - 1);
                    double speed = isLastStep ? 0.0 : (45.0 + (Math.random() * 8.0 - 4.0));
                    double remainingRatio = 1.0 - ((double) currentStep / totalSteps);
                    double etaRemaining = Math.max(0.1, Math.round(route.getDurationMinutes() * remainingRatio * 10.0) / 10.0);

                    // Update ambulance in database
                    Ambulance amb = ambulanceRepository.findById(ambId).orElse(null);
                    if (amb != null) {
                        amb.setLatitude(Math.round(lat * 100000.0) / 100000.0);
                        amb.setLongitude(Math.round(lon * 100000.0) / 100000.0);
                        amb.setSpeed(Math.round(speed * 10.0) / 10.0);
                        amb.setHeading(Math.round(heading * 10.0) / 10.0);
                        amb.setLastLocationAt(Instant.now());
                        ambulanceRepository.save(amb);

                        locationRepository.save(new AmbulanceLocation(
                                ambId, amb.getLatitude(), amb.getLongitude(), amb.getSpeed(), amb.getHeading(), amb.getStatus()
                        ));

                        // Find current turn maneuver
                        String maneuver = findCurrentManeuver(route.getSteps(), (double) currentStep / totalSteps);

                        // Broadcast live location telemetry
                        liveSocketHandler.broadcast(String.format(
                                Locale.US,
                                "{\"event\":\"LOCATION_UPDATED\",\"ambulanceId\":\"%s\",\"dispatchId\":\"%s\",\"latitude\":%.6f,\"longitude\":%.6f,\"speed\":%.1f,\"heading\":%.1f,\"etaRemaining\":%.1f,\"maneuver\":\"%s\"}",
                                ambId, dispatchId, amb.getLatitude(), amb.getLongitude(), amb.getSpeed(), amb.getHeading(), etaRemaining, escapeJson(maneuver)
                        ));
                    }

                    if (isLastStep) {
                        completePhase(dispatchId, ambId, finalPhase);
                        stopSimulation(dispatchId);
                    }
                } catch (Exception e) {
                    log.error("Error during road simulation step", e);
                    stopSimulation(dispatchId);
                }
            }
        }, 800, 1200, TimeUnit.MILLISECONDS);

        activeSimulations.put(dispatchId, future);

        return Map.of(
                "status", "STARTED",
                "dispatchId", dispatchId.toString(),
                "phase", phase,
                "distanceKm", route.getDistanceKm(),
                "etaMinutes", route.getDurationMinutes(),
                "waypointsCount", simulationPath.size(),
                "waypoints", simulationPath
        );
    }

    private List<double[]> resampleWaypoints(List<double[]> original, int targetCount) {
        if (original == null || original.isEmpty()) return Collections.emptyList();
        if (original.size() <= targetCount) return new ArrayList<>(original);

        List<double[]> result = new ArrayList<>();
        double step = (double) (original.size() - 1) / (targetCount - 1);
        for (int i = 0; i < targetCount; i++) {
            int index = (int) Math.round(i * step);
            if (index >= original.size()) index = original.size() - 1;
            result.add(original.get(index));
        }
        return result;
    }

    private String findCurrentManeuver(List<RoutingService.Step> steps, double progress) {
        if (steps == null || steps.isEmpty()) return "Proceeding on priority emergency route";
        int idx = (int) (progress * steps.size());
        if (idx >= steps.size()) idx = steps.size() - 1;
        return steps.get(idx).getInstruction();
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\"", "\\\"").replace("\n", " ");
    }

    private void completePhase(UUID dispatchId, UUID ambulanceId, String phase) {
        try {
            Dispatch dispatch = dispatchRepository.findById(dispatchId).orElse(null);
            Emergency emergency = (dispatch != null) ? emergencyRepository.findById(dispatch.getEmergencyId()).orElse(null) : null;
            Ambulance ambulance = ambulanceRepository.findById(ambulanceId).orElse(null);

            if (dispatch == null || emergency == null || ambulance == null) return;

            String nextStatus = "SCENE".equals(phase) ? "ARRIVED_AT_SCENE" : "ARRIVED_AT_HOSPITAL";
            String ambStatus = "SCENE".equals(phase) ? "ARRIVED_AT_SCENE" : "AT_HOSPITAL";

            emergency.setStatus(nextStatus);
            emergency.setUpdatedAt(Instant.now());
            emergencyRepository.save(emergency);

            dispatch.setStatus(nextStatus);
            dispatchRepository.save(dispatch);

            ambulance.setStatus(ambStatus);
            ambulance.setSpeed(0);
            ambulanceRepository.save(ambulance);

            auditService.log("Simulation Engine", "SIMULATION_COMPLETED", "DISPATCH", dispatchId,
                    "SIMULATING_" + phase, nextStatus, "Vehicle arrived via road routing");

            liveSocketHandler.broadcast(String.format(
                    "{\"event\":\"STATUS_CHANGED\",\"dispatchId\":\"%s\",\"status\":\"%s\"}",
                    dispatchId, nextStatus
            ));
            liveSocketHandler.broadcast(String.format(
                    "{\"event\":\"SIMULATION_FINISHED\",\"dispatchId\":\"%s\",\"status\":\"%s\"}",
                    dispatchId, nextStatus
            ));

            if ("SCENE".equals(phase)) {
                // Autonomous transition: Arrived at Scene -> 2.5s later: Patient Onboard -> start leg 2 (to Hospital)
                scheduler.schedule(() -> {
                    try {
                        Dispatch d = dispatchRepository.findById(dispatchId).orElse(null);
                        Emergency em = (d != null) ? emergencyRepository.findById(d.getEmergencyId()).orElse(null) : null;
                        Ambulance amb = ambulanceRepository.findById(ambulanceId).orElse(null);
                        if (d == null || em == null || amb == null) return;

                        // Transition to PATIENT_ONBOARD
                        em.setStatus("PATIENT_ONBOARD");
                        em.setUpdatedAt(Instant.now());
                        emergencyRepository.save(em);

                        d.setStatus("PATIENT_ONBOARD");
                        dispatchRepository.save(d);

                        amb.setStatus("PATIENT_ONBOARD");
                        ambulanceRepository.save(amb);

                        liveSocketHandler.broadcast(String.format(
                                "{\"event\":\"STATUS_CHANGED\",\"dispatchId\":\"%s\",\"status\":\"PATIENT_ONBOARD\"}",
                                dispatchId
                        ));

                        // Stream initial vitals
                        int hr = 108 + (int)(Math.random() * 24);
                        int sys = 132 + (int)(Math.random() * 18);
                        int dia = 84 + (int)(Math.random() * 10);
                        int spo2 = 91 + (int)(Math.random() * 6);
                        liveSocketHandler.broadcast(String.format(
                                Locale.US,
                                "{\"event\":\"VITALS_UPDATED\",\"dispatchId\":\"%s\",\"ambulanceId\":\"%s\",\"hospitalId\":\"%s\"," +
                                "\"vitals\":{\"heartRate\":%d,\"bloodPressureSys\":%d,\"bloodPressureDia\":%d,\"spO2\":%d," +
                                "\"respiratoryRate\":20,\"temperature\":37.2,\"gcs\":14,\"conditionSummary\":\"Patient onboard; IV lines established; transporting to ED\"}}",
                                dispatchId, ambulanceId, d.getHospitalId() != null ? d.getHospitalId().toString() : "",
                                hr, sys, dia, spo2
                        ));

                        // Start leg 2: Transport to Hospital
                        scheduler.schedule(() -> {
                            try {
                                startSimulation(dispatchId);
                            } catch (Exception ex) {
                                log.error("Failed to auto-start hospital transport simulation leg", ex);
                            }
                        }, 1800, TimeUnit.MILLISECONDS);

                    } catch (Exception ex) {
                        log.error("Error in autonomous patient onboard transition", ex);
                    }
                }, 2500, TimeUnit.MILLISECONDS);

            } else {
                // Arrived at Hospital -> 3s later: Patient Admitted, Mission Completed, Bed Decremented, Ambulance Available
                scheduler.schedule(() -> {
                    try {
                        Dispatch d = dispatchRepository.findById(dispatchId).orElse(null);
                        Emergency em = (d != null) ? emergencyRepository.findById(d.getEmergencyId()).orElse(null) : null;
                        Ambulance amb = ambulanceRepository.findById(ambulanceId).orElse(null);
                        if (d == null || em == null || amb == null) return;

                        // Complete emergency & dispatch
                        em.setStatus("COMPLETED");
                        em.setUpdatedAt(Instant.now());
                        emergencyRepository.save(em);

                        d.setStatus("COMPLETED");
                        d.setCompletedAt(Instant.now());
                        dispatchRepository.save(d);

                        // Ambulance is once again ready & available
                        amb.setStatus("AVAILABLE");
                        amb.setSpeed(0);
                        ambulanceRepository.save(amb);

                        // Decrement available hospital beds if hospital assigned
                        if (d.getHospitalId() != null) {
                            Hospital h = hospitalRepository.findById(d.getHospitalId()).orElse(null);
                            if (h != null) {
                                if (h.getAvailableBeds() > 0) h.setAvailableBeds(h.getAvailableBeds() - 1);
                                if ("TRAUMA".equalsIgnoreCase(em.getType()) && h.getTraumaBaysAvailable() > 0) {
                                    h.setTraumaBaysAvailable(h.getTraumaBaysAvailable() - 1);
                                }
                                hospitalRepository.save(h);
                                liveSocketHandler.broadcast(String.format(
                                        "{\"event\":\"HOSPITAL_CAPACITY_UPDATED\",\"hospitalId\":\"%s\",\"availableBeds\":%d,\"icuBeds\":%d,\"traumaBays\":%d}",
                                        h.getId(), h.getAvailableBeds(), h.getIcuBedsAvailable(), h.getTraumaBaysAvailable()
                                ));
                            }
                        }

                        auditService.log("Autonomous CAD System", "MISSION_COMPLETED", "DISPATCH", dispatchId,
                                "ARRIVED_AT_HOSPITAL", "COMPLETED", "Patient successfully admitted to hospital facility; vehicle returned to AVAILABLE");

                        liveSocketHandler.broadcast(String.format(
                                "{\"event\":\"STATUS_CHANGED\",\"dispatchId\":\"%s\",\"status\":\"COMPLETED\",\"ambulanceStatus\":\"AVAILABLE\"}",
                                dispatchId
                        ));
                        liveSocketHandler.broadcast(String.format(
                                "{\"event\":\"AMBULANCE_STATUS_UPDATED\",\"ambulanceId\":\"%s\",\"status\":\"AVAILABLE\"}",
                                ambulanceId
                        ));
                        liveSocketHandler.broadcast(String.format(
                                "{\"event\":\"MISSION_COMPLETED\",\"dispatchId\":\"%s\",\"ambulanceId\":\"%s\",\"emergencyId\":\"%s\"}",
                                dispatchId, ambulanceId, em.getId()
                        ));

                    } catch (Exception ex) {
                        log.error("Error in autonomous hospital handoff completion", ex);
                    }
                }, 3000, TimeUnit.MILLISECONDS);
            }
        } catch (Exception e) {
            log.error("Error completing road simulation phase", e);
        }
    }

    public synchronized boolean stopSimulation(UUID dispatchId) {
        ScheduledFuture<?> future = activeSimulations.remove(dispatchId);
        activeRoutes.remove(dispatchId);
        if (future != null) {
            future.cancel(true);
            liveSocketHandler.broadcast(String.format(
                    "{\"event\":\"SIMULATION_STOPPED\",\"dispatchId\":\"%s\"}",
                    dispatchId
            ));
            return true;
        }
        return false;
    }

    public synchronized void stopAllSimulations() {
        for (UUID dispatchId : new ArrayList<>(activeSimulations.keySet())) {
            stopSimulation(dispatchId);
        }
    }

    public boolean isSimulating(UUID dispatchId) {
        ScheduledFuture<?> future = activeSimulations.get(dispatchId);
        return future != null && !future.isDone();
    }

    public Set<UUID> getActiveSimulations() {
        return Collections.unmodifiableSet(activeSimulations.keySet());
    }

    public RoutingService.RouteResult getActiveRoute(UUID dispatchId) {
        return activeRoutes.get(dispatchId);
    }

    private double calculateBearing(double lat1, double lon1, double lat2, double lon2) {
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaLambda = Math.toRadians(lon2 - lon1);

        double y = Math.sin(deltaLambda) * Math.cos(phi2);
        double x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

        double theta = Math.atan2(y, x);
        return (Math.toDegrees(theta) + 360.0) % 360.0;
    }
}
