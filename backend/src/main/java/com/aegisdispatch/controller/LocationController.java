package com.aegisdispatch.controller;

import com.aegisdispatch.model.Ambulance;
import com.aegisdispatch.repository.AmbulanceRepository;
import com.aegisdispatch.websocket.LiveSocketHandler;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ambulances")
public class LocationController {

    private final AmbulanceRepository repo;
    private final LiveSocketHandler ws;

    public LocationController(AmbulanceRepository r, LiveSocketHandler w) {
        this.repo = r;
        this.ws = w;
    }

    @PostMapping("/{id}/location")
    public Ambulance update(@PathVariable UUID id, @RequestBody Map<String, Double> p) {
        Ambulance a = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ambulance not found: " + id));

        Double lat = p.get("latitude");
        Double lon = p.get("longitude");

        if (lat == null || lat < -90.0 || lat > 90.0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid latitude: must be between -90 and 90");
        }
        if (lon == null || lon < -180.0 || lon > 180.0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid longitude: must be between -180 and 180");
        }

        a.setLatitude(lat);
        a.setLongitude(lon);
        a.setSpeed(Math.max(0.0, Math.min(200.0, p.getOrDefault("speed", 0.0))));
        a.setHeading(Math.max(0.0, Math.min(360.0, p.getOrDefault("heading", 0.0))));
        a.setLastLocationAt(Instant.now());

        Ambulance s = repo.save(a);
        ws.broadcast(String.format("{\"event\":\"LOCATION_UPDATED\",\"ambulanceId\":\"%s\",\"latitude\":%f,\"longitude\":%f}",
                id, a.getLatitude(), a.getLongitude()));
        return s;
    }
}
