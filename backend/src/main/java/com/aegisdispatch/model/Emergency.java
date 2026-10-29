package com.aegisdispatch.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "emergencies")
public class Emergency {

    @Id
    private UUID id;

    @Column(name = "caller_name", nullable = false)
    private String callerName;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String type;

    @Column(name = "other_type_description")
    private String otherTypeDescription;

    @Column(name = "patient_count", nullable = false)
    private int patientCount = 1;

    @Column(nullable = false)
    private String priority;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String status;

    @Column(name = "cancel_reason_code")
    private String cancelReasonCode;

    @Column(name = "cancel_reason_text")
    private String cancelReasonText;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancelled_by")
    private String cancelledBy;

    @Column(name = "sos_triggered_at")
    private Instant sosTriggeredAt;

    @Column(name = "location_accuracy")
    private Double locationAccuracy;

    @Column(name = "location_source")
    private String locationSource;

    @Column(name = "device_info", columnDefinition = "TEXT")
    private String deviceInfo;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Emergency() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCallerName() { return callerName; }
    public void setCallerName(String callerName) { this.callerName = callerName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getOtherTypeDescription() { return otherTypeDescription; }
    public void setOtherTypeDescription(String otherTypeDescription) { this.otherTypeDescription = otherTypeDescription; }

    public int getPatientCount() { return patientCount; }
    public void setPatientCount(int patientCount) { this.patientCount = patientCount; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }

    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCancelReasonCode() { return cancelReasonCode; }
    public void setCancelReasonCode(String cancelReasonCode) { this.cancelReasonCode = cancelReasonCode; }

    public String getCancelReasonText() { return cancelReasonText; }
    public void setCancelReasonText(String cancelReasonText) { this.cancelReasonText = cancelReasonText; }

    public Instant getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(Instant cancelledAt) { this.cancelledAt = cancelledAt; }

    public String getCancelledBy() { return cancelledBy; }
    public void setCancelledBy(String cancelledBy) { this.cancelledBy = cancelledBy; }

    public Instant getSosTriggeredAt() { return sosTriggeredAt; }
    public void setSosTriggeredAt(Instant sosTriggeredAt) { this.sosTriggeredAt = sosTriggeredAt; }

    public Double getLocationAccuracy() { return locationAccuracy; }
    public void setLocationAccuracy(Double locationAccuracy) { this.locationAccuracy = locationAccuracy; }

    public String getLocationSource() { return locationSource; }
    public void setLocationSource(String locationSource) { this.locationSource = locationSource; }

    public String getDeviceInfo() { return deviceInfo; }
    public void setDeviceInfo(String deviceInfo) { this.deviceInfo = deviceInfo; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
