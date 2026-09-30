package com.redlink.backend.dto.auth;

import com.redlink.backend.util.Emails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * POST /api/auth/register/hospital: the two halves of the "Register a hospital" form.
 * Field errors come back as "hospital.name", "staff.email" …, matching the form sections.
 */
public record RegisterHospitalRequest(
        @NotNull @Valid HospitalDetails hospital,
        @NotNull @Valid StaffDetails staff
) {

    public record HospitalDetails(
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Size(max = 100) String registrationNo,
            @NotBlank @Size(max = 300) String address,
            @NotBlank @Size(max = 100) String city,
            @NotBlank @Pattern(regexp = Inputs.PHONE_PATTERN, message = Inputs.PHONE_MESSAGE) String phone
    ) {
        public HospitalDetails {
            name = Inputs.trim(name);
            registrationNo = Inputs.upper(registrationNo); // "reg-77" and "REG-77" are the same number
            address = Inputs.trim(address);
            city = Inputs.trim(city);
            phone = Inputs.phone(phone);
        }
    }

    // The person registering becomes the hospital's first staff user (decision 3). No role field: always HOSPITAL_STAFF.
    public record StaffDetails(
            @NotBlank @Size(max = 150) String fullName,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Pattern(regexp = Inputs.PHONE_PATTERN, message = Inputs.PHONE_MESSAGE) String phone,
            @NotBlank @Size(min = 8, max = 72) String password
    ) {
        public StaffDetails {
            fullName = Inputs.trim(fullName);
            email = Emails.normalize(email);
            phone = Inputs.phone(phone);
        }
    }
}
