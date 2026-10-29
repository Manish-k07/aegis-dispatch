package com.aegisdispatch.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

/**
 * Server-side Google ID Token Verifier
 * Uses standard java.net.http.HttpClient to query Google OAuth2 tokeninfo endpoint without external dependencies.
 */
@Component
public class GoogleTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Value("${app.google.client-id:${GOOGLE_CLIENT_ID:}}")
    private String configuredClientId;

    public GoogleTokenVerifier(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(6))
                .build();
    }

    public record GooglePayload(String sub, String email, String name, boolean emailVerified) {}

    public String getConfiguredClientId() {
        return configuredClientId != null ? configuredClientId.trim() : "";
    }

    public boolean isConfigured() {
        return configuredClientId != null && !configuredClientId.trim().isBlank();
    }

    public GooglePayload verifyToken(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            return null;
        }

        // Security rule: Never accept "mock:" or "demo:" tokens on the server in any configuration
        if (idToken.startsWith("mock:") || idToken.startsWith("demo:")) {
            log.warn("[SECURITY] Rejected forbidden mock/demo Google token format.");
            return null;
        }

        if (!isConfigured()) {
            log.warn("Google Sign-In is not configured on the server (missing GOOGLE_CLIENT_ID).");
            return null;
        }

        try {
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + java.net.URLEncoder.encode(idToken, java.nio.charset.StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(6))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("Google tokeninfo returned status {}: {}", response.statusCode(), response.body());
                return null;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> body = objectMapper.readValue(response.body(), Map.class);
            if (body == null) return null;

            String aud = (String) body.get("aud");
            if (aud == null || !aud.equals(configuredClientId)) {
                log.warn("Google token audience mismatch: expected {}, got {}", configuredClientId, aud);
                return null;
            }

            String iss = (String) body.get("iss");
            if (iss == null || (!iss.equals("accounts.google.com") && !iss.equals("https://accounts.google.com"))) {
                log.warn("Google token issuer invalid: {}", iss);
                return null;
            }

            String emailVerifiedStr = String.valueOf(body.get("email_verified"));
            if (!"true".equalsIgnoreCase(emailVerifiedStr)) {
                log.warn("Google token email is not verified");
                return null;
            }

            Object expObj = body.get("exp");
            if (expObj != null) {
                try {
                    long expSeconds = Long.parseLong(expObj.toString());
                    if (System.currentTimeMillis() / 1000 > expSeconds) {
                        log.warn("Google token has expired: exp={}", expSeconds);
                        return null;
                    }
                } catch (Exception ignored) {}
            }

            String sub = (String) body.get("sub");
            String email = ((String) body.get("email")).toLowerCase();
            String name = (String) body.getOrDefault("name", email.split("@")[0]);

            return new GooglePayload(sub, email, name, true);
        } catch (Exception e) {
            log.warn("Exception verifying Google ID token: {}", e.getMessage());
            return null;
        }
    }
}
