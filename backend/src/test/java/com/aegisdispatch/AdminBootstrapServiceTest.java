package com.aegisdispatch;

import com.aegisdispatch.model.User;
import com.aegisdispatch.repository.UserRepository;
import com.aegisdispatch.service.AdminBootstrapService;
import com.aegisdispatch.service.JwtService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminBootstrapServiceTest {

    @Test
    void testBootstrapCreatesAdminWhenNoneExists() {
        UserRepository mockRepo = mock(UserRepository.class);
        when(mockRepo.existsByRole("ADMIN")).thenReturn(false);

        AdminBootstrapService service = new AdminBootstrapService(mockRepo, "admin_test", "SecurePassword123!");
        service.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(mockRepo, times(1)).save(captor.capture());

        User created = captor.getValue();
        assertEquals("admin_test", created.getUsername());
        assertEquals("ADMIN", created.getRole());
        assertTrue(created.isForcePasswordChange());
        assertTrue(JwtService.verifyPassword("SecurePassword123!", created.getPasswordHash()));
    }

    @Test
    void testBootstrapSkipsWhenAdminExists() {
        UserRepository mockRepo = mock(UserRepository.class);
        when(mockRepo.existsByRole("ADMIN")).thenReturn(true);

        AdminBootstrapService service = new AdminBootstrapService(mockRepo, "admin_test", "SecurePassword123!");
        service.run();

        verify(mockRepo, never()).save(any(User.class));
    }
}
