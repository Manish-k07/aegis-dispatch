package com.aegisdispatch.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

/**
 * Backend CORS allows the frontend origin(s) from an env variable (CORS_ORIGIN),
 * with credentials only for those origins.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.cors-origin:${CORS_ORIGIN:http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173,http://127.0.0.1:8080}}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        registry.addMapping("/**")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
