package com.aegisdispatch.repository;

import com.aegisdispatch.model.IncidentEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface IncidentEventRepository extends JpaRepository<IncidentEvent, Long> {
    List<IncidentEvent> findByIncidentIdOrderByOccurredAtAsc(UUID incidentId);
    List<IncidentEvent> findByDispatchIdOrderByOccurredAtAsc(UUID dispatchId);
}
