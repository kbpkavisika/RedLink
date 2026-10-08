package com.redlink.backend.exception;

import org.springframework.http.HttpStatus;

import java.time.Duration;

// 429: tried too often. GlobalExceptionHandler adds a Retry-After header with retryAfter in seconds.
public class TooManyRequestsException extends ApiException {

    private final Duration retryAfter;

    public TooManyRequestsException(String message, Duration retryAfter) {
        super(HttpStatus.TOO_MANY_REQUESTS, message);
        this.retryAfter = retryAfter;
    }

    public Duration getRetryAfter() {
        return retryAfter;
    }

    // Whole seconds, rounded up and at least 1: the Retry-After header's value
    public static long seconds(Duration duration) {
        return Math.max(1, (duration.toMillis() + 999) / 1000);
    }
}
