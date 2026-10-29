package com.aegisdispatch.service;

import com.aegisdispatch.model.User;
import com.aegisdispatch.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final AuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // In-memory rate-limiter: key -> list of timestamp ms
    private final Map<String, List<Long>> rateLimits = new ConcurrentHashMap<>();
    private final Map<String, List<Long>> profileUpdateRateLimits = new ConcurrentHashMap<>();

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
            boolean forcePasswordChange,
            Map<String, Object> citizenProfile,
            boolean profileComplete,
            String status,
            String registrationToken
    ) {
        public String errorMessage() {
            return error;
        }

        public AuthResult(boolean success, String error, String token, String role, String userLabel,
                          String subLabel, String badgeNumber, String unitId, String vehicleId,
                          String hospitalId, boolean forcePasswordChange, Map<String, Object> citizenProfile,
                          boolean profileComplete) {
            this(success, error, token, role, userLabel, subLabel, badgeNumber, unitId, vehicleId,
                    hospitalId, forcePasswordChange, citizenProfile, profileComplete,
                    success ? "LOGGED_IN" : null, null);
        }
    }

    public record GoogleAuthResponse(
            boolean success,
            String error,
            String status,
            String verificationToken,
            String registrationToken,
            String maskedEmail,
            AuthResult authResult
    ) {
        public GoogleAuthResponse(boolean success, String error, String status, String verificationToken, String maskedEmail, AuthResult authResult) {
            this(success, error, status, verificationToken, null, maskedEmail, authResult);
        }

        public String registrationTicket() {
            return registrationToken != null ? registrationToken : verificationToken;
        }
    }

    public AuthService(UserRepository userRepository, JwtService jwtService, OtpService otpService,
                       GoogleTokenVerifier googleTokenVerifier, AuditService auditService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.otpService = otpService;
        this.googleTokenVerifier = googleTokenVerifier;
        this.auditService = auditService;
        seedUsersIfEmpty();
    }

    // Default constructor for unit tests
    public AuthService() {
        this.userRepository = new InMemoryUserRepository();
        this.jwtService = new JwtService("aegis-dispatch-super-secure-production-jwt-hmac-sha256-secret-key-2026");
        this.auditService = new AuditService(null) {
            @Override
            public void log(String actor, String action, String type, UUID id, String previous, String next, String metadata) {}
        };
        SmsService dummySms = new SmsService(this.auditService);
        this.otpService = new OtpService(dummySms);
        this.googleTokenVerifier = new GoogleTokenVerifier(this.objectMapper);
        seedUsersIfEmpty();
    }

    private void seedUsersIfEmpty() {
        if (!userRepository.existsByRole("ADMIN")) {
            User admin = new User(UUID.randomUUID(), "admin", JwtService.hashPassword("Aegis@Admin2026!"), "ADMIN", "Dr. A. Sharma (Director)", "+919800000000");
            admin.setPhoneVerified(true);
            userRepository.save(admin);
        }
        if (!userRepository.existsByRole("DISPATCHER")) {
            User disp = new User(UUID.randomUUID(), "D-101", JwtService.hashPassword("Dispatch@2026"), "DISPATCHER", "K. Raman (Chief Dispatcher)", "+919800000001");
            disp.setPhoneVerified(true);
            userRepository.save(disp);
        }
        if (userRepository.findByUsername("CAD-042").isEmpty()) {
            User cad = new User(UUID.randomUUID(), "CAD-042", JwtService.hashPassword("1120"), "DISPATCHER", "A. Sharma", "+919800000001");
            cad.setPhoneVerified(true);
            userRepository.save(cad);
        }
        if (!userRepository.existsByRole("PARAMEDIC")) {
            User driver = new User(UUID.randomUUID(), "KA-01-AE-1001", JwtService.hashPassword("Medic@2026"), "PARAMEDIC", "R. Deshmukh (Paramedic)", "+919800000002");
            driver.setAssignedVehicleId("20000000-0000-0000-0000-000000000001");
            driver.setPhoneVerified(true);
            userRepository.save(driver);
        }
        if (userRepository.findByUsername("MED-702").isEmpty()) {
            User med = new User(UUID.randomUUID(), "MED-702", JwtService.hashPassword("1001"), "PARAMEDIC", "R. Deshmukh", "+919800000002");
            med.setAssignedVehicleId("KA-01-AE-1001");
            med.setPhoneVerified(true);
            userRepository.save(med);
        }
        if (!userRepository.existsByRole("CITIZEN")) {
            User cit = new User(UUID.randomUUID(), "9845012345", JwtService.hashPassword("Citizen@2026"), "CITIZEN", "Priya Sharma", "9845012345");
            cit.setEmail("priya.sharma@example.com");
            cit.setProfileComplete(true);
            cit.setPhoneVerified(true);
            cit.setEmailVerified(true);
            Map<String, Object> profile = new LinkedHashMap<>();
            profile.put("id", "cit-001");
            profile.put("name", "Priya Sharma");
            profile.put("phone", "9845012345");
            profile.put("email", "priya.sharma@example.com");
            profile.put("bloodGroup", "O+");
            profile.put("age", 29);
            profile.put("gender", "FEMALE");
            profile.put("diseases", List.of("Severe asthma"));
            profile.put("chronicConditions", List.of("Severe asthma"));
            profile.put("allergies", List.of("Penicillin / amoxicillin"));
            profile.put("medications", List.of("Salbutamol 100mcg inhaler"));
            profile.put("emergencyContactName", "Amit Patel (Spouse)");
            profile.put("emergencyContactPhone", "+91 98450 99887");
            profile.put("emergencyContacts", List.of(Map.of("name", "Amit Patel (Spouse)", "phone", "+91 98450 99887", "relationship", "Spouse")));
            profile.put("address", "100ft Road, Indiranagar, Bengaluru");
            profile.put("homeAddress", "100ft Road, Indiranagar, Bengaluru");
            profile.put("landmark", "Opposite Metro Pillar 42");
            profile.put("profileVersion", 1);
            profile.put("profileUpdatedAt", Instant.now().toString());
            try {
                cit.setMetadata(objectMapper.writeValueAsString(profile));
            } catch (Exception ignored) {}
            userRepository.save(cit);
        }
    }

    public boolean checkLoginRateLimit(String key) {
        long now = System.currentTimeMillis();
        List<Long> attempts = rateLimits.computeIfAbsent(key, k -> Collections.synchronizedList(new ArrayList<>()));
        synchronized (attempts) {
            attempts.removeIf(time -> now - time > 15 * 60 * 1000); // 15 min window
            if (attempts.size() >= 5) {
                return false;
            }
            attempts.add(now);
            return true;
        }
    }

    public AuthResult authenticate(String role, String badgeOrUsername, String pinOrPassword, String vehicleId, String hospitalId, String clientIp) {
        String rateLimitKey = (clientIp != null ? clientIp : "") + ":" + (badgeOrUsername != null ? badgeOrUsername : "");
        if (!checkLoginRateLimit(rateLimitKey)) {
            return new AuthResult(false, "Rate limit exceeded. Too many failed attempts. Try again in 15 minutes.", null, null, null, null, null, null, null, null, false, null, false);
        }

        if (badgeOrUsername == null || pinOrPassword == null) {
            return new AuthResult(false, "Missing credentials.", null, null, null, null, null, null, null, null, false, null, false);
        }

        Optional<User> userOpt = userRepository.findByUsername(badgeOrUsername.trim());
        if (userOpt.isEmpty() && "CITIZEN".equalsIgnoreCase(role)) {
            String norm = OtpService.normalizePhone(badgeOrUsername);
            if (!norm.isEmpty()) {
                userOpt = userRepository.findByPhone(norm);
            }
        }

        if (userOpt.isEmpty()) {
            return new AuthResult(false, "Invalid badge, username, or credentials.", null, null, null, null, null, null, null, null, false, null, false);
        }

        User user = userOpt.get();
        if (!user.isEnabled()) {
            return new AuthResult(false, "This account has been disabled. Please contact support.", null, null, null, null, null, null, null, null, false, null, false);
        }

        if (role != null && !role.isBlank() && !user.getRole().equalsIgnoreCase(role.trim())) {
            return new AuthResult(false, "Role mismatch for provided credentials.", null, null, null, null, null, null, null, null, false, null, false);
        }

        if (!JwtService.verifyPassword(pinOrPassword.trim(), user.getPasswordHash())) {
            return new AuthResult(false, "Invalid security PIN or credentials.", null, null, null, null, null, null, null, null, false, null, false);
        }

        if ("PARAMEDIC".equalsIgnoreCase(user.getRole()) && vehicleId != null && !vehicleId.isBlank()
                && user.getAssignedVehicleId() != null && !user.getAssignedVehicleId().equalsIgnoreCase(vehicleId.trim())) {
            return new AuthResult(false, "Badge is bound to vehicle " + user.getAssignedVehicleId(), null, null, null, null, null, null, null, null, false, null, false);
        }

        return buildAuthResult(user, vehicleId, hospitalId);
    }

    /**
     * Shared helper that builds an AuthResult for a User.
     */
    private AuthResult buildAuthResult(User user, String vehicleId, String hospitalId) {
        String effectiveVehicle = vehicleId != null ? vehicleId : user.getAssignedVehicleId();
        String effectiveHospital = hospitalId != null ? hospitalId : user.getAssignedHospitalId();

        String token = jwtService.generateToken(user.getUsername(), user.getRole(), user.getFullName(), effectiveVehicle, effectiveHospital);
        String subLabel = switch (user.getRole().toUpperCase()) {
            case "ADMIN" -> "System Administrator";
            case "DISPATCHER" -> "EMS Command Console";
            case "PARAMEDIC" -> "Ambulance Crew (MDT)";
            case "HOSPITAL_STAFF" -> "Emergency Department Triage";
            case "CITIZEN" -> "Citizen Medical Profile";
            default -> user.getRole();
        };

        Map<String, Object> profile = buildCitizenProfile(user);
        boolean isComplete = user.isProfileComplete();

        return new AuthResult(
                true,
                null,
                token,
                user.getRole(),
                user.getFullName(),
                subLabel,
                user.getUsername(),
                user.getUsername(),
                effectiveVehicle,
                effectiveHospital,
                user.isForcePasswordChange(),
                profile,
                isComplete,
                "LOGGED_IN",
                null
        );
    }

    /**
     * Shared helper: builds unified CitizenProfile map from User with version and updatedAt.
     */
    public Map<String, Object> buildCitizenProfile(User user) {
        Map<String, Object> metaMap = new LinkedHashMap<>();
        if (user.getMetadata() != null && !user.getMetadata().isBlank()) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsed = objectMapper.readValue(user.getMetadata(), Map.class);
                if (parsed != null) metaMap.putAll(parsed);
            } catch (Exception ignored) {}
        }

        metaMap.put("id", user.getId().toString());
        metaMap.putIfAbsent("name", user.getFullName());
        metaMap.putIfAbsent("phone", user.getPhone() != null ? user.getPhone() : user.getUsername());
        if (user.getEmail() != null) metaMap.putIfAbsent("email", user.getEmail());
        metaMap.putIfAbsent("gender", "PREFER_NOT_TO_SAY");
        metaMap.putIfAbsent("age", 28);
        metaMap.putIfAbsent("bloodGroup", "Unknown");
        metaMap.putIfAbsent("diseases", new ArrayList<>());
        metaMap.putIfAbsent("chronicConditions", new ArrayList<>());
        metaMap.putIfAbsent("allergies", new ArrayList<>());
        metaMap.putIfAbsent("medications", new ArrayList<>());
        metaMap.putIfAbsent("homeAddress", metaMap.getOrDefault("address", ""));
        metaMap.putIfAbsent("medicalNotes", metaMap.getOrDefault("otherMedicalNotes", ""));
        metaMap.putIfAbsent("profileComplete", user.isProfileComplete());
        metaMap.put("phoneVerified", user.isPhoneVerified());
        metaMap.put("emailVerified", user.isEmailVerified());

        Object ver = metaMap.get("profileVersion");
        metaMap.put("version", ver instanceof Number ? ((Number) ver).intValue() : 1);
        metaMap.putIfAbsent("updatedAt", user.getCreatedAt().toString());
        return metaMap;
    }

    public AuthResult registerCitizen(String registrationToken, String phone, String password, String fullName, Map<String, Object> medicalProfile) {
        if (registrationToken == null || registrationToken.isBlank()) {
            return new AuthResult(false, "Phone verification is required before registration. Please verify your phone number via OTP.", null, null, null, null, null, null, null, null, false, null, false);
        }

        Map<String, Object> claims = jwtService.validateRegistrationToken(registrationToken, "REGISTER");
        if (claims == null) {
            return new AuthResult(false, "Invalid or expired registration token. Please verify your phone number again.", null, null, null, null, null, null, null, null, false, null, false);
        }

        String cleanPhone = (String) claims.get("phone");
        if (cleanPhone == null || cleanPhone.length() != 10) {
            return new AuthResult(false, "Invalid phone number in registration token.", null, null, null, null, null, null, null, null, false, null, false);
        }
        if (password == null || password.trim().length() < 6) {
            return new AuthResult(false, "Password must be at least 6 characters.", null, null, null, null, null, null, null, null, false, null, false);
        }

        Optional<User> existing = userRepository.findByUsername(cleanPhone);
        if (existing.isEmpty()) {
            existing = userRepository.findByPhone(cleanPhone);
        }
        if (existing.isPresent()) {
            return new AuthResult(false, "An account with this phone number already exists.", null, null, null, null, null, null, null, null, false, null, false);
        }

        String name = (fullName != null && !fullName.isBlank()) ? fullName.trim() : "Citizen User";
        User user = new User(UUID.randomUUID(), cleanPhone, JwtService.hashPassword(password.trim()), "CITIZEN", name, cleanPhone);
        user.setAuthProvider("PASSWORD");
        user.setPhoneVerified(true);
        user.setPhoneVerifiedAt(Instant.now());

        Map<String, Object> meta = (medicalProfile != null) ? new LinkedHashMap<>(medicalProfile) : new LinkedHashMap<>();
        meta.put("name", name);
        meta.put("phone", cleanPhone);
        meta.put("profileVersion", 1);
        meta.put("profileUpdatedAt", Instant.now().toString());
        user.setProfileComplete(medicalProfile != null && !medicalProfile.isEmpty());

        try {
            user.setMetadata(objectMapper.writeValueAsString(meta));
        } catch (Exception ignored) {}

        userRepository.save(user);
        auditService.log(name, "CITIZEN_REGISTERED_PASSWORD", "USER", user.getId(), null, "ACTIVE", "phone=" + cleanPhone);
        return buildAuthResult(user, null, null);
    }

    public AuthResult registerCitizen(String phone, String password, String fullName, Map<String, Object> medicalProfile) {
        return registerCitizen(null, phone, password, fullName, medicalProfile);
    }

    /**
     * Authenticate with Phone + OTP (Part 1 + Part 2 F1)
     * For existing citizen: returns status="LOGGED_IN" with token.
     * For new phone: returns status="NEW_USER" with registrationToken.
     */
    public AuthResult authenticateWithOtp(String phone, String otp, String fullName, String clientIp) {
        String cleanPhone = OtpService.normalizePhone(phone);
        if (!OtpService.isValidIndianMobile(cleanPhone)) {
            return new AuthResult(false, "Invalid 10-digit mobile number.", null, null, null, null, null, null, null, null, false, null, false);
        }

        OtpService.OtpVerifyResult verifyResult = otpService.verifyOtpWithDetails(cleanPhone, otp);
        if (!verifyResult.success()) {
            return new AuthResult(false, verifyResult.error(), null, null, null, null, null, null, null, null, false, null, false);
        }

        // Look up by phone
        Optional<User> userOpt = userRepository.findByPhone(cleanPhone);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(cleanPhone);
        }

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Rule 1: Non-citizen accounts can NEVER be authenticated via citizen OTP
            if (!"CITIZEN".equalsIgnoreCase(user.getRole())) {
                log.warn("[AEGIS-AUTH] Unauthorized attempt to access staff account via citizen OTP: {}", cleanPhone);
                return new AuthResult(false, "Invalid credentials.", null, null, null, null, null, null, null, null, false, null, false);
            }
            if (!user.isEnabled()) {
                return new AuthResult(false, "This account has been disabled.", null, null, null, null, null, null, null, null, false, null, false);
            }
            user.setPhoneVerified(true);
            user.setPhoneVerifiedAt(Instant.now());
            userRepository.save(user);
            return buildAuthResult(user, null, null);
        }

        // New user: Do NOT create user yet! (Part 2 F1)
        String regToken = jwtService.generateOtpRegistrationToken(cleanPhone);
        return new AuthResult(
                true,
                null,
                null,
                "CITIZEN",
                fullName != null ? fullName : "Citizen",
                "Citizen Medical Profile",
                cleanPhone,
                null,
                null,
                null,
                false,
                null,
                false,
                "NEW_USER",
                regToken
        );
    }

    /**
     * Complete registration for new phone OTP citizen (Part 2 F1 & F2)
     */
    @Transactional
    public AuthResult registerCitizenWithOtp(String registrationToken, String fullName, Map<String, Object> profile) {
        Map<String, Object> claims = jwtService.validateRegistrationToken(registrationToken, "REGISTER");
        if (claims == null) {
            return new AuthResult(false, "Invalid, expired, or tampered registration token.", null, null, null, null, null, null, null, null, false, null, false);
        }

        String phone = (String) claims.get("phone");
        String cleanPhone = OtpService.normalizePhone(phone);

        // Verify account not already created
        Optional<User> existing = userRepository.findByPhone(cleanPhone);
        if (existing.isEmpty()) {
            existing = userRepository.findByUsername(cleanPhone);
        }
        if (existing.isPresent()) {
            User user = existing.get();
            if (!"CITIZEN".equalsIgnoreCase(user.getRole())) {
                return new AuthResult(false, "Registration failed.", null, null, null, null, null, null, null, null, false, null, false);
            }
            return buildAuthResult(user, null, null);
        }

        String name = (fullName != null && !fullName.isBlank()) ? fullName.trim() : "Citizen User";
        User user = new User(UUID.randomUUID(), cleanPhone, JwtService.hashPassword(UUID.randomUUID().toString()), "CITIZEN", name, cleanPhone);
        user.setAuthProvider("OTP");
        user.setPhoneVerified(true);
        user.setPhoneVerifiedAt(Instant.now());

        Map<String, Object> meta = (profile != null) ? new LinkedHashMap<>(profile) : new LinkedHashMap<>();
        meta.put("name", name);
        meta.put("phone", cleanPhone);
        meta.put("profileVersion", 1);
        meta.put("profileUpdatedAt", Instant.now().toString());

        boolean complete = profile != null && !profile.isEmpty() && profile.containsKey("address");
        user.setProfileComplete(complete);

        try {
            user.setMetadata(objectMapper.writeValueAsString(meta));
        } catch (Exception ignored) {}

        userRepository.save(user);
        auditService.log(name, "CITIZEN_REGISTERED_OTP", "USER", user.getId(), null, "ACTIVE", "phone=" + cleanPhone);
        return buildAuthResult(user, null, null);
    }

    /**
     * Authenticate with Google (Part 4 Flow 3)
     * For existing citizen with email_verified = true: returns status="LOGGED_IN".
     * Otherwise: dispatches 6-digit email OTP and returns status="EMAIL_VERIFICATION_REQUIRED".
     */
    public GoogleAuthResponse authenticateWithGoogle(String idToken, String clientIp) {
        GoogleTokenVerifier.GooglePayload payload = googleTokenVerifier.verifyToken(idToken);
        if (payload == null || !payload.emailVerified()) {
            return new GoogleAuthResponse(false, "Invalid or unverified Google token.", null, null, null, null);
        }

        String googleSub = payload.sub();
        String email = payload.email().toLowerCase();
        String name = payload.name();

        // Check if user exists by googleSub or email
        Optional<User> userOpt = userRepository.findByGoogleSub(googleSub);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmailIgnoreCase(email);
        }

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Rule 1: Staff accounts can NEVER be logged into via Google citizen login
            if (!"CITIZEN".equalsIgnoreCase(user.getRole())) {
                log.warn("[AEGIS-AUTH] Unauthorized attempt to access non-citizen staff account via Google OAuth: {}", email);
                return new GoogleAuthResponse(false, "Access denied. Only citizens can sign in via Google.", null, null, null, null);
            }
            if (!user.isEnabled()) {
                return new GoogleAuthResponse(false, "This account has been disabled.", null, null, null, null);
            }

            // Part 4: If citizen already verified email, log in directly without OTP
            if (user.isEmailVerified()) {
                if (user.getGoogleSub() == null) {
                    user.setGoogleSub(googleSub);
                    userRepository.save(user);
                }
                return new GoogleAuthResponse(true, null, "LOGGED_IN", null, null, null, buildAuthResult(user, null, null));
            }
        }

        // New user or citizen whose email is not yet verified -> send Email OTP
        otpService.requestEmailOtp(email, clientIp);
        String verificationToken = jwtService.generateEmailVerificationToken(googleSub, email, name);
        String maskedEmail = EmailService.maskEmail(email);

        return new GoogleAuthResponse(true, null, "EMAIL_VERIFICATION_REQUIRED", verificationToken, null, maskedEmail, null);
    }

    public GoogleAuthResponse googleLogin(String idToken, String clientIp) {
        return authenticateWithGoogle(idToken, clientIp);
    }

    /**
     * Resend Google Email OTP
     */
    public OtpService.OtpRequestResult resendGoogleEmailOtp(String verificationToken, String clientIp) {
        Map<String, Object> claims = jwtService.validateRegistrationToken(verificationToken, "EMAIL_VERIFY");
        if (claims == null) {
            return new OtpService.OtpRequestResult(false, "Invalid or expired verification session.", 0, null, 401);
        }
        String email = (String) claims.get("email");
        return otpService.requestEmailOtp(email, clientIp);
    }

    /**
     * Verify Google Email OTP (Part 4 Flow 3)
     */
    @Transactional
    public GoogleAuthResponse verifyGoogleEmail(String verificationToken, String otp) {
        Map<String, Object> claims = jwtService.validateRegistrationToken(verificationToken, "EMAIL_VERIFY");
        if (claims == null) {
            return new GoogleAuthResponse(false, "Invalid or expired verification session. Please sign in again.", null, null, null, null);
        }

        String googleSub = (String) claims.get("googleSub");
        String email = (String) claims.get("email");
        String name = (String) claims.get("name");

        OtpService.OtpVerifyResult verifyRes = otpService.verifyEmailOtpWithDetails(email, otp);
        if (!verifyRes.success()) {
            return new GoogleAuthResponse(false, verifyRes.error(), null, null, null, null);
        }

        // Check if citizen exists with this email
        Optional<User> existingOpt = userRepository.findByEmailIgnoreCase(email);
        if (existingOpt.isEmpty()) {
            existingOpt = userRepository.findByGoogleSub(googleSub);
        }

        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            if (!"CITIZEN".equalsIgnoreCase(existing.getRole())) {
                return new GoogleAuthResponse(false, "Access denied.", null, null, null, null);
            }
            existing.setGoogleSub(googleSub);
            existing.setEmailVerified(true);
            existing.setEmailVerifiedAt(Instant.now());
            userRepository.save(existing);
            auditService.log(existing.getFullName(), "CITIZEN_GOOGLE_EMAIL_VERIFIED", "USER", existing.getId(), null, "ACTIVE", "email=" + email);
            return new GoogleAuthResponse(true, null, "LOGGED_IN", null, null, null, buildAuthResult(existing, null, null));
        }

        // Brand-new user: return NEW_USER with registrationToken (purpose REGISTER_GOOGLE)
        String regToken = jwtService.generateGoogleRegistrationToken(googleSub, email, name);
        return new GoogleAuthResponse(true, null, "NEW_USER", null, regToken, null, null);
    }

    /**
     * Create new citizen with Google after email verification (Part 4)
     */
    @Transactional
    public AuthResult registerCitizenWithGoogle(String registrationToken, String customFullName, Map<String, Object> profile) {
        Map<String, Object> claims = jwtService.validateRegistrationToken(registrationToken, "REGISTER_GOOGLE");
        if (claims == null) {
            return new AuthResult(false, "Invalid or expired registration token. Please sign in with Google again.", null, null, null, null, null, null, null, null, false, null, false);
        }

        String googleSub = (String) claims.get("googleSub");
        String email = (String) claims.get("email");
        String ticketName = (String) claims.get("name");

        String fullName = (customFullName != null && !customFullName.isBlank()) ? customFullName.trim() :
                (ticketName != null && !ticketName.isBlank()) ? ticketName.trim() : "Citizen User";

        String cleanPhone = null;
        if (profile != null && profile.get("phone") != null) {
            String p = OtpService.normalizePhone(profile.get("phone").toString());
            if (OtpService.isValidIndianMobile(p)) {
                cleanPhone = p;
            }
        }

        User newUser = new User(UUID.randomUUID(), email.toLowerCase(), JwtService.hashPassword(UUID.randomUUID().toString()), "CITIZEN", fullName, cleanPhone);
        newUser.setEmail(email);
        newUser.setGoogleSub(googleSub);
        newUser.setAuthProvider("GOOGLE");
        newUser.setEmailVerified(true);
        newUser.setEmailVerifiedAt(Instant.now());
        newUser.setPhoneVerified(cleanPhone != null && profile != null && Boolean.TRUE.equals(profile.get("phoneVerified")));
        newUser.setProfileComplete(false);

        Map<String, Object> meta = (profile != null) ? new LinkedHashMap<>(profile) : new LinkedHashMap<>();
        meta.put("name", fullName);
        meta.put("email", email);
        if (cleanPhone != null) meta.put("phone", cleanPhone);
        meta.put("profileVersion", 1);
        meta.put("profileUpdatedAt", Instant.now().toString());

        try {
            newUser.setMetadata(objectMapper.writeValueAsString(meta));
        } catch (Exception ignored) {}

        userRepository.save(newUser);
        auditService.log(fullName, "CITIZEN_REGISTERED_GOOGLE", "USER", newUser.getId(), null, "ACTIVE", "email=" + email);
        return buildAuthResult(newUser, null, null);
    }

    /**
     * Backward-compatible overload for earlier tests
     */
    @Transactional
    public AuthResult completeGoogleRegistration(String registrationTicket, String phone, String otp, String customFullName) {
        return registerCitizenWithGoogle(registrationTicket, customFullName, Map.of("phone", phone));
    }

    /**
     * GET /api/auth/profile
     * Single source of truth (Part 3)
     */
    public Map<String, Object> getCitizenProfile(String usernameOrPhone) {
        if (usernameOrPhone == null || usernameOrPhone.isBlank()) return null;
        Optional<User> userOpt = userRepository.findByUsername(usernameOrPhone);
        if (userOpt.isEmpty()) {
            String norm = OtpService.normalizePhone(usernameOrPhone);
            if (!norm.isEmpty()) {
                userOpt = userRepository.findByPhone(norm);
            }
        }
        if (userOpt.isEmpty() || !"CITIZEN".equalsIgnoreCase(userOpt.get().getRole()) || !userOpt.get().isEnabled()) {
            return null;
        }
        return buildCitizenProfile(userOpt.get());
    }

    /**
     * PUT /api/auth/profile (and /api/citizen/profile)
     * Validates, sanitizes, merges into users.metadata, enforces optimistic concurrency (Part 3)
     */
    @Transactional
    public ProfileUpdateResult updateCitizenProfile(String usernameOrPhone, Map<String, Object> input, Integer expectedVersion) {
        if (usernameOrPhone == null || usernameOrPhone.isBlank()) {
            return new ProfileUpdateResult(401, Map.of("error", "Unauthorized"), null);
        }

        Optional<User> userOpt = userRepository.findByUsername(usernameOrPhone);
        if (userOpt.isEmpty()) {
            String norm = OtpService.normalizePhone(usernameOrPhone);
            if (!norm.isEmpty()) userOpt = userRepository.findByPhone(norm);
        }
        if (userOpt.isEmpty()) {
            return new ProfileUpdateResult(404, Map.of("error", "Citizen user not found."), null);
        }

        User user = userOpt.get();
        if (!"CITIZEN".equalsIgnoreCase(user.getRole())) {
            return new ProfileUpdateResult(403, Map.of("error", "Only citizen accounts possess a citizen profile."), null);
        }
        if (!user.isEnabled()) {
            return new ProfileUpdateResult(403, Map.of("error", "Account is disabled."), null);
        }

        // Rate limit: 30 updates per hour per user
        long now = System.currentTimeMillis();
        List<Long> updates = profileUpdateRateLimits.computeIfAbsent(user.getUsername(), k -> Collections.synchronizedList(new ArrayList<>()));
        synchronized (updates) {
            updates.removeIf(t -> now - t > 3600_000L);
            if (updates.size() >= 30) {
                return new ProfileUpdateResult(429, Map.of("error", "Rate limit exceeded. Maximum 30 profile updates per hour."), null);
            }
            updates.add(now);
        }

        // Parse existing metadata
        Map<String, Object> existingMeta = new LinkedHashMap<>();
        if (user.getMetadata() != null && !user.getMetadata().isBlank()) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsed = objectMapper.readValue(user.getMetadata(), Map.class);
                if (parsed != null) existingMeta.putAll(parsed);
            } catch (Exception ignored) {}
        }

        // Optimistic Concurrency Check (Part 3)
        int currentVersion = 1;
        if (existingMeta.containsKey("profileVersion")) {
            Object v = existingMeta.get("profileVersion");
            if (v instanceof Number) currentVersion = ((Number) v).intValue();
        }

        if (expectedVersion != null && currentVersion > 0 && !expectedVersion.equals(currentVersion)) {
            Map<String, Object> currentProfile = buildCitizenProfile(user);
            return new ProfileUpdateResult(409, Map.of(
                    "error", "Your profile was updated on another device. Please reload or overwrite.",
                    "currentProfile", currentProfile
            ), currentProfile);
        }

        // Validation & Sanitization (Part 3)
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        String name = sanitizeString(input.get("name") != null ? input.get("name") : input.get("fullName"), 120);
        if (name == null || name.isBlank()) {
            fieldErrors.put("name", "Full legal name is required (1-120 characters).");
        }

        Object ageObj = input.get("age");
        int age = 0;
        if (ageObj instanceof Number) {
            age = ((Number) ageObj).intValue();
            if (age < 0 || age > 120) {
                fieldErrors.put("age", "Age must be between 0 and 120 years.");
            }
        } else if (ageObj != null) {
            try {
                age = Integer.parseInt(ageObj.toString());
                if (age < 0 || age > 120) fieldErrors.put("age", "Age must be between 0 and 120 years.");
            } catch (Exception e) {
                fieldErrors.put("age", "Invalid age.");
            }
        }

        String gender = sanitizeString(input.get("gender"), 30);
        if (gender != null && !gender.isBlank()) {
            if (!Set.of("MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY").contains(gender.toUpperCase())) {
                fieldErrors.put("gender", "Gender must be MALE, FEMALE, OTHER, or PREFER_NOT_TO_SAY.");
            }
        }

        String bloodGroup = sanitizeString(input.get("bloodGroup"), 20);
        if (bloodGroup != null && !bloodGroup.isBlank()) {
            if (!Set.of("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "UNKNOWN", "NOT SPECIFIED").contains(bloodGroup.toUpperCase())) {
                fieldErrors.put("bloodGroup", "Invalid blood group.");
            }
        }

        String email = sanitizeString(input.get("email"), 255);
        if (email != null && !email.isBlank()) {
            if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                fieldErrors.put("email", "Invalid email format.");
            } else if (!email.equalsIgnoreCase(user.getEmail())) {
                // Check if email is already taken by another account
                Optional<User> emailHolder = userRepository.findByEmailIgnoreCase(email);
                if (emailHolder.isPresent() && !emailHolder.get().getId().equals(user.getId())) {
                    return new ProfileUpdateResult(409, Map.of("error", "Email address is already in use by another account."), null);
                }
            }
        }

        String medicalNotes = sanitizeString(input.get("medicalNotes") != null ? input.get("medicalNotes") : input.get("otherMedicalNotes"), 1000);

        if (!fieldErrors.isEmpty()) {
            return new ProfileUpdateResult(400, Map.of("errors", fieldErrors), null);
        }

        // Sanitized List processing (max 30 items, max 80 chars each, deduplicated)
        List<String> diseases = sanitizeBoundedList(input.get("diseases") != null ? input.get("diseases") : input.get("chronicConditions"));
        List<String> allergies = sanitizeBoundedList(input.get("allergies"));
        List<String> medications = sanitizeBoundedList(input.get("medications"));

        String address = sanitizeString(input.get("homeAddress") != null ? input.get("homeAddress") : input.get("address"), 300);
        String landmark = sanitizeString(input.get("landmark"), 120);

        String contactName = sanitizeString(input.get("emergencyContactName"), 120);
        String contactPhone = sanitizeString(input.get("emergencyContactPhone"), 40);

        // Track changed field names for HIPAA/DPDP compliant audit log
        List<String> changedFields = new ArrayList<>();
        if (!Objects.equals(user.getFullName(), name)) changedFields.add("name");
        if (email != null && !Objects.equals(user.getEmail(), email)) changedFields.add("email");
        if (!Objects.equals(existingMeta.get("bloodGroup"), bloodGroup)) changedFields.add("bloodGroup");
        if (!Objects.equals(existingMeta.get("diseases"), diseases)) changedFields.add("diseases");
        if (!Objects.equals(existingMeta.get("allergies"), allergies)) changedFields.add("allergies");
        if (!Objects.equals(existingMeta.get("medications"), medications)) changedFields.add("medications");
        if (!Objects.equals(existingMeta.get("homeAddress"), address)) changedFields.add("homeAddress");
        if (!Objects.equals(existingMeta.get("medicalNotes"), medicalNotes)) changedFields.add("medicalNotes");

        // Merge into metadata (preserving unknown keys)
        int newVersion = currentVersion + 1;
        String updatedAt = Instant.now().toString();

        existingMeta.put("name", name);
        if (email != null) existingMeta.put("email", email);
        if (ageObj != null) existingMeta.put("age", age);
        if (gender != null) existingMeta.put("gender", gender);
        if (address != null) {
            existingMeta.put("address", address);
            existingMeta.put("homeAddress", address);
        }
        if (landmark != null) existingMeta.put("landmark", landmark);
        if (bloodGroup != null) existingMeta.put("bloodGroup", bloodGroup);
        existingMeta.put("diseases", diseases);
        existingMeta.put("chronicConditions", diseases);
        existingMeta.put("allergies", allergies);
        existingMeta.put("medications", medications);
        if (contactName != null) existingMeta.put("emergencyContactName", contactName);
        if (contactPhone != null) existingMeta.put("emergencyContactPhone", contactPhone);
        if (medicalNotes != null) {
            existingMeta.put("medicalNotes", medicalNotes);
            existingMeta.put("otherMedicalNotes", medicalNotes);
        }

        existingMeta.put("profileVersion", newVersion);
        existingMeta.put("profileUpdatedAt", updatedAt);

        user.setFullName(name);
        if (email != null) user.setEmail(email);
        user.setProfileComplete(true);

        try {
            user.setMetadata(objectMapper.writeValueAsString(existingMeta));
        } catch (Exception ignored) {}

        userRepository.save(user);

        // Audit log with field names only (never medical values)
        auditService.log(user.getUsername(), "PROFILE_UPDATED", "USER", user.getId(), null, null,
                "Changed fields: " + (changedFields.isEmpty() ? "none" : String.join(", ", changedFields)));

        Map<String, Object> updatedProfile = buildCitizenProfile(user);
        return new ProfileUpdateResult(200, null, updatedProfile);
    }

    public record ProfileUpdateResult(int status, Map<String, Object> errorOrErrors, Map<String, Object> profile) {}

    private static String sanitizeString(Object obj, int maxLength) {
        if (obj == null) return null;
        String str = obj.toString().replaceAll("<[^>]*>", "").replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", "").trim();
        return str.length() > maxLength ? str.substring(0, maxLength) : str;
    }

    private static List<String> sanitizeBoundedList(Object obj) {
        if (obj == null) return new ArrayList<>();
        Set<String> unique = new LinkedHashSet<>();
        if (obj instanceof List<?> list) {
            for (Object item : list) {
                if (unique.size() >= 30) break;
                String s = sanitizeString(item, 80);
                if (s != null && !s.isBlank()) unique.add(s);
            }
        } else if (obj instanceof String str && !str.isBlank()) {
            for (String part : str.split("[,;]")) {
                if (unique.size() >= 30) break;
                String s = sanitizeString(part, 80);
                if (s != null && !s.isBlank()) unique.add(s);
            }
        }
        return new ArrayList<>(unique);
    }

    public boolean changePassword(String username, String oldPassword, String newPassword) {
        if (username == null || oldPassword == null || newPassword == null) return false;
        if (newPassword.trim().length() < 6 || newPassword.equals(oldPassword)) return false;

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) return false;

        User user = userOpt.get();
        if (!JwtService.verifyPassword(oldPassword, user.getPasswordHash())) {
            return false;
        }

        user.setPasswordHash(JwtService.hashPassword(newPassword));
        user.setForcePasswordChange(false);
        userRepository.save(user);
        return true;
    }

    /**
     * Citizen Password Reset via verified SMS OTP
     */
    public AuthResult resetPassword(String phone, String otp, String newPassword) {
        if (phone == null || phone.isBlank()) {
            return new AuthResult(false, "Phone number is required.", null, null, null, null, null, null, null, null, false, null, false);
        }
        String cleanPhone = OtpService.normalizePhone(phone);
        if (!OtpService.isValidIndianMobile(cleanPhone)) {
            return new AuthResult(false, "Invalid 10-digit mobile number.", null, null, null, null, null, null, null, null, false, null, false);
        }
        if (otp == null || otp.isBlank()) {
            return new AuthResult(false, "OTP code is required.", null, null, null, null, null, null, null, null, false, null, false);
        }
        if (newPassword == null || newPassword.trim().length() < 6) {
            return new AuthResult(false, "New password must be at least 6 characters.", null, null, null, null, null, null, null, null, false, null, false);
        }

        OtpService.OtpVerifyResult verifyResult = otpService.verifyOtpWithDetails(cleanPhone, otp);
        if (!verifyResult.success()) {
            return new AuthResult(false, verifyResult.error(), null, null, null, null, null, null, null, null, false, null, false);
        }

        Optional<User> userOpt = userRepository.findByPhone(cleanPhone);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(cleanPhone);
        }

        if (userOpt.isEmpty()) {
            return new AuthResult(false, "No citizen account found for this phone number.", null, null, null, null, null, null, null, null, false, null, false);
        }

        User user = userOpt.get();
        if (!"CITIZEN".equalsIgnoreCase(user.getRole())) {
            return new AuthResult(false, "Password reset via OTP is only available for citizen accounts.", null, null, null, null, null, null, null, null, false, null, false);
        }

        if (!user.isEnabled()) {
            return new AuthResult(false, "This account has been disabled. Please contact support.", null, null, null, null, null, null, null, null, false, null, false);
        }

        user.setPasswordHash(JwtService.hashPassword(newPassword.trim()));
        user.setForcePasswordChange(false);
        userRepository.save(user);

        auditService.log(cleanPhone, "CITIZEN_PASSWORD_RESET", "USER", user.getId(), null, "ACTIVE", "phone=" + cleanPhone);
        return new AuthResult(true, "Password reset successfully. You can now log in with your new password.", null, null, null, null, null, null, null, null, false, null, false);
    }

    // In-memory repository for unit testing
    public static class InMemoryUserRepository implements UserRepository {
        private final Map<UUID, User> store = new ConcurrentHashMap<>();

        @Override
        public Optional<User> findByUsername(String username) {
            return store.values().stream().filter(u -> u.getUsername().equalsIgnoreCase(username)).findFirst();
        }

        @Override
        public Optional<User> findByPhone(String phone) {
            String norm = OtpService.normalizePhone(phone);
            return store.values().stream().filter(u -> norm.equals(OtpService.normalizePhone(u.getPhone()))).findFirst();
        }

        @Override
        public Optional<User> findByGoogleSub(String googleSub) {
            if (googleSub == null) return Optional.empty();
            return store.values().stream().filter(u -> googleSub.equals(u.getGoogleSub())).findFirst();
        }

        @Override
        public Optional<User> findByEmail(String email) {
            if (email == null) return Optional.empty();
            return store.values().stream().filter(u -> email.equalsIgnoreCase(u.getEmail())).findFirst();
        }

        @Override
        public Optional<User> findByEmailIgnoreCase(String email) {
            return findByEmail(email);
        }

        @Override
        public List<User> findByRole(String role) {
            return store.values().stream().filter(u -> u.getRole().equalsIgnoreCase(role)).toList();
        }

        @Override
        public boolean existsByRole(String role) {
            return store.values().stream().anyMatch(u -> u.getRole().equalsIgnoreCase(role));
        }

        @Override
        public <S extends User> S save(S entity) {
            if (entity.getId() == null) entity.setId(UUID.randomUUID());
            store.put(entity.getId(), entity);
            return entity;
        }

        @Override public Optional<User> findById(UUID uuid) { return Optional.ofNullable(store.get(uuid)); }
        @Override public boolean existsById(UUID uuid) { return store.containsKey(uuid); }
        @Override public long count() { return store.size(); }
        @Override public void deleteById(UUID uuid) { store.remove(uuid); }
        @Override public void delete(User entity) { store.remove(entity.getId()); }
        @Override public List<User> findAll() { return new ArrayList<>(store.values()); }
        @Override public void deleteAll() { store.clear(); }
        @Override public <S extends User> List<S> saveAll(Iterable<S> entities) { List<S> res = new ArrayList<>(); entities.forEach(e -> res.add(save(e))); return res; }
        @Override public List<User> findAllById(Iterable<UUID> uuids) { return List.of(); }
        @Override public void deleteAllById(Iterable<? extends UUID> uuids) {}
        @Override public void deleteAll(Iterable<? extends User> entities) {}
        @Override public void flush() {}
        @Override public <S extends User> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends User> List<S> saveAllAndFlush(Iterable<S> entities) { return saveAll(entities); }
        @Override public void deleteAllInBatch(Iterable<User> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<UUID> uuids) {}
        @Override public void deleteAllInBatch() {}
        @Override public User getOne(UUID uuid) { return store.get(uuid); }
        @Override public User getById(UUID uuid) { return store.get(uuid); }
        @Override public User getReferenceById(UUID uuid) { return store.get(uuid); }
        @Override public <S extends User> Optional<S> findOne(org.springframework.data.domain.Example<S> example) { return Optional.empty(); }
        @Override public <S extends User> List<S> findAll(org.springframework.data.domain.Example<S> example) { return List.of(); }
        @Override public <S extends User> List<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Sort sort) { return List.of(); }
        @Override public <S extends User> org.springframework.data.domain.Page<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Pageable pageable) { return null; }
        @Override public <S extends User> long count(org.springframework.data.domain.Example<S> example) { return 0; }
        @Override public <S extends User> boolean exists(org.springframework.data.domain.Example<S> example) { return false; }
        @Override public <S extends User, R> R findBy(org.springframework.data.domain.Example<S> example, java.util.function.Function<org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<User> findAll(org.springframework.data.domain.Sort sort) { return findAll(); }
        @Override public org.springframework.data.domain.Page<User> findAll(org.springframework.data.domain.Pageable pageable) { return null; }
    }
}
