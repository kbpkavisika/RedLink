package com.redlink.backend.dto.user;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.Role;

import java.time.Instant;

/**
 * One row of the admin's user list (A5). Never includes the password hash.
 * hospitalId / hospitalName are left out for users who aren't hospital staff.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserSummary(
        Long id,
        String fullName,
        String email,
        String phone,
        Role role,
        Long hospitalId,
        String hospitalName,
        boolean enabled,
        boolean mustChangePassword,
        Instant createdAt
) {
    // Reads user.getHospital(), so call it inside a transaction (or with the hospital fetched)
    public static UserSummary from(User user) {
        Hospital hospital = user.getHospital();
        return new UserSummary(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                hospital == null ? null : hospital.getId(),
                hospital == null ? null : hospital.getName(),
                user.isEnabled(),
                user.isMustChangePassword(),
                user.getCreatedAt()
        );
    }
}
