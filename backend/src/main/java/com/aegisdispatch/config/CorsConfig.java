package com.aegisdispatch.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Centralized CORS configuration allowing fine-grained control over allowed origins
 * via the `app.cors-allowed-origins` or `app.cors-origin` property or environment variables.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.cors-allowed-origins:${app.cors-origin:http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173,http://127.0.0.1:8080,http://172.20.10.2:5173,http://172.20.10.2:8080}}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        registry.addMapping("/api/**")
                .allowedOriginPatterns(origins.length > 0 ? origins : new String[]{"*"})
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
