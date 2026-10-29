package com.aegisdispatch.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class LaunchReadinessTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testResetPasswordValidationMissingFields() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"9035730176\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("required")));
    }

    @Test
    void testResetPasswordInvalidOtp() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"9035730176\",\"otp\":\"000000\",\"newPassword\":\"newSecret2026!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", notNullValue()));
    }

    @Test
    void testAnalyticsSummaryEndpoint() throws Exception {
        mockMvc.perform(get("/api/analytics/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEmergencies", notNullValue()))
                .andExpect(jsonPath("$.hospitalStats.totalBeds", notNullValue()))
                .andExpect(jsonPath("$.dispatchStats.totalDispatches", notNullValue()));
    }

    @Test
    void testAnalyticsExportCsvEndpoint() throws Exception {
        mockMvc.perform(get("/api/analytics/export.csv"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/csv")))
                .andExpect(header().string("Content-Disposition", containsString("aegis_analytics_")))
                .andExpect(content().string(containsString("Type")));
    }
}
