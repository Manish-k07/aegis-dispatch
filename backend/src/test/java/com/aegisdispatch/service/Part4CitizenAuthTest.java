package com.aegisdispatch.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class Part4CitizenAuthTest {

    private AuthService authService;
    private JwtService jwtService;
    private OtpService otpService;

    @BeforeEach
    void setUp() {
        authService = new AuthService();
        jwtService = new JwtService("aegis-dispatch-super-secure-production-jwt-hmac-sha256-secret-key-2026");
        otpService = new OtpService(new SmsService(null), new EmailService(null));
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
        otpService.requestOtp(phone, "127.0.0.1");
        otpService.setTestOtp(phone, "1120");

        // Verify OTP via authService
        AuthService.AuthResult verifyResult = authService.authenticateWithOtp(phone, "1120", "Rajesh Kumar", "127.0.0.1");
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
        otpService.requestOtp(phone, "127.0.0.1");
        otpService.setTestOtp(phone, "1120");

        AuthService.AuthResult loginResult = authService.authenticateWithOtp(phone, "1120", null, "127.0.0.1");
        assertTrue(loginResult.success(), "Seeded citizen should log in successfully");
        assertEquals("LOGGED_IN", loginResult.status());
        assertNotNull(loginResult.token());
        assertNotNull(loginResult.citizenProfile());
        assertEquals(Boolean.TRUE, loginResult.citizenProfile().get("phoneVerified"), "Seeded citizen phoneVerified must be true");
    }

    @Test
    void testNewGoogleUserRequiresEmailOtp() {
        // Simulated new Google user token
        String idToken = "mock:google-sub-new:newuser@gmail.com:New Google Citizen";
        AuthService.GoogleAuthResponse googleRes = authService.authenticateWithGoogle(idToken, "127.0.0.1");

        assertEquals("EMAIL_VERIFICATION_REQUIRED", googleRes.status());
        assertNotNull(googleRes.verificationToken());
        assertNotNull(googleRes.maskedEmail());

        // Immediate resend is blocked by the 60s cooldown
        OtpService.OtpRequestResult resendRes = authService.resendGoogleEmailOtp(googleRes.verificationToken(), "127.0.0.1");
        assertFalse(resendRes.success(), "Immediate resend should be blocked by cooldown");
        assertTrue(resendRes.resendInSeconds() > 0 || (resendRes.message() != null && resendRes.message().contains("wait")));

        // Verify with email OTP (123456 in dev echo)
        AuthService.GoogleAuthResponse verifyRes = authService.verifyGoogleEmail(googleRes.verificationToken(), "123456");
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
        assertNotNull(completeRes.citizenProfile());
        assertEquals(Boolean.TRUE, completeRes.citizenProfile().get("emailVerified"), "emailVerified must be true");
    }

    @Test
    void testRegistrationTokensRejectedAsLoginTokens() {
        String regToken = jwtService.generateOtpRegistrationToken("9876543210");
        assertNull(jwtService.validateAndExtractClaims(regToken), "Registration token must be rejected by validateAndExtractClaims");

        String emailToken = jwtService.generateEmailVerificationToken("test@example.com", "sub-12345", "Test User");
        assertNull(jwtService.validateAndExtractClaims(emailToken), "Email token must be rejected by validateAndExtractClaims");

        String googleRegToken = jwtService.generateGoogleRegistrationToken("test@example.com", "sub-12345", "Test User");
        assertNull(jwtService.validateAndExtractClaims(googleRegToken), "Google registration token must be rejected by validateAndExtractClaims");
    }
}
