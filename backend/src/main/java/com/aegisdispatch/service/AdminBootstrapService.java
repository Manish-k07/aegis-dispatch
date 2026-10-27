package com.aegisdispatch.service;

import com.aegisdispatch.model.User;
import com.aegisdispatch.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AdminBootstrapService implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapService.class);

    private final UserRepository userRepository;
    private final String adminUsername;
    private final String adminPassword;

    public AdminBootstrapService(
            UserRepository userRepository,
            @Value("${app.admin.username:${AEGIS_ADMIN_USERNAME:admin}}") String adminUsername,
            @Value("${app.admin.password:${AEGIS_ADMIN_PASSWORD:Admin@Aegis2026}}") String adminPassword
    ) {
        this.userRepository = userRepository;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        // Skip creation if any admin exists
        if (userRepository.existsByRole("ADMIN")) {
            log.info("System administrator account exists. Skipping bootstrap.");
            return;
        }

        UUID adminId = UUID.randomUUID();
        String hashedPassword = JwtService.hashPassword(adminPassword);
        User admin = new User(adminId, adminUsername, hashedPassword, "ADMIN", "System Administrator", "+919800000000");
        admin.setForcePasswordChange(true);
        admin.setEnabled(true);
        userRepository.save(admin);

        // NEVER log the password
        log.info("Bootstrapped first-run administrator account '{}' with force_password_change=true.", adminUsername);
    }
}
