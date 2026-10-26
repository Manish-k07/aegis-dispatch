package com.aegisdispatch.service;

import com.aegisdispatch.model.*;
import com.aegisdispatch.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.util.*;

@Service
public class CadFileService {

    private final EmergencyRepository emergencyRepo;
    private final AmbulanceRepository ambulanceRepo;
    private final HospitalRepository hospitalRepo;
    private final DispatchRepository dispatchRepo;
    private final AuditLogRepository auditLogRepo;
    private final ObjectMapper objectMapper;

    public CadFileService(EmergencyRepository emergencyRepo,
                          AmbulanceRepository ambulanceRepo,
                          HospitalRepository hospitalRepo,
                          DispatchRepository dispatchRepo,
                          AuditLogRepository auditLogRepo) {
        this.emergencyRepo = emergencyRepo;
        this.ambulanceRepo = ambulanceRepo;
        this.hospitalRepo = hospitalRepo;
        this.dispatchRepo = dispatchRepo;
        this.auditLogRepo = auditLogRepo;

        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * Builds complete system snapshot object in memory.
     */
    public Map<String, Object> buildSystemSnapshot(String reason) {
        List<Emergency> emergencies = emergencyRepo.findAllByOrderByCreatedAtDesc();
        List<Ambulance> ambulances = ambulanceRepo.findAll();
        List<Hospital> hospitals = hospitalRepo.findAll();
        List<Dispatch> dispatches = dispatchRepo.findAllByOrderByAssignedAtDesc();
        List<AuditLog> auditLogs = auditLogRepo.findAll();

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("systemName", "Aegis CAD");
        metadata.put("snapshotReason", reason != null ? reason : "MANUAL_EXPORT");
        metadata.put("exportedAt", Instant.now().toString());
        metadata.put("systemStatus", "OPERATIONAL");
        metadata.put("totalEmergencies", emergencies.size());
        metadata.put("totalDispatches", dispatches.size());
        metadata.put("totalAmbulances", ambulances.size());
        metadata.put("totalHospitals", hospitals.size());
        metadata.put("totalAuditLogs", auditLogs.size());

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("metadata", metadata);
        snapshot.put("emergencies", emergencies);
        snapshot.put("dispatches", dispatches);
        snapshot.put("ambulances", ambulances);
        snapshot.put("hospitals", hospitals);
        snapshot.put("auditLogs", auditLogs);

        return snapshot;
    }

    /**
     * Exports pretty-printed JSON string for browser file download (in-memory streaming).
     */
    public String exportFullArchiveJson() throws IOException {
        Map<String, Object> snapshot = buildSystemSnapshot("USER_EXPORT");
        return objectMapper.writeValueAsString(snapshot);
    }

    /**
     * Generates CSV format for tabular incident analytics analysis (in-memory streaming).
     */
    public String exportEmergenciesCsv() {
        List<Emergency> list = emergencyRepo.findAllByOrderByCreatedAtDesc();
        StringBuilder sb = new StringBuilder();
        sb.append("ID,Type,Priority,Status,CallerName,Phone,PatientCount,Address,Latitude,Longitude,CreatedAt\n");
        for (Emergency e : list) {
            sb.append(escapeCsv(e.getId().toString())).append(",")
              .append(escapeCsv(e.getType())).append(",")
              .append(escapeCsv(e.getPriority())).append(",")
              .append(escapeCsv(e.getStatus())).append(",")
              .append(escapeCsv(e.getCallerName())).append(",")
              .append(escapeCsv(e.getPhone())).append(",")
              .append(e.getPatientCount()).append(",")
              .append(escapeCsv(e.getAddress())).append(",")
              .append(e.getLatitude()).append(",")
              .append(e.getLongitude()).append(",")
              .append(e.getCreatedAt() != null ? e.getCreatedAt().toString() : "").append("\n");
        }
        return sb.toString();
    }

    private String escapeCsv(String val) {
        if (val == null) return "\"\"";
        return "\"" + val.replace("\"", "\"\"") + "\"";
    }
}
