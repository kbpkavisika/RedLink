package com.redlink.backend.dto.request;

import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.Urgency;

import java.time.Instant;

/**
 * A blood request as the hospital sees it. reference is the short code shown everywhere ("RQ-1043").
 * closedAt is null while the request is OPEN.
 */
public record BloodRequestDetail(
        Long id,
        String reference,
        BloodGroup bloodGroup,
        int unitsNeeded,
        Urgency urgency,
        String city,
        RequestStatus status,
        Instant neededBy,
        Instant createdAt,
        Instant closedAt,
        String hospitalName,
        String createdBy
) {
    public static String reference(Long id) {
        return "RQ-" + id;
    }

    // Reads the hospital and poster, so call it inside a transaction
    public static BloodRequestDetail from(BloodRequest request) {
        return new BloodRequestDetail(
                request.getId(),
                reference(request.getId()),
                request.getBloodGroup(),
                request.getUnitsNeeded(),
                request.getUrgency(),
                request.getCity(),
                request.getStatus(),
                request.getNeededBy(),
                request.getCreatedAt(),
                request.getClosedAt(),
                request.getHospital().getName(),
                request.getCreatedBy().getFullName()
        );
    }
}
