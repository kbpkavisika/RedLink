package com.redlink.backend.dto.request;

import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.Urgency;

import java.time.Instant;

/**
 * One row of a request list: the request plus how its replies and donations stand.
 * Used by the hospital's list (H11) and the admin's (A7); hospitalName and hospitalCity matter for the admin.
 *
 * @param coming   donors who accepted (and haven't withdrawn)
 * @param donated  donations recorded when it was fulfilled
 */
public record RequestListItem(
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
        String createdBy,
        Long hospitalId,
        String hospitalName,
        long coming,
        long withdrew,
        long declined,
        long donated
) {
    public record Counts(long coming, long withdrew, long declined, long donated) {
        public static final Counts NONE = new Counts(0, 0, 0, 0);
    }

    // Reads the hospital and the poster, so call it inside a transaction
    public static RequestListItem from(BloodRequest request, Counts counts) {
        return new RequestListItem(
                request.getId(),
                BloodRequestDetail.reference(request.getId()),
                request.getBloodGroup(),
                request.getUnitsNeeded(),
                request.getUrgency(),
                request.getCity(),
                request.getStatus(),
                request.getNeededBy(),
                request.getCreatedAt(),
                request.getClosedAt(),
                request.getCreatedBy().getFullName(),
                request.getHospital().getId(),
                request.getHospital().getName(),
                counts.coming(),
                counts.withdrew(),
                counts.declined(),
                counts.donated()
        );
    }
}
