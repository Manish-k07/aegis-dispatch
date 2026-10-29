package com.aegisdispatch.controller;

import com.aegisdispatch.service.AuthService;
import com.aegisdispatch.service.GoogleTokenVerifier;
import com.aegisdispatch.service.JwtService;
import com.aegisdispatch.service.OtpService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;

    public AuthController(AuthService authService, OtpService otpService, JwtService jwtService, GoogleTokenVerifier googleTokenVerifier) {
        this.authService = authService;
        this.otpService = otpService;
        this.jwtService = jwtService;
        this.googleTokenVerifier = googleTokenVerifier;
    }

    /**
     * GET /api/auth/providers
     * Public, unauthenticated endpoint exposing supported citizen auth providers.
     */
    @GetMapping("/api/auth/providers")
    public ResponseEntity<?> getAuthProviders() {
        Map<String, Object> providers = new HashMap<>();
        providers.put("otp", true);
        providers.put("google", googleTokenVerifier.isConfigured());
        providers.put("googleClientId", googleTokenVerifier.getConfiguredClientId());
        providers.put("emailOtp", otpService.isEmailServiceAvailable());
        return ResponseEntity.ok(providers);
    }

    /**
     * Standard Login (Badge/Username + Password)
     */
    @PostMapping("/api/auth/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String clientIp = extractClientIp(request);

        String role = body.getOrDefault("role", "");
        String badge = body.get("badgeNumber");
        if (badge == null || badge.isBlank()) badge = body.get("loginId");
        if (badge == null || badge.isBlank()) badge = body.get("username");

        String pin = body.get("pin");
        if (pin == null || pin.isBlank()) pin = body.get("password");

        String vehicleId = body.get("vehicleId");
        String hospitalId = body.get("hospitalId");

        AuthService.AuthResult result = authService.authenticate(role, badge, pin, vehicleId, hospitalId, clientIp);

        if (!result.success()) {
            if (result.error() != null && result.error().contains("Rate limit exceeded")) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", result.error()));
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", result.error()));
        }

        return ResponseEntity.ok(mapAuthResult(result));
    }

    /**
     * Citizen Self-Registration with Password
     */
    @PostMapping("/api/auth/register")
    public ResponseEntity<?> registerCitizen(@RequestBody Map<String, Object> body) {
        String registrationToken = (String) body.get("registrationToken");
        String phone = (String) body.get("phone");
        String password = (String) body.get("password");
        String fullName = (String) body.get("fullName");
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) (body.get("profile") != null ? body.get("profile") : body.get("medicalProfile"));

        AuthService.AuthResult result = authService.registerCitizen(registrationToken, phone, password, fullName, profile);
        if (!result.success()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", result.error()));
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(mapAuthResult(result));
    }

    /**
     * POST /api/auth/otp/request
     */
    @PostMapping({"/api/auth/otp/request", "/api/auth/otp/send"})
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String phone = body.get("phone");
        String clientIp = extractClientIp(request);

        OtpService.OtpRequestResult result = otpService.requestOtp(phone, clientIp);
        if (!result.success()) {
            return ResponseEntity.status(result.httpStatus()).body(Map.of("message", result.message(), "error", result.message()));
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("message", result.message());
        resp.put("resendInSeconds", result.resendInSeconds());
        if (result.devOtp() != null) {
            resp.put("devOtp", result.devOtp());
        }
        return ResponseEntity.ok(resp);
    }

    /**
     * POST /api/auth/otp/verify
     * For existing user: returns login payload with status="LOGGED_IN".
     * For new phone: returns status="NEW_USER" with registrationToken.
     */
    @PostMapping("/api/auth/otp/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String phone = body.get("phone");
        String otp = body.get("otp");
        String fullName = body.get("fullName");
        String clientIp = extractClientIp(request);

        AuthService.AuthResult result = authService.authenticateWithOtp(phone, otp, fullName, clientIp);
        if (!result.success()) {
            int code = (result.error() != null && result.error().contains("Too many incorrect attempts")) ? 429 : 401;
            return ResponseEntity.status(code).body(Map.of("error", result.error()));
        }

        if ("NEW_USER".equals(result.status())) {
            return ResponseEntity.ok(Map.of(
                    "status", "NEW_USER",
                    "registrationToken", result.registrationToken()
            ));
        }

        return ResponseEntity.ok(mapAuthResult(result));
    }

    /**
     * POST /api/auth/otp/register
     * Completes registration for new phone OTP citizen with mandatory/optional profile.
     */
    @PostMapping("/api/auth/otp/register")
    public ResponseEntity<?> registerWithOtp(@RequestBody Map<String, Object> body) {
        String registrationToken = (String) body.get("registrationToken");
        String fullName = (String) body.get("fullName");
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) body.get("profile");

        AuthService.AuthResult result = authService.registerCitizenWithOtp(registrationToken, fullName, profile);
        if (!result.success()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", result.error()));
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(mapAuthResult(result));
    }

    /**
     * POST /api/auth/google
     */
    @PostMapping("/api/auth/google")
    public ResponseEntity<?> googleAuth(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String idToken = body.get("idToken");
        if (idToken == null || idToken.isBlank()) {
            idToken = body.get("credential");
        }

        if (idToken != null && (idToken.startsWith("mock:") || idToken.startsWith("demo:"))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Mock or demo Google tokens are not permitted on the server."));
        }

        if (!googleTokenVerifier.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Google sign-in is not configured on the server."));
        }

        String clientIp = extractClientIp(request);
        AuthService.GoogleAuthResponse response = authService.authenticateWithGoogle(idToken, clientIp);

        if (!response.success()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", response.error()));
        }

        if ("EMAIL_VERIFICATION_REQUIRED".equals(response.status())) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "EMAIL_VERIFICATION_REQUIRED");
            resp.put("verificationToken", response.verificationToken());
            resp.put("maskedEmail", response.maskedEmail());
            return ResponseEntity.ok(resp);
        }

        if ("NEW_USER".equals(response.status())) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "NEW_USER");
            resp.put("registrationToken", response.registrationToken());
            return ResponseEntity.ok(resp);
        }

        return ResponseEntity.ok(mapAuthResult(response.authResult()));
    }

    /**
     * POST /api/auth/google/email-otp/resend
     */
    @PostMapping("/api/auth/google/email-otp/resend")
    public ResponseEntity<?> resendGoogleEmailOtp(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String verificationToken = body.get("verificationToken");
        String clientIp = extractClientIp(request);
        OtpService.OtpRequestResult result = authService.resendGoogleEmailOtp(verificationToken, clientIp);
        if (!result.success()) {
            return ResponseEntity.status(result.httpStatus()).body(Map.of("message", result.message(), "error", result.message()));
        }
        Map<String, Object> resp = new HashMap<>();
        resp.put("message", result.message());
        resp.put("resendInSeconds", result.resendInSeconds());
        if (result.devOtp() != null) resp.put("devOtp", result.devOtp());
        return ResponseEntity.ok(resp);
    }

    /**
     * POST /api/auth/google/verify-email
     */
    @PostMapping("/api/auth/google/verify-email")
    public ResponseEntity<?> verifyGoogleEmail(@RequestBody Map<String, String> body) {
        String verificationToken = body.get("verificationToken");
        String otp = body.get("otp");
        if (otp == null || otp.isBlank()) otp = body.get("code");

        AuthService.GoogleAuthResponse response = authService.verifyGoogleEmail(verificationToken, otp);
        if (!response.success()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", response.error()));
        }

        if ("NEW_USER".equals(response.status())) {
            return ResponseEntity.ok(Map.of("status", "NEW_USER", "registrationToken", response.registrationToken()));
        }

        return ResponseEntity.ok(mapAuthResult(response.authResult()));
    }

    /**
     * POST /api/auth/google/register and /api/auth/google/complete
     */
    @PostMapping({"/api/auth/google/register", "/api/auth/google/complete"})
    public ResponseEntity<?> googleRegister(@RequestBody Map<String, Object> body) {
        String ticket = (String) body.get("registrationToken");
        if (ticket == null || ticket.isBlank()) {
            ticket = (String) body.get("registrationTicket");
        }
        String fullName = (String) body.get("fullName");
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) (body.get("profile") != null ? body.get("profile") : body.get("medicalProfile"));

        AuthService.AuthResult res = authService.registerCitizenWithGoogle(ticket, fullName, profile);
        if (!res.success()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", res.error()));
        }

        return ResponseEntity.ok(mapAuthResult(res));
    }

    /**
     * GET /api/auth/profile
     * Returns authenticated citizen's current profile from server single-source-of-truth.
     */
    @GetMapping({"/api/auth/profile", "/api/citizen/profile"})
    public ResponseEntity<?> getCitizenProfile(HttpServletRequest request) {
        Map<String, Object> claims = extractClaimsFromToken(request);
        if (claims == null || claims.get("sub") == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Missing or invalid authorization token."));
        }

        String role = claims.get("role") != null ? claims.get("role").toString() : "";
        if (!"CITIZEN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only citizen accounts possess a citizen profile."));
        }

        String username = claims.get("sub").toString();
        Map<String, Object> profile = authService.getCitizenProfile(username);
        if (profile == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Account is disabled or profile not found."));
        }

        return ResponseEntity.ok(profile);
    }

    /**
     * PUT /api/auth/profile and /api/citizen/profile
     * Updates citizen medical and personal profile with validation and optimistic concurrency.
     */
    @RequestMapping(value = {"/api/auth/profile", "/api/citizen/profile"}, method = {RequestMethod.PUT, RequestMethod.POST})
    public ResponseEntity<?> updateCitizenProfile(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> claims = extractClaimsFromToken(request);
        if (claims == null || claims.get("sub") == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Missing or invalid authorization token."));
        }

        String role = claims.get("role") != null ? claims.get("role").toString() : "";
        if (!"CITIZEN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only citizen accounts possess a citizen profile."));
        }

        String username = claims.get("sub").toString();

        // Strip and ignore immutable/privileged account fields from client body
        Map<String, Object> sanitizedInput = new LinkedHashMap<>(body != null ? body : Map.of());
        sanitizedInput.remove("id");
        sanitizedInput.remove("phone");
        sanitizedInput.remove("role");
        sanitizedInput.remove("registeredAt");
        sanitizedInput.remove("authProvider");
        sanitizedInput.remove("googleSub");
        sanitizedInput.remove("phone_verified");
        sanitizedInput.remove("phoneVerified");
        sanitizedInput.remove("email_verified");
        sanitizedInput.remove("emailVerified");
        sanitizedInput.remove("username");

        Integer expectedVersion = null;
        Object v = sanitizedInput.get("expectedVersion");
        if (v instanceof Number) expectedVersion = ((Number) v).intValue();
        else if (v != null) {
            try { expectedVersion = Integer.parseInt(v.toString()); } catch (Exception ignored) {}
        }

        AuthService.ProfileUpdateResult result = authService.updateCitizenProfile(username, sanitizedInput, expectedVersion);

        if (result.status() == 200) {
            return ResponseEntity.ok(result.profile());
        } else {
            return ResponseEntity.status(result.status()).body(result.errorOrErrors());
        }
    }

    @PostMapping("/api/auth/change-password")
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

    @PostMapping("/api/auth/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String otp = body.get("otp");
        String newPassword = body.get("newPassword");

        if (phone == null || phone.isBlank() || otp == null || otp.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Phone number, OTP, and new password are required."));
        }

        AuthService.AuthResult result = authService.resetPassword(phone, otp, newPassword);
        if (!result.success()) {
            return ResponseEntity.badRequest().body(Map.of("error", result.errorMessage() != null ? result.errorMessage() : "Password reset failed."));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", result.errorMessage() != null ? result.errorMessage() : "Password reset successfully. You can now log in with your new password."
        ));
    }

    private Map<String, Object> extractClaimsFromToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            return jwtService.validateAndExtractClaims(token);
        }
        return null;
    }

    private static String extractClientIp(HttpServletRequest request) {
        String clientIp = request.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = request.getRemoteAddr();
        }
        return clientIp;
    }

    private static Map<String, Object> mapAuthResult(AuthService.AuthResult res) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("status", res.status() != null ? res.status() : "SUCCESS");
        resp.put("token", res.token());
        resp.put("role", res.role());
        resp.put("userLabel", res.userLabel());
        resp.put("subLabel", res.subLabel() != null ? res.subLabel() : "");
        resp.put("badgeNumber", res.badgeNumber() != null ? res.badgeNumber() : "");
        resp.put("unitId", res.unitId() != null ? res.unitId() : "");
        resp.put("vehicleId", res.vehicleId() != null ? res.vehicleId() : "");
        resp.put("hospitalId", res.hospitalId() != null ? res.hospitalId() : "");
        resp.put("forcePasswordChange", res.forcePasswordChange());
        resp.put("citizenProfile", res.citizenProfile() != null ? res.citizenProfile() : Map.of());
        resp.put("profileComplete", res.profileComplete());
        return resp;
    }
}
