package com.aegisdispatch.controller;

import com.aegisdispatch.model.Ambulance;
import com.aegisdispatch.model.Hospital;
import com.aegisdispatch.model.User;
import com.aegisdispatch.repository.AmbulanceRepository;
import com.aegisdispatch.repository.HospitalRepository;
import com.aegisdispatch.repository.UserRepository;
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
    private final JwtService jwtService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AdminController(UserRepository userRepository,
                           AmbulanceRepository ambulanceRepository,
                           HospitalRepository hospitalRepository,
                           JwtService jwtService) {
        this.userRepository = userRepository;
        this.ambulanceRepository = ambulanceRepository;
        this.hospitalRepository = hospitalRepository;
        this.jwtService = jwtService;
    }

    private boolean isAdmin(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return false;
        String token = authHeader.substring(7);
        Map<String, Object> claims = jwtService.validateAndExtractClaims(token);
        if (claims == null) return false;
        return "ADMIN".equalsIgnoreCase((String) claims.get("role"));
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
        // Return without password hashes
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

        User saved = userRepository.save(u);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", saved.getId(),
                "username", saved.getUsername(),
                "role", saved.getRole(),
                "fullName", saved.getFullName()
        ));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                        @PathVariable UUID id) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }

        if (!userRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
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
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/ambulances/{id}")
    public ResponseEntity<?> deleteAmbulance(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                             @PathVariable UUID id) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }
        if (!ambulanceRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Ambulance not found"));
        }
        ambulanceRepository.deleteById(id);
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
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/hospitals/{id}")
    public ResponseEntity<?> deleteHospital(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                            @PathVariable UUID id) {
        if (!isAdmin(authHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin privileges required"));
        }
        if (!hospitalRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Hospital not found"));
        }
        hospitalRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Hospital deleted successfully"));
    }
}
