package com.aegisdispatch.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class Part4CitizenAuthTest {

    private AuthService.InMemoryUserRepository userRepository;
    private AuthService authService;
    private JwtService jwtService;
    private OtpService otpService;
    private GoogleTokenVerifier googleVerifier;

    @BeforeEach
    void setUp() {
        userRepository = new AuthService.InMemoryUserRepository();
        jwtService = new JwtService("aegis-dispatch-super-secure-production-jwt-hmac-sha256-secret-key-2026");
        otpService = new OtpService(new SmsService(null), new EmailService(null));
        googleVerifier = mock(GoogleTokenVerifier.class);
        when(googleVerifier.isConfigured()).thenReturn(true);
        when(googleVerifier.verifyToken("valid-new-google-token")).thenReturn(
                new GoogleTokenVerifier.GooglePayload("google-sub-new", "newuser@gmail.com", "New Google Citizen", true)
        );
        authService = new AuthService(userRepository, jwtService, otpService, googleVerifier, mock(AuditService.class));
    }

    @Test
    void testSelfRegisterWithoutPhoneOtpFails() {
        AuthService.AuthResult res = authService.registerCitizen(
                null, // No registration token!
                "9876543210",
                "SecretPassword123!",
                "Rajesh Kumar",
                null
        );
        assertFalse(res.success(), "Registration without token must fail");
        assertTrue(res.error().contains("Phone verification is required"), "Should enforce phone verification token");
    }

    @Test
    void testSelfRegisterWithValidRegistrationTokenSucceeds() {
        String phone = "9876543210";
        otpService.setTestOtp(phone, "987123");

        // Verify OTP via authService
        AuthService.AuthResult verifyResult = authService.authenticateWithOtp(phone, "987123", "Rajesh Kumar", "127.0.0.1");
        assertEquals("NEW_USER", verifyResult.status());
        assertNotNull(verifyResult.registrationToken());

        // Now register citizen with token
        AuthService.AuthResult registerResult = authService.registerCitizen(
                verifyResult.registrationToken(),
                phone,
                "SecretPassword123!",
                "Rajesh Kumar",
                Map.of("bloodGroup", "B+", "age", 28)
        );

        assertTrue(registerResult.success(), "Registration should succeed with valid token");
        assertNotNull(registerResult.token());
        assertEquals("CITIZEN", registerResult.role());
        assertNotNull(registerResult.citizenProfile());
        assertEquals(Boolean.TRUE, registerResult.citizenProfile().get("phoneVerified"), "phone_verified must be true");
    }

    @Test
    void testReturningCitizenOtpLoginSetsPhoneVerified() {
        // Seeded Priya Sharma (9845012345)
        String phone = "9845012345";
        otpService.setTestOtp(phone, "987123");

        AuthService.AuthResult loginResult = authService.authenticateWithOtp(phone, "987123", null, "127.0.0.1");
        assertTrue(loginResult.success(), "Seeded citizen should log in successfully");
        assertEquals("LOGGED_IN", loginResult.status());
        assertNotNull(loginResult.token());
        assertNotNull(loginResult.citizenProfile());
        assertEquals(Boolean.TRUE, loginResult.citizenProfile().get("phoneVerified"), "Seeded citizen phoneVerified must be true");
    }

    @Test
    void testNewGoogleUserRequiresEmailOtp() {
        // Simulated new Google user token verified by mock
        String idToken = "valid-new-google-token";
        AuthService.GoogleAuthResponse googleRes = authService.authenticateWithGoogle(idToken, "127.0.0.1");

        assertEquals("EMAIL_VERIFICATION_REQUIRED", googleRes.status());
        assertNotNull(googleRes.verificationToken());
        assertNotNull(googleRes.maskedEmail());

        // Immediate resend is blocked by the 60s cooldown
        OtpService.OtpRequestResult resendRes = authService.resendGoogleEmailOtp(googleRes.verificationToken(), "127.0.0.1");
        assertFalse(resendRes.success(), "Immediate resend should be blocked by cooldown");
        assertTrue(resendRes.resendInSeconds() > 0 || (resendRes.message() != null && resendRes.message().contains("wait")));

        // Verify with email OTP (explicit test OTP set)
        otpService.setTestEmailOtp("newuser@gmail.com", "889900");
        AuthService.GoogleAuthResponse verifyRes = authService.verifyGoogleEmail(googleRes.verificationToken(), "889900");
        assertEquals("NEW_USER", verifyRes.status());
        assertNotNull(verifyRes.registrationToken());

        // Register citizen with Google token
        AuthService.AuthResult completeRes = authService.registerCitizenWithGoogle(
                verifyRes.registrationToken(),
                null,
                Map.of("name", "New Google Citizen")
        );
        assertTrue(completeRes.success());
        assertEquals("CITIZEN", completeRes.role());
    }
}
