package com.aegisdispatch.service;

import com.aegisdispatch.model.*;
import com.aegisdispatch.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class CadFileService {

    private static final Logger log = LoggerFactory.getLogger(CadFileService.class);
    private static final String DATA_DIR = "./data";
    private static final String BACKUP_DIR = "./data/backups";
    private static final String SNAPSHOT_FILE = "./data/aegis_cad_snapshot.json";

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

        ensureDirectories();
    }

    private void ensureDirectories() {
        try {
            Files.createDirectories(Paths.get(DATA_DIR));
            Files.createDirectories(Paths.get(BACKUP_DIR));
        } catch (IOException e) {
            log.error("Failed to create CAD data directories: {}", e.getMessage());
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        try {
            saveSnapshotToFile("SYSTEM_STARTUP");
            log.info("Initial CAD operational snapshot saved to file.");
        } catch (Exception e) {
            log.warn("Could not save initial snapshot: {}", e.getMessage());
        }
    }

    /**
     * Builds complete system snapshot object.
     */
    public Map<String, Object> buildSystemSnapshot(String reason) {
        List<Emergency> emergencies = emergencyRepo.findAllByOrderByCreatedAtDesc();
        List<Ambulance> ambulances = ambulanceRepo.findAll();
        List<Hospital> hospitals = hospitalRepo.findAll();
        List<Dispatch> dispatches = dispatchRepo.findAllByOrderByAssignedAtDesc();
        List<AuditLog> auditLogs = auditLogRepo.findAll();

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("systemName", "AEGIS DISPATCH CAD");
        metadata.put("version", "v2.5 PRO");
        metadata.put("snapshotReason", reason != null ? reason : "MANUAL_SAVE");
        metadata.put("exportedAt", Instant.now().toString());
        metadata.put("systemStatus", "OPERATIONAL");
        metadata.put("archiveSignature", UUID.randomUUID().toString());
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
     * Writes snapshot to ./data/aegis_cad_snapshot.json and timestamped archive in ./data/backups/
     */
    public synchronized Map<String, Object> saveSnapshotToFile(String reason) throws IOException {
        ensureDirectories();
        Map<String, Object> snapshot = buildSystemSnapshot(reason);

        // 1. Write latest snapshot
        File latestFile = new File(SNAPSHOT_FILE);
        objectMapper.writeValue(latestFile, snapshot);

        // 2. Write timestamped archive
        String timestamp = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")
                .withZone(ZoneOffset.UTC)
                .format(Instant.now());
        String backupPath = BACKUP_DIR + "/aegis_cad_backup_" + timestamp + ".json";
        File backupFile = new File(backupPath);
        objectMapper.writeValue(backupFile, snapshot);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("message", "All emergency incidents, dispatches, fleet telemetry, hospital capacities, and audit logs successfully saved to file.");
        result.put("snapshotFile", latestFile.getCanonicalPath());
        result.put("backupFile", backupFile.getCanonicalPath());
        result.put("fileSizeBytes", latestFile.length());
        result.put("fileSizeFormatted", String.format("%.2f KB", latestFile.length() / 1024.0));
        result.put("timestamp", Instant.now().toString());
        result.put("recordsSaved", Map.of(
                "emergencies", ((List<?>) snapshot.get("emergencies")).size(),
                "dispatches", ((List<?>) snapshot.get("dispatches")).size(),
                "ambulances", ((List<?>) snapshot.get("ambulances")).size(),
                "hospitals", ((List<?>) snapshot.get("hospitals")).size(),
                "auditLogs", ((List<?>) snapshot.get("auditLogs")).size()
        ));

        log.info("CAD snapshot saved to {} ({} KB)", latestFile.getCanonicalPath(), result.get("fileSizeFormatted"));
        return result;
    }

    /**
     * Exports pretty-printed JSON string for browser file download.
     */
    public String exportFullArchiveJson() throws IOException {
        Map<String, Object> snapshot = buildSystemSnapshot("USER_EXPORT");
        return objectMapper.writeValueAsString(snapshot);
    }

    /**
     * Generates CSV format for tabular incident analysis.
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

    /**
     * Lists all saved snapshot and backup files on server disk.
     */
    public List<Map<String, Object>> listSavedFiles() {
        ensureDirectories();
        List<Map<String, Object>> filesList = new ArrayList<>();

        File dataFolder = new File(DATA_DIR);
        File[] topFiles = dataFolder.listFiles((dir, name) -> name.endsWith(".json") || name.endsWith(".db"));
        if (topFiles != null) {
            for (File f : topFiles) {
                filesList.add(fileToMap(f, "LATEST_SNAPSHOT"));
            }
        }

        File backupFolder = new File(BACKUP_DIR);
        File[] backupFiles = backupFolder.listFiles((dir, name) -> name.endsWith(".json"));
        if (backupFiles != null) {
            Arrays.sort(backupFiles, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));
            for (File f : backupFiles) {
                filesList.add(fileToMap(f, "HISTORICAL_BACKUP"));
            }
        }

        return filesList;
    }

    private Map<String, Object> fileToMap(File f, String category) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("fileName", f.getName());
        m.put("category", category);
        m.put("path", f.getPath());
        m.put("sizeBytes", f.length());
        m.put("sizeFormatted", String.format("%.2f KB", f.length() / 1024.0));
        m.put("lastModified", Instant.ofEpochMilli(f.lastModified()).toString());
        return m;
    }
}
