package com.redlink.backend.security;

import com.redlink.backend.config.JwtProperties;
import com.redlink.backend.model.User;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Issues signed tokens at sign-in and registration. Reading them on each request is Spring's job
 * (the JwtDecoder in SecurityConfig).
 *
 * A token says who (sub = user id) and what role, and when it expires. It never contains
 * personal data: anyone can read a JWT's payload; they just can't change it without the secret.
 */
@Service
public class JwtService {

    private final JwtEncoder encoder;
    private final JwtProperties properties;
    private final Clock clock;

    public JwtService(JwtEncoder encoder, JwtProperties properties, Clock clock) {
        this.encoder = encoder;
        this.properties = properties;
        this.clock = clock;
    }

    public IssuedToken issue(User user, boolean rememberMe) {
        Instant now = clock.instant();
        Instant expiresAt = now.plus(rememberMe ? properties.rememberMeExpiry() : properties.expiry());

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim(SecurityConfig.ROLE_CLAIM, user.getRole().name())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, expiresAt);
    }

    // Was this token issued by a "Keep me signed in" sign-in? Its lifetime is longer than a normal one's.
    public boolean isRememberMe(Jwt token) {
        if (token.getIssuedAt() == null || token.getExpiresAt() == null) {
            return false;
        }
        return Duration.between(token.getIssuedAt(), token.getExpiresAt()).compareTo(properties.expiry()) > 0;
    }

    public record IssuedToken(String token, Instant expiresAt) {
    }
}
