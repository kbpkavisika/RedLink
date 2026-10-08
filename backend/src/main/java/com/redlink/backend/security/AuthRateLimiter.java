package com.redlink.backend.security;

import com.redlink.backend.config.RateLimitProperties;
import com.redlink.backend.config.RateLimitProperties.Limit;
import com.redlink.backend.exception.TooManyRequestsException;
import com.redlink.backend.util.Emails;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Limits how often sign-in and registration can be tried, so nobody can guess passwords at speed
 * or create accounts in bulk. Over a limit → 429 with Retry-After, before any password is checked.
 *
 *   sign-in:      per address, then per account (email)
 *   registration: per address
 *
 * Each key keeps the times of its recent attempts (a sliding window). Kept in memory: right for one
 * backend instance; restarting forgets every count. Several instances would need a shared store (e.g. Redis).
 */
@Component
public class AuthRateLimiter {

    // Forget keys with no recent attempts every this many calls, so memory doesn't grow without end
    private static final int CLEANUP_EVERY = 1_000;
    // Last resort if someone floods us with new keys faster than they expire: start again empty
    private static final int MAX_KEYS = 100_000;

    private final RateLimitProperties properties;
    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final AtomicInteger calls = new AtomicInteger();

    public AuthRateLimiter(RateLimitProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public void checkLogin(HttpServletRequest request, String email) {
        consume("login-ip:" + clientIp(request), properties.loginPerIp(), "sign-in attempts from your network");
        consume("login-email:" + Emails.normalize(email), properties.loginPerEmail(), "sign-in attempts for this account");
    }

    public void checkRegistration(HttpServletRequest request) {
        consume("register-ip:" + clientIp(request), properties.registerPerIp(), "sign-ups from your network");
    }

    // The visitor's address: the configured header's first value (set by the host), else the connecting address
    String clientIp(HttpServletRequest request) {
        String header = properties.clientIpHeader();
        if (!header.isEmpty()) {
            String value = request.getHeader(header);
            if (value != null && !value.isBlank()) {
                return value.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    private void consume(String key, Limit limit, String what) {
        if (!properties.enabled()) {
            return;
        }
        cleanUpNow();
        Instant now = clock.instant();
        Window window = windows.computeIfAbsent(key, k -> new Window(limit.per()));
        Duration retryAfter = window.tryHit(now, limit);
        if (retryAfter != null) {
            throw new TooManyRequestsException(
                    "Too many " + what + ". Please try again in " + describe(retryAfter) + ".", retryAfter);
        }
    }

    private void cleanUpNow() {
        if (calls.incrementAndGet() % CLEANUP_EVERY != 0 && windows.size() < MAX_KEYS) {
            return;
        }
        Instant now = clock.instant();
        windows.entrySet().removeIf(entry -> entry.getValue().isIdle(now));
        if (windows.size() >= MAX_KEYS) {
            windows.clear();
        }
    }

    // "45 seconds", "1 minute", "12 minutes" (rounded up, like Retry-After)
    static String describe(Duration duration) {
        long seconds = TooManyRequestsException.seconds(duration);
        if (seconds < 60) {
            return seconds + (seconds == 1 ? " second" : " seconds");
        }
        long minutes = (seconds + 59) / 60;
        return minutes + (minutes == 1 ? " minute" : " minutes");
    }

    // The recent attempt times for one key, oldest first
    private static final class Window {
        private final Duration per;
        private final Deque<Instant> hits = new ArrayDeque<>();

        Window(Duration per) {
            this.per = per;
        }

        // Records an attempt and returns null, or returns how long until one is allowed again
        synchronized Duration tryHit(Instant now, Limit limit) {
            Instant windowStart = now.minus(per);
            while (!hits.isEmpty() && !hits.peekFirst().isAfter(windowStart)) {
                hits.pollFirst();
            }
            if (hits.size() >= limit.requests()) {
                Duration wait = Duration.between(now, hits.peekFirst().plus(per));
                return wait.compareTo(Duration.ofSeconds(1)) < 0 ? Duration.ofSeconds(1) : wait;
            }
            hits.addLast(now);
            return null;
        }

        synchronized boolean isIdle(Instant now) {
            return hits.isEmpty() || !hits.peekLast().isAfter(now.minus(per));
        }
    }
}
