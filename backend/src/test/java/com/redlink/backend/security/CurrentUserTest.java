package com.redlink.backend.security;

import com.redlink.backend.exception.ForbiddenException;
import com.redlink.backend.exception.UnauthorizedException;
import com.redlink.backend.model.User;
import com.redlink.backend.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class CurrentUserTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final CurrentUser currentUser = new CurrentUser(userRepository);

    private static void signInWithSubject(String subject) {
        Jwt jwt = Jwt.withTokenValue("token").header("alg", "HS256").subject(subject).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void readsUserIdFromToken() {
        signInWithSubject("42");
        assertThat(currentUser.id()).isEqualTo(42L);
    }

    @Test
    void notSignedInIs401() {
        assertThatThrownBy(currentUser::id).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void nonNumericSubjectIs401() {
        signInWithSubject("not-a-number");
        assertThatThrownBy(currentUser::id).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void deletedAccountIs401() {
        signInWithSubject("42");
        given(userRepository.findById(42L)).willReturn(Optional.empty());

        assertThatThrownBy(currentUser::require).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void disabledAccountIs403EvenWithValidToken() {
        signInWithSubject("42");
        User disabled = new User();
        disabled.setId(42L);
        disabled.setEnabled(false);
        given(userRepository.findById(42L)).willReturn(Optional.of(disabled));

        assertThatThrownBy(currentUser::require)
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("disabled");
    }

    @Test
    void enabledAccountIsReturned() {
        signInWithSubject("42");
        User user = new User();
        user.setId(42L);
        given(userRepository.findById(42L)).willReturn(Optional.of(user));

        assertThat(currentUser.require()).isSameAs(user);
    }
}
