package com.redlink.backend.config;

import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class AdminSeederTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final PasswordEncoder passwordEncoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();

    private AdminSeeder seeder(String email, String password) {
        return new AdminSeeder(userRepository, passwordEncoder, new AdminProperties(email, password, null));
    }

    @Test
    void doesNothingWhenAnAdminExists() {
        given(userRepository.existsByRole(Role.ADMIN)).willReturn(true);

        seeder("admin@redlink.lk", "Seeded-Admin-Pass1").run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    void onlyWarnsWhenNotConfigured() {
        seeder(null, null).run(null);
        seeder("admin@redlink.lk", " ").run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    void createsTheAdminWithAHashedPasswordThatMustBeChanged() {
        seeder("  Admin@RedLink.LK ", "Seeded-Admin-Pass1").run(null);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        User admin = saved.getValue();
        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        assertThat(admin.getEmail()).isEqualTo("admin@redlink.lk");
        assertThat(admin.getFullName()).isEqualTo("RedLink Admin");
        assertThat(admin.isMustChangePassword()).isTrue();
        assertThat(admin.getPasswordHash()).startsWith("{bcrypt}");
        assertThat(passwordEncoder.matches("Seeded-Admin-Pass1", admin.getPasswordHash())).isTrue();
    }

    @Test
    void refusesToStartWithAnInvalidPassword() {
        assertThatThrownBy(() -> seeder("admin@redlink.lk", "short").run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("8 to 72 characters");
    }

    @Test
    void refusesToStartWithAnInvalidEmail() {
        assertThatThrownBy(() -> seeder("not-an-email", "Seeded-Admin-Pass1").run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not an email");
    }

    @Test
    void refusesToTakeOverANonAdminAccount() {
        given(userRepository.existsByEmail("kamal@mail.lk")).willReturn(true);

        assertThatThrownBy(() -> seeder("kamal@mail.lk", "Seeded-Admin-Pass1").run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("non-admin");
        verify(userRepository, never()).save(any());
    }
}
