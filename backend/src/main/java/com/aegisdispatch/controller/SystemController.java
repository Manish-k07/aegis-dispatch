package com.aegisdispatch.controller;

import com.aegisdispatch.service.CadFileService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
@CrossOrigin(origins = "*")
public class SystemController {

    private final CadFileService fileService;

    public SystemController(CadFileService fileService) {
        this.fileService = fileService;
    }

    /**
     * Explicitly saves all system state (emergencies, dispatches, fleet, hospitals, audit logs)
     * into a JSON file on the server disk.
     */
    @PostMapping("/save")
    public ResponseEntity<?> saveToFile(@RequestBody(required = false) Map<String, String> body) {
        try {
            String reason = body != null && body.containsKey("reason") ? body.get("reason") : "OPERATOR_MANUAL_SAVE";
            Map<String, Object> result = fileService.saveSnapshotToFile(reason);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to save system state to file: " + e.getMessage()));
        }
    }

    /**
     * Streams the complete formatted CAD operational state as a downloadable JSON file.
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportJson() {
        try {
            String json = fileService.exportFullArchiveJson();
            byte[] bytes = json.getBytes("UTF-8");

            String timestamp = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")
                    .withZone(ZoneOffset.UTC)
                    .format(Instant.now());
            String filename = "aegis_cad_archive_" + timestamp + ".json";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(bytes.length);

            return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Exports all emergency incidents in tabular CSV format.
     */
    @GetMapping("/export-csv")
    public ResponseEntity<byte[]> exportCsv() {
        try {
            String csv = fileService.exportEmergenciesCsv();
            byte[] bytes = csv.getBytes("UTF-8");

            String timestamp = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")
                    .withZone(ZoneOffset.UTC)
                    .format(Instant.now());
            String filename = "aegis_incidents_" + timestamp + ".csv";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/csv"));
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(bytes.length);

            return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Returns list of saved snapshot and backup files currently on the server disk.
     */
    @GetMapping("/files")
    public ResponseEntity<List<Map<String, Object>>> listFiles() {
        return ResponseEntity.ok(fileService.listSavedFiles());
    }
}
