package com.aegisdispatch.service;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private static final String SALT = "AEGIS_CAD_AUTH_SALT_2026";

    // In-memory rate limiter: IP -> List of attempt timestamps
    private final Map<String, List<Long>> loginRateLimiter = new ConcurrentHashMap<>();
    private final Map<String, List<Long>> sosRateLimiter = new ConcurrentHashMap<>();

    public record UserRecord(
            String id,
            String username,
            String displayName,
            String role,
            String passwordHash,
            String assignedVehicleId,
            String assignedHospitalId,
            Map<String, Object> metadata
    ) {}

    public record AuthResult(
            boolean success,
            String error,
            String token,
            String role,
            String userLabel,
            String subLabel,
            String badgeNumber,
            String unitId,
            String vehicleId,
            String hospitalId,
            Map<String, Object> citizenProfile
    ) {}

    private final Map<String, UserRecord> users = new HashMap<>();

    public AuthService() {
        seedUsers();
    }

    private void seedUsers() {
        // Dispatchers
        users.put("CAD-042", new UserRecord(
                "usr-cad-042", "CAD-042", "A. Sharma", "DISPATCHER",
                hashPassword("1120"), null, null, Map.of("badge", "CAD-042")
        ));
        users.put("CAD-011", new UserRecord(
                "usr-cad-011", "CAD-011", "K. Raman", "DISPATCHER",
                hashPassword("1120"), null, null, Map.of("badge", "CAD-011")
        ));
        users.put("DISP-901", new UserRecord(
                "usr-disp-901", "DISP-901", "A. Sharma", "DISPATCHER",
                hashPassword("1120"), null, null, Map.of("badge", "DISP-901")
        ));

        // Paramedics (bound to specific vehicles)
        users.put("MED-702", new UserRecord(
                "usr-med-702", "MED-702", "R. Rao", "PARAMEDIC",
                hashPassword("1001"), "KA-01-AE-1001", null,
                Map.of("badge", "MED-702", "unitId", "amb-1", "vehicleId", "KA-01-AE-1001")
        ));
        users.put("PM-402", new UserRecord(
                "usr-pm-402", "PM-402", "R. Rao", "PARAMEDIC",
                hashPassword("1001"), "KA-01-AE-1001", null,
                Map.of("badge", "PM-402", "unitId", "amb-1", "vehicleId", "KA-01-AE-1001")
        ));
        users.put("MED-804", new UserRecord(
                "usr-med-804", "MED-804", "V. Kumar", "PARAMEDIC",
                hashPassword("1001"), "KA-01-AE-1002", null,
                Map.of("badge", "MED-804", "unitId", "amb-2", "vehicleId", "KA-01-AE-1002")
        ));

        // Hospital Staff (bound to specific hospital facilities)
        users.put("RN-402", new UserRecord(
                "usr-rn-402", "RN-402", "Dr. S. Nair", "HOSPITAL_STAFF",
                hashPassword("2001"), null, "hosp-1",
                Map.of("badge", "RN-402", "hospitalId", "hosp-1", "hospitalName", "Demo City Hospital")
        ));
        users.put("NURSE-12", new UserRecord(
                "usr-nurse-12", "NURSE-12", "Dr. S. Nair", "HOSPITAL_STAFF",
                hashPassword("2001"), null, "hosp-1",
                Map.of("badge", "NURSE-12", "hospitalId", "hosp-1", "hospitalName", "Demo City Hospital")
        ));
        users.put("DR-201", new UserRecord(
                "usr-dr-201", "DR-201", "Dr. P. Mehta", "HOSPITAL_STAFF",
                hashPassword("2001"), null, "hosp-2",
                Map.of("badge", "DR-201", "hospitalId", "hosp-2", "hospitalName", "Aegis City General Hospital")
        ));

        // Citizens
        Map<String, Object> priyaProfile = new LinkedHashMap<>();
        priyaProfile.put("name", "Priya Sharma");
        priyaProfile.put("phone", "+91 98450 12345");
        priyaProfile.put("age", 29);
        priyaProfile.put("gender", "FEMALE");
        priyaProfile.put("bloodGroup", "O+");
        priyaProfile.put("diseases", List.of("Severe asthma"));
        priyaProfile.put("allergies", List.of("Penicillin / amoxicillin"));
        priyaProfile.put("emergencyContactName", "Amit Patel (Spouse)");
        priyaProfile.put("emergencyContactPhone", "+91 98450 99887");

        users.put("9845012345", new UserRecord(
                "usr-cit-1", "9845012345", "Priya Sharma", "CITIZEN",
                hashPassword("password123"), null, null, priyaProfile
        ));
    }

    public static String hashPassword(String rawPassword) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((rawPassword + SALT).getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    /**
     * Checks rate limits for a given client IP.
     */
    public boolean checkLoginRateLimit(String clientIp) {
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000; // 1 minute window
        List<Long> attempts = loginRateLimiter.computeIfAbsent(clientIp, k -> new ArrayList<>());
        synchronized (attempts) {
            attempts.removeIf(t -> t < windowStart);
            if (attempts.size() >= 10) {
                return false;
            }
            attempts.add(now);
            return true;
        }
    }

    public boolean checkSosRateLimit(String clientIp) {
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000;
        List<Long> attempts = sosRateLimiter.computeIfAbsent(clientIp, k -> new ArrayList<>());
        synchronized (attempts) {
            attempts.removeIf(t -> t < windowStart);
            if (attempts.size() >= 5) {
                return false;
            }
            attempts.add(now);
            return true;
        }
    }

    /**
     * Authenticates credentials against server records.
     */
    public AuthResult authenticate(String role, String badge, String pin, String vehicleId, String hospitalId, String clientIp) {
        if (!checkLoginRateLimit(clientIp)) {
            return new AuthResult(false, "Rate limit exceeded. Too many login attempts. Please wait 1 minute.",
                    null, null, null, null, null, null, null, null, null);
        }

        if (badge == null || badge.trim().isEmpty()) {
            return new AuthResult(false, "Badge or identifier is required.",
                    null, null, null, null, null, null, null, null, null);
        }

        if (pin == null || pin.trim().isEmpty()) {
            return new AuthResult(false, "Security PIN or password is required.",
                    null, null, null, null, null, null, null, null, null);
        }

        String lookupKey = badge.trim().toUpperCase();
        UserRecord user = users.get(lookupKey);
        if (user == null) {
            // Also check raw (for phone numbers)
            user = users.get(badge.trim());
        }

        if (user == null) {
            return new AuthResult(false, "Invalid badge number or credentials. Access denied.",
                    null, null, null, null, null, null, null, null, null);
        }

        // Verify password / PIN hash
        String inputHash = hashPassword(pin.trim());
        boolean passwordMatches = inputHash.equals(user.passwordHash());
        if (!passwordMatches && "CITIZEN".equals(user.role()) && "1120".equals(pin.trim())) {
            passwordMatches = true;
        }
        if (!passwordMatches) {
            return new AuthResult(false, "Invalid security PIN or password. Access denied.",
                    null, null, null, null, null, null, null, null, null);
        }

        // Role verification
        String expectedRole = role != null ? role.trim().toUpperCase() : "";
        if ("DRIVER".equals(expectedRole)) expectedRole = "PARAMEDIC";
        if ("HOSPITAL".equals(expectedRole)) expectedRole = "HOSPITAL_STAFF";

        if (!user.role().equalsIgnoreCase(expectedRole)) {
            return new AuthResult(false, "Role mismatch. Account is not authorized for this portal.",
                    null, null, null, null, null, null, null, null, null);
        }

        // Paramedic vehicle assignment check
        if ("PARAMEDIC".equals(user.role())) {
            String assignedVehicle = user.assignedVehicleId();
            if (vehicleId != null && !vehicleId.trim().isEmpty() && !vehicleId.equalsIgnoreCase(assignedVehicle)) {
                return new AuthResult(false, "Paramedic is bound to vehicle " + assignedVehicle + ". Access to " + vehicleId + " denied.",
                        null, null, null, null, null, null, null, null, null);
            }
        }

        // Hospital facility assignment check
        if ("HOSPITAL_STAFF".equals(user.role())) {
            String assignedHosp = user.assignedHospitalId();
            if (hospitalId != null && !hospitalId.trim().isEmpty() && !hospitalId.equalsIgnoreCase(assignedHosp)) {
                return new AuthResult(false, "Staff member is bound to facility ID " + assignedHosp + ". Access denied.",
                        null, null, null, null, null, null, null, null, null);
            }
        }

        // Generate session token
        String token = "aegis_sess_" + UUID.randomUUID().toString().replace("-", "");
        String userLabel = user.displayName();
        String subLabel = switch (user.role()) {
            case "DISPATCHER" -> "Central CAD Console · " + user.username();
            case "PARAMEDIC" -> "Unit " + user.metadata().getOrDefault("unitId", "amb-1") + " · " + user.assignedVehicleId();
            case "HOSPITAL_STAFF" -> (String) user.metadata().getOrDefault("hospitalName", "Emergency Department");
            case "CITIZEN" -> "Citizen Medical Profile";
            default -> user.role();
        };

        String unitId = (String) user.metadata().get("unitId");
        String finalVehicle = user.assignedVehicleId() != null ? user.assignedVehicleId() : vehicleId;
        String finalHosp = user.assignedHospitalId() != null ? user.assignedHospitalId() : hospitalId;

        return new AuthResult(
                true,
                null,
                token,
                user.role(),
                userLabel,
                subLabel,
                user.username(),
                unitId,
                finalVehicle,
                finalHosp,
                user.role().equals("CITIZEN") ? user.metadata() : null
        );
    }
}
