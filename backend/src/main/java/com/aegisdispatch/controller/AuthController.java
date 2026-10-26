package com.aegisdispatch.controller;

import com.aegisdispatch.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String clientIp = request.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = request.getRemoteAddr();
        }

        String role = body.getOrDefault("role", "");
        String badge = body.get("badgeNumber");
        if (badge == null || badge.isBlank()) {
            badge = body.get("loginId");
        }
        if (badge == null || badge.isBlank()) {
            badge = body.get("username");
        }
        String pin = body.get("pin");
        if (pin == null || pin.isBlank()) {
            pin = body.get("password");
        }
        String vehicleId = body.get("vehicleId");
        String hospitalId = body.get("hospitalId");

        AuthService.AuthResult result = authService.authenticate(role, badge, pin, vehicleId, hospitalId, clientIp);

        if (!result.success()) {
            if (result.error() != null && result.error().contains("Rate limit exceeded")) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", result.error()));
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", result.error()));
        }

        return ResponseEntity.ok(Map.of(
                "token", result.token(),
                "role", result.role(),
                "userLabel", result.userLabel(),
                "subLabel", result.subLabel() != null ? result.subLabel() : "",
                "badgeNumber", result.badgeNumber() != null ? result.badgeNumber() : "",
                "unitId", result.unitId() != null ? result.unitId() : "",
                "vehicleId", result.vehicleId() != null ? result.vehicleId() : "",
                "hospitalId", result.hospitalId() != null ? result.hospitalId() : "",
                "forcePasswordChange", result.forcePasswordChange(),
                "citizenProfile", result.citizenProfile() != null ? result.citizenProfile() : Map.of()
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerCitizen(@RequestBody Map<String, Object> body) {
        String phone = (String) body.get("phone");
        String password = (String) body.get("password");
        String fullName = (String) body.get("fullName");
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) body.get("medicalProfile");

        AuthService.AuthResult result = authService.registerCitizen(phone, password, fullName, profile);
        if (!result.success()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", result.error()));
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "token", result.token(),
                "role", result.role(),
                "userLabel", result.userLabel(),
                "subLabel", result.subLabel(),
                "badgeNumber", result.badgeNumber(),
                "citizenProfile", result.citizenProfile() != null ? result.citizenProfile() : Map.of()
        ));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");

        if (username == null || oldPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "username, oldPassword, and newPassword are required"));
        }

        boolean ok = authService.changePassword(username, oldPassword, newPassword);
        if (!ok) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Failed to update password. Please verify your old password and ensure new password is at least 6 characters."));
        }

        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }
}
