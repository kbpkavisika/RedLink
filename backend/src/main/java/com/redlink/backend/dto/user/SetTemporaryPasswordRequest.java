package com.redlink.backend.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * PATCH /api/admin/users/{id}/password: the v1 "forgot password" flow (decision 5).
 * The user signs in with this password and must choose a new one straight away.
 */
public record SetTemporaryPasswordRequest(
        @NotBlank @Size(min = 8, max = 72) String temporaryPassword
) {
}
