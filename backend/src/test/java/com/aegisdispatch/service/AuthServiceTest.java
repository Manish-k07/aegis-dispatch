package com.aegisdispatch.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AuthServiceTest {

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService();
    }

    @Test
    void testUnknownBadgeFails() {
        AuthService.AuthResult result = authService.authenticate(
                "DISPATCHER", "DFGG", "1120", null, null, "127.0.0.1"
        );
        assertFalse(result.success());
        assertTrue(result.error().contains("Invalid badge"));
    }

    @Test
    void testWrongPinFails() {
        AuthService.AuthResult result = authService.authenticate(
                "DISPATCHER", "CAD-042", "9999", null, null, "127.0.0.1"
        );
        assertFalse(result.success());
        assertTrue(result.error().contains("Invalid security PIN"));
    }

    @Test
    void testValidDispatcherSucceeds() {
        AuthService.AuthResult result = authService.authenticate(
                "DISPATCHER", "CAD-042", "1120", null, null, "127.0.0.1"
        );
        assertTrue(result.success());
        assertNotNull(result.token());
        assertEquals("DISPATCHER", result.role());
        assertEquals("A. Sharma", result.userLabel());
    }

    @Test
    void testParamedicVehicleMismatchFails() {
        AuthService.AuthResult result = authService.authenticate(
                "PARAMEDIC", "MED-702", "1001", "KA-01-AE-9999", null, "127.0.0.1"
        );
        assertFalse(result.success());
        assertTrue(result.error().contains("bound to vehicle"));
    }

    @Test
    void testValidParamedicSucceeds() {
        AuthService.AuthResult result = authService.authenticate(
                "PARAMEDIC", "MED-702", "1001", "KA-01-AE-1001", null, "127.0.0.1"
        );
        assertTrue(result.success());
        assertEquals("PARAMEDIC", result.role());
        assertEquals("KA-01-AE-1001", result.vehicleId());
    }

    @Test
    void testRoleMismatchFails() {
        // Attempting to log in as DISPATCHER with a PARAMEDIC badge
        AuthService.AuthResult result = authService.authenticate(
                "DISPATCHER", "MED-702", "1001", null, null, "127.0.0.1"
        );
        assertFalse(result.success());
        assertTrue(result.error().contains("Role mismatch"));
    }
}
