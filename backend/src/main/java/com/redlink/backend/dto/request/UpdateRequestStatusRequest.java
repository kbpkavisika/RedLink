package com.redlink.backend.dto.request;

import com.redlink.backend.model.enums.RequestStatus;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * PATCH /api/requests/{id}/status: close an OPEN request (H8, H9).
 *   {"status":"FULFILLED","donorIds":[4,9]}  the donors who actually gave blood; each must have accepted
 *   {"status":"CANCELLED"}                   no donations
 * EXPIRED is set by the system when the needed-by time passes, never by staff.
 */
public record UpdateRequestStatusRequest(
        @NotNull RequestStatus status,
        List<Long> donorIds
) {
    public UpdateRequestStatusRequest {
        donorIds = donorIds == null ? List.of() : List.copyOf(donorIds);
    }
}
