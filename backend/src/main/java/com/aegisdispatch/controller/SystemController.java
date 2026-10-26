package com.aegisdispatch.controller;

import com.aegisdispatch.service.CadFileService;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
public class SystemController {

    private final CadFileService fileService;
    private final Environment environment;
    private final DispatchController dispatchController;

    public SystemController(CadFileService fileService, Environment environment, DispatchController dispatchController) {
        this.fileService = fileService;
        this.environment = environment;
        this.dispatchController = dispatchController;
    }

    /**
     * Resets simulation data - ONLY allowed when Spring profile is "demo".
     */
    @PostMapping("/reset")
    public ResponseEntity<?> resetSystem() {
        boolean isDemo = Arrays.asList(environment.getActiveProfiles()).contains("demo") ||
                         Arrays.asList(environment.getDefaultProfiles()).contains("demo");
        if (!isDemo) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "System reset is only available when running with the 'demo' profile."));
        }
        return ResponseEntity.ok(dispatchController.reset());
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
}
