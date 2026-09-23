package com.aegisdispatch.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Filter that attaches industry-standard HTTP security headers to all incoming HTTP responses.
 * Protects against MIME-sniffing, clickjacking, cross-site scripting, and unauthorized framing.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (response instanceof HttpServletResponse httpResponse) {
            // Prevent browsers from MIME-sniffing a response away from declared content-type
            httpResponse.setHeader("X-Content-Type-Options", "nosniff");

            // Prevent clickjacking by disallowing framing
            httpResponse.setHeader("X-Frame-Options", "DENY");

            // Enable XSS filtering in older legacy browsers
            httpResponse.setHeader("X-XSS-Protection", "1; mode=block");

            // Strict referrer policy protecting query string parameters across origins
            httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

            // Restrict access to sensitive device features to self
            httpResponse.setHeader("Permissions-Policy", "geolocation=(self), microphone=(self), camera=()");

            // Content Security Policy for API server responses
            httpResponse.setHeader("Content-Security-Policy",
                    "default-src 'self'; " +
                    "connect-src 'self' http: https: ws: wss:; " +
                    "img-src 'self' data: blob: https:; " +
                    "style-src 'self' 'unsafe-inline' https:; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
                    "frame-ancestors 'none';");
        }
        chain.doFilter(request, response);
    }
}
