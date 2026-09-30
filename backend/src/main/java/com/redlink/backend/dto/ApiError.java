package com.redlink.backend.dto;

import java.time.Instant;
import java.util.List;

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
}
