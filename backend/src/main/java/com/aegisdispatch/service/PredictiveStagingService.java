package com.aegisdispatch.service;

import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Predictive Fleet Staging Engine
 * Computes micro-demand risk zones to proactively pre-position idle emergency vehicles.
 */
@Service
public class PredictiveStagingService {

    public List<Map<String, Object>> getStagingZones() {
        List<Map<String, Object>> zones = new ArrayList<>();

        Map<String, Object> z1 = new HashMap<>();
        z1.put("zoneId", "ZONE-INDIRANAGAR");
        z1.put("name", "Indiranagar 100ft Hub");
        z1.put("latitude", 12.9784);
        z1.put("longitude", 77.6408);
        z1.put("radiusMeters", 1200);
        z1.put("riskScore", 0.88);
        z1.put("predictedIncidentsNextHour", 3.4);
        z1.put("primaryRiskType", "TRAUMA / ACCIDENT");
        z1.put("recommendedUnits", 2);
        z1.put("recommendedType", "ALS");
        z1.put("status", "UNDER_SERVICED");
        zones.add(z1);

        Map<String, Object> z2 = new HashMap<>();
        z2.put("zoneId", "ZONE-KORAMANGALA");
        z2.put("name", "Koramangala Sony World Junction");
        z2.put("latitude", 12.9352);
        z2.put("longitude", 77.6245);
        z2.put("radiusMeters", 1000);
        z2.put("riskScore", 0.72);
        z2.put("predictedIncidentsNextHour", 2.1);
        z2.put("primaryRiskType", "CARDIAC / MEDICAL");
        z2.put("recommendedUnits", 1);
        z2.put("recommendedType", "ALS");
        z2.put("status", "ADEQUATE");
        zones.add(z2);

        Map<String, Object> z3 = new HashMap<>();
        z3.put("zoneId", "ZONE-MG-ROAD");
        z3.put("name", "MG Road - Trinity Circle");
        z3.put("latitude", 12.9733);
        z3.put("longitude", 77.6170);
        z3.put("radiusMeters", 800);
        z3.put("riskScore", 0.45);
        z3.put("predictedIncidentsNextHour", 1.2);
        z3.put("primaryRiskType", "ACCIDENT / PEDESTRIAN");
        z3.put("recommendedUnits", 1);
        z3.put("recommendedType", "BLS");
        z3.put("status", "OPTIMAL");
        zones.add(z3);

        return zones;
    }
}
