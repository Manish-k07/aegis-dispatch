package com.aegisdispatch.repository;

import com.aegisdispatch.model.AmbulanceLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AmbulanceLocationRepository extends JpaRepository<AmbulanceLocation, Long> {
    List<AmbulanceLocation> findByAmbulanceIdOrderByRecordedAtDesc(UUID ambulanceId);
}
