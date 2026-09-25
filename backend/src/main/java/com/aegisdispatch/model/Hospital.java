package com.aegisdispatch.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "hospitals")
public class Hospital {

    @Id
    private UUID id;

    private String name;
    private String phone;
    @Column(name = "designated_ed_phone")
    private String designatedEdPhone;
    private String address;
    private String status;

    private double latitude;
    private double longitude;

    @Column(name = "emergency_department")
    private boolean emergencyDepartment;

    @Column(name = "icu_available")
    private boolean icuAvailable;

    @Column(name = "cardiac_services")
    private boolean cardiacServices;

    @Column(name = "pediatric_services")
    private boolean pediatricServices;

    @Column(name = "maternity_services")
    private boolean maternityServices;

    @Column(name = "total_beds")
    private int totalBeds = 120;

    @Column(name = "available_beds")
    private int availableBeds = 34;

    @Column(name = "icu_beds_total")
    private int icuBedsTotal = 20;

    @Column(name = "icu_beds_available")
    private int icuBedsAvailable = 5;

    @Column(name = "trauma_bays_total")
    private int traumaBaysTotal = 8;

    @Column(name = "trauma_bays_available")
    private int traumaBaysAvailable = 3;

    @Column(name = "cath_lab_operational")
    private boolean cathLabOperational = true;

    @Column(name = "demo_data")
    private boolean demoData;

    public UUID getId() { return id; }
    public void setId(UUID v) { id = v; }

    public String getName() { return name; }
    public void setName(String v) { name = v; }

    public String getPhone() { return phone; }
    public void setPhone(String v) { phone = v; }

    public String getDesignatedEdPhone() { return designatedEdPhone; }
    public void setDesignatedEdPhone(String v) { designatedEdPhone = v; }

    public String getAddress() { return address; }
    public void setAddress(String v) { address = v; }

    public String getStatus() { return status; }
    public void setStatus(String v) { status = v; }

    public double getLatitude() { return latitude; }
    public void setLatitude(double v) { latitude = v; }

    public double getLongitude() { return longitude; }
    public void setLongitude(double v) { longitude = v; }

    public boolean isEmergencyDepartment() { return emergencyDepartment; }
    public void setEmergencyDepartment(boolean v) { emergencyDepartment = v; }

    public boolean isIcuAvailable() { return icuAvailable; }
    public void setIcuAvailable(boolean v) { icuAvailable = v; }

    public boolean isCardiacServices() { return cardiacServices; }
    public void setCardiacServices(boolean v) { cardiacServices = v; }

    public boolean isPediatricServices() { return pediatricServices; }
    public void setPediatricServices(boolean v) { pediatricServices = v; }

    public boolean isMaternityServices() { return maternityServices; }
    public void setMaternityServices(boolean v) { maternityServices = v; }

    public int getTotalBeds() { return totalBeds; }
    public void setTotalBeds(int v) { totalBeds = v; }

    public int getAvailableBeds() { return availableBeds; }
    public void setAvailableBeds(int v) { availableBeds = v; }

    public int getIcuBedsTotal() { return icuBedsTotal; }
    public void setIcuBedsTotal(int v) { icuBedsTotal = v; }

    public int getIcuBedsAvailable() { return icuBedsAvailable; }
    public void setIcuBedsAvailable(int v) { icuBedsAvailable = v; }

    public int getTraumaBaysTotal() { return traumaBaysTotal; }
    public void setTraumaBaysTotal(int v) { traumaBaysTotal = v; }

    public int getTraumaBaysAvailable() { return traumaBaysAvailable; }
    public void setTraumaBaysAvailable(int v) { traumaBaysAvailable = v; }

    public boolean isCathLabOperational() { return cathLabOperational; }
    public void setCathLabOperational(boolean v) { cathLabOperational = v; }

    public boolean isDemoData() { return demoData; }
    public void setDemoData(boolean v) { demoData = v; }
}
