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

import java.time.Instant;
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

    private static void signInWithTokenIssuedAt(Instant issuedAt) {
        Jwt jwt = Jwt.withTokenValue("token").header("alg", "HS256").subject("42").issuedAt(issuedAt).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
    }

    private User userWhoChangedPasswordAt(Instant changedAt) {
        User user = new User();
        user.setId(42L);
        user.setPasswordChangedAt(changedAt);
        given(userRepository.findById(42L)).willReturn(Optional.of(user));
        return user;
    }

    @Test
    void tokenIssuedBeforePasswordChangeIs401() {
        userWhoChangedPasswordAt(Instant.parse("2026-10-08T10:00:00.500Z"));
        signInWithTokenIssuedAt(Instant.parse("2026-10-08T09:59:59Z"));

        assertThatThrownBy(currentUser::require)
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage(CurrentUser.PASSWORD_CHANGED);
    }

    @Test
    void tokenIssuedInTheSameSecondAsTheChangeIsValid() {
        // The new token the change returns: "iat" has no fraction of a second
        User user = userWhoChangedPasswordAt(Instant.parse("2026-10-08T10:00:00.500Z"));
        signInWithTokenIssuedAt(Instant.parse("2026-10-08T10:00:00Z"));

        assertThat(currentUser.require()).isSameAs(user);
    }

    @Test
    void neverChangedPasswordAcceptsAnyToken() {
        User user = userWhoChangedPasswordAt(null);
        signInWithTokenIssuedAt(Instant.parse("2020-01-01T00:00:00Z"));

        assertThat(currentUser.require()).isSameAs(user);
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
