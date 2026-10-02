package com.redlink.backend.dto.hospital;

import com.redlink.backend.model.enums.HospitalStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * PATCH /api/admin/hospitals/{id}/status
 *   {"status": "APPROVED"}
 *   {"status": "REJECTED", "reason": "Registration number could not be verified."}
 * The reason is required for REJECTED (checked in the service) and ignored for APPROVED.
 */
public record UpdateHospitalStatusRequest(
        @NotNull HospitalStatus status,
        @Size(max = 500) String reason
) {
    public UpdateHospitalStatusRequest {
        reason = (reason == null || reason.isBlank()) ? null : reason.trim();
    }
}
