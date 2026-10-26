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

    private final String secretKey;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public JwtService(@Value("${app.jwt.secret:${AEGIS_JWT_SECRET:aegis-dispatch-super-secure-production-jwt-hmac-sha256-secret-key-2026}}") String secretKey) {
        this.secretKey = secretKey;
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
