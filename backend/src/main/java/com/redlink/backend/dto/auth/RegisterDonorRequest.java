package com.redlink.backend.dto.auth;

import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.util.Emails;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * POST /api/auth/register/donor. There is deliberately no "role" field: this endpoint always
 * creates a DONOR, so nobody can register themselves as an admin.
 * The donor's age (18 to 60) is checked in the service, because it depends on today's date.
 */
public record RegisterDonorRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Pattern(regexp = Inputs.PHONE_PATTERN, message = Inputs.PHONE_MESSAGE) String phone,
        // BCrypt only uses the first 72 bytes, so longer passwords would be silently cut
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotNull BloodGroup bloodGroup,
        @NotNull @Past LocalDate dateOfBirth,
        @NotBlank @Size(max = 100) String city
) {
    public RegisterDonorRequest {
        fullName = Inputs.trim(fullName);
        email = Emails.normalize(email);
        phone = Inputs.phone(phone);
        city = Inputs.trim(city);
    }
}
