package com.aegisdispatch.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="emergencies")
public class Emergency {
 @Id private UUID id; @Column(name="caller_name") private String callerName; private String phone,type,description,address,status; @Column(name="patient_count") private int patientCount; private String priority; private double latitude,longitude; @Column(name="created_at") private Instant createdAt; @Column(name="updated_at") private Instant updatedAt;
 public UUID getId(){return id;} public void setId(UUID v){id=v;} public String getCallerName(){return callerName;} public void setCallerName(String v){callerName=v;} public String getPhone(){return phone;} public void setPhone(String v){phone=v;} public String getType(){return type;} public void setType(String v){type=v;} public String getDescription(){return description;} public void setDescription(String v){description=v;} public String getAddress(){return address;} public void setAddress(String v){address=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public int getPatientCount(){return patientCount;} public void setPatientCount(int v){patientCount=v;} public String getPriority(){return priority;} public void setPriority(String v){priority=v;} public double getLatitude(){return latitude;} public void setLatitude(double v){latitude=v;} public double getLongitude(){return longitude;} public void setLongitude(double v){longitude=v;} public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;} public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
