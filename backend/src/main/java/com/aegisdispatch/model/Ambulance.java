package com.aegisdispatch.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="ambulances")
public class Ambulance {
  @Id private UUID id; @Column(name="registration_number") private String registrationNumber; private String type; private String status;
  @Column(name="driver_name") private String driverName; @Column(name="emt_name") private String emtName;
  private double latitude, longitude, speed, heading; @Column(name="last_location_at") private Instant lastLocationAt;
  public UUID getId(){return id;} public void setId(UUID v){id=v;} public String getRegistrationNumber(){return registrationNumber;} public void setRegistrationNumber(String v){registrationNumber=v;}
  public String getType(){return type;} public void setType(String v){type=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public String getDriverName(){return driverName;} public void setDriverName(String v){driverName=v;} public String getEmtName(){return emtName;} public void setEmtName(String v){emtName=v;}
  public double getLatitude(){return latitude;} public void setLatitude(double v){latitude=v;} public double getLongitude(){return longitude;} public void setLongitude(double v){longitude=v;} public double getSpeed(){return speed;} public void setSpeed(double v){speed=v;} public double getHeading(){return heading;} public void setHeading(double v){heading=v;} public Instant getLastLocationAt(){return lastLocationAt;} public void setLastLocationAt(Instant v){lastLocationAt=v;}
}
