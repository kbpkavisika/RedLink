package com.redlink.backend.dto.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.Role;

/**
 * The signed-in user, as the frontend's CurrentUser type expects.
 * The hospital fields are left out (not null) for users who aren't hospital staff,
 * and hospitalRejectionReason is only present for a REJECTED hospital.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CurrentUserResponse(
        Long id,
        String fullName,
        String email,
        Role role,
        Long hospitalId,
        String hospitalName,
        HospitalStatus hospitalStatus, // drives the frontend's Blocked state until APPROVED
        String hospitalRejectionReason, // the admin's reason, shown to staff of a rejected hospital
        boolean mustChangePassword
) {
    // Reads user.getHospital(), so call it inside a transaction
    public static CurrentUserResponse from(User user) {
        Hospital hospital = user.getHospital();
        return new CurrentUserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                hospital == null ? null : hospital.getId(),
                hospital == null ? null : hospital.getName(),
                hospital == null ? null : hospital.getStatus(),
                hospital == null ? null : hospital.getRejectionReason(),
                user.isMustChangePassword()
        );
    }
}
