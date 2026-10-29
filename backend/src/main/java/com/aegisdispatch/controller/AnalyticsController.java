package com.aegisdispatch.controller;

import com.aegisdispatch.model.*;
import com.aegisdispatch.repository.*;
import com.aegisdispatch.service.CadFileService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final CadFileService fileService;
    private final EmergencyRepository emergencies;
    private final AmbulanceRepository ambulances;
    private final HospitalRepository hospitals;
    private final DispatchRepository dispatches;

    public AnalyticsController(
            CadFileService fileService,
            EmergencyRepository emergencies,
            AmbulanceRepository ambulances,
            HospitalRepository hospitals,
            DispatchRepository dispatches
    ) {
        this.fileService = fileService;
        this.emergencies = emergencies;
        this.ambulances = ambulances;
        this.hospitals = hospitals;
        this.dispatches = dispatches;
    }

    /**
     * Operational analytics summary endpoint.
     * GET /api/analytics/summary
     */
    @GetMapping("/summary")
    public ResponseEntity<?> getAnalyticsSummary() {
        List<Emergency> allEmergencies = emergencies.findAll();
        List<Ambulance> allAmbulances = ambulances.findAll();
        List<Hospital> allHospitals = hospitals.findAll();
        List<Dispatch> allDispatches = dispatches.findAll();

        Map<String, Long> emergencyStatusCounts = allEmergencies.stream()
                .collect(Collectors.groupingBy(Emergency::getStatus, Collectors.counting()));

        Map<String, Long> ambulanceStatusCounts = allAmbulances.stream()
                .collect(Collectors.groupingBy(Ambulance::getStatus, Collectors.counting()));

        int totalBeds = allHospitals.stream().mapToInt(Hospital::getTotalBeds).sum();
        int availableBeds = allHospitals.stream().mapToInt(Hospital::getAvailableBeds).sum();
        int totalIcu = allHospitals.stream().mapToInt(Hospital::getIcuBedsTotal).sum();
        int availableIcu = allHospitals.stream().mapToInt(Hospital::getIcuBedsAvailable).sum();
        int traumaBays = allHospitals.stream().mapToInt(Hospital::getTraumaBaysAvailable).sum();

        double avgEta = allDispatches.stream()
                .mapToDouble(Dispatch::getEtaMinutes)
                .average()
                .orElse(0.0);

        return ResponseEntity.ok(Map.of(
                "totalEmergencies", allEmergencies.size(),
                "emergenciesByStatus", emergencyStatusCounts,
                "totalAmbulances", allAmbulances.size(),
                "ambulancesByStatus", ambulanceStatusCounts,
                "hospitalStats", Map.of(
                        "totalBeds", totalBeds,
                        "availableBeds", availableBeds,
                        "occupancyRate", totalBeds > 0 ? Math.round((1.0 - (double) availableBeds / totalBeds) * 100.0) : 0,
                        "totalIcuBeds", totalIcu,
                        "availableIcuBeds", availableIcu,
                        "availableTraumaBays", traumaBays
                ),
                "dispatchStats", Map.of(
                        "totalDispatches", allDispatches.size(),
                        "averageEtaMinutes", Math.round(avgEta * 10.0) / 10.0
                )
        ));
    }

    /**
     * Analytics CSV export for dispatcher review and reporting.
     * GET /api/analytics/export.csv
     */
    @GetMapping("/export.csv")
    public ResponseEntity<byte[]> exportAnalyticsCsv() {
        try {
            String csv = fileService.exportEmergenciesCsv();
            byte[] bytes = csv.getBytes("UTF-8");

            String timestamp = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")
                    .withZone(ZoneOffset.UTC)
                    .format(Instant.now());
            String filename = "aegis_analytics_" + timestamp + ".csv";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/csv"));
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(bytes.length);

            return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
