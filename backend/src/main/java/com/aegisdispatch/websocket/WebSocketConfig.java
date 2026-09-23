package com.aegisdispatch.websocket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final LiveSocketHandler handler;

    @Value("${app.cors-allowed-origins:http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173,http://127.0.0.1:8080,http://172.20.10.2:5173,http://172.20.10.2:8080}")
    private String allowedOrigins;

    public WebSocketConfig(LiveSocketHandler h) {
        this.handler = h;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry r) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        r.addHandler(handler, "/ws/live")
         .setAllowedOrigins(origins.length > 0 ? origins : new String[]{"*"});
    }
}
