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
                "citizenProfile", result.citizenProfile() != null ? result.citizenProfile() : Map.of()
        ));
    }
}
