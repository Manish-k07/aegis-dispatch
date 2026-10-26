package com.aegisdispatch.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "incident_events")
public class IncidentEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "incident_id", nullable = false)
    private UUID incidentId;

    @Column(name = "dispatch_id")
    private UUID dispatchId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(nullable = false)
    private String actor;

    @Column(name = "from_status")
    private String fromStatus;

    @Column(name = "to_status", nullable = false)
    private String toStatus;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    public IncidentEvent() {}

    public IncidentEvent(UUID incidentId, UUID dispatchId, String eventType, String actor, String fromStatus, String toStatus, String notes) {
        this.incidentId = incidentId;
        this.dispatchId = dispatchId;
        this.eventType = eventType;
        this.actor = actor;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.notes = notes;
        this.occurredAt = Instant.now();
    }

    public Long getId() { return id; }
    public UUID getIncidentId() { return incidentId; }
    public UUID getDispatchId() { return dispatchId; }
    public String getEventType() { return eventType; }
    public String getActor() { return actor; }
    public String getFromStatus() { return fromStatus; }
    public String getToStatus() { return toStatus; }
    public String getNotes() { return notes; }
    public Instant getOccurredAt() { return occurredAt; }
}
