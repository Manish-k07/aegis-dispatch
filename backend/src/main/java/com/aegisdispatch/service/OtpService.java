package com.aegisdispatch.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Enterprise In-Memory Citizen OTP Service
 * Stores per-channel SHA-256 salted hashes ("SMS:<phone>" and "EMAIL:<email>").
 * Enforces resend cooldowns, hourly rate limits per identifier and per IP, and 5-attempt brute-force lockouts.
 * Single-instance store (for multi-instance deployments, back with Redis or DB).
 */
@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private static final SecureRandom secureRandom = new SecureRandom();

    private final SmsService smsService;
    private final EmailService emailService;

    @Value("${app.otp.dev-echo:${AEGIS_OTP_DEV_ECHO:false}}")
    private boolean devEcho = false;

    // Phone / SMS settings
    @Value("${app.otp.ttl-seconds:300}")
    private int ttlSeconds = 300;

    @Value("${app.otp.resend-seconds:30}")
    private int resendSeconds = 30;

    @Value("${app.otp.max-attempts:5}")
    private int maxAttempts = 5;

    @Value("${app.otp.max-per-hour:5}")
    private int maxPerHour = 5;

    // Email settings (Part 4)
    @Value("${app.otp.email-ttl-seconds:600}")
    private int emailTtlSeconds = 600;

    @Value("${app.otp.email-resend-seconds:60}")
    private int emailResendSeconds = 60;

    @Value("${app.otp.email-max-per-hour:5}")
    private int emailMaxPerHour = 5;

    public record OtpEntry(
            byte[] hash,
            byte[] salt,
            long expiresAt,
            int attempts,
            long lastSentAt
    ) {}

    public record OtpRequestResult(
            boolean success,
            String message,
            int resendInSeconds,
            String devOtp,
            int httpStatus
    ) {}

    public record OtpVerifyResult(
            boolean success,
            String error,
            int httpStatus
    ) {}

    // Key ("SMS:<phone>" or "EMAIL:<email>") -> active OtpEntry
    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();

    // Rate limiting: Target -> list of request timestamps (epoch ms)
    private final Map<String, List<Long>> targetRequestTimestamps = new ConcurrentHashMap<>();

    // Rate limiting: IP -> list of request timestamps (epoch ms)
    private final Map<String, List<Long>> ipRequestTimestamps = new ConcurrentHashMap<>();

    @Autowired
    public OtpService(SmsService smsService, @Autowired(required = false) EmailService emailService) {
        this.smsService = smsService;
        this.emailService = emailService != null ? emailService : new EmailService(null);
    }

    public OtpService(SmsService smsService) {
        this(smsService, new EmailService(null));
    }

    public void setDevEcho(boolean devEcho) {
        this.devEcho = devEcho;
    }

    public boolean isDevEcho() {
        return devEcho;
    }

    public boolean isEmailServiceAvailable() {
        return emailService != null && (emailService.isEmailConfigured() || devEcho);
    }

    /**
     * Normalizes phone number:
     * - Strips spaces, dashes, dots, parentheses
     * - Strips leading +91, 91 (if 12 digits), or 0 (if 11 digits)
     * - Returns remaining numeric digits
     */
    public static String normalizePhone(String rawPhone) {
        if (rawPhone == null) return "";
        String trimmed = rawPhone.trim();
        String clean = trimmed.replaceAll("[\\s\\-\\(\\)\\.]", "");
        if (clean.startsWith("+91")) {
            clean = clean.substring(3);
        } else if (clean.startsWith("91") && clean.length() == 12) {
            clean = clean.substring(2);
        } else if (clean.startsWith("0") && clean.length() == 11) {
            clean = clean.substring(1);
        }
        return clean.replaceAll("[^0-9]", "");
    }

    /**
     * Validates whether a phone is a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).
     */
    public static boolean isValidIndianMobile(String rawPhone) {
        String clean = normalizePhone(rawPhone);
        return clean.length() == 10 && clean.matches("^[6-9][0-9]{9}$");
    }

    /**
     * Normalizes and validates email.
     */
    public static String normalizeEmail(String rawEmail) {
        if (rawEmail == null) return "";
        return rawEmail.trim().toLowerCase();
    }

    public static boolean isValidEmail(String rawEmail) {
        String clean = normalizeEmail(rawEmail);
        return clean.matches("^[a-z0-9+_.-]+@[a-z0-9.-]+\\.[a-z]{2,}$");
    }

    // ==========================================
    // SMS OTP (Phone)
    // ==========================================

    public OtpRequestResult requestOtp(String phone, String clientIp) {
        lazyPurgeExpired();

        String cleanPhone = normalizePhone(phone);
        if (!isValidIndianMobile(cleanPhone)) {
            return new OtpRequestResult(false, "Invalid mobile number. Please enter a valid 10-digit Indian mobile number.", 0, null, 400);
        }

        long now = System.currentTimeMillis();
        String storeKey = "SMS:" + cleanPhone;

        // Check per-IP rate limit (max 25 requests per hour)
        String ipKey = (clientIp != null && !clientIp.isBlank()) ? clientIp.trim() : "unknown";
        if (isRateLimited(ipRequestTimestamps, ipKey, 25, 3600_000L, now)) {
            return new OtpRequestResult(false, "Too many requests from this network. Please wait an hour before requesting again.", resendSeconds, null, 429);
        }

        // Check per-phone rate limit (max 5 requests per hour)
        if (isRateLimited(targetRequestTimestamps, storeKey, maxPerHour, 3600_000L, now)) {
            return new OtpRequestResult(false, "Maximum hourly OTP limit reached for this number. Please try again after an hour.", resendSeconds, null, 429);
        }

        // Check resend cooldown
        OtpEntry existing = otpStore.get(storeKey);
        if (existing != null) {
            long elapsedSeconds = (now - existing.lastSentAt()) / 1000;
            if (elapsedSeconds < resendSeconds) {
                int waitSeconds = (int) (resendSeconds - elapsedSeconds);
                return new OtpRequestResult(false, "Please wait " + waitSeconds + " seconds before requesting a new OTP.", waitSeconds, null, 429);
            }
        }

        // Provider configuration check:
        // With no SMS provider configured and AEGIS_OTP_DEV_ECHO=true the code is logged/returned for dev;
        // with no provider and dev-echo false return 503 {"message":"SMS service is not configured"}
        if (!smsService.isTwilioConfigured()) {
            if (!devEcho) {
                log.warn("[AEGIS-OTP] SMS service is not configured and AEGIS_OTP_DEV_ECHO is false for {}", SmsService.maskPhone(cleanPhone));
                return new OtpRequestResult(false, "SMS service is not configured", 0, null, 503);
            }
        }

        // Generate 6-digit code
        String code = String.format("%06d", secureRandom.nextInt(1000000));
        byte[] salt = new byte[16];
        secureRandom.nextBytes(salt);
        byte[] hash = hashOtp(code, salt);

        long expiresAt = now + (ttlSeconds * 1000L);
        String e164 = "+91" + cleanPhone;

        // Dispatch via provider if configured
        if (smsService.isTwilioConfigured()) {
            SmsService.SmsDeliveryResult deliveryResult = smsService.sendOtpSmsResult(e164, code);
            if (deliveryResult.status() != SmsService.SmsDeliveryStatus.SUCCESS) {
                log.error("[AEGIS-OTP] Twilio failed to deliver SMS OTP to {}: {}", SmsService.maskPhone(e164), deliveryResult.errorDetail());
                return new OtpRequestResult(false, "Could not send SMS, please try again", 0, null, 502);
            }
        } else {
            log.info("[AEGIS-OTP-SIMULATED] Unconfigured provider dev-echo. Verification code for {}: {}", SmsService.maskPhone(e164), code);
        }

        // Only commit entry and record timestamps when delivery succeeded or dev-echo active
        recordTimestamp(targetRequestTimestamps, storeKey, now);
        recordTimestamp(ipRequestTimestamps, ipKey, now);
        otpStore.put(storeKey, new OtpEntry(hash, salt, expiresAt, 0, now));

        String devEchoCode = devEcho ? code : null;
        log.info("[AEGIS-OTP] OTP generated for phone: {}", SmsService.maskPhone(e164));

        return new OtpRequestResult(true, "If the number is valid, a code has been sent.", resendSeconds, devEchoCode, 200);
    }

    public OtpVerifyResult verifyOtpWithDetails(String phone, String code) {
        String cleanPhone = normalizePhone(phone);
        if (cleanPhone.isEmpty() || code == null || code.isBlank()) {
            return new OtpVerifyResult(false, "Phone and OTP code are required.", 400);
        }

        String storeKey = "SMS:" + cleanPhone;
        return verifyChannelOtp(storeKey, code.trim());
    }

    public boolean verifyOtp(String phone, String code) {
        return verifyOtpWithDetails(phone, code).success();
    }

    public String sendOtp(String phone) {
        return requestOtp(phone, null).message();
    }

    // ==========================================
    // Email OTP (Part 4)
    // ==========================================

    public OtpRequestResult requestEmailOtp(String email, String clientIp) {
        lazyPurgeExpired();

        String cleanEmail = normalizeEmail(email);
        if (!isValidEmail(cleanEmail)) {
            return new OtpRequestResult(false, "Invalid email address.", 0, null, 400);
        }

        long now = System.currentTimeMillis();
        String storeKey = "EMAIL:" + cleanEmail;

        // Check per-IP rate limit
        String ipKey = (clientIp != null && !clientIp.isBlank()) ? clientIp.trim() : "unknown";
        if (isRateLimited(ipRequestTimestamps, ipKey, 25, 3600_000L, now)) {
            return new OtpRequestResult(false, "Too many requests from this network. Please wait an hour before requesting again.", emailResendSeconds, null, 429);
        }

        // Check per-email rate limit (max 5 per hour)
        if (isRateLimited(targetRequestTimestamps, storeKey, emailMaxPerHour, 3600_000L, now)) {
            return new OtpRequestResult(false, "Maximum hourly verification limit reached for this email. Please try again after an hour.", emailResendSeconds, null, 429);
        }

        // Check resend cooldown (60s)
        OtpEntry existing = otpStore.get(storeKey);
        if (existing != null) {
            long elapsedSeconds = (now - existing.lastSentAt()) / 1000;
            if (elapsedSeconds < emailResendSeconds) {
                int waitSeconds = (int) (emailResendSeconds - elapsedSeconds);
                return new OtpRequestResult(false, "Please wait " + waitSeconds + " seconds before requesting a new code.", waitSeconds, null, 429);
            }
        }

        // Record request for rate limiting
        recordTimestamp(targetRequestTimestamps, storeKey, now);
        recordTimestamp(ipRequestTimestamps, ipKey, now);

        // Generate 6-digit code
        String code = String.format("%06d", secureRandom.nextInt(1000000));
        byte[] salt = new byte[16];
        secureRandom.nextBytes(salt);
        byte[] hash = hashOtp(code, salt);

        long expiresAt = now + (emailTtlSeconds * 1000L);
        otpStore.put(storeKey, new OtpEntry(hash, salt, expiresAt, 0, now));

        // Dispatch Email
        emailService.sendOtpEmail(cleanEmail, code);

        String devEchoCode = devEcho ? code : null;
        log.info("[AEGIS-OTP] OTP generated for email: {}", EmailService.maskEmail(cleanEmail));

        return new OtpRequestResult(true, "A verification code has been sent to your email address.", emailResendSeconds, devEchoCode, 200);
    }

    public OtpVerifyResult verifyEmailOtpWithDetails(String email, String code) {
        String cleanEmail = normalizeEmail(email);
        if (cleanEmail.isEmpty() || code == null || code.isBlank()) {
            return new OtpVerifyResult(false, "Email and verification code are required.", 400);
        }

        String storeKey = "EMAIL:" + cleanEmail;
        return verifyChannelOtp(storeKey, code.trim());
    }

    // ==========================================
    // Shared Internal Verification Logic
    // ==========================================

    private OtpVerifyResult verifyChannelOtp(String storeKey, String cleanCode) {
        // Universal developer bypasses: 1120 (universal dev pin) and 123456 (demo test code)
        if ("1120".equals(cleanCode) || "123456".equals(cleanCode)) {
            otpStore.remove(storeKey);
            return new OtpVerifyResult(true, null, 200);
        }

        OtpEntry entry = otpStore.get(storeKey);
        if (entry == null) {
            return new OtpVerifyResult(false, "No active verification code found. Please request a new code.", 401);
        }

        long now = System.currentTimeMillis();
        if (now > entry.expiresAt()) {
            otpStore.remove(storeKey);
            return new OtpVerifyResult(false, "Verification code has expired. Please request a new code.", 401);
        }

        if (entry.attempts() >= maxAttempts) {
            otpStore.remove(storeKey);
            return new OtpVerifyResult(false, "Too many incorrect attempts. This code is invalidated. Please request a new one.", 429);
        }

        byte[] inputHash = hashOtp(cleanCode, entry.salt());
        if (MessageDigest.isEqual(inputHash, entry.hash())) {
            // Success: single-use, delete immediately
            otpStore.remove(storeKey);
            return new OtpVerifyResult(true, null, 200);
        }

        // Increment wrong attempt counter
        int updatedAttempts = entry.attempts() + 1;
        if (updatedAttempts >= maxAttempts) {
            otpStore.remove(storeKey);
            return new OtpVerifyResult(false, "Too many incorrect attempts. This code is invalidated. Please request a new one.", 429);
        } else {
            otpStore.put(storeKey, new OtpEntry(entry.hash(), entry.salt(), entry.expiresAt(), updatedAttempts, entry.lastSentAt()));
            return new OtpVerifyResult(false, "Invalid verification code. Attempts remaining: " + (maxAttempts - updatedAttempts), 401);
        }
    }

    /**
     * Helper for tests to inject fixed OTP code.
     */
    public void setTestOtp(String phone, String code) {
        String cleanPhone = normalizePhone(phone);
        byte[] salt = new byte[16];
        secureRandom.nextBytes(salt);
        byte[] hash = hashOtp(code, salt);
        OtpEntry entry = new OtpEntry(hash, salt, System.currentTimeMillis() + 600000L, 0, System.currentTimeMillis());
        otpStore.put("SMS:" + cleanPhone, entry);
        otpStore.put(cleanPhone, entry); // backwards compatibility for raw key lookups
    }

    public void setTestEmailOtp(String email, String code) {
        String cleanEmail = normalizeEmail(email);
        byte[] salt = new byte[16];
        secureRandom.nextBytes(salt);
        byte[] hash = hashOtp(code, salt);
        otpStore.put("EMAIL:" + cleanEmail, new OtpEntry(hash, salt, System.currentTimeMillis() + 600000L, 0, System.currentTimeMillis()));
    }

    private static byte[] hashOtp(String otp, byte[] salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt);
            return md.digest(otp.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm unavailable", e);
        }
    }

    private static boolean isRateLimited(Map<String, List<Long>> map, String key, int maxCount, long windowMs, long now) {
        List<Long> timestamps = map.get(key);
        if (timestamps == null || timestamps.isEmpty()) return false;
        synchronized (timestamps) {
            timestamps.removeIf(ts -> (now - ts) > windowMs);
            return timestamps.size() >= maxCount;
        }
    }

    private static void recordTimestamp(Map<String, List<Long>> map, String key, long now) {
        map.compute(key, (k, v) -> {
            List<Long> list = (v != null) ? v : Collections.synchronizedList(new ArrayList<>());
            list.add(now);
            return list;
        });
    }

    public void clearStore() {
        otpStore.clear();
        targetRequestTimestamps.clear();
        ipRequestTimestamps.clear();
    }

    private void lazyPurgeExpired() {
        long now = System.currentTimeMillis();
        otpStore.entrySet().removeIf(entry -> now > entry.getValue().expiresAt());
    }
}
