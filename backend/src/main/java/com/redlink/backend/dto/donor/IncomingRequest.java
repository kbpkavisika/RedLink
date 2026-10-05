package com.redlink.backend.dto.donor;

import com.redlink.backend.dto.request.BloodRequestDetail;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.DonorResponse;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.model.enums.Urgency;

import java.time.Instant;

/**
 * One open request a donor can give to (D5). Only what a donor needs to decide and get there:
 * the hospital, where and by when. Never anything about the patient.
 *
 * @param exactMatch  the request is for the donor's own blood group (otherwise they're a compatible substitute)
 * @param sameCity    the request is in the donor's city
 * @param myResponse  ACCEPTED, DECLINED or WITHDRAWN if they already replied; null if not yet
 */
public record IncomingRequest(
        Long requestId,
        String reference,
        BloodGroup bloodGroup,
        int unitsNeeded,
        Urgency urgency,
        String city,
        Instant neededBy,
        Instant createdAt,
        String hospitalName,
        String hospitalAddress,
        String hospitalPhone,
        boolean exactMatch,
        boolean sameCity,
        ResponseStatus myResponse,
        Instant respondedAt
) {
    // Reads request.getHospital(), so call it inside a transaction
    public static IncomingRequest from(BloodRequest request, boolean exactMatch, boolean sameCity, DonorResponse response) {
        Hospital hospital = request.getHospital();
        return new IncomingRequest(
                request.getId(),
                BloodRequestDetail.reference(request.getId()),
                request.getBloodGroup(),
                request.getUnitsNeeded(),
                request.getUrgency(),
                request.getCity(),
                request.getNeededBy(),
                request.getCreatedAt(),
                hospital.getName(),
                hospital.getAddress(),
                hospital.getPhone(),
                exactMatch,
                sameCity,
                response == null ? null : response.getStatus(),
                response == null ? null : response.getRespondedAt()
        );
    }
}
