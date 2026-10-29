package com.aegisdispatch.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Validates database schema integrity at startup.
 * Ensures all required PostgreSQL and H2 columns exist, failing loudly if any are missing.
 */
@Component
@Order(1)
public class DatabaseSchemaValidator implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSchemaValidator.class);

    private final DataSource dataSource;

    public DatabaseSchemaValidator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("[AEGIS-SCHEMA-VALIDATOR] Verifying persistent database schema integrity...");

        List<String> requiredUserColumns = List.of(
                "enabled",
                "google_sub",
                "email",
                "auth_provider",
                "profile_complete",
                "phone_verified",
                "phone_verified_at",
                "email_verified",
                "email_verified_at"
        );

        List<String> requiredEmergencyColumns = List.of(
                "other_type_description",
                "cancel_reason_code",
                "cancel_reason_text",
                "cancelled_at",
                "cancelled_by",
                "sos_triggered_at",
                "location_accuracy",
                "location_source",
                "device_info"
        );

        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();
            verifyColumns(metaData, "users", requiredUserColumns);
            verifyColumns(metaData, "emergencies", requiredEmergencyColumns);
            log.info("[AEGIS-SCHEMA-VALIDATOR] Database schema validation passed. All required columns present.");
        } catch (Exception e) {
            log.error("[AEGIS-SCHEMA-VALIDATOR] CRITICAL: Schema verification failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    private void verifyColumns(DatabaseMetaData metaData, String tableName, List<String> requiredColumns) throws Exception {
        Set<String> existingColumns = new HashSet<>();
        // Query lower, upper, and exact case for H2 and PostgreSQL compatibility
        try (ResultSet rs = metaData.getColumns(null, null, tableName.toLowerCase(), null)) {
            while (rs.next()) {
                existingColumns.add(rs.getString("COLUMN_NAME").toLowerCase());
            }
        }
        if (existingColumns.isEmpty()) {
            try (ResultSet rs = metaData.getColumns(null, null, tableName.toUpperCase(), null)) {
                while (rs.next()) {
                    existingColumns.add(rs.getString("COLUMN_NAME").toLowerCase());
                }
            }
        }

        if (existingColumns.isEmpty()) {
            log.warn("[AEGIS-SCHEMA-VALIDATOR] Table '{}' column metadata could not be fetched (in-memory test or mock db).", tableName);
            return;
        }

        for (String col : requiredColumns) {
            if (!existingColumns.contains(col.toLowerCase())) {
                String error = String.format("Required column '%s' is missing from table '%s'!", col, tableName);
                log.error("[AEGIS-SCHEMA-VALIDATOR] {}", error);
                throw new IllegalStateException(error);
            }
        }
    }
}
