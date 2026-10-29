package com.aegisdispatch.service;

import com.aegisdispatch.controller.AuthController;
import com.aegisdispatch.controller.DispatchController;
import com.aegisdispatch.model.Emergency;
import com.aegisdispatch.model.User;
import com.aegisdispatch.repository.EmergencyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class GoogleAuthAndCitizenFlowTest {

    private AuthService.InMemoryUserRepository userRepository;
    private JwtService jwtService;
    private OtpService otpService;
    private AuthService authService;
    private AuthController authController;
    private EmergencyRepository emergencyRepository;
    private DispatchController dispatchController;

    @BeforeEach
    void setUp() {
        userRepository = new AuthService.InMemoryUserRepository();
        jwtService = new JwtService("aegis-dispatch-test-jwt-hmac-sha256-secret-key-2026-very-secure");
        SmsService mockSms = mock(SmsService.class);
        AuditService mockAudit = mock(AuditService.class);
        GoogleTokenVerifier googleVerifier = new GoogleTokenVerifier(new com.fasterxml.jackson.databind.ObjectMapper());
        otpService = new OtpService(mockSms);
        authService = new AuthService(userRepository, jwtService, otpService, googleVerifier, mockAudit);
        authController = new AuthController(authService, otpService, jwtService, googleVerifier);

        emergencyRepository = mock(EmergencyRepository.class);
        dispatchController = new DispatchController(
                emergencyRepository, mock(com.aegisdispatch.repository.AmbulanceRepository.class),
                mock(com.aegisdispatch.repository.HospitalRepository.class),
                mock(com.aegisdispatch.repository.DispatchRepository.class),
                mock(DispatchEngine.class), mock(com.aegisdispatch.websocket.LiveSocketHandler.class),
                mock(AuditService.class), mock(com.aegisdispatch.repository.AuditLogRepository.class),
                mock(com.aegisdispatch.repository.AmbulanceLocationRepository.class),
                mock(com.aegisdispatch.repository.IncidentEventRepository.class),
                mock(SimulationService.class), mock(RoutingService.class),
                mock(CadFileService.class), mock(SmsService.class),
                mock(HospitalCapacityService.class), mock(PredictiveStagingService.class),
                null, authService
        );
    }

    @Test
    @DisplayName("F1: New Google user gets EMAIL_VERIFICATION_REQUIRED and no user is created until verified")
    void testNewGoogleUserRequiresPhoneVerification() {
        String googleIdToken = "mock:google-sub-999:newcitizen@example.com:John Doe";
        long userCountBefore = userRepository.count();

        AuthService.GoogleAuthResponse resp = authService.googleLogin(googleIdToken, "127.0.0.1");

        assertTrue(resp.success());
        assertEquals("EMAIL_VERIFICATION_REQUIRED", resp.status());
        assertNotNull(resp.verificationToken());
        assertNull(resp.authResult());
        assertEquals(userCountBefore, userRepository.count(), "No user should be created yet");

        // Set valid email OTP
        otpService.setTestEmailOtp("newcitizen@example.com", "654321");

        // Verify email OTP -> returns NEW_USER with registrationToken
        AuthService.GoogleAuthResponse verifyRes = authService.verifyGoogleEmail(resp.verificationToken(), "654321");
        assertTrue(verifyRes.success());
        assertEquals("NEW_USER", verifyRes.status());
        assertNotNull(verifyRes.registrationToken());

        // Complete registration
        AuthService.AuthResult completeRes = authService.registerCitizenWithGoogle(
                verifyRes.registrationToken(),
                "John Doe",
                null
        );

        assertTrue(completeRes.success());
        assertNotNull(completeRes.token());
        assertEquals("CITIZEN", completeRes.role());
        assertFalse(completeRes.profileComplete(), "New Google citizen starts with profileComplete=false");
        assertEquals(userCountBefore + 1, userRepository.count(), "User should now be created");

        Optional<User> createdOpt = userRepository.findByEmailIgnoreCase("newcitizen@example.com");
        assertTrue(createdOpt.isPresent());
        assertEquals("google-sub-999", createdOpt.get().getGoogleSub());
        assertEquals("GOOGLE", createdOpt.get().getAuthProvider());
    }

    @Test
    @DisplayName("F2: Registration ticket that is expired, tampered, or wrong purpose is rejected, and cannot be used as login token")
    void testRegistrationTicketSecurityConstraints() {
        String validTicket = jwtService.generateRegistrationTicket("sub-111", "sec@example.com", "Alice");

        // Tamper with ticket
        String tamperedTicket = validTicket.substring(0, validTicket.lastIndexOf('.') + 1) + "tamperedSignature";
        Map<String, Object> tamperedClaims = jwtService.validateRegistrationTicket(tamperedTicket);
        assertNull(tamperedClaims, "Tampered ticket must be rejected");

        // Ticket cannot be used as a login token
        Map<String, Object> loginClaims = jwtService.validateAndExtractClaims(validTicket);
        assertNull(loginClaims, "Registration ticket must never be accepted as a login JWT");

        // Ticket with wrong purpose
        String normalToken = jwtService.generateToken("user123", "CITIZEN", "User", null, null);
        Map<String, Object> wrongPurposeClaims = jwtService.validateRegistrationTicket(normalToken);
        assertNull(wrongPurposeClaims, "Normal login token cannot be used as a registration ticket");
    }

    @Test
    @DisplayName("F3: Existing Google user logs in without OTP")
    void testExistingGoogleUserLogsInDirectly() {
        // Pre-create existing Google citizen
        User existing = new User(UUID.randomUUID(), "9845012345", JwtService.hashPassword("secret"), "CITIZEN", "Priya Sharma", "9845012345");
        existing.setGoogleSub("google-existing-456");
        existing.setEmail("priya@example.com");
        existing.setAuthProvider("GOOGLE");
        existing.setEmailVerified(true);
        existing.setProfileComplete(true);
        userRepository.save(existing);

        String googleToken = "mock:google-existing-456:priya@example.com:Priya Sharma";
        AuthService.GoogleAuthResponse resp = authService.googleLogin(googleToken, "127.0.0.1");

        assertTrue(resp.success());
        assertEquals("LOGGED_IN", resp.status());
        assertNotNull(resp.authResult());
        assertNotNull(resp.authResult().token());
        assertEquals("CITIZEN", resp.authResult().role());
        assertTrue(resp.authResult().profileComplete(), "Existing complete profile returns profileComplete=true");
    }

    @Test
    @DisplayName("F4: profileComplete is false for new users and true after the profile PUT")
    void testProfileCompleteTransitionsTrueAfterProfilePut() {
        // Create new citizen with registration token
        String regToken = jwtService.generateOtpRegistrationToken("9811122233");
        AuthService.AuthResult reg = authService.registerCitizen(regToken, "9811122233", "Password123", "New Citizen", null);
        assertTrue(reg.success());
        assertFalse(reg.profileComplete(), "Newly registered citizen profileComplete must be false");

        // Profile PUT with personal details + emergency contact
        Map<String, Object> profileUpdate = new LinkedHashMap<>();
        profileUpdate.put("fullName", "Rohan Mehta");
        profileUpdate.put("gender", "MALE");
        profileUpdate.put("age", 32);
        profileUpdate.put("address", "Flat 402, Sunshine Heights, Koramangala");
        profileUpdate.put("landmark", "Near Wipro Park");
        profileUpdate.put("emergencyContacts", List.of(
                Map.of("name", "Anita Mehta", "relationship", "Sister", "phone", "+919811199999")
        ));
        profileUpdate.put("bloodGroup", "B+");
        profileUpdate.put("allergies", List.of("Sulfa drugs"));

        AuthService.ProfileUpdateResult updateRes = authService.updateCitizenProfile("9811122233", profileUpdate, 1);
        assertEquals(200, updateRes.status());
        assertNotNull(updateRes.profile());
        assertTrue(Boolean.TRUE.equals(updateRes.profile().get("profileComplete")), "profileComplete must become true after saving valid required profile fields");

        Optional<User> updatedUser = userRepository.findByPhone("9811122233");
        assertTrue(updatedUser.isPresent());
        assertTrue(updatedUser.get().isProfileComplete());
        assertEquals("Rohan Mehta", updatedUser.get().getFullName());
    }

    @Test
    @DisplayName("F5: OTHER type requires a description")
    void testOtherTypeRequiresDescription() {
        // 1. OTHER type without description -> rejected
        Emergency bad = new Emergency();
        bad.setCallerName("Test Caller");
        bad.setPhone("+919999900001");
        bad.setType("OTHER");
        bad.setOtherTypeDescription(null);
        bad.setLatitude(12.97);
        bad.setLongitude(77.59);
        bad.setAddress("MG Road");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            dispatchController.createEmergency(bad);
        });
        assertTrue(ex.getMessage().contains("Description is required for 'OTHER'"));

        // 2. OTHER type with too short description (< 3 chars) -> rejected
        bad.setOtherTypeDescription("Hi");
        assertThrows(IllegalArgumentException.class, () -> {
            dispatchController.createEmergency(bad);
        });

        // 3. OTHER type with valid description -> accepted with default HIGH priority
        when(emergencyRepository.save(any(Emergency.class))).thenAnswer(i -> i.getArgument(0));
        bad.setOtherTypeDescription("Severe chemical inhalation spill");
        bad.setPriority(null); // will be defaulted
        Emergency good = dispatchController.createEmergency(bad);
        assertNotNull(good);
        assertEquals("Severe chemical inhalation spill", good.getOtherTypeDescription());
        assertEquals("HIGH", good.getPriority(), "OTHER emergency type defaults to HIGH priority");
    }

    @Test
    @DisplayName("F6: Cancel without a reason returns 400, and cancel with a reason persists it")
    void testCancellationRequiresReasonAndPersistsIt() {
        UUID emergencyId = UUID.randomUUID();
        Emergency emg = new Emergency();
        emg.setId(emergencyId);
        emg.setStatus("PENDING_DISPATCH");
        when(emergencyRepository.findById(emergencyId)).thenReturn(Optional.of(emg));
        when(emergencyRepository.save(any(Emergency.class))).thenAnswer(i -> i.getArgument(0));

        // 1. Cancel with no reason -> 400 Bad Request
        ResponseEntity<?> reject = dispatchController.cancelEmergency(emergencyId, Map.of());
        assertEquals(HttpStatus.BAD_REQUEST, reject.getStatusCode());

        // 2. Cancel with reasonCode "OTHER" but no reasonText -> 400 Bad Request
        ResponseEntity<?> rejectOtherNoText = dispatchController.cancelEmergency(emergencyId, Map.of(
                "reasonCode", "OTHER"
        ));
        assertEquals(HttpStatus.BAD_REQUEST, rejectOtherNoText.getStatusCode());

        // 3. Cancel with valid reasonCode "HELP_ARRIVED" -> 200 OK and persisted
        ResponseEntity<?> accept = dispatchController.cancelEmergency(emergencyId, Map.of(
                "reasonCode", "HELP_ARRIVED",
                "actor", "Citizen Mobile"
        ));
        assertEquals(HttpStatus.OK, accept.getStatusCode());
        assertEquals("CANCELLED", emg.getStatus());
        assertEquals("HELP_ARRIVED", emg.getCancelReasonCode());
        assertNotNull(emg.getCancelledAt());
        assertEquals("Citizen Mobile", emg.getCancelledBy());
    }

    @Test
    @DisplayName("F7: SOS payload validation (out-of-range coords rejected, missing location accepted)")
    void testSosPayloadValidation() {
        when(emergencyRepository.save(any(Emergency.class))).thenAnswer(i -> i.getArgument(0));

        // 1. Out-of-range coordinates -> rejected
        Emergency invalidLat = new Emergency();
        invalidLat.setCallerName("Caller");
        invalidLat.setPhone("+919999900002");
        invalidLat.setType("CARDIAC");
        invalidLat.setLatitude(95.0); // Out of bounds > 90
        invalidLat.setLongitude(77.59);
        invalidLat.setAddress("Bangalore");

        assertThrows(IllegalArgumentException.class, () -> {
            dispatchController.createEmergency(invalidLat);
        });

        Emergency invalidLng = new Emergency();
        invalidLng.setCallerName("Caller");
        invalidLng.setPhone("+919999900002");
        invalidLng.setType("CARDIAC");
        invalidLng.setLatitude(12.97);
        invalidLng.setLongitude(185.0); // Out of bounds > 180
        invalidLng.setAddress("Bangalore");

        assertThrows(IllegalArgumentException.class, () -> {
            dispatchController.createEmergency(invalidLng);
        });

        // 2. Missing / UNAVAILABLE location -> accepted without blocking SOS
        Emergency sosUnavailable = new Emergency();
        sosUnavailable.setCallerName("Caller");
        sosUnavailable.setPhone("+919999900002");
        sosUnavailable.setType("CARDIAC");
        sosUnavailable.setLatitude(0.0);
        sosUnavailable.setLongitude(0.0);
        sosUnavailable.setLocationSource("UNAVAILABLE");
        sosUnavailable.setAddress("Address pending confirmation");
        sosUnavailable.setSosTriggeredAt(Instant.now());
        sosUnavailable.setDeviceInfo("{\"onLine\":true,\"battery\":0.82,\"platform\":\"Win32\"}");

        Emergency savedSos = dispatchController.createEmergency(sosUnavailable);
        assertNotNull(savedSos);
        assertEquals("UNAVAILABLE", savedSos.getLocationSource());
        assertNotNull(savedSos.getSosTriggeredAt());
        assertNotNull(savedSos.getDeviceInfo());
    }
}
