package com.redlink.backend.dto.user;

import com.redlink.backend.dto.auth.Inputs;
import com.redlink.backend.util.Emails;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * POST /api/admin/users: an admin adds a colleague to an approved hospital (decision 3).
 * The admin chooses a temporary password and passes it on; the new user must change it at first sign-in.
 * There is no role field: this endpoint only creates HOSPITAL_STAFF.
 */
public record AddStaffRequest(
        @NotNull Long hospitalId,
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Pattern(regexp = Inputs.PHONE_PATTERN, message = Inputs.PHONE_MESSAGE) String phone,
        @NotBlank @Size(min = 8, max = 72) String temporaryPassword
) {
    public AddStaffRequest {
        fullName = Inputs.trim(fullName);
        email = Emails.normalize(email);
        phone = Inputs.phone(phone);
    }
}
