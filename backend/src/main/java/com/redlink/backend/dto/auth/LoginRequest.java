package com.redlink.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @param rememberMe "Keep me signed in on this device": a 7-day token instead of 12 hours.
 *                   Optional. It's a Boolean, not a boolean, because Jackson 3 rejects a missing
 *                   primitive field instead of defaulting it; a missing value becomes false here.
 */
public record LoginRequest(
        @NotBlank @Size(max = 255) String email,
        @NotBlank @Size(max = 72) String password,
        Boolean rememberMe
) {
    public LoginRequest {
        rememberMe = Boolean.TRUE.equals(rememberMe);
    }
}
