package com.aegisdispatch.controller;

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

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final CadFileService fileService;

    public AnalyticsController(CadFileService fileService) {
        this.fileService = fileService;
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
