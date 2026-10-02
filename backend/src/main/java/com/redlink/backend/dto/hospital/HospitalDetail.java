package com.redlink.backend.dto.hospital;

import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.HospitalStatus;

import java.time.Instant;
import java.util.List;

/**
 * Everything an admin needs to check that a hospital is real (A2), plus who decided and when.
 * reviewedBy / reviewedAt are set once an admin approves or rejects it; rejectionReason only when REJECTED.
 * staff lists its users, so the admin can call the person who registered it.
 */
public record HospitalDetail(
        Long id,
        String name,
        String registrationNo,
        String address,
        String city,
        String phone,
        HospitalStatus status,
        Instant createdAt,
        String reviewedBy,
        Instant reviewedAt,
        String rejectionReason,
        List<StaffMember> staff
) {
    public record StaffMember(Long id, String fullName, String email, String phone, boolean enabled) {
        static StaffMember from(User user) {
            return new StaffMember(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), user.isEnabled());
        }
    }

    // Reads hospital.getApprovedBy(), so call it inside a transaction
    public static HospitalDetail from(Hospital hospital, List<User> staff) {
        User reviewer = hospital.getApprovedBy();
        return new HospitalDetail(
                hospital.getId(),
                hospital.getName(),
                hospital.getRegistrationNo(),
                hospital.getAddress(),
                hospital.getCity(),
                hospital.getPhone(),
                hospital.getStatus(),
                hospital.getCreatedAt(),
                reviewer == null ? null : reviewer.getFullName(),
                hospital.getApprovedAt(),
                hospital.getRejectionReason(),
                staff.stream().map(StaffMember::from).toList()
        );
    }
}
