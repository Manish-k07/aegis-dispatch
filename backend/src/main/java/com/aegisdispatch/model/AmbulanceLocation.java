package com.aegisdispatch.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ambulance_locations")
public class AmbulanceLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ambulance_id", nullable = false)
    private UUID ambulanceId;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(nullable = false)
    private double speed;

    @Column(nullable = false)
    private double heading;

    @Column(nullable = false)
    private String status;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt = Instant.now();

    public AmbulanceLocation() {}

    public AmbulanceLocation(UUID ambulanceId, double latitude, double longitude, double speed, double heading, String status) {
        this.ambulanceId = ambulanceId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.speed = speed;
        this.heading = heading;
        this.status = status;
        this.recordedAt = Instant.now();
    }

    public Long getId() { return id; }
    public UUID getAmbulanceId() { return ambulanceId; }
    public void setAmbulanceId(UUID ambulanceId) { this.ambulanceId = ambulanceId; }
    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    public double getSpeed() { return speed; }
    public void setSpeed(double speed) { this.speed = speed; }
    public double getHeading() { return heading; }
    public void setHeading(double heading) { this.heading = heading; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getRecordedAt() { return recordedAt; }
    public void setRecordedAt(Instant recordedAt) { this.recordedAt = recordedAt; }
}
