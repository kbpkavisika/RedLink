package com.redlink.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Settings under "redlink.rate-limit": how often sign-in and registration may be tried (AuthRateLimiter).
 * Defaults are in application.properties. A missing or non-positive limit stops the app at startup.
 *
 * @param enabled        false switches every limit off (the tests do, except the rate-limit tests)
 * @param loginPerIp     sign-in attempts from one address
 * @param loginPerEmail  sign-in attempts for one account, from anywhere: stops guessing one password from many addresses
 * @param registerPerIp  registrations (donor or hospital) from one address
 * @param clientIpHeader header the host puts the visitor's address in, e.g. X-Real-IP; empty = the connecting address.
 *                       Only set it to a header the host overwrites, or visitors could send any address they like.
 */
@ConfigurationProperties(prefix = "redlink.rate-limit")
public record RateLimitProperties(boolean enabled, Limit loginPerIp, Limit loginPerEmail, Limit registerPerIp,
                                  String clientIpHeader) {

    // At most "requests" in any "per" (a sliding window, so there's no burst at the edge of a window)
    public record Limit(int requests, Duration per) {
        public Limit {
            if (requests <= 0 || per == null || per.isNegative() || per.isZero()) {
                throw new IllegalStateException("redlink.rate-limit.* needs requests > 0 and a positive per");
            }
        }
    }

    public RateLimitProperties {
        if (loginPerIp == null || loginPerEmail == null || registerPerIp == null) {
            throw new IllegalStateException("redlink.rate-limit.* must be set (see application.properties)");
        }
        clientIpHeader = clientIpHeader == null ? "" : clientIpHeader.trim();
    }
}
