package com.redlink.backend.dto;

import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * The one JSON shape every error response uses.
 * "ref" is also written to the server log, so a user-reported ref leads to the exact error.
 */
public record ApiError(
        int status,
        String error,
        String message,
        List<FieldError> fieldErrors,
        String ref,
        Instant timestamp,
        String path
) {
    // One invalid input field, shown under that field in the frontend form
    public record FieldError(String field, String message) {
    }

    // Used by GlobalExceptionHandler and by the security layer, so every error gets the same shape and a new ref
    public static ApiError of(HttpStatus status, String message, List<FieldError> fieldErrors, String path) {
        return new ApiError(status.value(), status.getReasonPhrase(), message, fieldErrors,
                newRef(), Instant.now(), path);
    }

    // Short, readable reference such as "7f3a-19c2"
    private static String newRef() {
        String hex = UUID.randomUUID().toString().replace("-", "");
        return hex.substring(0, 4) + "-" + hex.substring(4, 8);
    }
}
