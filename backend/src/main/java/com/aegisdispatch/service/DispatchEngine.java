package com.aegisdispatch.service;

import com.aegisdispatch.model.Ambulance;
import com.aegisdispatch.model.Emergency;
import com.aegisdispatch.repository.AmbulanceRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class DispatchEngine {

    private final AmbulanceRepository ambulances;
    private final RoutingService routingService;

    public DispatchEngine(AmbulanceRepository ambulances, RoutingService routingService) {
        this.ambulances = ambulances;
        this.routingService = routingService;
    }

    public List<Map<String, Object>> candidates(Emergency e) {
        return ambulances.findByStatus("AVAILABLE").stream()
                .map(a -> {
                    // Calculate real road network route
                    RoutingService.RouteResult route = routingService.calculateRoute(
                            a.getLatitude(), a.getLongitude(),
                            e.getLatitude(), e.getLongitude()
                    );

                    double d = route.getDistanceKm();
                    double eta = route.getDurationMinutes();
                    double cap = capability(e, a);
                    double distScore = 1.0 / (1.0 + d * 0.1);
                    double etaScore = 1.0 / (1.0 + eta * 0.1);
                    double trafficFactor = (a.getSpeed() > 0 ? 0.8 : 1.0);

                    // Multi-criteria weighted ranking:
                    // ETA: 30%, Capabilities: 30%, Availability: 15%, Distance: 15%, Traffic: 10%
                    double score = (0.30 * etaScore)
                            + (0.30 * cap)
                            + (0.15 * 1.0)
                            + (0.15 * distScore)
                            + (0.10 * trafficFactor);

                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("ambulance", a);
                    m.put("distanceKm", round(d));
                    m.put("etaMinutes", round(eta));
                    m.put("capabilityScore", round(cap));
                    m.put("score", round(score));
                    m.put("waypoints", route.getWaypoints());
                    return m;
                })
                .sorted((x, y) -> Double.compare((Double) y.get("score"), (Double) x.get("score")))
                .toList();
    }

    private double capability(Emergency e, Ambulance a) {
        String emType = e.getType() != null ? e.getType() : "";
        String ambType = a.getType() != null ? a.getType() : "";

        if (emType.equals("CARDIAC") || emType.equals("BREATHING")) {
            return ambType.equals("ALS") ? 1.0 : 0.65;
        }
        if (emType.equals("PEDIATRIC") || emType.equals("TRAUMA")) {
            return ambType.equals("ALS") ? 0.95 : 0.70;
        }
        return 1.0;
    }

    private double round(double x) {
        return Math.round(x * 100.0) / 100.0;
    }
}
