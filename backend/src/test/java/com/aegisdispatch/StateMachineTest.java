package com.aegisdispatch;

import com.aegisdispatch.controller.DispatchController;
import com.aegisdispatch.model.*;
import com.aegisdispatch.repository.*;
import com.aegisdispatch.service.*;
import com.aegisdispatch.websocket.LiveSocketHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StateMachineTest {

    private EmergencyRepository emergencies;
    private AmbulanceRepository ambulances;
    private HospitalRepository hospitals;
    private DispatchRepository dispatches;
    private DispatchEngine engine;
    private LiveSocketHandler ws;
    private AuditService audit;
    private AuditLogRepository auditRepo;
    private AmbulanceLocationRepository locationRepo;
    private IncidentEventRepository incidentEventRepository;
    private SimulationService simulationService;
    private RoutingService routingService;
    private CadFileService cadFileService;
    private SmsService smsService;
    private HospitalCapacityService hospitalCapacityService;
    private PredictiveStagingService predictiveStagingService;

    private DispatchController controller;

    @BeforeEach
    void setUp() {
        emergencies = mock(EmergencyRepository.class);
        ambulances = mock(AmbulanceRepository.class);
        hospitals = mock(HospitalRepository.class);
        dispatches = mock(DispatchRepository.class);
        engine = mock(DispatchEngine.class);
        ws = mock(LiveSocketHandler.class);
        audit = mock(AuditService.class);
        auditRepo = mock(AuditLogRepository.class);
        locationRepo = mock(AmbulanceLocationRepository.class);
        incidentEventRepository = mock(IncidentEventRepository.class);
        simulationService = mock(SimulationService.class);
        routingService = mock(RoutingService.class);
        cadFileService = mock(CadFileService.class);
        smsService = mock(SmsService.class);
        hospitalCapacityService = mock(HospitalCapacityService.class);
        predictiveStagingService = mock(PredictiveStagingService.class);

        controller = new DispatchController(
                emergencies, ambulances, hospitals, dispatches, engine, ws, audit, auditRepo, locationRepo,
                incidentEventRepository, simulationService, routingService, cadFileService, smsService,
                hospitalCapacityService, predictiveStagingService, null
        );
    }

    @Test
    void testEmergencyCreationRecordsIncidentEvent() {
        Emergency e = new Emergency();
        e.setCallerName("John Doe");
        e.setPhone("+919999999999");
        e.setType("CARDIAC");
        e.setPriority("CRITICAL");
        e.setLatitude(12.9716);
        e.setLongitude(77.5946);
        e.setAddress("MG Road");

        when(emergencies.save(any(Emergency.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Emergency created = controller.createEmergency(e);
        assertNotNull(created.getId());
        assertEquals("PENDING_DISPATCH", created.getStatus());

        ArgumentCaptor<IncidentEvent> eventCaptor = ArgumentCaptor.forClass(IncidentEvent.class);
        verify(incidentEventRepository, times(1)).save(eventCaptor.capture());
        IncidentEvent event = eventCaptor.getValue();
        assertEquals(created.getId(), event.getIncidentId());
        assertEquals("EMERGENCY_REPORTED", event.getEventType());
        assertEquals("PENDING_DISPATCH", event.getToStatus());
    }

    @Test
    void testStatusTransitionLogsIncidentEvent() {
        UUID dispatchId = UUID.randomUUID();
        UUID emergencyId = UUID.randomUUID();
        UUID ambulanceId = UUID.randomUUID();

        Dispatch dispatch = new Dispatch();
        dispatch.setId(dispatchId);
        dispatch.setEmergencyId(emergencyId);
        dispatch.setAmbulanceId(ambulanceId);
        dispatch.setStatus("DISPATCHED");

        Emergency emergency = new Emergency();
        emergency.setId(emergencyId);
        emergency.setStatus("DISPATCHED");

        Ambulance ambulance = new Ambulance();
        ambulance.setId(ambulanceId);
        ambulance.setStatus("DISPATCHED");

        when(dispatches.findById(dispatchId)).thenReturn(Optional.of(dispatch));
        when(emergencies.findById(emergencyId)).thenReturn(Optional.of(emergency));
        when(ambulances.findById(ambulanceId)).thenReturn(Optional.of(ambulance));
        when(dispatches.save(any(Dispatch.class))).thenAnswer(inv -> inv.getArgument(0));

        // Paramedic moves EN_ROUTE_TO_SCENE
        ResponseEntity<?> resp = controller.updateStatus(dispatchId, Map.of(
                "status", "EN_ROUTE_TO_SCENE",
                "actor", "Paramedic Arun"
        ));

        assertEquals(200, resp.getStatusCode().value());
        assertEquals("EN_ROUTE_TO_SCENE", dispatch.getStatus());
        assertEquals("EN_ROUTE_TO_PATIENT", ambulance.getStatus());

        ArgumentCaptor<IncidentEvent> captor = ArgumentCaptor.forClass(IncidentEvent.class);
        verify(incidentEventRepository, times(1)).save(captor.capture());
        IncidentEvent ev = captor.getValue();
        assertEquals(emergencyId, ev.getIncidentId());
        assertEquals("DISPATCHED", ev.getFromStatus());
        assertEquals("EN_ROUTE_TO_SCENE", ev.getToStatus());
        assertEquals("Paramedic Arun", ev.getActor());
    }
}
