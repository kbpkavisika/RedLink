package com.redlink.backend.dto.hospital;

import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.enums.HospitalStatus;

import java.time.Instant;

// One row of the admin's hospital list (A1). createdAt is when the hospital registered.
public record HospitalSummary(
        Long id,
        String name,
        String registrationNo,
        String city,
        HospitalStatus status,
        Instant createdAt
) {
    public static HospitalSummary from(Hospital hospital) {
        return new HospitalSummary(
                hospital.getId(),
                hospital.getName(),
                hospital.getRegistrationNo(),
                hospital.getCity(),
                hospital.getStatus(),
                hospital.getCreatedAt()
        );
    }
}
