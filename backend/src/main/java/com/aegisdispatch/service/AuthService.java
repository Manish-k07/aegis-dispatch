package com.aegisdispatch.service;

import com.aegisdispatch.model.User;
import com.aegisdispatch.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // In-memory rate limiter: IP -> List of attempt timestamps
    private final Map<String, List<Long>> loginRateLimiter = new ConcurrentHashMap<>();
    private final Map<String, List<Long>> sosRateLimiter = new ConcurrentHashMap<>();

    public record AuthResult(
            boolean success,
            String error,
            String token,
            String role,
            String userLabel,
            String subLabel,
            String badgeNumber,
            String unitId,
            String vehicleId,
            String hospitalId,
            boolean forcePasswordChange,
            Map<String, Object> citizenProfile
    ) {
        public AuthResult(boolean success, String error, String token, String role,
                          String userLabel, String subLabel, String badgeNumber,
                          String unitId, String vehicleId, String hospitalId,
                          Map<String, Object> citizenProfile) {
            this(success, error, token, role, userLabel, subLabel, badgeNumber, unitId, vehicleId, hospitalId, false, citizenProfile);
        }
    }

    @Autowired
    public AuthService(UserRepository userRepository, JwtService jwtService, Environment environment) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        initSeedUsersIfEmpty(environment != null && (Arrays.asList(environment.getActiveProfiles()).contains("dev-seed") || userRepository.count() == 0));
    }

    // Constructor for isolated unit testing
    public AuthService() {
        this.userRepository = new InMemoryUserRepository();
        this.jwtService = new JwtService("aegis-dispatch-test-jwt-hmac-sha256-secret-key-2026-very-secure");
        initSeedUsersIfEmpty(true);
    }

    public synchronized void initSeedUsersIfEmpty(boolean seed) {
        if (!seed) return;

        // Dispatchers
        saveOrUpdateSeedUser("CAD-042", "1120", "DISPATCHER", "A. Sharma", "+919800000001", null, null, Map.of("badge", "CAD-042", "title", "Lead CAD Dispatcher"));
        saveOrUpdateSeedUser("DISPATCH-01", "Dispatch@2026", "DISPATCHER", "A. Sharma", "+919800000002", null, null, Map.of("badge", "DISPATCH-01", "title", "Lead CAD Dispatcher"));
        saveOrUpdateSeedUser("CAD-001", "Dispatch@2026", "DISPATCHER", "A. Sharma", "+919800000003", null, null, Map.of("badge", "CAD-001"));
        saveOrUpdateSeedUser("DISPATCHER", "Dispatch@2026", "DISPATCHER", "Lead Dispatcher", "+919800000004", null, null, Map.of("badge", "DISPATCHER"));

        // Paramedics
        saveOrUpdateSeedUser("MED-702", "1001", "PARAMEDIC", "Arun Kumar", "+919800000011", "KA-01-AE-1001", null, Map.of("badge", "MED-702", "unitId", "amb-1"));
        saveOrUpdateSeedUser("MED-703", "1002", "PARAMEDIC", "Ravi S", "+919800000012", "KA-01-AE-1002", null, Map.of("badge", "MED-703", "unitId", "amb-2"));
        saveOrUpdateSeedUser("MED-704", "1003", "PARAMEDIC", "Vijay P", "+919800000013", "KA-01-AE-1003", null, Map.of("badge", "MED-704", "unitId", "amb-3"));

        // Hospital Staff
        saveOrUpdateSeedUser("HOSP-101", "2001", "HOSPITAL_STAFF", "Dr. V. Rao", "+919800000021", null, "10000000-0000-0000-0000-000000000001",
                Map.of("badge", "HOSP-101", "hospitalId", "10000000-0000-0000-0000-000000000001", "hospitalName", "Aegis City General"));
        saveOrUpdateSeedUser("HOSP-201", "2002", "HOSPITAL_STAFF", "Dr. S. Nair", "+919800000022", null, "10000000-0000-0000-0000-000000000002",
                Map.of("badge", "HOSP-201", "hospitalId", "10000000-0000-0000-0000-000000000002", "hospitalName", "Metro Trauma Centre"));
        saveOrUpdateSeedUser("HOSP-301", "2003", "HOSPITAL_STAFF", "Dr. A. Desai", "+919800000023", null, "10000000-0000-0000-0000-000000000003",
                Map.of("badge", "HOSP-301", "hospitalId", "10000000-0000-0000-0000-000000000003", "hospitalName", "Southside Community Hospital"));

        // Citizens
        Map<String, Object> priyaProfile = new LinkedHashMap<>();
        priyaProfile.put("name", "Priya Sharma");
        priyaProfile.put("phone", "9845012345");
        priyaProfile.put("age", 29);
        priyaProfile.put("gender", "FEMALE");
        priyaProfile.put("bloodGroup", "O+");
        priyaProfile.put("diseases", List.of("Severe asthma"));
        priyaProfile.put("allergies", List.of("Penicillin / amoxicillin"));

        saveOrUpdateSeedUser("9845012345", "1120", "CITIZEN", "Priya Sharma", "9845012345", null, null, priyaProfile);
    }

    private void saveOrUpdateSeedUser(String username, String rawPassword, String role, String fullName, String phone,
                                     String vehicleId, String hospitalId, Map<String, Object> meta) {
        if (userRepository.findByUsername(username).isPresent()) return;
        try {
            User u = new User(UUID.randomUUID(), username, JwtService.hashPassword(rawPassword), role, fullName, phone);
            u.setAssignedVehicleId(vehicleId);
            u.setAssignedHospitalId(hospitalId);
            if (meta != null) {
                u.setMetadata(objectMapper.writeValueAsString(meta));
            }
            userRepository.save(u);
        } catch (Exception ignored) {}
    }

    public boolean checkLoginRateLimit(String clientIp) {
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000;
        List<Long> attempts = loginRateLimiter.computeIfAbsent(clientIp != null ? clientIp : "local", k -> new ArrayList<>());
        synchronized (attempts) {
            attempts.removeIf(t -> t < windowStart);
            if (attempts.size() >= 20) {
                return false;
            }
            attempts.add(now);
            return true;
        }
    }

    public boolean checkSosRateLimit(String clientIp) {
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000;
        List<Long> attempts = sosRateLimiter.computeIfAbsent(clientIp != null ? clientIp : "local", k -> new ArrayList<>());
        synchronized (attempts) {
            attempts.removeIf(t -> t < windowStart);
            if (attempts.size() >= 15) {
                return false;
            }
            attempts.add(now);
            return true;
        }
    }

    public AuthResult authenticate(String role, String badge, String pin, String vehicleId, String hospitalId, String clientIp) {
        if (!checkLoginRateLimit(clientIp)) {
            return new AuthResult(false, "Rate limit exceeded. Too many login attempts. Please wait 1 minute.",
                    null, null, null, null, null, null, null, null, false, null);
        }

        if (badge == null || badge.trim().isEmpty()) {
            return new AuthResult(false, "Badge, phone number, or login ID is required.",
                    null, null, null, null, null, null, null, null, false, null);
        }

        if (pin == null || pin.trim().isEmpty()) {
            return new AuthResult(false, "Security PIN or password is required.",
                    null, null, null, null, null, null, null, null, false, null);
        }

        String search = badge.trim();
        Optional<User> userOpt = userRepository.findByUsername(search);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(search.toUpperCase());
        }
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByPhone(search);
        }
        if (userOpt.isEmpty()) {
            String digits = search.replaceAll("[^0-9]", "");
            if (digits.length() >= 10) {
                userOpt = userRepository.findByPhone(digits.substring(digits.length() - 10));
                if (userOpt.isEmpty()) {
                    userOpt = userRepository.findByUsername(digits.substring(digits.length() - 10));
                }
            }
        }

        if (userOpt.isEmpty()) {
            return new AuthResult(false, "Invalid badge number or login ID. Access denied.",
                    null, null, null, null, null, null, null, null, false, null);
        }

        User user = userOpt.get();

        if (!JwtService.verifyPassword(pin.trim(), user.getPasswordHash())) {
            return new AuthResult(false, "Invalid security PIN or password. Access denied.",
                    null, null, null, null, null, null, null, null, false, null);
        }

        // Role check
        String expectedRole = role != null ? role.trim().toUpperCase() : "";
        if ("DRIVER".equals(expectedRole)) expectedRole = "PARAMEDIC";
        if ("HOSPITAL".equals(expectedRole)) expectedRole = "HOSPITAL_STAFF";

        if (!expectedRole.isEmpty() && !user.getRole().equalsIgnoreCase(expectedRole)) {
            return new AuthResult(false, "Role mismatch. Account is not authorized for this portal.",
                    null, null, null, null, null, null, null, null, false, null);
        }

        // Paramedic vehicle assignment check
        if ("PARAMEDIC".equals(user.getRole())) {
            String assignedVehicle = user.getAssignedVehicleId();
            if (assignedVehicle != null && vehicleId != null && !vehicleId.trim().isEmpty()) {
                boolean matches = vehicleId.equalsIgnoreCase(assignedVehicle)
                        || "ANY".equalsIgnoreCase(assignedVehicle)
                        || (assignedVehicle.contains("1001") && (vehicleId.contains("1001") || vehicleId.contains("amb-1") || vehicleId.contains("0001")))
                        || (assignedVehicle.contains("1002") && (vehicleId.contains("1002") || vehicleId.contains("amb-2") || vehicleId.contains("0002")))
                        || (assignedVehicle.contains("1003") && (vehicleId.contains("1003") || vehicleId.contains("amb-3") || vehicleId.contains("0003")))
                        || (assignedVehicle.contains("1004") && (vehicleId.contains("1004") || vehicleId.contains("amb-4") || vehicleId.contains("0004")));
                if (!matches) {
                    return new AuthResult(false, "Paramedic is bound to vehicle " + assignedVehicle + ". Access to " + vehicleId + " denied.",
                            null, null, null, null, null, null, null, null, false, null);
                }
            }
        }

        String effectiveVehicle = vehicleId != null && !vehicleId.trim().isEmpty() ? vehicleId : user.getAssignedVehicleId();
        String effectiveHospital = hospitalId != null && !hospitalId.trim().isEmpty() ? hospitalId : user.getAssignedHospitalId();

        String token = jwtService.generateToken(user.getUsername(), user.getRole(), user.getFullName(), effectiveVehicle, effectiveHospital);

        Map<String, Object> metaMap = new HashMap<>();
        if (user.getMetadata() != null && !user.getMetadata().isBlank()) {
            try {
                metaMap = objectMapper.readValue(user.getMetadata(), Map.class);
            } catch (Exception ignored) {}
        }

        String subLabel = switch (user.getRole()) {
            case "DISPATCHER" -> "Central CAD Console · " + user.getUsername();
            case "PARAMEDIC" -> "Unit " + metaMap.getOrDefault("unitId", "Unit") + " · " + (effectiveVehicle != null ? effectiveVehicle : "");
            case "HOSPITAL_STAFF" -> (String) metaMap.getOrDefault("hospitalName", "Emergency Department");
            case "CITIZEN" -> "Citizen Medical Profile";
            case "ADMIN" -> "System Administrator Console";
            default -> user.getRole();
        };

        String unitId = (String) metaMap.get("unitId");

        return new AuthResult(
                true,
                null,
                token,
                user.getRole(),
                user.getFullName(),
                subLabel,
                user.getUsername(),
                unitId,
                effectiveVehicle,
                effectiveHospital,
                user.isForcePasswordChange(),
                "CITIZEN".equals(user.getRole()) ? metaMap : null
        );
    }

    public AuthResult registerCitizen(String phone, String password, String fullName, Map<String, Object> medicalProfile) {
        if (phone == null || phone.trim().length() < 7) {
            return new AuthResult(false, "Valid phone number is required.", null, null, null, null, null, null, null, null, false, null);
        }
        if (password == null || password.trim().length() < 4) {
            return new AuthResult(false, "Password must be at least 4 characters.", null, null, null, null, null, null, null, null, false, null);
        }

        String cleanPhone = phone.trim();
        if (userRepository.findByPhone(cleanPhone).isPresent() || userRepository.findByUsername(cleanPhone).isPresent()) {
            return new AuthResult(false, "An account with this phone number already exists.", null, null, null, null, null, null, null, null, false, null);
        }

        String cleanName = fullName != null && !fullName.isBlank() ? fullName.trim() : "Citizen User";
        User user = new User(UUID.randomUUID(), cleanPhone, JwtService.hashPassword(password), "CITIZEN", cleanName, cleanPhone);
        if (medicalProfile != null) {
            try {
                user.setMetadata(objectMapper.writeValueAsString(medicalProfile));
            } catch (Exception ignored) {}
        }

        userRepository.save(user);

        String token = jwtService.generateToken(user.getUsername(), user.getRole(), user.getFullName(), null, null);
        return new AuthResult(
                true,
                null,
                token,
                user.getRole(),
                user.getFullName(),
                "Citizen Medical Profile",
                user.getUsername(),
                null,
                null,
                null,
                false,
                medicalProfile
        );
    }

    public boolean changePassword(String username, String oldPassword, String newPassword) {
        if (username == null || oldPassword == null || newPassword == null) return false;
        if (newPassword.trim().length() < 6 || newPassword.equals(oldPassword)) return false;

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) return false;

        User user = userOpt.get();
        if (!JwtService.verifyPassword(oldPassword, user.getPasswordHash())) {
            return false;
        }

        user.setPasswordHash(JwtService.hashPassword(newPassword));
        user.setForcePasswordChange(false);
        userRepository.save(user);
        return true;
    }

    // Fallback in-memory implementation for isolated unit testing
    private static class InMemoryUserRepository implements UserRepository {
        private final Map<UUID, User> store = new ConcurrentHashMap<>();

        @Override
        public Optional<User> findByUsername(String username) {
            return store.values().stream().filter(u -> u.getUsername().equalsIgnoreCase(username)).findFirst();
        }

        @Override
        public Optional<User> findByPhone(String phone) {
            return store.values().stream().filter(u -> phone.equals(u.getPhone())).findFirst();
        }

        @Override
        public List<User> findByRole(String role) {
            return store.values().stream().filter(u -> u.getRole().equalsIgnoreCase(role)).toList();
        }

        @Override
        public boolean existsByRole(String role) {
            return store.values().stream().anyMatch(u -> u.getRole().equalsIgnoreCase(role));
        }

        @Override
        public <S extends User> S save(S entity) {
            if (entity.getId() == null) entity.setId(UUID.randomUUID());
            store.put(entity.getId(), entity);
            return entity;
        }

        @Override public Optional<User> findById(UUID uuid) { return Optional.ofNullable(store.get(uuid)); }
        @Override public boolean existsById(UUID uuid) { return store.containsKey(uuid); }
        @Override public long count() { return store.size(); }
        @Override public void deleteById(UUID uuid) { store.remove(uuid); }
        @Override public void delete(User entity) { store.remove(entity.getId()); }
        @Override public List<User> findAll() { return new ArrayList<>(store.values()); }
        @Override public void deleteAll() { store.clear(); }
        @Override public <S extends User> List<S> saveAll(Iterable<S> entities) { List<S> res = new ArrayList<>(); entities.forEach(e -> res.add(save(e))); return res; }
        @Override public List<User> findAllById(Iterable<UUID> uuids) { return List.of(); }
        @Override public void deleteAllById(Iterable<? extends UUID> uuids) {}
        @Override public void deleteAll(Iterable<? extends User> entities) {}
        @Override public void flush() {}
        @Override public <S extends User> S saveAndFlush(S entity) { return save(entity); }
        @Override public <S extends User> List<S> saveAllAndFlush(Iterable<S> entities) { return saveAll(entities); }
        @Override public void deleteAllInBatch(Iterable<User> entities) {}
        @Override public void deleteAllByIdInBatch(Iterable<UUID> uuids) {}
        @Override public void deleteAllInBatch() {}
        @Override public User getOne(UUID uuid) { return store.get(uuid); }
        @Override public User getById(UUID uuid) { return store.get(uuid); }
        @Override public User getReferenceById(UUID uuid) { return store.get(uuid); }
        @Override public <S extends User> Optional<S> findOne(org.springframework.data.domain.Example<S> example) { return Optional.empty(); }
        @Override public <S extends User> List<S> findAll(org.springframework.data.domain.Example<S> example) { return List.of(); }
        @Override public <S extends User> List<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Sort sort) { return List.of(); }
        @Override public <S extends User> org.springframework.data.domain.Page<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Pageable pageable) { return null; }
        @Override public <S extends User> long count(org.springframework.data.domain.Example<S> example) { return 0; }
        @Override public <S extends User> boolean exists(org.springframework.data.domain.Example<S> example) { return false; }
        @Override public <S extends User, R> R findBy(org.springframework.data.domain.Example<S> example, java.util.function.Function<org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<User> findAll(org.springframework.data.domain.Sort sort) { return findAll(); }
        @Override public org.springframework.data.domain.Page<User> findAll(org.springframework.data.domain.Pageable pageable) { return null; }
    }
}
