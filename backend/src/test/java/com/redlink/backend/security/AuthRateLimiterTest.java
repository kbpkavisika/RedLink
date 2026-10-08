package com.redlink.backend.security;

import com.redlink.backend.config.RateLimitProperties;
import com.redlink.backend.config.RateLimitProperties.Limit;
import com.redlink.backend.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthRateLimiterTest {

    // A clock the test moves forward by hand
    private static final class TestClock extends Clock {
        private Instant now = Instant.parse("2026-10-08T10:00:00Z");

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override public Instant instant() { return now; }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
    }

    private final TestClock clock = new TestClock();

    private AuthRateLimiter limiter(boolean enabled, String clientIpHeader) {
        RateLimitProperties properties = new RateLimitProperties(enabled,
                new Limit(3, Duration.ofMinutes(1)),   // sign-in per address
                new Limit(5, Duration.ofMinutes(15)),  // sign-in per account
                new Limit(2, Duration.ofHours(1)),     // registration per address
                clientIpHeader);
        return new AuthRateLimiter(properties, clock);
    }

    private static MockHttpServletRequest from(String address) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(address);
        return request;
    }

    @Test
    void allowsUpToTheLimitThenRefusesWithHowLongToWait() {
        AuthRateLimiter limiter = limiter(true, "");
        for (int i = 0; i < 3; i++) {
            limiter.checkLogin(from("1.1.1.1"), "a" + i + "@x.lk");
            clock.advance(Duration.ofSeconds(10));
        }

        // The first attempt was 30 s ago, so the next one is allowed in 30 s
        assertThatThrownBy(() -> limiter.checkLogin(from("1.1.1.1"), "other@x.lk"))
                .isInstanceOf(TooManyRequestsException.class)
                .hasMessage("Too many sign-in attempts from your network. Please try again in 30 seconds.")
                .extracting(e -> ((TooManyRequestsException) e).getRetryAfter())
                .isEqualTo(Duration.ofSeconds(30));
    }

    @Test
    void slidingWindowAllowsAgainOnceTheOldestAttemptIsOld() {
        AuthRateLimiter limiter = limiter(true, "");
        for (int i = 0; i < 3; i++) {
            limiter.checkLogin(from("1.1.1.1"), "a" + i + "@x.lk");
        }
        clock.advance(Duration.ofMinutes(1));

        assertThatCode(() -> limiter.checkLogin(from("1.1.1.1"), "a@x.lk")).doesNotThrowAnyException();
    }

    @Test
    void addressesAreCountedSeparately() {
        AuthRateLimiter limiter = limiter(true, "");
        for (int i = 0; i < 3; i++) {
            limiter.checkLogin(from("1.1.1.1"), "a" + i + "@x.lk");
        }

        assertThatCode(() -> limiter.checkLogin(from("2.2.2.2"), "b@x.lk")).doesNotThrowAnyException();
    }

    @Test
    void oneAccountIsLimitedFromAnyAddressWhateverTheSpelling() {
        AuthRateLimiter limiter = limiter(true, "");
        for (int i = 0; i < 5; i++) {
            limiter.checkLogin(from("10.0.0." + i), "Kamal@Mail.lk");
        }

        assertThatThrownBy(() -> limiter.checkLogin(from("10.0.0.99"), " kamal@mail.lk "))
                .isInstanceOf(TooManyRequestsException.class)
                .hasMessage("Too many sign-in attempts for this account. Please try again in 15 minutes.");
    }

    @Test
    void registrationHasItsOwnLimit() {
        AuthRateLimiter limiter = limiter(true, "");
        limiter.checkRegistration(from("1.1.1.1"));
        limiter.checkRegistration(from("1.1.1.1"));

        assertThatThrownBy(() -> limiter.checkRegistration(from("1.1.1.1")))
                .isInstanceOf(TooManyRequestsException.class)
                .hasMessageContaining("sign-ups");
        // Signing in from the same address is unaffected
        assertThatCode(() -> limiter.checkLogin(from("1.1.1.1"), "a@x.lk")).doesNotThrowAnyException();
    }

    @Test
    void disabledNeverRefuses() {
        AuthRateLimiter limiter = limiter(false, "");
        for (int i = 0; i < 50; i++) {
            limiter.checkLogin(from("1.1.1.1"), "a@x.lk");
        }
    }

    @Test
    void clientIpComesFromTheConfiguredHeaderElseTheConnection() {
        AuthRateLimiter limiter = limiter(true, "X-Real-IP");
        MockHttpServletRequest viaProxy = from("10.0.0.1");
        viaProxy.addHeader("X-Real-IP", " 203.0.113.7, 10.0.0.2");

        assertThat(limiter.clientIp(viaProxy)).isEqualTo("203.0.113.7");
        assertThat(limiter.clientIp(from("10.0.0.1"))).isEqualTo("10.0.0.1");
        assertThat(limiter(true, "").clientIp(viaProxy)).isEqualTo("10.0.0.1");
    }

    @Test
    void describesWaitsInWords() {
        assertThat(AuthRateLimiter.describe(Duration.ofMillis(200))).isEqualTo("1 second");
        assertThat(AuthRateLimiter.describe(Duration.ofSeconds(59))).isEqualTo("59 seconds");
        assertThat(AuthRateLimiter.describe(Duration.ofSeconds(61))).isEqualTo("2 minutes");
        assertThat(AuthRateLimiter.describe(Duration.ofSeconds(60))).isEqualTo("1 minute");
    }
}
