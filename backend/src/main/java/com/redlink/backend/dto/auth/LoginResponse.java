package com.redlink.backend.dto.auth;

import java.time.Instant;

// Returned by login and registration. The frontend stores the token and sends it as "Authorization: Bearer …".
public record LoginResponse(String token, Instant expiresAt, CurrentUserResponse user) {
}
