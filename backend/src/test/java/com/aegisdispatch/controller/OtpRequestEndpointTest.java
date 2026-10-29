package com.aegisdispatch.controller;

import com.aegisdispatch.service.OtpService;
import com.aegisdispatch.service.SmsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class OtpRequestEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OtpService otpService;

    @Autowired
    private SmsService smsService;

    @BeforeEach
    void setUp() {
        otpService.clearStore();
        otpService.setDevEcho(true);
        smsService.setTwilioConfig("", "", ""); // unconfigured Twilio
    }

    @Test
    void testOtpRequestWithPlus91Number() throws Exception {
        mockMvc.perform(post("/api/auth/otp/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"+919035730176\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("If the number is valid, a code has been sent.")))
                .andExpect(jsonPath("$.resendInSeconds", greaterThan(0)));
    }

    @Test
    void testOtpRequestWithTenDigitsOnly() throws Exception {
        mockMvc.perform(post("/api/auth/otp/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"9035730176\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("If the number is valid, a code has been sent.")));
    }

    @Test
    void testOtpRequestWithPastedFormattedNumber() throws Exception {
        mockMvc.perform(post("/api/auth/otp/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"+91 90357 30176\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("If the number is valid, a code has been sent.")));
    }

    @Test
    void testOtpRequestMalformedPhoneReturns400() throws Exception {
        mockMvc.perform(post("/api/auth/otp/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"12345\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid mobile number")));
    }

    @Test
    void testOtpRequestNoProviderAndDevEchoFalseReturns503() throws Exception {
        otpService.setDevEcho(false);
        mockMvc.perform(post("/api/auth/otp/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"9845012345\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message", is("SMS service is not configured")));
    }

    @Test
    void testOtpRequestTwilioFailureReturns502() throws Exception {
        otpService.setDevEcho(true);
        // Set invalid Twilio credentials so dispatchTwilioSms will fail or return error
        smsService.setTwilioConfig("AC_invalid_mock_sid", "mock_auth_token", "+15555555555");

        mockMvc.perform(post("/api/auth/otp/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"9845054321\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message", is("Could not send SMS, please try again")));
    }
}
