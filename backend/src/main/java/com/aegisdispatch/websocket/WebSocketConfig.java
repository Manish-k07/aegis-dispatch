package com.aegisdispatch.websocket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

/**
 * WebSocket allowed origins use the same list as CORS_ORIGIN.
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final LiveSocketHandler handler;

    @Value("${app.cors-origin:${CORS_ORIGIN:http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173,http://127.0.0.1:8080}}")
    private String allowedOrigins;

    public WebSocketConfig(LiveSocketHandler handler) {
        this.handler = handler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        registry.addHandler(handler, "/ws/live")
                .setAllowedOrigins(origins);
    }
}
