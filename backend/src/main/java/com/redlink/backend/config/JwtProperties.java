package com.redlink.backend.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/**
 * Settings under "redlink.jwt". Validated at startup: the app refuses to start without a proper secret,
 * rather than running with no or weak token signing.
 *
 * @param secret            HMAC signing key, at least 32 characters. Never committed:
 *                          application-local.properties locally, REDLINK_JWT_SECRET when deployed.
 * @param issuer            written into every token and checked when reading one
 * @param expiry            how long a normal sign-in lasts
 * @param rememberMeExpiry  how long a "Keep me signed in" sign-in lasts
 */
@Validated
@ConfigurationProperties(prefix = "redlink.jwt")
public record JwtProperties(
        @NotBlank(message = "is missing. Set redlink.jwt.secret in application-local.properties or the REDLINK_JWT_SECRET environment variable")
        @Size(min = 32, message = "must be at least 32 characters")
        String secret,
        @NotBlank String issuer,
        @NotNull Duration expiry,
        @NotNull Duration rememberMeExpiry
) {
}
