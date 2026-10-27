package com.aegisdispatch.controller;

import com.aegisdispatch.model.Ambulance;
import com.aegisdispatch.model.Hospital;
import com.aegisdispatch.model.User;
import com.aegisdispatch.repository.AmbulanceRepository;
import com.aegisdispatch.repository.DispatchRepository;
import com.aegisdispatch.repository.HospitalRepository;
import com.aegisdispatch.repository.UserRepository;
import com.aegisdispatch.service.AuditService;
import com.aegisdispatch.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final AmbulanceRepository ambulanceRepository;
    private final HospitalRepository hospitalRepository;
    private final DispatchRepository dispatchRepository;
    private final JwtService jwtService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AdminController(UserRepository userRepository,
                           AmbulanceRepository ambulanceRepository,
                           HospitalRepository hospitalRepository,
                           DispatchRepository dispatchRepository,
                           JwtService jwtService,
                           AuditService auditService) {
        this.userRepository = userRepository;
        this.ambulanceRepository = ambulanceRepository;
        this.hospitalRepository = hospitalRepository;
        this.dispatchRepository = dispatchRepository;
        this.jwtService = jwtService;
        this.auditService = auditService;
    }

    private Map<String, Object> getClaims(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        return jwtService.validateAndExtractClaims(token);
    }

    private boolean isAdmin(String authHeader) {
        Map<String, Object> claims = getClaims(authHeader);
        if (claims == null) return false;
        return "ADMIN".equalsIgnoreCase((String) claims.get("role"));
    }

    private String getCallerUsername(String authHeader) {
        Map<String, Object> claims = getClaims(authHeader);
        if (claims == null) return "system";
        String sub = (String) claims.get("sub");
        if (sub != null && !sub.isBlank()) return sub;
        String username = (String) claims.get("username");
        return username != null ? username : "system";
    }

    // ----------------------------------------------------
    // User Management
    // ----------------------------------------------------
    @GetMapping("/users")
    public ResponseEntity<?> listUsers(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> safeUsers = users.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("role", u.getRole());
            m.put("fullName", u.getFullName());
            m.put("phone", u.getPhone());
            m.put("assignedVehicleId", u.getAssignedVehicleId());
            m.put("assignedHospitalId", u.getAssignedHospitalId());
            m.put("forcePasswordChange", u.isForcePasswordChange());
            m.put("enabled", u.isEnabled());
            m.put("createdAt", u.getCreatedAt());
            return m;
        }).toList();

        return ResponseEntity.ok(safeUsers);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                        @RequestBody Map<String, String> body) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }

        String username = body.get("username");
        String password = body.get("password");
        String role = body.get("role");
        String fullName = body.get("fullName");
        String phone = body.get("phone");
        String assignedVehicleId = body.get("assignedVehicleId");
        String assignedHospitalId = body.get("assignedHospitalId");

        if (username == null || username.isBlank() || password == null || password.isBlank() || role == null || role.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "username, password, and role are required"));
        }

        if (userRepository.findByUsername(username.trim()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Username already exists"));
        }

        User u = new User(
                UUID.randomUUID(),
                username.trim(),
                JwtService.hashPassword(password.trim()),
                role.trim().toUpperCase(),
                fullName != null ? fullName.trim() : username,
                phone != null ? phone.trim() : null
        );
        u.setAssignedVehicleId(assignedVehicleId != null && !assignedVehicleId.isBlank() ? assignedVehicleId.trim() : null);
        u.setAssignedHospitalId(assignedHospitalId != null && !assignedHospitalId.isBlank() ? assignedHospitalId.trim() : null);
        u.setForcePasswordChange(Boolean.parseBoolean(body.getOrDefault("forcePasswordChange", "false")));
        u.setEnabled(true);

        User saved = userRepository.save(u);
        String caller = getCallerUsername(authHeader);
        auditService.log(caller, "CREATE", "USER", saved.getId(), null, saved.getUsername(), "Role: " + saved.getRole());

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", saved.getId(),
                "username", saved.getUsername(),
                "role", saved.getRole(),
                "fullName", saved.getFullName(),
                "enabled", saved.isEnabled()
        ));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                        @PathVariable UUID id) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }

        Optional<User> targetOpt = userRepository.findById(id);
        if (targetOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }
        User target = targetOpt.get();

        String caller = getCallerUsername(authHeader);
        Optional<User> callerOpt = userRepository.findByUsername(caller);

        // Safety rule 1: Reject admin self-delete
        if (callerOpt.isPresent() && callerOpt.get().getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Cannot delete your own administrator account"));
        }

        // Safety rule 2: Reject deleting last active administrator
        if ("ADMIN".equalsIgnoreCase(target.getRole())) {
            long adminCount = userRepository.findAll().stream()
                    .filter(u -> "ADMIN".equalsIgnoreCase(u.getRole()))
                    .count();
            if (adminCount <= 1) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Cannot delete the last administrator account"));
            }
        }

        userRepository.deleteById(id);
        auditService.log(caller, "DELETE", "USER", id, target.getUsername(), null, "Role: " + target.getRole());
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }

    @PostMapping("/users/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @PathVariable UUID id) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }

        Optional<User> targetOpt = userRepository.findById(id);
        if (targetOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }
        User target = targetOpt.get();

        String caller = getCallerUsername(authHeader);
        Optional<User> callerOpt = userRepository.findByUsername(caller);

        // If disabling
        if (target.isEnabled()) {
            // Safety rule: Cannot disable self
            if (callerOpt.isPresent() && callerOpt.get().getId().equals(id)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Cannot disable your own administrator account"));
            }
            // Safety rule: Cannot disable last active admin
            if ("ADMIN".equalsIgnoreCase(target.getRole())) {
                long activeAdminCount = userRepository.findAll().stream()
                        .filter(u -> "ADMIN".equalsIgnoreCase(u.getRole()) && u.isEnabled())
                        .count();
                if (activeAdminCount <= 1) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Cannot disable the last active administrator account"));
                }
            }
        }

        boolean newStatus = !target.isEnabled();
        target.setEnabled(newStatus);
        userRepository.save(target);

        auditService.log(caller, "TOGGLE_STATUS", "USER", id, String.valueOf(!newStatus), String.valueOf(newStatus), "User: " + target.getUsername());
        return ResponseEntity.ok(Map.of(
                "id", target.getId(),
                "username", target.getUsername(),
                "enabled", target.isEnabled(),
                "message", newStatus ? "User enabled" : "User disabled"
        ));
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                           @PathVariable UUID id) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }

        Optional<User> targetOpt = userRepository.findById(id);
        if (targetOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }
        User target = targetOpt.get();

        String tempPassword = "Temp@" + UUID.randomUUID().toString().substring(0, 8);
        target.setPasswordHash(JwtService.hashPassword(tempPassword));
        target.setForcePasswordChange(true);
        userRepository.save(target);

        String caller = getCallerUsername(authHeader);
        auditService.log(caller, "RESET_PASSWORD", "USER", id, null, null, "User: " + target.getUsername());

        return ResponseEntity.ok(Map.of(
                "temporaryPassword", tempPassword,
                "message", "Temporary password generated. User will be forced to change password upon next login."
        ));
    }

    // ----------------------------------------------------
    // Ambulance Unit Management
    // ----------------------------------------------------
    @GetMapping("/ambulances")
    public ResponseEntity<?> listAmbulances(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }
        return ResponseEntity.ok(ambulanceRepository.findAll());
    }

    @PostMapping("/ambulances")
    public ResponseEntity<?> createAmbulance(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                            @RequestBody Ambulance ambulance) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }

        if (ambulance.getId() == null) ambulance.setId(UUID.randomUUID());
        if (ambulance.getStatus() == null) ambulance.setStatus("AVAILABLE");
        if (ambulance.getLastLocationAt() == null) ambulance.setLastLocationAt(Instant.now());

        Ambulance saved = ambulanceRepository.save(ambulance);
        String caller = getCallerUsername(authHeader);
        auditService.log(caller, "SAVE", "AMBULANCE", saved.getId(), null, saved.getRegistrationNumber(), "Type: " + saved.getType());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/ambulances/{id}")
    public ResponseEntity<?> deleteAmbulance(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @PathVariable UUID id) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }

        Optional<Ambulance> ambOpt = ambulanceRepository.findById(id);
        if (ambOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Ambulance not found"));
        }
        Ambulance amb = ambOpt.get();

        // Safety Rule 3: Reject deleting unit with active mission
        String status = amb.getStatus();
        boolean isUnitBusy = status != null && (
                status.equalsIgnoreCase("DISPATCHED") ||
                status.equalsIgnoreCase("EN_ROUTE") ||
                status.equalsIgnoreCase("ON_SCENE") ||
                status.equalsIgnoreCase("TRANSPORTING") ||
                status.equalsIgnoreCase("AT_HOSPITAL")
        );

        boolean hasActiveDispatch = dispatchRepository.findAll().stream().anyMatch(d ->
                id.equals(d.getAmbulanceId()) &&
                d.getStatus() != null &&
                !d.getStatus().equalsIgnoreCase("COMPLETED") &&
                !d.getStatus().equalsIgnoreCase("CANCELLED")
        );

        if (isUnitBusy || hasActiveDispatch) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Cannot delete ambulance while assigned to an active mission"));
        }

        ambulanceRepository.deleteById(id);
        String caller = getCallerUsername(authHeader);
        auditService.log(caller, "DELETE", "AMBULANCE", id, amb.getRegistrationNumber(), null, null);
        return ResponseEntity.ok(Map.of("message", "Ambulance deleted successfully"));
    }

    // ----------------------------------------------------
    // Hospital Facility Management
    // ----------------------------------------------------
    @GetMapping("/hospitals")
    public ResponseEntity<?> listHospitals(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }
        return ResponseEntity.ok(hospitalRepository.findAll());
    }

    @PostMapping("/hospitals")
    public ResponseEntity<?> createHospital(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                            @RequestBody Hospital hospital) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }

        if (hospital.getId() == null) hospital.setId(UUID.randomUUID());
        if (hospital.getStatus() == null) hospital.setStatus("AVAILABLE");

        Hospital saved = hospitalRepository.save(hospital);
        String caller = getCallerUsername(authHeader);
        auditService.log(caller, "SAVE", "HOSPITAL", saved.getId(), null, saved.getName(), null);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/hospitals/{id}")
    public ResponseEntity<?> deleteHospital(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @PathVariable UUID id) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }

        Optional<Hospital> hospOpt = hospitalRepository.findById(id);
        if (hospOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Hospital not found"));
        }
        Hospital hosp = hospOpt.get();

        // Safety Rule 4: Reject deleting hospital destination of active incident
        boolean isDestinationOfActiveMission = dispatchRepository.findAll().stream().anyMatch(d ->
                id.equals(d.getHospitalId()) &&
                d.getStatus() != null &&
                !d.getStatus().equalsIgnoreCase("COMPLETED") &&
                !d.getStatus().equalsIgnoreCase("CANCELLED")
        );

        if (isDestinationOfActiveMission) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Cannot delete hospital facility designated as destination for an active incident"));
        }

        hospitalRepository.deleteById(id);
        String caller = getCallerUsername(authHeader);
        auditService.log(caller, "DELETE", "HOSPITAL", id, hosp.getName(), null, null);
        return ResponseEntity.ok(Map.of("message", "Hospital deleted successfully"));
    }
}
