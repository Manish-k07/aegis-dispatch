package com.aegisdispatch;

import com.aegisdispatch.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AegisDispatchApplicationTests {

    @Autowired
    private EmergencyRepository emergencyRepository;

    @Autowired
    private AmbulanceRepository ambulanceRepository;

    @Autowired
    private HospitalRepository hospitalRepository;

    @Test
    void contextLoads() {
        assertNotNull(emergencyRepository);
        assertNotNull(ambulanceRepository);
        assertNotNull(hospitalRepository);

        assertTrue(emergencyRepository.count() > 0, "Seed emergencies should be loaded");
        assertTrue(ambulanceRepository.count() > 0, "Seed ambulances should be loaded");
        assertTrue(hospitalRepository.count() > 0, "Seed hospitals should be loaded");
    }
}
