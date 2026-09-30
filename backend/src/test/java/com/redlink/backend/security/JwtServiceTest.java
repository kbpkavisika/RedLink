package com.redlink.backend.security;

import com.redlink.backend.config.JwtProperties;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.Role;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import javax.crypto.SecretKey;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Issues tokens with JwtService and reads them back with the app's real decoder from SecurityConfig
class JwtServiceTest {

    private static final JwtProperties PROPERTIES = new JwtProperties(
            "unit-test-secret-0123456789abcdef-0123456789", "redlink", Duration.ofHours(12), Duration.ofDays(7));

    private final SecurityConfig config = new SecurityConfig();
    private final SecretKey key = config.jwtSigningKey(PROPERTIES);
    private final JwtDecoder decoder = config.jwtDecoder(key, PROPERTIES);

    private JwtService serviceAt(Instant now) {
        return new JwtService(config.jwtEncoder(key), PROPERTIES, Clock.fixed(now, ZoneOffset.UTC));
    }

    private static User donor() {
        User user = new User();
        user.setId(42L);
        user.setRole(Role.DONOR);
        return user;
    }

    @Test
    void tokenCarriesUserIdRoleAndIssuer() {
        Instant now = Instant.now();
        JwtService.IssuedToken issued = serviceAt(now).issue(donor(), false);

        Jwt jwt = decoder.decode(issued.token());
        assertThat(jwt.getSubject()).isEqualTo("42");
        assertThat(jwt.getClaimAsString(SecurityConfig.ROLE_CLAIM)).isEqualTo("DONOR");
        // getIssuer() expects a URL; ours is a plain name, so read the raw claim
        assertThat(jwt.getClaimAsString("iss")).isEqualTo("redlink");
    }

    @Test
    void normalSignInLasts12HoursAndRememberMe7Days() {
        Instant now = Instant.now();
        assertThat(serviceAt(now).issue(donor(), false).expiresAt()).isEqualTo(now.plus(Duration.ofHours(12)));
        assertThat(serviceAt(now).issue(donor(), true).expiresAt()).isEqualTo(now.plus(Duration.ofDays(7)));
    }

    @Test
    void tokenContainsNoPersonalData() {
        User user = donor();
        user.setEmail("kamal@mail.lk");
        user.setPasswordHash("{bcrypt}secret-hash");

        Jwt jwt = decoder.decode(serviceAt(Instant.now()).issue(user, false).token());
        assertThat(jwt.getClaims()).containsOnlyKeys("iss", "sub", "iat", "exp", "role");
    }

    @Test
    void expiredTokenIsRejected() {
        String token = serviceAt(Instant.now().minus(Duration.ofHours(13))).issue(donor(), false).token();

        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        JwtProperties other = new JwtProperties(
                "a-completely-different-secret-9876543210", "redlink", Duration.ofHours(12), Duration.ofDays(7));
        SecretKey otherKey = config.jwtSigningKey(other);
        String forged = new JwtService(config.jwtEncoder(otherKey), other, Clock.systemUTC()).issue(donor(), false).token();

        assertThatThrownBy(() -> decoder.decode(forged)).isInstanceOf(JwtException.class);
    }

    @Test
    void tokenFromAnotherIssuerIsRejected() {
        JwtProperties otherIssuer = new JwtProperties(
                PROPERTIES.secret(), "someone-else", Duration.ofHours(12), Duration.ofDays(7));
        String token = new JwtService(config.jwtEncoder(key), otherIssuer, Clock.systemUTC()).issue(donor(), false).token();

        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void passwordsAreHashedWithBcryptAndSalted() {
        var encoder = config.passwordEncoder();
        String first = encoder.encode("MyPass123");
        String second = encoder.encode("MyPass123");

        assertThat(first).startsWith("{bcrypt}$2");
        assertThat(first).isNotEqualTo(second); // different salt each time
        assertThat(encoder.matches("MyPass123", first)).isTrue();
        assertThat(encoder.matches("mypass123", first)).isFalse();
        assertThat(first.length()).isLessThanOrEqualTo(100); // fits users.password_hash VARCHAR(100)
    }
}
