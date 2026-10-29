package com.aegisdispatch.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
public class JwtService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JwtService.class);
    private final String secretKey;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public JwtService(@Value("${app.jwt-secret:${app.jwt.secret:${JWT_SECRET:${AEGIS_JWT_SECRET:AegisDispatchSuperSecretKeyForJwtAuthenticationTokens2026!}}}}") String secretKey) {
        if (secretKey == null || secretKey.trim().length() < 32) {
            throw new IllegalStateException("Configured JWT secret key must be at least 32 characters (256 bits) for HMAC-SHA256 security.");
        }
        this.secretKey = secretKey;
        if (secretKey.contains("AegisDispatchSuperSecretKey") || secretKey.contains("super-secure-production")) {
            log.warn("[SECURITY AUDIT] Aegis Dispatch is running with a default or demo JWT secret key! In production environments, set the JWT_SECRET environment variable with a strong, random 256-bit secret string.");
        }
    }

    public static String hashPassword(String rawPassword) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(("aegis_salt_2026_" + rawPassword).getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }

    public static boolean verifyPassword(String rawPassword, String hashedPassword) {
        if (rawPassword == null || hashedPassword == null) return false;
        return hashPassword(rawPassword).equalsIgnoreCase(hashedPassword);
    }

    public String generateToken(String username, String role, String userLabel, String vehicleId, String hospitalId) {
        try {
            long now = System.currentTimeMillis();
            long exp = now + (24 * 3600 * 1000); // 24 hours

            Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
            Map<String, Object> claims = new LinkedHashMap<>();
            claims.put("sub", username);
            claims.put("role", role);
            claims.put("userLabel", userLabel);
            if (vehicleId != null) claims.put("vehicleId", vehicleId);
            if (hospitalId != null) claims.put("hospitalId", hospitalId);
            claims.put("iat", now / 1000);
            claims.put("exp", exp / 1000);

            String encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(header));
            String encodedClaims = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(claims));

            String signature = sign(encodedHeader + "." + encodedClaims);
            return encodedHeader + "." + encodedClaims + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Error generating token", e);
        }
    }

    /**
     * Signed, 15-minute registration token for phone OTP registration.
     */
    public String generateOtpRegistrationToken(String phone) {
        try {
            long now = System.currentTimeMillis();
            long exp = now + (15 * 60 * 1000); // 15 minutes

            Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
            Map<String, Object> claims = new LinkedHashMap<>();
            claims.put("purpose", "REGISTER");
            claims.put("phone", phone);
            claims.put("iat", now / 1000);
            claims.put("exp", exp / 1000);

            String encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(header));
            String encodedClaims = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(claims));

            String signature = sign(encodedHeader + "." + encodedClaims);
            return encodedHeader + "." + encodedClaims + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Error generating OTP registration token", e);
        }
    }

    /**
     * Signed, 15-minute token for Google Email verification (purpose: EMAIL_VERIFY).
     */
    public String generateEmailVerificationToken(String googleSub, String email, String name) {
        try {
            long now = System.currentTimeMillis();
            long exp = now + (15 * 60 * 1000); // 15 minutes

            Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
            Map<String, Object> claims = new LinkedHashMap<>();
            claims.put("purpose", "EMAIL_VERIFY");
            claims.put("googleSub", googleSub);
            claims.put("email", email);
            claims.put("name", name != null ? name : "");
            claims.put("iat", now / 1000);
            claims.put("exp", exp / 1000);

            String encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(header));
            String encodedClaims = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(claims));
            String signature = sign(encodedHeader + "." + encodedClaims);
            return encodedHeader + "." + encodedClaims + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Error generating email verification token", e);
        }
    }

    /**
     * Signed, 15-minute token for completing Google registration after email verified (purpose: REGISTER_GOOGLE).
     */
    public String generateGoogleRegistrationToken(String googleSub, String email, String name) {
        try {
            long now = System.currentTimeMillis();
            long exp = now + (15 * 60 * 1000); // 15 minutes

            Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
            Map<String, Object> claims = new LinkedHashMap<>();
            claims.put("purpose", "REGISTER_GOOGLE");
            claims.put("googleSub", googleSub);
            claims.put("email", email);
            claims.put("name", name != null ? name : "");
            claims.put("iat", now / 1000);
            claims.put("exp", exp / 1000);

            String encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(header));
            String encodedClaims = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(claims));
            String signature = sign(encodedHeader + "." + encodedClaims);
            return encodedHeader + "." + encodedClaims + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Error generating Google registration token", e);
        }
    }

    /**
     * Signed, 10-minute JWT with purpose=google-registration, googleSub, email, name
     */
    public String generateRegistrationTicket(String googleSub, String email, String name) {
        return generateRegistrationTicket(googleSub, email, name, null);
    }

    public String generateRegistrationTicket(String googleSub, String email, String name, String verifiedPhone) {
        try {
            long now = System.currentTimeMillis();
            long exp = now + (15 * 60 * 1000); // 15 minutes

            Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
            Map<String, Object> claims = new LinkedHashMap<>();
            claims.put("purpose", verifiedPhone != null ? "REGISTER_GOOGLE" : "google-registration");
            claims.put("googleSub", googleSub);
            claims.put("email", email);
            claims.put("name", name != null ? name : "");
            if (verifiedPhone != null) {
                claims.put("phone", verifiedPhone);
            }
            claims.put("iat", now / 1000);
            claims.put("exp", exp / 1000);

            String encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(header));
            String encodedClaims = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(claims));

            String signature = sign(encodedHeader + "." + encodedClaims);
            return encodedHeader + "." + encodedClaims + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Error generating registration ticket", e);
        }
    }

    /**
     * Verifies registration token signature, expiry, and purpose.
     */
    public Map<String, Object> validateRegistrationToken(String token, String expectedPurpose) {
        if (token == null || token.isBlank()) return null;
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;

            String content = parts[0] + "." + parts[1];
            String expectedSig = sign(content);
            if (!expectedSig.equals(parts[2])) {
                return null;
            }

            byte[] decodedClaims = Base64.getUrlDecoder().decode(parts[1]);
            @SuppressWarnings("unchecked")
            Map<String, Object> claims = objectMapper.readValue(decodedClaims, Map.class);

            long exp = ((Number) claims.get("exp")).longValue();
            if (System.currentTimeMillis() / 1000 > exp) {
                return null; // Expired
            }

            String purpose = (String) claims.get("purpose");
            if (expectedPurpose != null && !expectedPurpose.equalsIgnoreCase(purpose)) {
                // Also accept REGISTER_GOOGLE if expected is google-registration
                if (!("google-registration".equalsIgnoreCase(expectedPurpose) && "REGISTER_GOOGLE".equalsIgnoreCase(purpose))) {
                    return null;
                }
            }

            return claims;
        } catch (Exception e) {
            return null;
        }
    }

    public Map<String, Object> validateRegistrationTicket(String ticket) {
        return validateRegistrationToken(ticket, "google-registration");
    }

    /**
     * Validates authentication tokens.
     * The registration ticket MUST NEVER be accepted as a login token.
     */
    public Map<String, Object> validateAndExtractClaims(String token) {
        if (token == null || token.isBlank()) return null;
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;

            String content = parts[0] + "." + parts[1];
            String expectedSig = sign(content);
            if (!expectedSig.equals(parts[2])) {
                return null;
            }

            byte[] decodedClaims = Base64.getUrlDecoder().decode(parts[1]);
            @SuppressWarnings("unchecked")
            Map<String, Object> claims = objectMapper.readValue(decodedClaims, Map.class);

            long exp = ((Number) claims.get("exp")).longValue();
            if (System.currentTimeMillis() / 1000 > exp) {
                return null; // Expired
            }

            // Reject registration tokens when validating for login / authorization
            Object purpose = claims.get("purpose");
            if (purpose != null) {
                return null;
            }

            return claims;
        } catch (Exception e) {
            return null;
        }
    }

    private String sign(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] hmacData = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(hmacData);
    }
}
