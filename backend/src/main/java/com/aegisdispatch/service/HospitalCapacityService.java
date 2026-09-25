package com.aegisdispatch.service;

import com.aegisdispatch.model.Hospital;
import com.aegisdispatch.repository.HospitalRepository;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Enterprise Regional Hospital Capacity & ED Diversion Management Service
 */
@Service
public class HospitalCapacityService {

    private final HospitalRepository hospitalRepository;
    private final AuditService auditService;

    public HospitalCapacityService(HospitalRepository hospitalRepository, AuditService auditService) {
        this.hospitalRepository = hospitalRepository;
        this.auditService = auditService;
    }

    @jakarta.annotation.PostConstruct
    public void ensureDesignatedPhones() {
        for (Hospital h : hospitalRepository.findAll()) {
            if (h.getDesignatedEdPhone() == null || h.getDesignatedEdPhone().isBlank()) {
                if (h.getId().equals(UUID.fromString("10000000-0000-0000-0000-000000000001"))) {
                    h.setDesignatedEdPhone("+918022220001");
                } else if (h.getId().equals(UUID.fromString("10000000-0000-0000-0000-000000000002"))) {
                    h.setDesignatedEdPhone("+918022220002");
                } else if (h.getId().equals(UUID.fromString("10000000-0000-0000-0000-000000000003"))) {
                    h.setDesignatedEdPhone("+918022220003");
                } else {
                    h.setDesignatedEdPhone("+918022229999");
                }
                hospitalRepository.save(h);
            }
        }
    }

    public Map<String, Object> getCapacityOverview() {
        List<Hospital> hospitals = hospitalRepository.findAll();

        int totalBeds = 0;
        int availableBeds = 0;
        int totalIcu = 0;
        int availableIcu = 0;
        int totalTrauma = 0;
        int availableTrauma = 0;
        int diversionCount = 0;

        List<Map<String, Object>> facilityDetails = new ArrayList<>();

        for (Hospital h : hospitals) {
            totalBeds += h.getTotalBeds();
            availableBeds += h.getAvailableBeds();
            totalIcu += h.getIcuBedsTotal();
            availableIcu += h.getIcuBedsAvailable();
            totalTrauma += h.getTraumaBaysTotal();
            availableTrauma += h.getTraumaBaysAvailable();

            boolean isDiversion = "DIVERSION".equalsIgnoreCase(h.getStatus());
            if (isDiversion) diversionCount++;

            Map<String, Object> item = new HashMap<>();
            item.put("id", h.getId());
            item.put("name", h.getName());
            item.put("status", h.getStatus());
            item.put("isDiversion", isDiversion);
            item.put("totalBeds", h.getTotalBeds());
            item.put("availableBeds", h.getAvailableBeds());
            item.put("icuBedsTotal", h.getIcuBedsTotal());
            item.put("icuBedsAvailable", h.getIcuBedsAvailable());
            item.put("traumaBaysTotal", h.getTraumaBaysTotal());
            item.put("traumaBaysAvailable", h.getTraumaBaysAvailable());
            item.put("cathLabOperational", h.isCathLabOperational());
            item.put("phone", h.getPhone());
            item.put("designatedEdPhone", h.getDesignatedEdPhone());
            facilityDetails.add(item);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("networkStatus", diversionCount > 0 ? "SURGE_ACTIVE" : "NOMINAL");
        response.put("totalFacilities", hospitals.size());
        response.put("diversionFacilities", diversionCount);
        response.put("totalErBeds", totalBeds);
        response.put("availableErBeds", availableBeds);
        response.put("totalIcuBeds", totalIcu);
        response.put("availableIcuBeds", availableIcu);
        response.put("totalTraumaBays", totalTrauma);
        response.put("availableTraumaBays", availableTrauma);
        response.put("facilities", facilityDetails);
        return response;
    }

    public Hospital toggleDiversion(UUID hospitalId, boolean diversion, String reason) {
        Hospital h = hospitalRepository.findById(hospitalId).orElse(null);
        if (h == null) return null;

        String prevStatus = h.getStatus();
        h.setStatus(diversion ? "DIVERSION" : "AVAILABLE");
        hospitalRepository.save(h);

        auditService.log("Regional Triage Officer",
                diversion ? "HOSPITAL_DECLARED_DIVERSION" : "HOSPITAL_RESUMED_NORMAL",
                "HOSPITAL",
                hospitalId,
                prevStatus,
                h.getStatus(),
                "reason=" + (reason != null ? reason : "ED Saturation Protocol")
        );

        return h;
    }
}
