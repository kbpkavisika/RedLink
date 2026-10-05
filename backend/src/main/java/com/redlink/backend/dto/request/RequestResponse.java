package com.redlink.backend.dto.request;

import com.redlink.backend.model.Donor;
import com.redlink.backend.model.DonorResponse;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.ResponseStatus;

import java.time.Instant;

/**
 * One donor's reply to a request, as the hospital sees it (H7). The phone is included so staff can call
 * donors who accepted. updatedAt changes when an accepted donor withdraws.
 */
public record RequestResponse(
        Long donorId,
        String name,
        String phone,
        BloodGroup bloodGroup,
        String city,
        ResponseStatus status,
        Instant respondedAt,
        Instant updatedAt
) {
    // Reads the donor and their user, so call it inside a transaction
    public static RequestResponse from(DonorResponse response) {
        Donor donor = response.getDonor();
        return new RequestResponse(
                donor.getId(),
                donor.getUser().getFullName(),
                donor.getUser().getPhone(),
                donor.getBloodGroup(),
                donor.getCity(),
                response.getStatus(),
                response.getRespondedAt(),
                response.getUpdatedAt()
        );
    }
}
