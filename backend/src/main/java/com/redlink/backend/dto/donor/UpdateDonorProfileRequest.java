package com.redlink.backend.dto.donor;

import com.redlink.backend.dto.auth.Inputs;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * PATCH /api/donor/me: the details a donor can change themselves (D2). Send all three.
 * Email, blood group and date of birth can't be changed here: the blood group decides who they're matched to,
 * so a wrong one is corrected by an admin, not the donor.
 */
public record UpdateDonorProfileRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Pattern(regexp = Inputs.PHONE_PATTERN, message = Inputs.PHONE_MESSAGE) String phone,
        @NotBlank @Size(max = 100) String city
) {
    public UpdateDonorProfileRequest {
        fullName = Inputs.trim(fullName);
        phone = Inputs.phone(phone);
        city = Inputs.trim(city);
    }
}
