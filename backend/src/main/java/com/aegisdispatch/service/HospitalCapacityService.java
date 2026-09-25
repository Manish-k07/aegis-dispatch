package com.aegisdispatch.service;

import com.aegisdispatch.model.Hospital;
import com.aegisdispatch.repository.HospitalRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class HospitalCapacityService {

    private final HospitalRepository hospitalRepository;

    public HospitalCapacityService(HospitalRepository hospitalRepository) {
        this.hospitalRepository = hospitalRepository;
    }

    /**
     * Compute real-time city-wide emergency department capacity analytics.
     */
    public Map<String, Object> getNetworkCapacitySummary() {
        List<Hospital> allHospitals = hospitalRepository.findAll();

        int totalBeds = 0;
        int availableBeds = 0;
        int totalIcu = 0;
        int availableIcu = 0;
        int totalTrauma = 0;
        int availableTrauma = 0;
        int totalVentilators = 0;
        int availableVentilators = 0;
        int onDiversionCount = 0;

        List<Map<String, Object>> hospitalSummaries = new ArrayList<>();

        for (Hospital h : allHospitals) {
            totalBeds += h.getTotalBeds();
            availableBeds += h.getAvailableBeds();
            totalIcu += h.getIcuBedsTotal();
            availableIcu += h.getIcuBedsAvailable();
            totalTrauma += h.getTraumaBaysTotal();
            availableTrauma += h.getTraumaBaysAvailable();

            // Estimated ventilators based on ICU capacity (typically 1.2x ICU beds)
            int ventsTotal = Math.max(10, (int) Math.round(h.getIcuBedsTotal() * 1.2));
            int ventsAvail = Math.max(2, (int) Math.round(h.getIcuBedsAvailable() * 0.9));
            totalVentilators += ventsTotal;
            availableVentilators += ventsAvail;

            boolean isDiversion = "DIVERSION".equalsIgnoreCase(h.getStatus());
            if (isDiversion) {
                onDiversionCount++;
            }

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", h.getId());
            item.put("name", h.getName());
            item.put("address", h.getAddress());
            item.put("status", h.getStatus());
            item.put("phone", h.getPhone());
            item.put("designatedEdPhone", h.getDesignatedEdPhone());
            item.put("totalBeds", h.getTotalBeds());
            item.put("availableBeds", h.getAvailableBeds());
            item.put("icuBedsTotal", h.getIcuBedsTotal());
            item.put("icuBedsAvailable", h.getIcuBedsAvailable());
            item.put("traumaBaysTotal", h.getTraumaBaysTotal());
            item.put("traumaBaysAvailable", h.getTraumaBaysAvailable());
            item.put("ventilatorsTotal", ventsTotal);
            item.put("ventilatorsAvailable", ventsAvail);
            item.put("cathLabOperational", h.isCathLabOperational());
            item.put("onDiversion", isDiversion);

            double bedOccupancy = h.getTotalBeds() > 0
                    ? Math.round(((double) (h.getTotalBeds() - h.getAvailableBeds()) / h.getTotalBeds()) * 100.0)
                    : 0.0;
            item.put("bedOccupancyPercent", bedOccupancy);

            hospitalSummaries.add(item);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("timestamp", java.time.Instant.now().toString());
        summary.put("totalHospitals", allHospitals.size());
        summary.put("onDiversionHospitals", onDiversionCount);
        summary.put("totalBeds", totalBeds);
        summary.put("availableBeds", availableBeds);
        summary.put("totalIcu", totalIcu);
        summary.put("availableIcu", availableIcu);
        summary.put("totalTraumaBays", totalTrauma);
        summary.put("availableTraumaBays", availableTrauma);
        summary.put("totalVentilators", totalVentilators);
        summary.put("availableVentilators", availableVentilators);
        summary.put("networkOccupancyPercent", totalBeds > 0 ? Math.round(((double)(totalBeds - availableBeds) / totalBeds) * 100.0) : 0);
        summary.put("facilities", hospitalSummaries);

        return summary;
    }

    /**
     * Toggles diversion status for an emergency facility.
     */
    public Hospital setDiversionStatus(UUID hospitalId, boolean diversion) {
        Hospital h = hospitalRepository.findById(hospitalId)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found: " + hospitalId));

        h.setStatus(diversion ? "DIVERSION" : "AVAILABLE");
        return hospitalRepository.save(h);
    }
}
