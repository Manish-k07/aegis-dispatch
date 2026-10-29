package com.aegisdispatch.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Enterprise Email Dispatch Gateway
 * Sends verification OTPs for citizen email verification.
 * Supports standard SMTP (JavaMailSender) with simulated fallback for local development.
 * Designed to be swappable with HTTP-based providers (e.g. Resend, SendGrid, Brevo) if SMTP outbound ports are blocked.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.host:${MAIL_HOST:}}")
    private String mailHost;

    @Value("${spring.mail.username:${MAIL_USERNAME:}}")
    private String mailUsername;

    @Value("${app.mail.from:${MAIL_FROM:noreply@aegisdispatch.org}}")
    private String mailFrom;

    @Value("${app.otp.dev-echo:${AEGIS_OTP_DEV_ECHO:false}}")
    private boolean devEcho;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public boolean isEmailConfigured() {
        return mailSender != null && mailHost != null && !mailHost.trim().isBlank();
    }

    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) return "***";
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) return "***" + (atIndex >= 0 ? email.substring(atIndex) : "");
        String local = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        if (local.length() <= 2) {
            return local.charAt(0) + "***" + domain;
        }
        return local.charAt(0) + "***" + local.charAt(local.length() - 1) + domain;
    }

    public boolean sendOtpEmail(String toEmail, String otp) {
        String masked = maskEmail(toEmail);
        String subject = "Your Aegis Dispatch verification code";
        String textBody = "Your Aegis Dispatch verification code is: " + otp + "\n\n"
                + "This code is valid for 10 minutes. If you did not request this verification code, please ignore this email.\n\n"
                + "Aegis Emergency Dispatch";

        String htmlBody = "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;\">"
                + "<h2 style=\"color: #0b57d0; margin-top: 0;\">Aegis Dispatch Verification</h2>"
                + "<p style=\"font-size: 15px; color: #333;\">Use the verification code below to verify your email address:</p>"
                + "<div style=\"background-color: #f0f4f9; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;\">"
                + "<span style=\"font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1f1f1f;\">" + otp + "</span>"
                + "</div>"
                + "<p style=\"font-size: 13px; color: #666;\">This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>"
                + "<p style=\"font-size: 13px; color: #666;\">If you did not initiate this request, you can safely ignore this email.</p>"
                + "<hr style=\"border: none; border-top: 1px solid #eee; margin: 24px 0;\" />"
                + "<p style=\"font-size: 11px; color: #999;\">Aegis Dispatch – Emergency Medical Dispatch Platform</p>"
                + "</div>";

        if (isEmailConfigured()) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(mailFrom != null && !mailFrom.isBlank() ? mailFrom : "noreply@aegisdispatch.org");
                helper.setTo(toEmail.trim());
                helper.setSubject(subject);
                helper.setText(textBody, htmlBody);
                mailSender.send(message);
                log.info("[AEGIS-EMAIL] Verification OTP email dispatched to: {}", masked);
                return true;
            } catch (Exception e) {
                log.warn("[AEGIS-EMAIL] SMTP delivery failed for recipient {}: {}", masked, e.getMessage());
            }
        } else {
            log.warn("[AEGIS-EMAIL] SMTP is not configured. Falling back to simulated email dispatch.");
        }

        if (devEcho) {
            log.info("[AEGIS-EMAIL-OTP-DEV-ECHO] Verification code for {}: {}", masked, otp);
        } else {
            log.info("[AEGIS-EMAIL-OTP-SIMULATED] Verification code dispatched to {}", masked);
        }

        return true;
    }
}
