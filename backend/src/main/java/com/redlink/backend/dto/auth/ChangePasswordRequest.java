package com.redlink.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// PATCH /api/auth/me/password. Also how a new staff member replaces the first password an admin gave them.
public record ChangePasswordRequest(
        @NotBlank @Size(max = 72) String currentPassword,
        @NotBlank @Size(min = 8, max = 72) String newPassword
) {
}
