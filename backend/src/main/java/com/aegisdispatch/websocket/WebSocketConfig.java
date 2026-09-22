package com.aegisdispatch.websocket;
import org.springframework.context.annotation.Configuration; import org.springframework.web.socket.config.annotation.*;
@Configuration @EnableWebSocket public class WebSocketConfig implements WebSocketConfigurer { private final LiveSocketHandler handler; public WebSocketConfig(LiveSocketHandler h){handler=h;} public void registerWebSocketHandlers(WebSocketHandlerRegistry r){r.addHandler(handler,"/ws/live").setAllowedOrigins("*");} }
