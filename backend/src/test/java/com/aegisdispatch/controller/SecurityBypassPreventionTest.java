package com.aegisdispatch.controller;

import com.aegisdispatch.service.GoogleTokenVerifier;
import com.aegisdispatch.service.OtpService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class SecurityBypassPreventionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OtpService otpService;

    @Autowired
    private GoogleTokenVerifier googleTokenVerifier;

    @Test
    @DisplayName("Security 1: 123456 and 1120 bypass codes are strictly rejected when no real OTP exists")
    void testBypassCodesAreRejected() throws Exception {
        String testPhone = "9988776655";
        // Ensure no active OTP in store for this phone
        assertFalse(otpService.verifyOtp(testPhone, "123456"), "123456 must be rejected with no active OTP");
        assertFalse(otpService.verifyOtp(testPhone, "1120"), "1120 must be rejected with no active OTP");

        // Verify via endpoint
        mockMvc.perform(post("/api/auth/otp/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"9988776655\",\"otp\":\"123456\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").isNotEmpty());

        mockMvc.perform(post("/api/auth/otp/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"9988776655\",\"otp\":\"1120\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    @DisplayName("Security 2: Profile update without token returns 401 even if body contains username or phone")
    void testProfileUpdateWithoutTokenReturns401() throws Exception {
        // PUT /api/auth/profile with username in body
        mockMvc.perform(put("/api/auth/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"9845012345\",\"name\":\"Attacker\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Missing or invalid authorization token."));

        // PUT /api/citizen/profile with phone in body
        mockMvc.perform(put("/api/citizen/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"9845012345\",\"name\":\"Attacker\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Missing or invalid authorization token."));

        // POST /api/auth/profile with phone in body
        mockMvc.perform(post("/api/auth/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"9845012345\",\"name\":\"Attacker\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Missing or invalid authorization token."));
    }

    @Test
    @DisplayName("Security 3: mock: and demo: Google tokens are rejected on server")
    void testMockAndDemoGoogleTokensAreRejected() throws Exception {
        // Verify verifier component directly
        assertNull(googleTokenVerifier.verifyToken("mock:sub-123:test@example.com:Hacker"), "mock: prefix must return null");
        assertNull(googleTokenVerifier.verifyToken("demo:sub-123:test@example.com:Hacker"), "demo: prefix must return null");

        // Verify via endpoint
        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"mock:sub-123:test@example.com:Hacker\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").isNotEmpty());

        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"demo:sub-123:test@example.com:Hacker\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    @DisplayName("Security 4: Reset password with wrong OTP fails with 400 Bad Request")
    void testResetPasswordWithWrongOtpFails() throws Exception {
        // Calling with wrong random OTP
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"9845012345\",\"otp\":\"999999\",\"newPassword\":\"NewValidSecret123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());

        // Calling with bypass codes 1120 or 123456 must also fail with wrong OTP
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"9845012345\",\"otp\":\"1120\",\"newPassword\":\"NewValidSecret123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"9845012345\",\"otp\":\"123456\",\"newPassword\":\"NewValidSecret123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }
}
