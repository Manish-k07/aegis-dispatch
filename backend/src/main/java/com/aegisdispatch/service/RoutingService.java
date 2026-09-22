package com.aegisdispatch.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoutingService {

    private static final Logger log = LoggerFactory.getLogger(RoutingService.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, RouteResult> routeCache = new ConcurrentHashMap<>();

    public RoutingService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(4000);
        factory.setReadTimeout(5000);
        this.restTemplate = new RestTemplate(factory);
    }

    public static class Step {
        private final String instruction;
        private final double distanceMeters;
        private final String streetName;

        public Step(String instruction, double distanceMeters, String streetName) {
            this.instruction = instruction;
            this.distanceMeters = distanceMeters;
            this.streetName = streetName;
        }

        public String getInstruction() { return instruction; }
        public double getDistanceMeters() { return distanceMeters; }
        public String getStreetName() { return streetName; }
    }

    public static class RouteResult {
        private final double distanceKm;
        private final double durationMinutes;
        private final List<double[]> waypoints; // [lat, lon]
        private final List<Step> steps;

        public RouteResult(double distanceKm, double durationMinutes, List<double[]> waypoints, List<Step> steps) {
            this.distanceKm = distanceKm;
            this.durationMinutes = durationMinutes;
            this.waypoints = waypoints;
            this.steps = steps;
        }

        public double getDistanceKm() { return distanceKm; }
        public double getDurationMinutes() { return durationMinutes; }
        public List<double[]> getWaypoints() { return waypoints; }
        public List<Step> getSteps() { return steps; }
    }

    public RouteResult calculateRoute(double startLat, double startLon, double endLat, double endLon) {
        String cacheKey = String.format(Locale.US, "%.5f,%.5f->%.5f,%.5f", startLat, startLon, endLat, endLon);
        RouteResult cached = routeCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        try {
            // OSRM format: /route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson&steps=true
            String url = String.format(Locale.US,
                    "https://router.project-osrm.org/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=full&geometries=geojson&steps=true",
                    startLon, startLat, endLon, endLat);

            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode routes = root.path("routes");
                if (routes.isArray() && routes.size() > 0) {
                    JsonNode route = routes.get(0);
                    double distanceMeters = route.path("distance").asDouble();
                    double durationSeconds = route.path("duration").asDouble();

                    double distanceKm = Math.round((distanceMeters / 1000.0) * 100.0) / 100.0;
                    double durationMin = Math.round(Math.max(2.0, durationSeconds / 60.0) * 10.0) / 10.0;

                    // Extract coordinates (OSRM returns [lon, lat])
                    List<double[]> waypoints = new ArrayList<>();
                    JsonNode coordinates = route.path("geometry").path("coordinates");
                    if (coordinates.isArray()) {
                        for (JsonNode coord : coordinates) {
                            if (coord.isArray() && coord.size() >= 2) {
                                double lon = coord.get(0).asDouble();
                                double lat = coord.get(1).asDouble();
                                waypoints.add(new double[]{lat, lon});
                            }
                        }
                    }

                    // Extract turn-by-turn steps
                    List<Step> steps = new ArrayList<>();
                    JsonNode legs = route.path("legs");
                    if (legs.isArray() && legs.size() > 0) {
                        JsonNode stepsNode = legs.get(0).path("steps");
                        if (stepsNode.isArray()) {
                            for (JsonNode s : stepsNode) {
                                String name = s.path("name").asText("Unnamed Road");
                                double stepDist = s.path("distance").asDouble();
                                String modifier = s.path("maneuver").path("modifier").asText("");
                                String type = s.path("maneuver").path("type").asText("");

                                String instr = formatManeuver(type, modifier, name);
                                steps.add(new Step(instr, stepDist, name));
                            }
                        }
                    }

                    if (waypoints.isEmpty()) {
                        waypoints.add(new double[]{startLat, startLon});
                        waypoints.add(new double[]{endLat, endLon});
                    }

                    RouteResult result = new RouteResult(distanceKm, durationMin, waypoints, steps);
                    routeCache.put(cacheKey, result);
                    return result;
                }
            }
        } catch (Exception e) {
            log.warn("OSRM routing failed for ({}, {}) -> ({}, {}): {}. Falling back to urban Haversine model.",
                    startLat, startLon, endLat, endLon, e.getMessage());
        }

        // Fallback: Haversine with 1.32 urban tortuosity factor
        RouteResult fallback = createFallbackRoute(startLat, startLon, endLat, endLon);
        routeCache.put(cacheKey, fallback);
        return fallback;
    }

    private RouteResult createFallbackRoute(double startLat, double startLon, double endLat, double endLon) {
        double directKm = haversine(startLat, startLon, endLat, endLon);
        double roadKm = Math.round(directKm * 1.32 * 100.0) / 100.0;
        // Average emergency vehicle city speed ~38 km/h
        double durationMin = Math.round(Math.max(2.0, (roadKm / 38.0) * 60.0) * 10.0) / 10.0;

        List<double[]> waypoints = new ArrayList<>();
        int count = 20;
        for (int i = 0; i <= count; i++) {
            double p = (double) i / count;
            double lat = startLat + (endLat - startLat) * p;
            double lon = startLon + (endLon - startLon) * p;
            waypoints.add(new double[]{lat, lon});
        }

        List<Step> steps = List.of(
                new Step("Depart from current station", roadKm * 500, "City Arterial"),
                new Step("Proceed towards incident location", roadKm * 500, "Primary Route")
        );

        return new RouteResult(roadKm, durationMin, waypoints, steps);
    }

    private String formatManeuver(String type, String modifier, String name) {
        if ("depart".equalsIgnoreCase(type)) {
            return "Depart onto " + (name.isBlank() ? "the road" : name);
        } else if ("arrive".equalsIgnoreCase(type)) {
            return "Arrive at destination on " + (name.isBlank() ? "the route" : name);
        } else if ("turn".equalsIgnoreCase(type)) {
            return "Turn " + (modifier.isBlank() ? "" : modifier + " ") + "onto " + (name.isBlank() ? "the cross street" : name);
        } else if ("continue".equalsIgnoreCase(type) || "new name".equalsIgnoreCase(type)) {
            return "Continue onto " + (name.isBlank() ? "the avenue" : name);
        } else {
            return (modifier.isBlank() ? "Proceed" : "Turn " + modifier) + " on " + (name.isBlank() ? "the street" : name);
        }
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;
        double p = Math.PI / 180;
        double x = (lat2 - lat1) * p;
        double y = (lon2 - lon1) * p;
        double h = Math.sin(x / 2) * Math.sin(x / 2) + Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(y / 2) * Math.sin(y / 2);
        return 2 * R * Math.asin(Math.sqrt(h));
    }
}
