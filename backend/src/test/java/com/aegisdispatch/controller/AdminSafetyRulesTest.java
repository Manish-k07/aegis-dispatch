package com.aegisdispatch.controller;

import com.aegisdispatch.model.Ambulance;
import com.aegisdispatch.model.Dispatch;
import com.aegisdispatch.model.Hospital;
import com.aegisdispatch.model.User;
import com.aegisdispatch.repository.AmbulanceRepository;
import com.aegisdispatch.repository.DispatchRepository;
import com.aegisdispatch.repository.HospitalRepository;
import com.aegisdispatch.repository.UserRepository;
import com.aegisdispatch.service.AuditService;
import com.aegisdispatch.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.*;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

public class AdminSafetyRulesTest {

    private UserRepository userRepository;
    private AmbulanceRepository ambulanceRepository;
    private HospitalRepository hospitalRepository;
    private DispatchRepository dispatchRepository;
    private JwtService jwtService;
    private AuditService auditService;
    private AdminController controller;

    private final String authHeader = "Bearer admin-token";
    private final UUID adminId = UUID.randomUUID();
    private final String adminUsername = "admin";

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        ambulanceRepository = mock(AmbulanceRepository.class);
        hospitalRepository = mock(HospitalRepository.class);
        dispatchRepository = mock(DispatchRepository.class);
        jwtService = mock(JwtService.class);
        auditService = mock(AuditService.class);

        controller = new AdminController(
                userRepository,
                ambulanceRepository,
                hospitalRepository,
                dispatchRepository,
                jwtService,
                auditService
        );

        when(jwtService.validateAndExtractClaims("admin-token")).thenReturn(Map.of(
                "sub", adminUsername,
                "role", "ADMIN"
        ));
    }

    @Test
    void testRejectAdminSelfDelete() {
        User adminUser = new User(adminId, adminUsername, "hash", "ADMIN", "System Admin", "+919800000000");
        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));
        when(userRepository.findByUsername(adminUsername)).thenReturn(Optional.of(adminUser));

        ResponseEntity<?> response = controller.deleteUser(authHeader, adminId);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void testRejectDeleteLastAdmin() {
        UUID secondAdminId = UUID.randomUUID();
        User secondAdmin = new User(secondAdminId, "admin2", "hash", "ADMIN", "Second Admin", "+919800000001");
        User callingAdmin = new User(adminId, adminUsername, "hash", "ADMIN", "System Admin", "+919800000000");

        when(userRepository.findById(secondAdminId)).thenReturn(Optional.of(secondAdmin));
        when(userRepository.findByUsername(adminUsername)).thenReturn(Optional.of(callingAdmin));
        // Only 1 admin in the system
        when(userRepository.findAll()).thenReturn(List.of(secondAdmin));

        ResponseEntity<?> response = controller.deleteUser(authHeader, secondAdminId);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void testRejectDeletingUnitWithActiveMission() {
        UUID unitId = UUID.randomUUID();
        Ambulance busyUnit = new Ambulance();
        busyUnit.setId(unitId);
        busyUnit.setRegistrationNumber("KA-01-AE-1001");
        busyUnit.setStatus("DISPATCHED");

        when(ambulanceRepository.findById(unitId)).thenReturn(Optional.of(busyUnit));
        when(dispatchRepository.findAll()).thenReturn(Collections.emptyList());

        ResponseEntity<?> response = controller.deleteAmbulance(authHeader, unitId);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void testRejectDeletingHospitalWithActiveIncidentDestination() {
        UUID hospitalId = UUID.randomUUID();
        Hospital hosp = new Hospital();
        hosp.setId(hospitalId);
        hosp.setName("City General");

        Dispatch activeDispatch = new Dispatch();
        activeDispatch.setId(UUID.randomUUID());
        activeDispatch.setHospitalId(hospitalId);
        activeDispatch.setStatus("TRANSPORTING");

        when(hospitalRepository.findById(hospitalId)).thenReturn(Optional.of(hosp));
        when(dispatchRepository.findAll()).thenReturn(List.of(activeDispatch));

        ResponseEntity<?> response = controller.deleteHospital(authHeader, hospitalId);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }
}
