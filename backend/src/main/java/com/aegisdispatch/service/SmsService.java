package com.aegisdispatch.service;

import com.aegisdispatch.model.Ambulance;
import com.aegisdispatch.model.Dispatch;
import com.aegisdispatch.model.Emergency;
import com.aegisdispatch.model.Hospital;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Enterprise SMS Dispatch Gateway
 * Sends HIPAA-compliant pre-arrival notifications to Receiving Hospital ED triage teams.
 * Supports Twilio REST API integration with automated fallback to internal simulated carrier gateway.
 */
@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    private final AuditService auditService;
    private final HttpClient httpClient;

    @Value("${twilio.account.sid:}")
    private String twilioAccountSid;

    @Value("${twilio.auth.token:}")
    private String twilioAuthToken;

    @Value("${twilio.phone.number:}")
    private String twilioFromNumber;

    public SmsService(AuditService auditService) {
        this.auditService = auditService;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .build();
    }

    /**
     * Build HIPAA / DPDP Compliant SMS payload.
     * STRICT HEALTHCARE PRIVACY RULE:
     * Never include patient full names, street addresses, or personal phone numbers over unencrypted SMS.
     */
    public String buildHipaaPayload(Ambulance ambulance, Emergency emergency, Hospital hospital, Dispatch dispatch, Map<String, Object> vitals) {
        String unitReg = ambulance != null ? ambulance.getRegistrationNumber() : "UNIT-UNK";
        String unitType = ambulance != null ? ambulance.getType() : "ALS";
        int eta = dispatch != null ? (int) Math.round(dispatch.getEtaMinutes()) : 8;
        String acuity = emergency != null ? emergency.getPriority() : "CRITICAL";
        String complaint = emergency != null ? emergency.getType() : "CARDIAC";

        // Generate de-identified clinical tag (e.g. PT-4B29)
        String patientTag = emergency != null && emergency.getId() != null
                ? "PT-" + emergency.getId().toString().substring(0, 4).toUpperCase()
                : "PT-" + (int)(Math.random() * 9000 + 1000);

        String vitalsSummary = "HR 84 | BP 124/82 | SpO2 98%";
        if (vitals != null && !vitals.isEmpty()) {
            Object hr = vitals.getOrDefault("heartRate", 84);
            Object sys = vitals.getOrDefault("bloodPressureSys", 120);
            Object dia = vitals.getOrDefault("bloodPressureDia", 80);
            Object spo2 = vitals.getOrDefault("spO2", 98);
            vitalsSummary = String.format("HR %s | BP %s/%s | SpO2 %s%%", hr, sys, dia, spo2);
        }

        return String.format(
                "[AEGIS-ALERT] INBOUND AMBULANCE: %s (%s)\n" +
                "ETA: ~%d mins\n" +
                "PATIENT ID: #%s\n" +
                "ACUITY: %s\n" +
                "CHIEF COMPLAINT: %s\n" +
                "VITALS: %s\n" +
                "REPLY:\n" +
                "  1 to CONFIRM TRAUMA BAY READY\n" +
                "  2 for ED DIVERSION (REROUTE)",
                unitReg, unitType, eta, patientTag, acuity, complaint, vitalsSummary
        );
    }

    /**
     * Send Pre-Arrival SMS Notification to receiving Hospital ED.
     */
    public Map<String, Object> sendHospitalPreArrivalNotification(
            Ambulance ambulance,
            Emergency emergency,
            Hospital hospital,
            Dispatch dispatch,
            Map<String, Object> vitals
    ) {
        String targetPhone = (hospital != null && hospital.getDesignatedEdPhone() != null && !hospital.getDesignatedEdPhone().isBlank())
                ? hospital.getDesignatedEdPhone()
                : (hospital != null ? hospital.getPhone() : "+918000000000");

        String body = buildHipaaPayload(ambulance, emergency, hospital, dispatch, vitals);
        boolean sentViaTwilio = false;
        String messageId = "AEGIS-SMS-" + UUIDShort();

        if (isTwilioConfigured()) {
            try {
                sentViaTwilio = dispatchTwilioSms(targetPhone, body);
            } catch (Exception e) {
                log.warn("Twilio delivery failed, falling back to simulated carrier gateway: {}", e.getMessage());
            }
        }

        if (!sentViaTwilio) {
            log.info("Simulated Gateway: Pre-Arrival SMS dispatched to Hospital [{}] at phone [{}]:\n{}",
                    hospital != null ? hospital.getName() : "Unknown", targetPhone, body);
        }

        // Audit Trail entry
        if (dispatch != null) {
            auditService.log(
                    "Driver MDT (" + (ambulance != null ? ambulance.getRegistrationNumber() : "Ambulance") + ")",
                    "SMS_NOTIFIED_ED",
                    "DISPATCH",
                    dispatch.getId(),
                    "EN_ROUTE_TO_HOSPITAL",
                    "ED_PRE_ALERTED",
                    "hospital=" + (hospital != null ? hospital.getName() : "") + ";phone=" + targetPhone + ";msgId=" + messageId
            );
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("messageId", messageId);
        result.put("recipient", targetPhone);
        result.put("hospitalName", hospital != null ? hospital.getName() : "Destination Hospital");
        result.put("channel", sentViaTwilio ? "TWILIO_REST_API" : "SIMULATED_CARRIER_GATEWAY");
        result.put("sentAt", Instant.now().toString());
        result.put("payloadPreview", body);
        return result;
    }

    private boolean isTwilioConfigured() {
        return twilioAccountSid != null && !twilioAccountSid.isBlank()
                && twilioAuthToken != null && !twilioAuthToken.isBlank()
                && twilioFromNumber != null && !twilioFromNumber.isBlank();
    }

    private boolean dispatchTwilioSms(String toPhone, String body) throws Exception {
        String url = String.format("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", twilioAccountSid);
        String form = "To=" + java.net.URLEncoder.encode(toPhone, StandardCharsets.UTF_8)
                + "&From=" + java.net.URLEncoder.encode(twilioFromNumber, StandardCharsets.UTF_8)
                + "&Body=" + java.net.URLEncoder.encode(body, StandardCharsets.UTF_8);

        String auth = Base64.getEncoder().encodeToString((twilioAccountSid + ":" + twilioAuthToken).getBytes(StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization", "Basic " + auth)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .timeout(Duration.ofSeconds(6))
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return response.statusCode() >= 200 && response.statusCode() < 300;
    }

    private String UUIDShort() {
        return java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
